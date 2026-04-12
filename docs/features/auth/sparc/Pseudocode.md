# Pseudocode: Authentication

## Login Flow

```
# Landing page (Client Component)
FUNCTION LoginForm():
  email = useState("")
  loading = useState(false)
  sent = useState(false)

  ON SUBMIT:
    loading = true
    supabase = createBrowserClient()
    { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    IF error: show error message
    ELSE: sent = true  // "Проверь почту"
    loading = false

  RENDER:
    IF sent: "Письмо отправлено! Проверь почту."
    ELSE: email input + submit button
```

## Auth Callback

```
# app/auth/callback/route.ts
ASYNC FUNCTION GET(request: NextRequest):
  code = request.nextUrl.searchParams.get('code')
  next = request.nextUrl.searchParams.get('next') ?? '/dashboard'

  IF code:
    supabase = await createClient()
    { error } = await supabase.auth.exchangeCodeForSession(code)
    IF NOT error:
      RETURN NextResponse.redirect(`${origin}${next}`)

  # Failed (no code or exchange error)
  RETURN NextResponse.redirect(`${origin}/?auth_error=1`)
```

## Middleware

```
# middleware.ts
ASYNC FUNCTION middleware(request: NextRequest):
  response = await updateSession(request)
    # @supabase/ssr: reads/refreshes JWT cookie
    # Sets updated cookie on response

  PROTECTED_PATHS = ['/dashboard', '/roast', '/settings']
  path = request.nextUrl.pathname

  IF path.startsWith ONE OF PROTECTED_PATHS:
    # Check session from cookie
    supabase = createServerClient(request, response)
    { data: { user } } = await supabase.auth.getUser()
    IF NOT user:
      redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('auth_required', '1')
      RETURN NextResponse.redirect(redirectUrl)

  RETURN response
```

## Auto-create Profile (DB Trigger)

```sql
-- Срабатывает при каждом новом пользователе в auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1)  -- username как display_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
