import type { VercelRequest, VercelResponse } from '@vercel/node'
import { placesFetch } from '../src/lib/pipeline/places-client'
import { checkRateLimit, getErrorMessage, handleOptions, json } from './_utils'

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      text?: { text?: string }
      placeId?: string
    }
  }>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (!checkRateLimit(req, res)) return

  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  const input = String(req.query.input ?? '').trim()
  if (input.length < 2) {
    return json(res, 200, { suggestions: [] })
  }

  try {
    const data = await placesFetch<AutocompleteResponse>('/places:autocomplete', {
      method: 'POST',
      fieldMask: 'suggestions.placePrediction.text,suggestions.placePrediction.placeId',
      body: {
        input,
        includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'country'],
      },
    })

    const suggestions =
      data.suggestions
        ?.map((s) => s.placePrediction?.text?.text)
        .filter((t): t is string => Boolean(t)) ?? []

    return json(res, 200, { suggestions: [...new Set(suggestions)].slice(0, 8) })
  } catch (error) {
    return json(res, 500, { error: getErrorMessage(error) })
  }
}
