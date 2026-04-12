# Pseudocode: Roast Mode

## Algorithm 4: generate_roast

```
ASYNC GENERATOR generate_roast(req: RoastRequest) → AsyncGenerator[str]

  IF NOT req.categories OR sum(c.count for c in req.categories) < 5
    YIELD "Маловато данных — добавь больше трат!"
    RETURN

  prompt = _build_user_prompt(req)
    """Поджарь расходы за период "{period}":
    - Всего потрачено: ₽{total_spent}
    - Топ категорий: {top-5 categories}
    - Лишних подписок: {n} штук, ₽{parasite_total}/мес
    - Самый шокирующий факт: ₽{top_amount} на {top_category}
    Ответ только на русском языке."""

  # Try Claude first
  IF CLAUDE_API_KEY:
    TRY
      ASYNC FOR chunk IN _stream_claude(prompt):
        YIELD chunk
      RETURN
    EXCEPT Exception as e:
      LOG.warning("Claude failed: %s", e)

  # YandexGPT fallback
  IF YANDEX_GPT_API_KEY:
    TRY
      ASYNC FOR chunk IN _stream_yandexgpt(prompt):
        YIELD chunk
      RETURN
    EXCEPT Exception as e:
      LOG.warning("YandexGPT failed: %s", e)

  # Generic template
  YIELD _generic_roast(req.total_spent, top_category_label)


ASYNC GENERATOR _stream_claude(prompt: str)
  headers = { "x-api-key": CLAUDE_API_KEY, "anthropic-version": "2023-06-01" }
  body = {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 600,
    "system": SYSTEM_PROMPT,
    "messages": [{"role":"user","content":prompt}],
    "stream": True
  }
  ASYNC WITH httpx.AsyncClient(timeout=30) AS client:
    ASYNC WITH client.stream("POST", PROXY_URL+"/v1/messages", body) AS response:
      ASYNC FOR line IN response.aiter_lines():
        IF NOT line.startswith("data:") → CONTINUE
        data = line[5:].strip()
        IF data == "[DONE]" → BREAK
        event = json.loads(data)
        IF event.type == "content_block_delta":
          YIELD event.delta.text


ASYNC GENERATOR _stream_yandexgpt(prompt: str)
  FOR attempt IN [0, 1, 2]:
    TRY
      response = await POST yandex-llm-api { system+user messages, maxTokens=600 }
      text = response.json()["result"]["alternatives"][0]["message"]["text"]
      YIELD text
      RETURN
    EXCEPT:
      IF attempt < 2: SLEEP 2^attempt seconds
      ELSE: RAISE
```

## Rate Limiter (Redis sliding window)

```
FUNCTION check_rate_limit(user_id: str, limit: int, window_secs: int) → bool
  now = time.time() * 1000  # milliseconds
  window_start = now - window_secs * 1000
  key = f"rate:roast:{user_id}"

  REDIS PIPELINE:
    ZREMRANGEBYSCORE key 0 window_start    # remove old entries
    ZCARD key                               # count in window
    ZADD key now now                        # add current request
    EXPIRE key window_secs

  IF count >= limit → RETURN False (rate limited)
  RETURN True

FUNCTION check_monthly_limit(user_id: str) → bool
  year_month = datetime.now().strftime("%Y:%m")
  key = f"rate:roast:monthly:{user_id}:{year_month}"
  count = REDIS GET key
  IF count AND int(count) >= 1 → RETURN False (monthly limit for free plan)
  REDIS INCR key
  REDIS EXPIRE key 31*24*3600
  RETURN True
```
