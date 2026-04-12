"""
AI Chat Generator — conversational financial advisor
Source: docs/features/ai-chat/sparc/Pseudocode.md Algorithm 2
Primary: Claude 3.5 Sonnet via proxyapi.ru
Fallback: YandexGPT 3
"""
import json
import logging
import os
from typing import AsyncGenerator

import httpx

from models.schemas import ChatRequest

logger = logging.getLogger(__name__)

CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
PROXY_API_URL = os.getenv("PROXY_API_URL", "https://api.proxyapi.ru/anthropic")
YANDEX_GPT_API_KEY = os.getenv("YANDEX_GPT_API_KEY", "")
YANDEX_GPT_FOLDER_ID = os.getenv("YANDEX_GPT_FOLDER_ID", "")


def _format_categories(categories: list[dict]) -> str:
    """Format top categories for system prompt."""
    if not categories:
        return "- данные о категориях недоступны"
    lines = []
    for cat in categories:
        name = cat.get("name", "Прочее")
        percent = cat.get("percent", 0)
        total = cat.get("total", 0)
        lines.append(f"- {name}: {percent:.0f}% ({total:,.0f} ₽)")
    return "\n".join(lines)


def _format_parasites(parasites: list[dict]) -> str:
    """Format parasite subscriptions for system prompt."""
    if not parasites:
        return "подписок-паразитов не обнаружено"
    lines = []
    for p in parasites:
        name = p.get("name", "Неизвестно")
        amount = p.get("amount_per_month", 0)
        lines.append(f"- {name}: ~{amount:,.0f} ₽/мес")
    return "\n".join(lines)


def _build_system_prompt(req: ChatRequest) -> str:
    ctx = req.context
    categories_text = _format_categories(ctx.get("top_categories", []))
    parasites_text = _format_parasites(ctx.get("parasites", []))
    total_spent = ctx.get("total_spent", 0)

    return f"""Ты — Клёво, дружелюбный финансовый советник с характером для российской молодёжи.
Твой стиль: честный, с лёгким юмором, как лучший друг. Без занудства.
Отвечай кратко (2-4 предложения). Всегда заканчивай конкретным советом.
Отвечай ТОЛЬКО на русском языке.

Финансы пользователя (последний месяц):
Потрачено: {total_spent:,.0f} ₽

Топ категории расходов:
{categories_text}

Паразитные подписки:
{parasites_text}"""


async def _stream_claude(
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """Stream tokens from Claude via proxyapi.ru."""
    headers = {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 512,
        "system": system,
        "messages": messages,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=5.0)) as client:
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


async def _stream_yandexgpt(
    system: str,
    messages: list[dict],
) -> AsyncGenerator[str, None]:
    """YandexGPT fallback — non-streaming, yields full response at once."""
    import asyncio

    headers = {
        "Authorization": f"Api-Key {YANDEX_GPT_API_KEY}",
        "Content-Type": "application/json",
    }

    yandex_messages = [{"role": "system", "text": system}]
    for msg in messages:
        yandex_messages.append({
            "role": msg["role"],
            "text": msg["content"],
        })

    body = {
        "modelUri": f"gpt://{YANDEX_GPT_FOLDER_ID}/yandexgpt/latest",
        "completionOptions": {"maxTokens": 512, "temperature": 0.7},
        "messages": yandex_messages,
    }

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


async def generate_chat_response(req: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Main chat response generator. Tries Claude → YandexGPT.
    Yields text chunks for SSE streaming.
    Raises on total failure so caller can emit error SSE event.
    """
    system = _build_system_prompt(req)

    messages = [
        *req.history,
        {"role": "user", "content": req.message},
    ]

    # Try Claude first
    if CLAUDE_API_KEY:
        try:
            async for chunk in _stream_claude(system, messages):
                yield chunk
            return
        except Exception as e:
            logger.warning("Claude failed for chat, trying YandexGPT: %s", e)

    # YandexGPT fallback
    if YANDEX_GPT_API_KEY and YANDEX_GPT_FOLDER_ID:
        try:
            async for chunk in _stream_yandexgpt(system, messages):
                yield chunk
            return
        except Exception as e:
            logger.warning("YandexGPT also failed for chat: %s", e)

    # Both failed — raise so router emits error event
    raise RuntimeError("All AI providers unavailable")
