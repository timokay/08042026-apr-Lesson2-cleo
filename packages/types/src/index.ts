// ============================================================
// Shared TypeScript types for Клёво
// Source: docs/Pseudocode.md, docs/Specification.md
// ============================================================

// ------ Transaction ------

export type TransactionCategory =
  | 'food_delivery'
  | 'restaurants'
  | 'subscriptions'
  | 'transport'
  | 'groceries'
  | 'shopping'
  | 'utilities'
  | 'entertainment'
  | 'savings'
  | 'other'

export type TransactionSource = 'csv' | 'manual' | 'bank_api' | 'sms'

export type Transaction = {
  id: string
  user_id: string
  amount: number        // always negative for expenses
  currency: 'RUB'
  category: TransactionCategory
  description: string
  merchant: string
  transaction_date: string  // ISO date string
  source: TransactionSource
  is_subscription: boolean
  created_at: string
}

// ------ Category Summary ------

export type CategorySummary = {
  category: TransactionCategory
  total: number         // total RUB spent
  percent: number       // % of all spending
  count: number         // number of transactions
  transactions: Transaction[]
}

// ------ Subscription (Parasite) ------

export type SubscriptionConfidence = 'high' | 'medium' | 'low'

export type Subscription = {
  name: string
  amount_per_month: number
  last_charge_date: string
  confidence: SubscriptionConfidence
  is_active: boolean    // false if last charge > 30 days ago
  transaction_ids: string[]
}

// ------ Roast ------

export type Roast = {
  id: string
  user_id: string
  content: string       // full roast text
  summary: string       // short quote for sharing (max 280 chars)
  period_start: string
  period_end: string
  share_token: string
  is_public: boolean
  created_at: string
}

export type RoastContext = {
  user_id: string
  period: 'last_month' | 'last_3_months' | 'all'
  categories: CategorySummary[]
  parasites: Subscription[]
  total_spent: number
}

// ------ User Profile ------

export type PlanTier = 'free' | 'plus' | 'pro'

export type UserProfile = {
  id: string
  display_name: string | null
  plan: PlanTier
  plan_expires_at: string | null
  created_at: string
}

// ------ Dashboard ------

export type DashboardData = {
  categories: CategorySummary[]
  total_spent: number
  period: { start: string; end: string }
  parasites_count: number
  has_roast_this_month: boolean
  user_plan: PlanTier
}

// ------ Upload Result ------

export type UploadResult = {
  transactions_count: number
  period: { start: string; end: string }
  categories: CategorySummary[]
  parasites: Subscription[]
}

// ------ API Errors ------

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PARSE_ERROR'
  | 'FILE_TOO_LARGE'
  | 'RATE_LIMIT'
  | 'INSUFFICIENT_DATA'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'NO_DATA'

export type ApiError = {
  code: ApiErrorCode
  message: string
  retry_after?: number  // seconds, for RATE_LIMIT
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError }
