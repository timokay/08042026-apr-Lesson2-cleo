// API request/response types
// Source: docs/Pseudocode.md API Contracts, docs/Specification.md

import type { CategorySummary, Subscription, Transaction } from './index'

// ------ POST /api/upload ------

export type UploadRequestBody = {
  bank?: 'tbank' | 'sber' | 'alfa' | 'auto'
}

export type UploadResponseBody = {
  transactions_count: number
  period: { start: string; end: string }
  categories: CategorySummary[]
  parasites: Subscription[]
}

// ------ GET /api/dashboard ------

export type DashboardQuery = {
  period?: '1month' | '3months' | '6months'
}

export type DashboardResponseBody = {
  categories: CategorySummary[]
  transactions: Transaction[]
  total_spent: number
  period: { start: string; end: string }
  parasites_count: number
  has_roast_this_month: boolean
  user_plan: 'free' | 'plus' | 'pro'
}

// ------ POST /api/roast (SSE) ------

export type RoastRequestBody = {
  period?: 'last_month' | 'last_3_months' | 'all'
}

// SSE events streamed to client
export type RoastTokenEvent = {
  text: string
}

export type RoastDoneEvent = {
  roast_id: string
  share_token: string
  summary: string
}

// ------ POST /ai-service/analyze ------

export type AnalyzeRequestBody = {
  user_id: string
  bank?: 'tbank' | 'sber' | 'alfa' | 'auto'
}

export type AnalyzeResponseBody = {
  transactions: Transaction[]
  categories: CategorySummary[]
  parasites: Subscription[]
  period: { start: string; end: string }
  total_spent: number
}

// ------ POST /ai-service/roast ------

export type AiRoastRequestBody = {
  user_id: string
  period: 'last_month' | 'last_3_months' | 'all'
  categories: CategorySummary[]
  parasites: Subscription[]
  total_spent: number
}

// ------ Health check ------

export type HealthResponseBody = {
  status: 'ok' | 'degraded'
  version: string
  llm?: 'connected' | 'fallback' | 'unavailable'
}
