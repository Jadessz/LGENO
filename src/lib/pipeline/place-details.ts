import { placesFetch } from './places-client'
import type { PlaceSummary } from './types'

const DETAILS_FIELD_MASK =
  'displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,rating,userRatingCount,websiteUri,businessStatus,googleMapsUri,primaryType'

interface PlaceDetailsResponse {
  displayName?: { text?: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  rating?: number
  userRatingCount?: number
  websiteUri?: string
  businessStatus?: string
  googleMapsUri?: string
  primaryType?: string
}

export function formatPrimaryType(type: string | null | undefined): string | null {
  if (!type) return null
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function mapPlaceDetails(placeId: string, data: PlaceDetailsResponse): PlaceSummary {
  const websiteUri = data.websiteUri?.trim() || null
  return {
    placeId,
    name: data.displayName?.text ?? 'Unknown',
    address: data.formattedAddress ?? '',
    phone: data.nationalPhoneNumber ?? data.internationalPhoneNumber ?? null,
    email: null,
    rating: data.rating ?? null,
    ratingCount: data.userRatingCount ?? null,
    businessStatus: data.businessStatus ?? null,
    websiteUri,
    googleMapsUri: data.googleMapsUri ?? null,
    primaryType: formatPrimaryType(data.primaryType),
    hasWebsite: Boolean(websiteUri),
  }
}

export async function fetchPlaceDetails(placeId: string): Promise<PlaceSummary> {
  const data = await placesFetch<PlaceDetailsResponse>(`/places/${placeId}`, {
    fieldMask: DETAILS_FIELD_MASK,
  })
  return mapPlaceDetails(placeId, data)
}
