import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSearchStats } from '../src/lib/db/supabase'
import { checkRateLimit, getErrorMessage, handleOptions, json } from './_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (!checkRateLimit(req, res)) return

  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' })
  }

  try {
    const stats = await getSearchStats()
    return json(res, 200, stats)
  } catch (error) {
    return json(res, 500, { error: getErrorMessage(error) })
  }
}
