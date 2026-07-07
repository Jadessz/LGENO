import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  LeadRecord,
  OutreachStatus,
  PlaceSummary,
  SavedLocation,
  SearchRecord,
  SearchStats,
} from '../pipeline/types'
import { estimateCost } from '../pipeline/types'
import { leadsToCsv as buildCsv } from '../leads-csv'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
  }

  client = createClient(url, key)
  return client
}

export async function createSearch(category: string, location: string): Promise<SearchRecord> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('searches')
    .insert({ category, location, status: 'running' })
    .select()
    .single()

  if (error) throw error
  return data as SearchRecord
}

export async function completeSearch(
  searchId: string,
  result: {
    totalFound: number
    leadsFound: number
    textSearchPages?: number
    placeDetailsCalls?: number
    estimatedCostUsd?: number
  },
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('searches')
    .update({
      status: 'completed',
      total_found: result.totalFound,
      leads_found: result.leadsFound,
      text_search_pages: result.textSearchPages ?? null,
      place_details_calls: result.placeDetailsCalls ?? null,
      estimated_cost_usd: result.estimatedCostUsd ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', searchId)

  if (error) throw error
}

export async function failSearch(searchId: string, message: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('searches')
    .update({
      status: 'failed',
      error_message: message,
      completed_at: new Date().toISOString(),
    })
    .eq('id', searchId)

  if (error) throw error
}

export async function upsertLeads(searchId: string, leads: PlaceSummary[]): Promise<void> {
  if (leads.length === 0) return

  const supabase = getSupabase()
  const rows = leads.map((lead) => ({
    place_id: lead.placeId,
    name: lead.name,
    address: lead.address,
    phone: lead.phone,
    rating: lead.rating,
    rating_count: lead.ratingCount,
    business_status: lead.businessStatus,
    has_website: lead.hasWebsite,
    google_maps_uri: lead.googleMapsUri,
    primary_type: lead.primaryType,
    search_id: searchId,
    last_seen_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('leads').upsert(rows, {
    onConflict: 'place_id',
    ignoreDuplicates: false,
  })

  if (error) throw error
}

export async function updateLead(
  leadId: string,
  updates: { outreach_status?: OutreachStatus; notes?: string | null },
): Promise<LeadRecord> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)
    .select()
    .single()

  if (error) throw error
  return data as LeadRecord
}

export async function listLeads(searchId?: string): Promise<LeadRecord[]> {
  const supabase = getSupabase()
  let query = supabase
    .from('leads')
    .select('*')
    .eq('has_website', false)
    .order('last_seen_at', { ascending: false })

  if (searchId) {
    query = query.eq('search_id', searchId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as LeadRecord[]
}

export async function listSearches(limit = 20): Promise<SearchRecord[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as SearchRecord[]
}

export function searchCostUsd(search: SearchRecord): number {
  if (search.estimated_cost_usd != null) {
    return Number(search.estimated_cost_usd)
  }
  if (search.status !== 'completed' || search.total_found === 0) {
    return 0
  }
  const pages = Math.max(1, Math.ceil(search.total_found / 20))
  return estimateCost(pages, search.total_found)
}

export async function getSearchStats(): Promise<SearchStats> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('searches')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  const allLeads = await listLeads()
  const leadsWithPhone = allLeads.filter((l) => l.phone).length

  const searches = (data ?? []) as SearchRecord[]
  let totalCostUsd = 0
  let totalLeadsFound = 0
  let totalScanned = 0
  let completedSearches = 0
  let failedSearches = 0
  let runningSearches = 0

  const withCost = searches.map((search) => {
    const computedCostUsd = searchCostUsd(search)
    const conversionRate =
      search.total_found > 0 ? search.leads_found / search.total_found : 0
    const costPerLead =
      search.leads_found > 0 ? computedCostUsd / search.leads_found : null

    if (search.status === 'completed') {
      completedSearches += 1
      totalCostUsd += computedCostUsd
      totalLeadsFound += search.leads_found
      totalScanned += search.total_found
    } else if (search.status === 'failed') {
      failedSearches += 1
    } else if (search.status === 'running') {
      runningSearches += 1
    }

    return { ...search, computedCostUsd, conversionRate, costPerLead }
  })

  return {
    totalCostUsd,
    totalSearches: searches.length,
    completedSearches,
    failedSearches,
    runningSearches,
    totalLeadsFound,
    totalScanned,
    leadsWithPhone,
    totalLeads: allLeads.length,
    searches: withCost,
  }
}

export async function listSavedLocations(): Promise<SavedLocation[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as SavedLocation[]
}

export async function createSavedLocation(input: {
  label: string
  category: string
  location: string
  is_default?: boolean
  schedule_enabled?: boolean
  schedule_cron?: string | null
  max_pages?: number
  max_results?: number
  budget_cap_usd?: number | null
}): Promise<SavedLocation> {
  const supabase = getSupabase()

  if (input.is_default) {
    await supabase.from('saved_locations').update({ is_default: false }).eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('saved_locations')
    .insert({
      label: input.label,
      category: input.category,
      location: input.location,
      is_default: input.is_default ?? false,
      schedule_enabled: input.schedule_enabled ?? false,
      schedule_cron: input.schedule_cron ?? null,
      max_pages: input.max_pages ?? 3,
      max_results: input.max_results ?? 60,
      budget_cap_usd: input.budget_cap_usd ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as SavedLocation
}

export async function updateSavedLocation(
  id: string,
  input: Partial<{
    label: string
    category: string
    location: string
    is_default: boolean
    schedule_enabled: boolean
    schedule_cron: string | null
    max_pages: number
    max_results: number
    budget_cap_usd: number | null
  }>,
): Promise<SavedLocation> {
  const supabase = getSupabase()

  if (input.is_default) {
    await supabase.from('saved_locations').update({ is_default: false }).eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('saved_locations')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as SavedLocation
}

export async function deleteSavedLocation(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('saved_locations').delete().eq('id', id)
  if (error) throw error
}

export async function listScheduledLocations(): Promise<SavedLocation[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('saved_locations')
    .select('*')
    .eq('schedule_enabled', true)

  if (error) throw error
  return (data ?? []) as SavedLocation[]
}

export function leadsToCsv(leads: LeadRecord[]): string {
  return buildCsv(leads)
}
