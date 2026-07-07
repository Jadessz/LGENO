const PLACES_BASE_URL = 'https://places.googleapis.com/v1'

export class PlacesApiError extends Error {
  status: number
  body?: string

  constructor(message: string, status: number, body?: string) {
    super(message)
    this.name = 'PlacesApiError'
    this.status = status
    this.body = body
  }
}

export async function placesFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    fieldMask: string
    body?: Record<string, unknown>
  },
): Promise<T> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not set')
  }

  const response = await fetch(`${PLACES_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': options.fieldMask,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new PlacesApiError(
      `Places API error: ${response.status} ${response.statusText}`,
      response.status,
      body,
    )
  }

  return response.json() as Promise<T>
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
