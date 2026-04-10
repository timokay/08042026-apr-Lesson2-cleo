import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser (client-side) Supabase client.
 * Uses ANON key — safe to expose.
 * RLS enforced automatically via JWT.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
