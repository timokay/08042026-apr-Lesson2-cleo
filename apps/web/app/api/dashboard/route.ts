import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { DashboardQuerySchema } from '../../../lib/zod/schemas'
import type { DashboardResponseBody } from '@klevo/types/api'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const query = DashboardQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  if (!query.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
  }

  const { period } = query.data
  const now = new Date()
  const daysBack = period === '3months' ? 90 : period === '6months' ? 180 : 30
  const since = new Date(now)
  since.setDate(since.getDate() - daysBack)

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', since.toISOString().split('T')[0])
    .order('transaction_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
  }

  if (!transactions || transactions.length === 0) {
    return NextResponse.json(
      { error: { code: 'NO_DATA', message: 'Загрузи выписку для начала' } },
      { status: 404 },
    )
  }

  // Check has_roast_this_month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const { data: recentRoast } = await supabase
    .from('roasts')
    .select('id')
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString())
    .limit(1)
    .single()

  // Get user plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const totalSpent = (transactions as Array<{ amount: number }>)
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const subscriptions = (transactions as Array<{ is_subscription: boolean }>)
    .filter(t => t.is_subscription)

  const response: DashboardResponseBody = {
    categories: [],  // computed client-side or via /analyze
    transactions: transactions as DashboardResponseBody['transactions'],
    total_spent: Math.round(totalSpent * 100) / 100,
    period: {
      start: since.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    parasites_count: subscriptions.length,
    has_roast_this_month: !!recentRoast,
    user_plan: (profile?.plan as 'free' | 'plus' | 'pro') ?? 'free',
  }

  return NextResponse.json(response)
}
