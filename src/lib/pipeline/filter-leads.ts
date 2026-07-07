import type { FilterOptions, PlaceSummary } from './types'

export function isLeadCandidate(place: PlaceSummary, filters?: FilterOptions): boolean {
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') {
    return false
  }
  if (!place.hasWebsite) {
    // no website — continue checks
  } else {
    return false
  }

  if (filters?.requirePhone && !place.phone) {
    return false
  }
  if (filters?.minRating != null && (place.rating == null || place.rating < filters.minRating)) {
    return false
  }
  if (
    filters?.minReviewCount != null &&
    (place.ratingCount == null || place.ratingCount < filters.minReviewCount)
  ) {
    return false
  }

  return true
}

export function filterLeads(places: PlaceSummary[], filters?: FilterOptions): PlaceSummary[] {
  return places.filter((place) => isLeadCandidate(place, filters))
}
