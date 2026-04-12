# Pseudocode: Share Roast Card

## POST /api/share

```
ASYNC FUNCTION POST(request: NextRequest) → NextResponse

  supabase = await createClient()
  user = await supabase.auth.getUser()
  IF NOT user → RETURN 401

  body = await request.json()
  parsed = ShareRequestSchema.safeParse(body)
    { roast_id: z.string().uuid() }
  IF NOT parsed.success → RETURN 400

  roast_id = parsed.data.roast_id

  # Verify ownership
  { data: roast } = await supabase
    .from('roasts')
    .select('id, share_token, user_id')
    .eq('id', roast_id)
    .eq('user_id', user.id)
    .single()

  IF NOT roast → RETURN 404

  # Reuse or generate token
  token = roast.share_token ?? randomBytes(8).toString('base64url')

  # Make public
  await supabase
    .from('roasts')
    .update({ is_public: true, share_token: token })
    .eq('id', roast_id)
    .eq('user_id', user.id)

  app_url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  RETURN { share_url: `${app_url}/share/${token}`, token }
```

## GET /share/[token] (Server Component)

```
ASYNC FUNCTION generateMetadata({ params }):
  RETURN {
    title: "Мой финансовый ростер от Клёво",
    description: "Посмотри как AI поджарил мои расходы 🔥",
    openGraph: { url: `${APP_URL}/share/${params.token}` }
  }

ASYNC FUNCTION Page({ params }):
  token = params.token

  # Validate token format
  IF NOT /^[a-zA-Z0-9_-]{8,16}$/.test(token):
    notFound()

  { data: roast } = await supabase
    .from('roasts')
    .select('*')
    .eq('share_token', token)
    .eq('is_public', true)
    .single()

  IF NOT roast: notFound()

  RENDER SharePage(roast)
    └─ RoastCard (read-only, без кнопок)
    └─ CTA: "Сделай свой анализ на klevo.app"
```

## UI: RoastCard "Поделиться"

```
STATE: copied = false

ON CLICK "Поделиться":
  response = await POST /api/share { roast_id }
  navigator.clipboard.writeText(response.share_url)
  copied = true
  setTimeout(() → copied = false, 2000)

RENDER:
  IF copied: "Скопировано! ✓"
  ELSE: "Поделиться"
```
