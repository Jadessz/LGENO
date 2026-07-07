import type { VercelRequest, VercelResponse } from '@vercel/node'
import { listSearches } from '../src/lib/db/supabase'
import { checkRateLimit, getErrorMessage, handleOptions, json } from './_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (!checkRateLimit(req, res)) return

  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20
    const searches = await listSearches(limit)
    return json(res, 200, { searches })
  } catch (error) {
    return json(res, 500, { error: getErrorMessage(error) })
  }
}
