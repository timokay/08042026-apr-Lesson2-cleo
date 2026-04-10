"""
Algorithm 4: Roast Generator (AI streaming)
Source: docs/Pseudocode.md — Algorithm 4
Primary: Claude 3.5 Sonnet via proxyapi.ru
Fallback: YandexGPT 3
Fallback-2: pre-written generic roast template
"""
import json
import logging
import os
from typing import AsyncGenerator

import httpx

from models.schemas import CategorySummary, RoastRequest, Subscription, TransactionCategory

logger = logging.getLogger(__name__)

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
PROXY_API_URL = os.getenv("PROXY_API_URL", "https://api.proxyapi.ru/anthropic")
YANDEX_GPT_API_KEY = os.getenv("YANDEX_GPT_API_KEY", "")
YANDEX_GPT_FOLDER_ID = os.getenv("YANDEX_GPT_FOLDER_ID", "")

CATEGORY_LABELS: dict[TransactionCategory, str] = {
    TransactionCategory.FOOD_DELIVERY:  "Доставка еды",
    TransactionCategory.RESTAURANTS:    "Рестораны",
    TransactionCategory.SUBSCRIPTIONS:  "Подписки",
    TransactionCategory.TRANSPORT:      "Транспорт",
    TransactionCategory.GROCERIES:      "Продукты",
    TransactionCategory.SHOPPING:       "Шопинг",
    TransactionCategory.UTILITIES:      "ЖКХ",
    TransactionCategory.ENTERTAINMENT:  "Развлечения",
    TransactionCategory.SAVINGS:        "Сбережения",
    TransactionCategory.OTHER:          "Прочее",
}

SYSTEM_PROMPT = """Ты — Клёво, дружелюбный и честный AI-финансовый советник.
Твой стиль: юмористичный, но не обидный. Как лучший друг, который говорит правду с улыбкой.
Используй современный русский молодёжный язык (без матов). Максимум 300 слов.
Добавляй 1-2 эмодзи для живости. Структура ответа:
1. Ударная фраза (одно предложение — самый жёсткий факт)
2. Основной ростер (2-3 абзаца)
3. 2 конкретных совета по улучшению

ВАЖНО: Отвечай ТОЛЬКО на русском языке. Если ты начинаешь отвечать на другом языке — перестань и начни заново на русском."""


def _build_user_prompt(req: RoastRequest) -> str:
    top = req.categories[:5] if req.categories else []
    categories_list = "\n".join(
        f"  - {CATEGORY_LABELS.get(c.category, c.category)}: ₽{c.total:,.0f} ({c.percent:.0f}%)"
        for c in top
    )
    parasite_total = sum(p.amount_per_month for p in req.parasites)
    top_cat = top[0] if top else None

    shocking_stat = ""
    if top_cat and top_cat.total > 3000:
        shocking_stat = f"₽{top_cat.total:,.0f} на {CATEGORY_LABELS.get(top_cat.category, top_cat.category)}"

    return f"""Поджарь расходы за период "{req.period}":
- Всего потрачено: ₽{req.total_spent:,.0f}
- Топ категорий:
{categories_list}
- Лишних подписок: {len(req.parasites)} штук, ₽{parasite_total:,.0f}/мес
{"- Самый шокирующий факт: " + shocking_stat if shocking_stat else ""}

Ответ только на русском языке."""


async def _stream_claude(prompt: str) -> AsyncGenerator[str, None]:
    """Stream tokens from Claude via proxyapi.ru."""
    headers = {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 600,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        async with client.stream(
            "POST",
            f"{PROXY_API_URL}/v1/messages",
            headers=headers,
            json=body,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    event = json.loads(data)
                    if event.get("type") == "content_block_delta":
                        text = event.get("delta", {}).get("text", "")
                        if text:
                            yield text
                except (json.JSONDecodeError, KeyError):
                    continue


async def _stream_yandexgpt(prompt: str) -> AsyncGenerator[str, None]:
    """YandexGPT fallback — non-streaming, yields whole response at once."""
    headers = {
        "Authorization": f"Api-Key {YANDEX_GPT_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "modelUri": f"gpt://{YANDEX_GPT_FOLDER_ID}/yandexgpt/latest",
        "completionOptions": {"maxTokens": 600, "temperature": 0.7},
        "messages": [
            {"role": "system", "text": SYSTEM_PROMPT},
            {"role": "user", "text": prompt},
        ],
    }

    import asyncio
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
                    headers=headers,
                    json=body,
                )
                response.raise_for_status()
                data = response.json()
                text = data["result"]["alternatives"][0]["message"]["text"]
                yield text
                return
        except Exception:
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
            else:
                raise


def _generic_roast(total_spent: float, top_category: str | None) -> str:
    """Last-resort fallback: pre-written template."""
    return (
        f"Слушай, ты потратил ₽{total_spent:,.0f} — и это только то, что попало в выписку! 😅 "
        f"{'Особенно впечатляет статья на ' + top_category + '.' if top_category else ''} "
        "Советую: 1) Посмотри на подписки — там часто прячутся незаметные траты. "
        "2) Попробуй правило 24 часов перед незапланированными покупками."
    )


async def generate_roast(req: RoastRequest) -> AsyncGenerator[str, None]:
    """
    Main roast generator. Tries Claude → YandexGPT → generic template.
    Yields text chunks for SSE streaming.
    """
    if not req.categories or sum(t.count for t in req.categories) < 5:
        yield "Маловато данных для полноценного ростера — добавь больше трат!"
        return

    prompt = _build_user_prompt(req)
    top_cat_label = CATEGORY_LABELS.get(req.categories[0].category) if req.categories else None

    # Try Claude first
    if CLAUDE_API_KEY:
        try:
            async for chunk in _stream_claude(prompt):
                yield chunk
            return
        except Exception as e:
            logger.warning("Claude failed, trying YandexGPT: %s", e)

    # YandexGPT fallback
    if YANDEX_GPT_API_KEY and YANDEX_GPT_FOLDER_ID:
        try:
            async for chunk in _stream_yandexgpt(prompt):
                yield chunk
            return
        except Exception as e:
            logger.warning("YandexGPT failed, using generic template: %s", e)

    # Generic template fallback
    yield _generic_roast(req.total_spent, top_cat_label)
