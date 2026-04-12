/**
 * Robokassa signature utilities
 * Source: docs/features/upgrade-plus/sparc/Pseudocode.md
 * Docs: https://docs.robokassa.ru/
 */
import { createHash } from 'crypto'

const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN ?? ''
const PASSWORD1 = process.env.ROBOKASSA_PASSWORD1 ?? ''
const PASSWORD2 = process.env.ROBOKASSA_PASSWORD2 ?? ''
const TEST_MODE = process.env.ROBOKASSA_TEST_MODE === 'true'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export interface RobokassaInvoice {
  invoiceId: string
  paymentUrl: string
  amount: number
}

/**
 * Build Robokassa payment URL with MD5 signature.
 * shp_user_id is a custom parameter (shp_ prefix) — Robokassa returns it in webhook.
 */
export function buildPaymentUrl(invoiceId: string, amount: number, userId: string): string {
  const outSum = amount.toFixed(2)

  // Signature: MD5(MerchantLogin:OutSum:InvoiceId:Password1:shp_user_id=userId)
  const signatureStr = `${MERCHANT_LOGIN}:${outSum}:${invoiceId}:${PASSWORD1}:shp_user_id=${userId}`
  const signature = createHash('md5').update(signatureStr).digest('hex')

  const params = new URLSearchParams({
    MerchantLogin: MERCHANT_LOGIN,
    OutSum: outSum,
    InvoiceId: invoiceId,
    Description: 'Клёво Plus — 1 месяц',
    SignatureValue: signature,
    Encoding: 'utf-8',
    Culture: 'ru',
    IsTest: TEST_MODE ? '1' : '0',
    SuccessURL: `${APP_URL}/upgrade?success=1`,
    FailURL: `${APP_URL}/upgrade?failed=1`,
    ResultURL: `${APP_URL}/api/payments/webhook`,
    shp_user_id: userId,
  })

  return `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
}

/**
 * Verify Robokassa webhook signature (ResultURL).
 * Uses Password2 (different from Password1).
 * Signature: MD5(OutSum:InvoiceId:Password2:shp_user_id=userId)
 */
export function verifyWebhookSignature(
  outSum: string,
  invoiceId: string,
  signature: string,
  userId: string,
): boolean {
  if (!PASSWORD2) {
    console.error('ROBOKASSA_PASSWORD2 not configured')
    return false
  }
  const signatureStr = `${outSum}:${invoiceId}:${PASSWORD2}:shp_user_id=${userId}`
  const expected = createHash('md5').update(signatureStr).digest('hex')
  return signature.toLowerCase() === expected.toLowerCase()
}

/**
 * Generate a unique invoice ID.
 * Format: KLV-{timestamp}-{random4}
 */
export function generateInvoiceId(): string {
  const ts = Date.now()
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `KLV-${ts}-${rand}`
}

export const PLUS_PRICE = parseFloat(process.env.PLUS_PRICE_RUB ?? '299.00')
export const PLUS_DURATION_DAYS = parseInt(process.env.PLUS_DURATION_DAYS ?? '30', 10)
