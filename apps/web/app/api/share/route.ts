import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const ShareRequestSchema = z.object({
  roast_id: z.string().uuid(),
})

/**
 * POST /api/share
 * Make a roast public and return its share URL.
 * Generates a short URL-safe token and sets is_public = true.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const body: unknown = await request.json().catch(() => ({}))
  const parsed = ShareRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
  }

  const { roast_id } = parsed.data

  // Verify ownership
  const { data: roast } = await supabase
    .from('roasts')
    .select('id, share_token, user_id')
    .eq('id', roast_id)
    .eq('user_id', user.id)
    .single()

  if (!roast) {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  // Reuse existing token or generate new one
  const token = (roast.share_token as string | null) ?? randomBytes(8).toString('base64url')

  const { error } = await supabase
    .from('roasts')
    .update({ is_public: true, share_token: token })
    .eq('id', roast_id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({ share_url: `${appUrl}/share/${token}`, token })
}
