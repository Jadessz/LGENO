export type OutreachStatus = 'new' | 'contacted' | 'interested' | 'won' | 'lost'

export interface FilterOptions {
  requirePhone?: boolean
  minRating?: number
  minReviewCount?: number
}

export interface SearchOptions {
  category: string
  location: string
  maxPages?: number
  maxResults?: number
  requestDelayMs?: number
  budgetCapUsd?: number
  filters?: FilterOptions
}

export interface PlaceSummary {
  placeId: string
  name: string
  address: string
  phone: string | null
  email: string | null
  rating: number | null
  ratingCount: number | null
  businessStatus: string | null
  websiteUri: string | null
  googleMapsUri: string | null
  primaryType: string | null
  hasWebsite: boolean
}

export interface PipelineResult {
  totalFound: number
  leadsFound: number
  leads: PlaceSummary[]
  textSearchPages: number
  placeDetailsCalls: number
  estimatedCostUsd: number
}

export interface SearchRecord {
  id: string
  category: string
  location: string
  status: 'running' | 'completed' | 'failed'
  total_found: number
  leads_found: number
  text_search_pages: number | null
  place_details_calls: number | null
  estimated_cost_usd: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface SearchStats {
  totalCostUsd: number
  totalSearches: number
  completedSearches: number
  failedSearches: number
  runningSearches: number
  totalLeadsFound: number
  totalScanned: number
  leadsWithPhone: number
  totalLeads: number
  searches: Array<
    SearchRecord & {
      computedCostUsd: number
      conversionRate: number
      costPerLead: number | null
    }
  >
}

export interface LeadRecord {
  id: string
  place_id: string
  name: string
  address: string
  phone: string | null
  email: string | null
  rating: number | null
  rating_count: number | null
  business_status: string | null
  has_website: boolean
  outreach_status?: OutreachStatus
  notes?: string | null
  google_maps_uri?: string | null
  primary_type?: string | null
  search_id: string | null
  first_seen_at: string
  last_seen_at: string
}

export interface SavedLocation {
  id: string
  label: string
  category: string
  location: string
  is_default: boolean
  schedule_enabled: boolean
  schedule_cron: string | null
  max_pages: number
  max_results?: number
  budget_cap_usd?: number | null
  created_at: string
}

export const OUTREACH_STATUSES: OutreachStatus[] = [
  'new',
  'contacted',
  'interested',
  'won',
  'lost',
]

export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  won: 'Won',
  lost: 'Lost',
}

export const TEXT_SEARCH_COST_PER_PAGE = 0.032
export const PLACE_DETAILS_ENTERPRISE_COST = 0.02

export function estimateCost(pages: number, detailsCalls: number): number {
  return pages * TEXT_SEARCH_COST_PER_PAGE + detailsCalls * PLACE_DETAILS_ENTERPRISE_COST
}
