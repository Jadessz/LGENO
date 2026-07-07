import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  completeSearch,
  createSearch,
  failSearch,
  listScheduledLocations,
  upsertLeads,
} from '../../src/lib/db/supabase'
import { runPipeline } from '../../src/lib/pipeline/run-pipeline'
import { getErrorMessage, json, requireCronAuth } from '../_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  if (!requireCronAuth(req, res)) return

  try {
    const locations = await listScheduledLocations()
    const results = []

    for (const saved of locations) {
      let searchId: string | null = null
      try {
        const search = await createSearch(saved.category, saved.location)
        searchId = search.id

        const result = await runPipeline({
          category: saved.category,
          location: saved.location,
          maxPages: saved.max_pages,
          maxResults: saved.max_results ?? 60,
          budgetCapUsd: saved.budget_cap_usd ?? undefined,
        })

        await upsertLeads(search.id, result.leads)
        await completeSearch(search.id, {
          totalFound: result.totalFound,
          leadsFound: result.leadsFound,
          textSearchPages: result.textSearchPages,
          placeDetailsCalls: result.placeDetailsCalls,
          estimatedCostUsd: result.estimatedCostUsd,
        })

        results.push({
          label: saved.label,
          searchId: search.id,
          leadsFound: result.leadsFound,
          status: 'completed',
        })
      } catch (error) {
        if (searchId) {
          await failSearch(searchId, getErrorMessage(error)).catch(() => undefined)
        }
        results.push({
          label: saved.label,
          status: 'failed',
          error: getErrorMessage(error),
        })
      }
    }

    return json(res, 200, { ran: results.length, results })
  } catch (error) {
    return json(res, 500, { error: getErrorMessage(error) })
  }
}
