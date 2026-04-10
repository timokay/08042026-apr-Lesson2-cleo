import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { UploadQuerySchema } from '../../../lib/zod/schemas'
import type { UploadResponseBody } from '@klevo/types/api'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://ai-service:8000'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: { code: 'PARSE_ERROR', message: 'Не смогли прочитать файл' } },
      { status: 400 },
    )
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json(
      { error: { code: 'PARSE_ERROR', message: 'Файл не найден' } },
      { status: 400 },
    )
  }

  // File size check
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: { code: 'FILE_TOO_LARGE', message: 'Максимум 10 МБ' } },
      { status: 413 },
    )
  }

  // Validate query params
  const query = UploadQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  if (!query.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
  }

  // Forward to AI service for parsing + categorization
  const aiForm = new FormData()
  aiForm.append('file', file)
  aiForm.append('user_id', user.id)
  aiForm.append('bank', query.data.bank)

  let aiData: { transactions: unknown[]; categories: unknown[]; parasites: unknown[]; period: { start: string; end: string }; total_spent: number }

  try {
    const aiRes = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: 'POST',
      body: aiForm,
    })

    if (!aiRes.ok) {
      const err = await aiRes.json() as { detail?: { message?: string } }
      return NextResponse.json(
        { error: { code: 'PARSE_ERROR', message: err.detail?.message ?? 'Ошибка парсинга' } },
        { status: aiRes.status >= 400 && aiRes.status < 500 ? 400 : 500 },
      )
    }

    aiData = await aiRes.json() as typeof aiData
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'AI сервис недоступен' } },
      { status: 503 },
    )
  }

  // Persist transactions to Supabase (raw CSV never stored — security rule)
  if (aiData.transactions.length > 0) {
    const { error: dbError } = await supabase
      .from('transactions')
      .insert(aiData.transactions)

    if (dbError) {
      console.error('DB insert error:', dbError)
    }
  }

  const response: UploadResponseBody = {
    transactions_count: aiData.transactions.length,
    period: aiData.period,
    categories: aiData.categories as UploadResponseBody['categories'],
    parasites: aiData.parasites as UploadResponseBody['parasites'],
  }

  return NextResponse.json(response)
}
