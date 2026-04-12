# Architecture: Parasite Scanner

## Компоненты

```
Python FastAPI (AI service)
  └─ services/parasite_detector.py
       find_parasites(transactions: list[Transaction]) → list[Subscription]
       ├─ _normalize_merchant(merchant) → str
       ├─ _is_known_subscription(name) → bool  [KNOWN_SUBSCRIPTIONS set]
       ├─ _estimate_monthly_amount(amounts, intervals) → float
       └─ group → filter → classify → sort → truncate

React UI
  └─ packages/ui/src/SubscriptionList.tsx
       SubscriptionList({ subscriptions: Subscription[] })
       ├─ Confidence badge (HIGH=зелёный, MEDIUM=жёлтый)
       ├─ "Неактивна" badge если !is_active
       ├─ Keep/Cancel кнопки
       └─ Total monthly waste header
```

## Поток данных

```
POST /analyze (AI service)
  1. parse_csv(bytes) → Transaction[]
  2. categorize(transactions) → CategorySummary[]
  3. find_parasites(transactions) → Subscription[]
  4. Return { transactions, categories, parasites, period, total_spent }

Dashboard (Next.js)
  1. Получает parasites[] из /api/upload response
  2. Передаёт в <SubscriptionList subscriptions={parasites} />
```

## Алгоритм (высокий уровень)

```
group transactions by normalized merchant name
  ↓
for each group with ≥ 2 transactions:
  calculate intervals between consecutive charges
  std_dev < 5 days AND 7 ≤ avg_interval ≤ 35 days
    ↓ YES → recurring
  classify confidence (known subscription? → HIGH, else MEDIUM)
  estimate monthly amount (normalize to 30 days)
  check is_active (last charge ≤ 45 days ago)
  ↓
sort by amount_per_month DESC
return top 20
```

## Зависимости

- `statistics.stdev()` — stdlib Python, без внешних зависимостей
- Transaction model из `models/schemas.py`
- KNOWN_SUBSCRIPTIONS hardcoded в модуле (seed list ~30 сервисов)
