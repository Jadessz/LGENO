import type { LeadRecord } from './pipeline/types'

export function leadsToCsv(leads: LeadRecord[]): string {
  const headers = [
    'name',
    'address',
    'phone',
    'type',
    'google_maps_uri',
    'outreach_status',
    'notes',
    'rating',
    'rating_count',
    'business_status',
    'place_id',
    'first_seen_at',
    'last_seen_at',
  ]

  const escape = (value: string | number | null | undefined) => {
    const str = value == null ? '' : String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = leads.map((lead) =>
    [
      lead.name,
      lead.address,
      lead.phone,
      lead.primary_type,
      lead.google_maps_uri,
      lead.outreach_status,
      lead.notes,
      lead.rating,
      lead.rating_count,
      lead.business_status,
      lead.place_id,
      lead.first_seen_at,
      lead.last_seen_at,
    ]
      .map(escape)
      .join(','),
  )

  const bom = '\uFEFF'
  return bom + [headers.join(','), ...rows].join('\n')
}
