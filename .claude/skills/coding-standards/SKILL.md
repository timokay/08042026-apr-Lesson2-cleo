---
name: coding-standards
description: >
  Coding standards and conventions for Клёво tech stack: Next.js 15, Python FastAPI,
  Supabase, Tailwind CSS v4, Recharts, TypeScript strict mode. Use when writing new code,
  reviewing existing code, or when unsure about naming/structure conventions.
  Trigger: "conventions", "naming", "how to structure", "code style", "стандарты".
version: "1.0"
maturity: production
---

# Coding Standards: Клёво

## TypeScript — apps/web, packages/*

### File Naming
```
Components:    RoastCard.tsx, CategoryPieChart.tsx     (PascalCase)
Hooks:         use-csv-upload.ts, use-roast.ts         (kebab-case)
Services:      csv-parser.ts, roast-service.ts         (kebab-case)
Types:         transaction.types.ts, api.types.ts      (kebab-case)
API routes:    route.ts                                (Next.js App Router)
```

### Variable Naming
```typescript
// Variables and functions: camelCase
const csvParser = new CsvParser()
async function generateRoast(context: RoastContext): Promise<AsyncGenerator<string>>

// Types and interfaces: PascalCase
type Transaction = { id: string; amount: number; merchant: string }
interface RoastContext { transactions: Transaction[]; period: string }

// Constants: UPPER_SNAKE_CASE (module-level)
const MAX_CSV_SIZE_MB = 10
const FREE_ROASTS_PER_MONTH = 1

// Components: PascalCase
export function RoastCard({ content, onShare }: RoastCardProps) { ... }
```

### Import Ordering
```typescript
// 1. Node built-ins
import path from 'path'

// 2. External packages
import { createClient } from '@supabase/ssr'
import { z } from 'zod'

// 3. Internal packages (@klevo/*)
import type { Transaction } from '@klevo/types'
import { RoastCard } from '@klevo/ui'

// 4. Relative imports
import { csvParser } from '../lib/csv-parser'
```

### Next.js 15 Rules
```typescript
// Server Components by default; 'use client' only for interactivity
// ✅ Server Component (default)
export default async function DashboardPage() {
  const supabase = await createClient()  // async in Next.js 15
  // ...
}

// ✅ Client Component (add only when needed)
'use client'
export function UploadZone() {
  const [file, setFile] = useState<File | null>(null)
  // ...
}

// CRITICAL: In Next.js 15, cookies() and headers() are async
const cookieStore = await cookies()   // ✅ correct
const cookieStore = cookies()         // ❌ wrong in Next.js 15

// API routes: always validate with Zod before processing
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = UploadSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: '...' }, { status: 400 })
}
```

## Python — apps/ai-service

### File Naming
```
Modules:      csv_parser.py, roast_generator.py    (snake_case)
Routers:      roast_router.py, analyze_router.py   (snake_case)
Services:     rate_limiter.py, categorizer.py      (snake_case)
```

### Function Naming
```python
# Functions and variables: snake_case
async def generate_roast(context: RoastContext) -> AsyncGenerator[str, None]:
    ...

# Classes: PascalCase
class ParasiteDetector:
    def find_parasites(self, transactions: list[Transaction]) -> list[Subscription]:
        ...

# Constants: UPPER_SNAKE_CASE
MAX_TRANSACTIONS_PER_REQUEST = 1000
FREE_ROASTS_PER_MONTH = 1
```

### FastAPI Patterns
```python
# Always async def for route handlers
@router.post("/roast")
async def create_roast(request: RoastRequest, settings=Depends(get_settings)):
    ...

# SSE: each chunk must end with \n\n
async def generate_stream():
    async for token in claude_client.stream(prompt):
        yield f"data: {json.dumps({'token': token})}\n\n"

# Pydantic for request validation (same role as Zod on TS side)
class RoastRequest(BaseModel):
    user_id: str
    period: str = "last_month"
    
    @validator('period')
    def validate_period(cls, v):
        allowed = ['last_month', 'last_3_months', 'last_year']
        if v not in allowed:
            raise ValueError(f'period must be one of {allowed}')
        return v
```

## Database — packages/db

### Naming
```sql
-- Tables: snake_case, plural
CREATE TABLE transactions (...);
CREATE TABLE roast_sessions (...);
CREATE TABLE savings_goals (...);

-- Columns: snake_case
user_id UUID NOT NULL,
created_at TIMESTAMPTZ DEFAULT now(),
merchant_name TEXT NOT NULL,

-- Every table must have:
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE

-- RLS policy naming: action_table_condition
CREATE POLICY "select_transactions_own_user" ON transactions
  FOR SELECT USING (user_id = auth.uid());
```

## CSS — Tailwind CSS v4

```tsx
// Utility class ordering: layout → sizing → spacing → typography → color → state
<div className="flex flex-col w-full max-w-md p-6 text-sm text-white bg-slate-900 hover:bg-slate-800">

// Component variants via cva
const buttonVariants = cva('rounded-lg font-medium transition-colors', {
  variants: {
    variant: {
      primary: 'bg-violet-600 text-white hover:bg-violet-500',
      secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})
```

## Known Gotchas (Critical)

- **Cyrillic regex:** `\w` does NOT match Cyrillic. Use `\p{L}` with `/u` flag.
- **T-Bank CSV encoding:** Detect encoding before parsing — NOT always UTF-8.
- **Next.js 15 async APIs:** `cookies()`, `headers()`, `params` are all async now.
- **FastAPI SSE:** Chunks need `\n\n` at end — single `\n` silently breaks the stream.
- **Redis singleton:** Rate limiter MUST be singleton — per-request instance bypasses limits.
- **Supabase service role:** Never use in browser. Service role bypasses RLS silently.

See `.claude/rules/coding-style.md` for complete gotchas list.
