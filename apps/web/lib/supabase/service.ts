import { createClient } from '@supabase/supabase-js'

/**
 * Supabase service-role client.
 * Bypasses RLS — use ONLY in server-side code where RLS bypass is intentional
 * (e.g., webhook handlers, admin operations).
 * NEVER expose to browser or pass to client components.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not configured')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
