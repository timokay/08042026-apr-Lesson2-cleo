# Architecture: CSV Upload

## Компоненты

```
Browser (React)
  └─ CsvUploadZone.tsx          packages/ui/src/
       │  drag-and-drop, validates .csv + size
       └─ POST /api/upload (multipart/form-data)

Next.js BFF
  └─ app/api/upload/route.ts    apps/web/
       │  auth check → size check → Zod validate
       │  → forward to AI service
       └─ persist Transaction[] to Supabase

Python FastAPI (AI service)
  └─ POST /analyze              apps/ai-service/
       │  csv_parser.py         services/
       │  categorizer.py        services/
       └─ parasite_detector.py  services/

Supabase PostgreSQL
  └─ transactions table         packages/db/schema/001_init.sql
       RLS: user_id = auth.uid()
```

## Поток данных

```
1. Browser → [multipart CSV] → Next.js /api/upload
2. Next.js → auth check (Supabase JWT) → 401 if not auth
3. Next.js → file.size > 10MB → 413
4. Next.js → [multipart] → AI service /analyze
5. AI service:
   a. detect_encoding(bytes) → "utf-8" | "cp1251"
   b. csv.DictReader(text, delimiter=";")
   c. detect_bank_format(headers) → "tbank" | "sber" | "generic"
   d. _parse_tbank / _parse_sber / _parse_generic
   e. filter amount < 0 (расходы only)
   f. deduplicate(transactions)
   g. truncate to 1000 rows
   h. categorize(transactions) → CategorySummary[]
   i. find_parasites(transactions) → Subscription[]
6. Next.js ← { transactions, categories, parasites, period, total_spent }
7. Next.js → supabase.from('transactions').insert(transactions)
8. Browser ← { transactions_count, period, categories, parasites }
```

## Security

- Raw CSV НЕ сохраняется (только в памяти FastAPI)
- AI service не имеет прямого доступа к Supabase (Next.js BFF-прослойка)
- user_id передаётся от аутентифицированного Next.js, не из body запроса
- RLS на таблице transactions: user_id = auth.uid()

## ADR: Почему BFF, а не прямой доступ из браузера к AI service

Браузер не может напрямую обращаться к AI service:
1. AI service работает в docker network (не публичный)
2. Передача user_id должна идти от auth middleware, не от клиента
3. Next.js middleware защищает все `/api/*` маршруты
