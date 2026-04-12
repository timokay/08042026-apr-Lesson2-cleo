import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { RoastRequestSchema } from '../../../lib/zod/schemas'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  // Validate input
  const body: unknown = await request.json().catch(() => ({}))
  const parsed = RoastRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
  }

  // Fetch user's active plan (for monthly limit enforcement)
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  const now = new Date()
  const planExpiry = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const activePlan = profile?.plan !== 'free' && planExpiry && planExpiry > now ? profile.plan : 'free'

  // Fetch user's transactions for the requested period
  const { period } = parsed.data
  const now = new Date()
  const daysBack = period === 'last_3_months' ? 90 : period === 'all' ? 365 : 30
  const since = new Date(now)
  since.setDate(since.getDate() - daysBack)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', since.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })

  if (!transactions || transactions.length < 5) {
    return NextResponse.json(
      { error: { code: 'INSUFFICIENT_DATA', message: 'Маловато данных для ростера' } },
      { status: 422 },
    )
  }

  // Get categories + parasites from AI service
  const analyzeRes = await fetch(`${AI_SERVICE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions, user_id: user.id }),
  }).catch(() => null)

  if (!analyzeRes?.ok) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 503 })
  }

  const analyzed = await analyzeRes.json() as { categories: unknown[]; parasites: unknown[]; total_spent: number }

  // Stream roast from AI service → proxy SSE to client
  const roastRes = await fetch(`${AI_SERVICE_URL}/roast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user.id,
      period,
      categories: analyzed.categories,
      parasites: analyzed.parasites,
      total_spent: analyzed.total_spent,
      plan: activePlan,
    }),
  }).catch(() => null)

  if (!roastRes) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 503 })
  }

  if (roastRes.status === 429) {
    const err = await roastRes.json() as { detail: { code: string; retry_after?: number } }
    return NextResponse.json({ error: err.detail }, { status: 429 })
  }

  if (!roastRes.ok || !roastRes.body) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 503 })
  }

  // Proxy SSE stream directly to client
  return new NextResponse(roastRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
