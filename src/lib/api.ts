const API_BASE = '/api'
const API_KEY = import.meta.env.VITE_APP_API_KEY as string | undefined

function authHeaders(): Record<string, string> {
  if (!API_KEY) return {}
  return { 'X-Api-Key': API_KEY }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(body.error ?? 'Request failed')
  }

  if (response.headers.get('content-type')?.includes('text/csv')) {
    return response.text() as Promise<T>
  }

  return response.json() as Promise<T>
}

export interface SearchEstimate {
  estimatedCostUsd: number
  maxPages: number
  maxResults: number
  textQuery: string
}

export interface SearchFilters {
  requirePhone?: boolean
  minRating?: number
  minReviewCount?: number
}

export interface SearchResponse {
  searchId: string
  totalFound: number
  leadsFound: number
  textSearchPages: number
  placeDetailsCalls: number
  estimatedCostUsd: number
}

export const api = {
  estimateSearch(params: {
    category: string
    location: string
    maxPages?: number
    maxResults?: number
    budgetCapUsd?: number
    requirePhone?: boolean
    minRating?: number
    minReviewCount?: number
  }) {
    const query = new URLSearchParams({
      category: params.category,
      location: params.location,
      maxPages: String(params.maxPages ?? 3),
      maxResults: String(params.maxResults ?? 60),
    })
    if (params.budgetCapUsd) query.set('budgetCapUsd', String(params.budgetCapUsd))
    if (params.requirePhone) query.set('requirePhone', 'true')
    if (params.minRating != null) query.set('minRating', String(params.minRating))
    if (params.minReviewCount != null) query.set('minReviewCount', String(params.minReviewCount))
    return request<SearchEstimate>(`/search?${query}`)
  },

  runSearch(body: {
    category: string
    location: string
    maxPages?: number
    maxResults?: number
    budgetCapUsd?: number
    requirePhone?: boolean
    minRating?: number
    minReviewCount?: number
  }) {
    return request<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  getLeads(searchId?: string) {
    const query = searchId ? `?searchId=${searchId}` : ''
    return request<{ leads: import('@/lib/pipeline/types').LeadRecord[] }>(`/leads${query}`)
  },

  updateLead(id: string, updates: { outreach_status?: string; notes?: string | null }) {
    return request<{ lead: import('@/lib/pipeline/types').LeadRecord }>('/leads', {
      method: 'PATCH',
      body: JSON.stringify({ id, ...updates }),
    })
  },

  exportCsv(searchId?: string, filename?: string) {
    const params = new URLSearchParams({ format: 'csv' })
    if (searchId) params.set('searchId', searchId)
    return request<string>(`/leads?${params}`).then((csv) => {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename ?? `leads-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    })
  },

  exportLeadsClient(leads: import('@/lib/pipeline/types').LeadRecord[], filename: string) {
    import('@/lib/leads-csv').then(({ leadsToCsv }) => {
      const csv = leadsToCsv(leads)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    })
  },

  getSearches(limit = 50) {
    return request<{ searches: import('@/lib/pipeline/types').SearchRecord[] }>(
      `/searches?limit=${limit}`,
    )
  },

  getStats() {
    return request<import('@/lib/pipeline/types').SearchStats>('/stats')
  },

  getLocationSuggestions(input: string) {
    return request<{ suggestions: string[] }>(
      `/autocomplete?input=${encodeURIComponent(input)}`,
    )
  },

  getSavedLocations() {
    return request<{ locations: import('@/lib/pipeline/types').SavedLocation[] }>(
      '/saved-locations',
    )
  },

  createSavedLocation(body: {
    label: string
    category: string
    location: string
    is_default?: boolean
    schedule_enabled?: boolean
    schedule_cron?: string | null
    max_pages?: number
    max_results?: number
    budget_cap_usd?: number | null
  }) {
    return request<{ location: import('@/lib/pipeline/types').SavedLocation }>(
      '/saved-locations',
      { method: 'POST', body: JSON.stringify(body) },
    )
  },

  updateSavedLocation(
    id: string,
    body: Partial<{
      label: string
      is_default: boolean
      schedule_enabled: boolean
      schedule_cron: string | null
    }>,
  ) {
    return request<{ location: import('@/lib/pipeline/types').SavedLocation }>(
      '/saved-locations',
      { method: 'PATCH', body: JSON.stringify({ id, ...body }) },
    )
  },

  deleteSavedLocation(id: string) {
    return request<{ ok: boolean }>(`/saved-locations?id=${id}`, { method: 'DELETE' })
  },
}
