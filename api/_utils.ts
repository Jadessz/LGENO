import type { VercelRequest, VercelResponse } from '@vercel/node'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000

export function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key')
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  setCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}

export function json(res: VercelResponse, status: number, data: unknown) {
  setCors(res)
  res.status(status).json(data)
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unknown error'
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return req.socket?.remoteAddress ?? 'unknown'
}

export function checkRateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const ip = getClientIp(req)
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  entry.count += 1
  if (entry.count > RATE_LIMIT) {
    json(res, 429, { error: 'Too many requests. Try again in a minute.' })
    return false
  }

  return true
}

export function requireApiAuth(req: VercelRequest, res: VercelResponse): boolean {
  const apiKey = process.env.APP_API_KEY
  if (!apiKey) return true

  const header = req.headers['x-api-key']
  const auth = req.headers.authorization
  const provided =
    (typeof header === 'string' ? header : null) ??
    (typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null)

  if (provided !== apiKey) {
    json(res, 401, { error: 'Unauthorized' })
    return false
  }

  return true
}

export function requireCronAuth(req: VercelRequest, res: VercelResponse): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    json(res, 503, { error: 'CRON_SECRET is not configured' })
    return false
  }

  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${cronSecret}`) {
    json(res, 401, { error: 'Unauthorized' })
    return false
  }

  return true
}

function parseFilters(query: Record<string, string | string[] | undefined>) {
  const requirePhone = query.requirePhone === 'true'
  const minRating = query.minRating ? Number(query.minRating) : undefined
  const minReviewCount = query.minReviewCount ? Number(query.minReviewCount) : undefined

  if (!requirePhone && minRating == null && minReviewCount == null) {
    return undefined
  }

  return {
    requirePhone: requirePhone || undefined,
    minRating: minRating != null && !Number.isNaN(minRating) ? minRating : undefined,
    minReviewCount:
      minReviewCount != null && !Number.isNaN(minReviewCount) ? minReviewCount : undefined,
  }
}

export function parseSearchFiltersFromQuery(
  query: Record<string, string | string[] | undefined>,
) {
  return parseFilters(query)
}

export function parseSearchFiltersFromBody(body: Record<string, unknown>) {
  const requirePhone = Boolean(body.requirePhone)
  const minRating = body.minRating != null ? Number(body.minRating) : undefined
  const minReviewCount = body.minReviewCount != null ? Number(body.minReviewCount) : undefined

  if (!requirePhone && minRating == null && minReviewCount == null) {
    return undefined
  }

  return {
    requirePhone: requirePhone || undefined,
    minRating: minRating != null && !Number.isNaN(minRating) ? minRating : undefined,
    minReviewCount:
      minReviewCount != null && !Number.isNaN(minReviewCount) ? minReviewCount : undefined,
  }
}
