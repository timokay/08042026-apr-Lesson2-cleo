import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'
import { createServiceClient } from '../../../../lib/supabase/service'
import {
  buildPaymentUrl,
  generateInvoiceId,
  PLUS_PRICE,
  PLUS_DURATION_DAYS,
} from '../../../../lib/robokassa'

/**
 * POST /api/payments/create-invoice
 * Creates a Robokassa payment invoice for Plus plan upgrade.
 * Source: docs/features/upgrade-plus/sparc/Pseudocode.md Algorithm 1
 */
export async function POST(_request: NextRequest): Promise<NextResponse> {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  // Check if already on active Plus plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  if (profile?.plan !== 'free') {
    const expiresAt = profile?.plan_expires_at
    if (expiresAt && new Date(expiresAt) > new Date()) {
      return NextResponse.json(
        {
          error: { code: 'ALREADY_SUBSCRIBED', message: 'У тебя уже активная подписка' },
          expires_at: expiresAt,
        },
        { status: 409 },
      )
    }
  }

  const invoiceId = generateInvoiceId()
  const amount = PLUS_PRICE

  // Create pending transaction (service role — user not yet "upgraded")
  const serviceSupabase = createServiceClient()
  const { error: insertError } = await serviceSupabase
    .from('payment_transactions')
    .insert({
      user_id: user.id,
      invoice_id: invoiceId,
      amount,
      status: 'pending',
    })

  if (insertError) {
    console.error('Failed to create payment transaction:', insertError)
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
  }

  const paymentUrl = buildPaymentUrl(invoiceId, amount, user.id)

  return NextResponse.json({
    invoice_id: invoiceId,
    payment_url: paymentUrl,
    amount,
    duration_days: PLUS_DURATION_DAYS,
  })
}
