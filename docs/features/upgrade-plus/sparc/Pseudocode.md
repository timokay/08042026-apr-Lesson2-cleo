# Pseudocode: Upgrade to Plus

## Data Structures

### PaymentTransaction
```typescript
type PaymentTransaction = {
  id: string           // UUID
  user_id: string      // UUID → profiles
  invoice_id: string   // "KLV-{timestamp}-{random}" UNIQUE
  amount: number       // 299.00
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  robokassa_id: string | null
  created_at: string   // ISO timestamp
  paid_at: string | null
}
```

## Core Algorithms

### Algorithm 1: create_invoice

```
ASYNC FUNCTION create_invoice(user_id: str) → { invoice_id, payment_url, amount }

  # Check not already subscribed
  profile = await supabase.from('profiles').select().eq('id', user_id).single()
  IF profile.plan != 'free' AND profile.plan_expires_at > now():
    RAISE 409 ALREADY_SUBSCRIBED

  # Generate unique invoice ID
  invoice_id = f"KLV-{int(time.time())}-{random(4)}"
  amount = float(env.PLUS_PRICE_RUB)  # 299.00

  # Create pending transaction
  await supabase.from('payment_transactions').insert({
    user_id, invoice_id, amount, status: 'pending'
  })

  # Build Robokassa URL
  # shp_user_id — custom parameter (передаётся через webhook)
  signature = md5(f"{MERCHANT_LOGIN}:{amount}:{invoice_id}:{PASSWORD1}:shp_user_id={user_id}")
  
  params = {
    MerchantLogin: MERCHANT_LOGIN,
    OutSum: amount,
    InvoiceId: invoice_id,
    Description: "Клёво Plus — 1 месяц",
    SignatureValue: signature,
    IsTest: "1" if TEST_MODE else "0",
    shp_user_id: user_id,    # custom param — Robokassa вернёт в webhook
  }
  
  payment_url = f"https://auth.robokassa.ru/Merchant/Index.aspx?{urlencode(params)}"
  
  RETURN { invoice_id, payment_url, amount }
```

### Algorithm 2: handle_webhook (ResultURL)

```
ASYNC FUNCTION handle_webhook(form_data: dict) → "OK{invoice_id}"

  out_sum = form_data.get('OutSum')
  invoice_id = form_data.get('InvoiceId')
  signature = form_data.get('SignatureValue')
  user_id = form_data.get('shp_user_id')  # custom param

  # CRITICAL: Verify signature BEFORE any DB changes
  expected = md5(f"{out_sum}:{invoice_id}:{PASSWORD2}:shp_user_id={user_id}")
  IF signature.lower() != expected.lower():
    LOG.warning("Invalid Robokassa signature for invoice %s", invoice_id)
    RAISE 400 BAD_REQUEST

  # Idempotency: check if already processed
  txn = await supabase
    .from('payment_transactions')
    .select()
    .eq('invoice_id', invoice_id)
    .single()

  IF txn.status == 'paid':
    RETURN "OK{invoice_id}"  # Already processed, idempotent

  IF NOT txn OR txn.user_id != user_id:
    RAISE 400 BAD_REQUEST

  # Update transaction status to 'paid'
  # Race condition protection: UNIQUE constraint on invoice_id prevents double-processing.
  # If two concurrent webhooks arrive, the second .update() where status='pending'
  # will affect 0 rows (already 'paid') → idempotent result.
  { count } = await supabase.from('payment_transactions')
    .update({ status: 'paid', paid_at: now_utc(), raw_robokassa_response: out_sum })
    .eq('invoice_id', invoice_id)
    .eq('status', 'pending')  # Only update if still pending (race condition guard)

  IF count == 0:
    RETURN "OK{invoice_id}"  # Already processed by concurrent request

  # Upgrade plan (atomically with transaction update above)
  expires_at = datetime.now(UTC) + timedelta(days=int(env.PLUS_DURATION_DAYS))
  await supabase.from('profiles')
    .update({ plan: 'plus', plan_expires_at: expires_at.isoformat() })
    .eq('id', user_id)

  LOG.info("User %s upgraded to Plus, expires %s", user_id, expires_at)
  RETURN "OK{invoice_id}"  # Robokassa требует именно этот формат
```

### Algorithm 3: check_plan_active (интеграция в rate_limiter.py)

```python
ASYNC FUNCTION check_roast_allowed(user_id: str, redis: Redis) → (bool, str):
  """Returns (allowed: bool, reason: str)"""
  
  # Check profile plan
  supabase = get_supabase_service_client()
  { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user_id)
    .single()

  IF profile AND profile['plan'] in ('plus', 'pro'):
    expires_at = profile.get('plan_expires_at')
    IF expires_at:
      # Always compare UTC-aware datetimes to avoid DST/timezone issues
      exp = datetime.fromisoformat(expires_at).replace(tzinfo=timezone.utc)
      IF exp > datetime.now(timezone.utc):
        RETURN (True, "plus_active")
      ELSE:
        # Auto-downgrade expired plan
        await supabase.from('profiles')
          .update({ 'plan': 'free', 'plan_expires_at': None })
          .eq('id', user_id)
        LOG.info("Downgraded expired plan for user %s", user_id)

  # Free plan: check monthly limit
  year_month = datetime.now().strftime("%Y:%m")
  key = f"rate:roast:monthly:{user_id}:{year_month}"
  count = await redis.get(key)
  
  IF count AND int(count) >= 1:
    RETURN (False, "monthly_limit")
  
  await redis.incr(key)
  await redis.expire(key, 31 * 24 * 3600)
  RETURN (True, "free_allowed")
```

## API Contracts

### POST /api/payments/create-invoice
```
Headers: { Cookie: session }
Body: {}

Response 200: { invoice_id: str, payment_url: str, amount: 299.00 }
Response 401: { error: "UNAUTHORIZED" }
Response 409: { error: "ALREADY_SUBSCRIBED", expires_at: ISO }
```

### POST /api/payments/webhook
```
Content-Type: application/x-www-form-urlencoded (от Robokassa)
Body: OutSum=299.00&InvoiceId=KLV-xxx&SignatureValue=abc&shp_user_id=uuid

Response 200: "OKKL-xxx"  (plain text, не JSON!)
Response 400: "Bad signature"
```

## Robokassa URL построение

```
Base: https://auth.robokassa.ru/Merchant/Index.aspx
Params:
  MerchantLogin  = env.ROBOKASSA_MERCHANT_LOGIN
  OutSum         = "299.00"
  InvoiceId      = invoice_id
  Description    = "Клёво Plus — 1 месяц"
  SignatureValue = md5(f"{MerchantLogin}:{OutSum}:{InvoiceId}:{Password1}:shp_user_id={user_id}")
  Encoding       = "utf-8"
  Culture        = "ru"
  IsTest         = "1" | "0"
  shp_user_id    = user_id  # lowercase shp_ prefix для custom params
```

## Signature Verification (webhook)

```python
import hashlib

def verify_robokassa_signature(
    out_sum: str, invoice_id: str, 
    signature: str, user_id: str, password2: str
) -> bool:
    expected = hashlib.md5(
        f"{out_sum}:{invoice_id}:{password2}:shp_user_id={user_id}".encode()
    ).hexdigest()
    return signature.lower() == expected.lower()
```
