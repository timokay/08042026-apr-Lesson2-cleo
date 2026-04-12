import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

/**
 * GET /api/payments/status
 * Returns the current user's plan and expiry info.
 * Source: docs/features/upgrade-plus/sparc/Specification.md
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  const now = new Date()
  const expiresAt = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const isActive = profile.plan !== 'free' && expiresAt !== null && expiresAt > now
  const daysRemaining = isActive && expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return NextResponse.json({
    plan: isActive ? profile.plan : 'free',
    plan_expires_at: profile.plan_expires_at ?? null,
    days_remaining: daysRemaining,
    is_active: isActive,
  })
}
