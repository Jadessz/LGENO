import { placesFetch } from './places-client'

interface TextSearchResponse {
  places?: Array<{ id: string }>
  nextPageToken?: string
}

export async function searchPlaceIds(
  textQuery: string,
  maxPages: number,
): Promise<{ placeIds: string[]; pages: number }> {
  const placeIds: string[] = []
  let pageToken: string | undefined
  let pages = 0

  while (pages < maxPages) {
    const body: Record<string, unknown> = {
      textQuery,
      pageSize: 20,
    }
    if (pageToken) {
      body.pageToken = pageToken
    }

    const response = await placesFetch<TextSearchResponse>('/places:searchText', {
      method: 'POST',
      fieldMask: 'places.id,nextPageToken',
      body,
    })

    pages += 1

    for (const place of response.places ?? []) {
      if (place.id) {
        placeIds.push(place.id)
      }
    }

    if (!response.nextPageToken) {
      break
    }

    pageToken = response.nextPageToken
  }

  return { placeIds, pages }
}
