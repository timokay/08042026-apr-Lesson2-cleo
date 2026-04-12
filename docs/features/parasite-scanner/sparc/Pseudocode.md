# Pseudocode: Parasite Scanner

## Algorithm 3: find_parasites

```
FUNCTION find_parasites(transactions: list[Transaction]) → list[Subscription]

  # Step 1: Group by merchant (normalized)
  groups: dict[str, list[Transaction]] = {}
  FOR txn IN transactions:
    IF txn.amount >= 0 → SKIP (income)
    key = txn.merchant[:40].lower().strip()  OR  txn.description[:40].lower().strip()
    groups[key].append(txn)

  parasites = []

  FOR merchant_key, txns IN groups:
    IF len(txns) < 2 → SKIP (need ≥ 2 charges)

    # Step 2: Sort by date, calculate intervals
    txns.sort(by=transaction_date ASC)
    dates = [t.transaction_date for t in txns]
    amounts = [t.amount for t in txns]
    intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]

    IF NOT intervals → SKIP

    avg_interval = mean(intervals)
    std_dev = stdev(intervals) IF len(intervals) > 1 ELSE 0

    # Step 3: Recurring check
    is_recurring = std_dev < 5 AND 7 ≤ avg_interval ≤ 35

    IF NOT is_recurring → SKIP

    # Step 4: Active check
    last_date = dates[-1]
    days_since_last = (today - last_date).days
    is_active = days_since_last ≤ 45

    # Step 5: Confidence
    is_known = ANY(sub IN merchant_key.lower() FOR sub IN KNOWN_SUBSCRIPTIONS)
    confidence = "high" IF is_known AND is_recurring
               = "medium" IF is_recurring
               = "low"    (never reached, filtered above)

    # Step 6: Monthly amount estimate
    avg_amount = mean(abs(amounts))
    monthly_amount = round(avg_amount * (30 / avg_interval), 2)

    # Step 7: Display name = most common name in group
    display_name = mode([t.merchant OR t.description for t in txns])

    parasites.append(Subscription(
      name=display_name[:60],
      amount_per_month=monthly_amount,
      last_charge_date=last_date,
      confidence=confidence,
      is_active=is_active,
      transaction_ids=[t.id for t in txns]
    ))

  # Step 8: Sort by cost DESC, top 20
  RETURN sorted(parasites, by=amount_per_month, DESC)[:20]
```

## Вспомогательные функции

```
FUNCTION _estimate_monthly_amount(amounts, intervals) → float
  avg_amount = abs(sum(amounts) / len(amounts))
  avg_interval = sum(intervals) / len(intervals)  # days
  IF avg_interval == 0 → return avg_amount
  RETURN round(avg_amount * (30 / avg_interval), 2)

FUNCTION _is_known_subscription(name: str) → bool
  RETURN ANY(sub IN name.lower() FOR sub IN KNOWN_SUBSCRIPTIONS)
  # KNOWN_SUBSCRIPTIONS: {"netflix", "spotify", "яндекс плюс", "кинопоиск", ...}
```
