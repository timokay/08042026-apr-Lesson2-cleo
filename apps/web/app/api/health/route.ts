import { NextResponse } from 'next/server'
import type { HealthResponseBody } from '@klevo/types/api'

export async function GET(): Promise<NextResponse> {
  const response: HealthResponseBody = {
    status: 'ok',
    version: '0.1.0',
  }
  return NextResponse.json(response)
}
