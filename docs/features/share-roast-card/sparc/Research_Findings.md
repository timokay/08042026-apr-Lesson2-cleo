# Research Findings: Share Roast Card

## Viral mechanics в fintech

- Cleo (US): share feature → 35% новых пользователей приходят через shared content (2022)
- "Social proof + юмор" — самая эффективная комбинация для fintech virality
- Telegram превью (OG) важнее Twitter Card для российской аудитории

## OG Tags для мессенджеров

| Мессенджер | Поддержка OG | Image required |
|-----------|-------------|----------------|
| Telegram | ✅ Полная | Опционально |
| VKontakte | ✅ Полная | Рекомендуется |
| WhatsApp | ✅ Частичная | Рекомендуется |
| Twitter/X | ✅ Twitter Card | Обязательна |

**Вывод:** Для MVP достаточно title + description (Telegram/VK). OG image повысит CTR в 2–3×.

## Token Security

- 64 bits entropy (randomBytes(8)) — industry standard для share URLs
- При 1M токенов вероятность коллизии: ~2.7×10^-11 (пренебрежимо мала)
- base64url vs hex: base64url = 11 символов, hex = 16 символов — более короткий URL

## Конкуренты

| Продукт | Share механика |
|---------|---------------|
| Cleo | Share screenshot → нет публичной страницы |
| Splitwise | Публичный invoice link |
| Venmo | Публичная лента транзакций |
| **Клёво** | Публичная страница с ростером + OG + CTA |

**Клёво уникально:** шаринг ведёт на красивую страницу с CTA "сделай свой анализ" — growth loop.

## Next.js generateMetadata

Используется Next.js 15 App Router API:
```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: '...',
    openGraph: { ... }
  }
}
```
Выполняется на сервере, корректно для SSR/SSG.
