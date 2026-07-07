import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  completeSearch,
  createSearch,
  failSearch,
  upsertLeads,
} from '../src/lib/db/supabase'
import { runPipeline } from '../src/lib/pipeline/run-pipeline'
import { estimateCost } from '../src/lib/pipeline/types'
import {
  checkRateLimit,
  getErrorMessage,
  handleOptions,
  json,
  parseSearchFiltersFromBody,
  parseSearchFiltersFromQuery,
  requireApiAuth,
} from './_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (!checkRateLimit(req, res)) return

  if (req.method === 'GET') {
    const category = String(req.query.category ?? '')
    const location = String(req.query.location ?? '')
    const maxPages = Number(req.query.maxPages ?? 3)
    const maxResults = Number(req.query.maxResults ?? 60)
    const budgetCapUsd = req.query.budgetCapUsd ? Number(req.query.budgetCapUsd) : undefined

    if (!category || !location) {
      return json(res, 400, { error: 'category and location are required' })
    }

    const estimatedCostUsd = estimateCost(maxPages, maxResults)
    return json(res, 200, {
      estimatedCostUsd,
      maxPages,
      maxResults,
      textQuery: `${category} in ${location}`,
      filters: parseSearchFiltersFromQuery(req.query),
    })
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!requireApiAuth(req, res)) return

  const body = req.body ?? {}
  const category = String(body.category ?? '').trim()
  const location = String(body.location ?? '').trim()
  const maxPages = Number(body.maxPages ?? 3)
  const maxResults = Number(body.maxResults ?? 60)
  const budgetCapUsd = body.budgetCapUsd ? Number(body.budgetCapUsd) : undefined
  const filters = parseSearchFiltersFromBody(body)

  if (!category || !location) {
    return json(res, 400, { error: 'category and location are required' })
  }

  let searchId: string | null = null

  try {
    const search = await createSearch(category, location)
    searchId = search.id

    const result = await runPipeline({
      category,
      location,
      maxPages,
      maxResults,
      budgetCapUsd,
      filters,
    })

    await upsertLeads(search.id, result.leads)
    await completeSearch(search.id, {
      totalFound: result.totalFound,
      leadsFound: result.leadsFound,
      textSearchPages: result.textSearchPages,
      placeDetailsCalls: result.placeDetailsCalls,
      estimatedCostUsd: result.estimatedCostUsd,
    })

    return json(res, 200, {
      searchId: search.id,
      ...result,
    })
  } catch (error) {
    if (searchId) {
      await failSearch(searchId, getErrorMessage(error)).catch(() => undefined)
    }
    return json(res, 500, { error: getErrorMessage(error) })
  }
}
