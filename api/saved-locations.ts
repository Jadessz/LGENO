import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  createSavedLocation,
  deleteSavedLocation,
  listSavedLocations,
  updateSavedLocation,
} from '../src/lib/db/supabase'
import {
  checkRateLimit,
  getErrorMessage,
  handleOptions,
  json,
  requireApiAuth,
} from './_utils'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  if (!checkRateLimit(req, res)) return

  if (req.method === 'GET') {
    try {
      const locations = await listSavedLocations()
      return json(res, 200, { locations })
    } catch (error) {
      return json(res, 500, { error: getErrorMessage(error) })
    }
  }

  if (req.method === 'POST') {
    if (!requireApiAuth(req, res)) return

    const body = req.body ?? {}
    const label = String(body.label ?? '').trim()
    const category = String(body.category ?? '').trim()
    const location = String(body.location ?? '').trim()

    if (!label || !category || !location) {
      return json(res, 400, { error: 'label, category, and location are required' })
    }

    try {
      const saved = await createSavedLocation({
        label,
        category,
        location,
        is_default: Boolean(body.is_default),
        schedule_enabled: Boolean(body.schedule_enabled),
        schedule_cron: body.schedule_cron ?? null,
        max_pages: body.max_pages ? Number(body.max_pages) : 3,
        max_results: body.max_results ? Number(body.max_results) : 60,
        budget_cap_usd: body.budget_cap_usd != null ? Number(body.budget_cap_usd) : null,
      })
      return json(res, 201, { location: saved })
    } catch (error) {
      return json(res, 500, { error: getErrorMessage(error) })
    }
  }

  if (req.method === 'PATCH') {
    if (!requireApiAuth(req, res)) return

    const body = req.body ?? {}
    const id = String(body.id ?? '').trim()
    if (!id) {
      return json(res, 400, { error: 'id is required' })
    }

    try {
      const saved = await updateSavedLocation(id, {
        ...(body.label != null ? { label: String(body.label).trim() } : {}),
        ...(body.category != null ? { category: String(body.category).trim() } : {}),
        ...(body.location != null ? { location: String(body.location).trim() } : {}),
        ...(body.is_default != null ? { is_default: Boolean(body.is_default) } : {}),
        ...(body.schedule_enabled != null
          ? { schedule_enabled: Boolean(body.schedule_enabled) }
          : {}),
        ...(body.schedule_cron !== undefined
          ? { schedule_cron: body.schedule_cron as string | null }
          : {}),
        ...(body.max_pages != null ? { max_pages: Number(body.max_pages) } : {}),
        ...(body.max_results != null ? { max_results: Number(body.max_results) } : {}),
        ...(body.budget_cap_usd !== undefined
          ? {
              budget_cap_usd:
                body.budget_cap_usd == null ? null : Number(body.budget_cap_usd),
            }
          : {}),
      })
      return json(res, 200, { location: saved })
    } catch (error) {
      return json(res, 500, { error: getErrorMessage(error) })
    }
  }

  if (req.method === 'DELETE') {
    if (!requireApiAuth(req, res)) return

    const id = String(req.query.id ?? req.body?.id ?? '').trim()
    if (!id) {
      return json(res, 400, { error: 'id is required' })
    }

    try {
      await deleteSavedLocation(id)
      return json(res, 200, { ok: true })
    } catch (error) {
      return json(res, 500, { error: getErrorMessage(error) })
    }
  }

  return json(res, 405, { error: 'Method not allowed' })
}
