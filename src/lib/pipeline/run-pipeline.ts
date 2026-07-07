import { filterLeads } from './filter-leads'
import { fetchPlaceDetails } from './place-details'
import { placesFetch, sleep } from './places-client'
import { searchPlaceIds } from './text-search'
import {
  estimateCost,
  type PipelineResult,
  type SearchOptions,
} from './types'

const DEFAULT_MAX_PAGES = 3
const DEFAULT_MAX_RESULTS = 60
const DEFAULT_DELAY_MS = 150

export async function runPipeline(options: SearchOptions): Promise<PipelineResult> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS
  const requestDelayMs = options.requestDelayMs ?? DEFAULT_DELAY_MS
  const textQuery = `${options.category} in ${options.location}`

  const estimatedPages = maxPages
  const estimatedDetails = maxResults
  const estimatedCost = estimateCost(estimatedPages, estimatedDetails)

  if (options.budgetCapUsd && estimatedCost > options.budgetCapUsd) {
    throw new Error(
      `Estimated cost $${estimatedCost.toFixed(2)} exceeds budget cap $${options.budgetCapUsd.toFixed(2)}`,
    )
  }

  const { placeIds, pages } = await searchPlaceIds(textQuery, maxPages)
  const limitedIds = placeIds.slice(0, maxResults)

  const places = []
  for (const placeId of limitedIds) {
    const details = await fetchPlaceDetails(placeId)
    places.push(details)
    if (requestDelayMs > 0) {
      await sleep(requestDelayMs)
    }
  }

  const leads = filterLeads(places, options.filters)

  return {
    totalFound: places.length,
    leadsFound: leads.length,
    leads,
    textSearchPages: pages,
    placeDetailsCalls: limitedIds.length,
    estimatedCostUsd: estimateCost(pages, limitedIds.length),
  }
}

// Re-export for places-client usage in tests
export { placesFetch }
