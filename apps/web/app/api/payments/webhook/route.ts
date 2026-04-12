import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '../../../../lib/supabase/service'
import { verifyWebhookSignature, PLUS_DURATION_DAYS } from '../../../../lib/robokassa'

/**
 * POST /api/payments/webhook (Robokassa ResultURL)
 * Receives payment confirmation from Robokassa.
 * NO JWT auth — security via MD5 signature verification.
 * Source: docs/features/upgrade-plus/sparc/Pseudocode.md Algorithm 2
 *
 * CRITICAL: Must return "OK{InvoiceId}" on success (Robokassa requirement).
 * Any other response → Robokassa retries.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let body: URLSearchParams

  try {
    const text = await request.text()
    body = new URLSearchParams(text)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const outSum = body.get('OutSum') ?? ''
  const invoiceId = body.get('InvoiceId') ?? ''
  const signature = body.get('SignatureValue') ?? ''
  const userId = body.get('shp_user_id') ?? ''

  // Validate all required params present
  if (!outSum || !invoiceId || !signature || !userId) {
    console.warn('Robokassa webhook: missing required params', { outSum, invoiceId, userId })
    return new Response('Bad Request: missing params', { status: 400 })
  }

  // CRITICAL: Verify MD5 signature BEFORE any DB changes
  if (!verifyWebhookSignature(outSum, invoiceId, signature, userId)) {
    console.warn('Robokassa webhook: invalid signature for invoice', invoiceId)
    return new Response('Bad Request: invalid signature', { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch pending transaction (idempotency + validation)
  const { data: txn } = await supabase
    .from('payment_transactions')
    .select('id, status, user_id, amount')
    .eq('invoice_id', invoiceId)
    .single()

  if (!txn) {
    console.warn('Robokassa webhook: invoice not found', invoiceId)
    return new Response('Bad Request: invoice not found', { status: 400 })
  }

  // Idempotency: already processed
  if (txn.status === 'paid') {
    console.info('Robokassa webhook: duplicate for invoice %s, ignoring', invoiceId)
    return new Response(`OK${invoiceId}`, { status: 200 })
  }

  // Validate user_id matches (prevent IDOR)
  if (txn.user_id !== userId) {
    console.warn('Robokassa webhook: user_id mismatch for invoice', invoiceId)
    return new Response('Bad Request: user mismatch', { status: 400 })
  }

  // Validate amount matches expected (prevent price tampering)
  const receivedAmount = parseFloat(outSum)
  if (Math.abs(receivedAmount - Number(txn.amount)) > 0.01) {
    console.warn('Robokassa webhook: amount mismatch for invoice', invoiceId, { expected: txn.amount, received: outSum })
    return new Response('Bad Request: amount mismatch', { status: 400 })
  }

  // Update transaction to 'paid' with race condition guard (.eq status='pending')
  const { count } = await supabase
    .from('payment_transactions')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      raw_robokassa_response: outSum,
    })
    .eq('invoice_id', invoiceId)
    .eq('status', 'pending')  // Race condition guard: only update if still pending

  if (count === 0) {
    // Another concurrent request already processed it
    return new Response(`OK${invoiceId}`, { status: 200 })
  }

  // Upgrade user plan
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + PLUS_DURATION_DAYS)

  const { error: upgradeError } = await supabase
    .from('profiles')
    .update({
      plan: 'plus',
      plan_expires_at: expiresAt.toISOString(),
    })
    .eq('id', userId)

  if (upgradeError) {
    console.error('Failed to upgrade user plan:', upgradeError, { userId, invoiceId })
    // Don't return error — Robokassa would retry. Transaction is paid, log for manual fix.
    // TODO: add alerting here
  }

  console.info('User %s upgraded to Plus, expires %s', userId, expiresAt.toISOString())

  // Robokassa requires exactly this response format
  return new Response(`OK${invoiceId}`, { status: 200 })
}
