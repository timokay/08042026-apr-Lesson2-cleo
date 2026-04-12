import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/server'

/**
 * POST /api/chat — AI Chat BFF
 * Auth → plan fetch → validate → transactions → /analyze → proxy /chat SSE
 * Source: docs/features/ai-chat/sparc/Pseudocode.md Algorithm 1
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000'

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  session_id: z.string().uuid(),
})

export async function POST(request: NextRequest): Promise<Response> {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  // Validate input
  const body: unknown = await request.json().catch(() => ({}))
  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
  }
  const { message, session_id } = parsed.data

  // Fetch user plan (with expiry check)
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  const now = new Date()
  const planExpiry = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const plan = profile?.plan !== 'free' && planExpiry && planExpiry > now ? profile.plan : 'free'

  // Fetch transactions for context
  const since = new Date(now)
  since.setDate(since.getDate() - 30)

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', since.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })

  if (!transactions || transactions.length === 0) {
    return NextResponse.json(
      { error: { code: 'NO_TRANSACTIONS', message: 'Сначала загрузи выписку' } },
      { status: 422 },
    )
  }

  // Get financial context — cached in Redis by user_id+date (TTL 3600s)
  const analyzeRes = await fetch(`${AI_SERVICE_URL}/analyze/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.id, transactions }),
  }).catch(() => null)

  if (!analyzeRes?.ok) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 503 })
  }

  const analyzed = await analyzeRes.json() as {
    categories: { name: string; percent: number; total: number }[]
    parasites: { name: string; amount_per_month: number }[]
    total_spent: number
  }

  // Proxy to AI Service /chat (which handles rate limiting + history + streaming)
  const chatRes = await fetch(`${AI_SERVICE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: user.id,
      session_id,
      message,
      history: [],  // AI Service fetches history from Redis using user_id + session_id
      context: {
        total_spent: analyzed.total_spent,
        top_categories: analyzed.categories.slice(0, 5),
        parasites: analyzed.parasites.slice(0, 3),
        period: 'last_month',
      },
      plan,
    }),
  }).catch(() => null)

  if (!chatRes) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 503 })
  }

  if (chatRes.status === 429) {
    const err = await chatRes.json() as { detail: { code: string; retry_after: number } }
    return NextResponse.json({ error: err.detail }, { status: 429 })
  }

  if (!chatRes.ok || !chatRes.body) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 503 })
  }

  // Proxy SSE stream to client
  return new Response(chatRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
