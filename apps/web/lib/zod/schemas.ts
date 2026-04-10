import { z } from 'zod'

/**
 * Zod validation schemas for all API route inputs.
 * Source: docs/Specification.md API Contracts
 * Rule: validate ALL inputs at API boundaries before processing.
 */

export const UploadQuerySchema = z.object({
  bank: z.enum(['tbank', 'sber', 'alfa', 'auto']).optional().default('auto'),
})

export const RoastRequestSchema = z.object({
  period: z.enum(['last_month', 'last_3_months', 'all']).optional().default('last_month'),
})

export const DashboardQuerySchema = z.object({
  period: z.enum(['1month', '3months', '6months']).optional().default('1month'),
})

export const ShareTokenSchema = z.object({
  token: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
})
