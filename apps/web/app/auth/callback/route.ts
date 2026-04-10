import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

/**
 * Supabase Auth callback — exchanges code for session after email confirmation.
 * Required for email signup flow to complete.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect to home with error
  return NextResponse.redirect(`${origin}/?auth_error=1`)
}
