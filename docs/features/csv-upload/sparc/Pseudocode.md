# Pseudocode: CSV Upload

## Algorithm 1: parse_csv

```
FUNCTION parse_csv(file_bytes: bytes, user_id: str, bank_hint: str = "auto") → list[Transaction]
  IF len(file_bytes) > 5_000_000
    RAISE ValueError("Файл слишком большой. Максимум 5 МБ")

  encoding = detect_encoding(file_bytes)
    TRY decode as UTF-8 → return "utf-8"
    EXCEPT UnicodeDecodeError → return "cp1251"

  text = file_bytes.decode(encoding, errors="replace")

  reader = csv.DictReader(text, delimiter=";")
  IF reader.fieldnames < 2
    reader = csv.DictReader(text, delimiter=",")
  IF NOT reader.fieldnames
    RAISE ValueError("Не смогли прочитать файл")

  bank = bank_hint IF bank_hint != "auto" ELSE detect_bank_format(fieldnames)
    headers_lower = {h.lower().strip() for h in headers}
    IF {"дата операции", "сумма операции"} ∩ headers → "tbank"
    IF {"дата проводки"} ∩ headers → "sber"
    IF {"дата транзакции"} ∩ headers → "alfa"
    ELSE → "generic"

  transactions = parse_by_bank(reader, user_id, bank)
    FOR each row:
      amount = parse_amount(row["Сумма операции"])
        strip spaces, NBSP, replace "," → "."
        float(cleaned)
      date = parse_date(row["Дата операции"])
        TRY formats: "%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y %H:%M:%S"
      IF amount IS None OR date IS None → SKIP
      IF amount >= 0 → SKIP (income)
      APPEND Transaction(id=uuid4(), user_id, amount, date, description, merchant)

  IF NOT transactions
    RAISE ValueError("Не нашли транзакций")

  transactions = deduplicate(transactions)
    key = (date, amount, description[:50])
    seen: set[key] → keep only unique

  truncated = len(transactions) > 1000
  transactions = transactions[:1000]
  transactions.sort(key=date, reverse=True)

  RETURN transactions
```

## Algorithm 2: categorize

```
FUNCTION categorize(transactions: list[Transaction]) → list[CategorySummary]
  FOR each transaction:
    FOR each (pattern, category) IN CATEGORY_PATTERNS:
      IF re.search(pattern, merchant+description, IGNORECASE|UNICODE) → MATCH
    IF no match → category = "other"
    txn.category = category

  groups = group_by(category)
  total_sum = sum(abs(amount) for all transactions)

  summaries = []
  FOR category, txns IN groups:
    cat_total = sum(abs(t.amount) for t in txns)
    summaries.append(CategorySummary(
      category=category,
      total=cat_total,
      count=len(txns),
      percent=cat_total / total_sum * 100
    ))

  RETURN summaries.sort(by=total, DESC)
```
