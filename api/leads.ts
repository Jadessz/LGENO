import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  checkRateLimit,
  getErrorMessage,
  handleOptions,
  json,
  requireApiAuth,
  setCors,
} from './_utils'
import { leadsToCsv, listLeads, updateLead } from '../src/lib/db/supabase'
import type { OutreachStatus } from '../src/lib/pipeline/types'

const VALID_STATUSES: OutreachStatus[] = ['new', 'contacted', 'interested', 'won', 'lost']

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return

  if (!checkRateLimit(req, res)) return

  if (req.method === 'GET') {
    try {
      const searchId = req.query.searchId ? String(req.query.searchId) : undefined
      const format = req.query.format ? String(req.query.format) : 'json'
      const leads = await listLeads(searchId)

      if (format === 'csv') {
        const csv = leadsToCsv(leads)
        const filename = searchId ? `leads-${searchId.slice(0, 8)}.csv` : 'leads-all.csv'
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        setCors(res)
        return res.status(200).send(csv)
      }

      return json(res, 200, { leads })
    } catch (error) {
      return json(res, 500, { error: getErrorMessage(error) })
    }
  }

  if (req.method === 'PATCH') {
    if (!requireApiAuth(req, res)) return

    const body = req.body ?? {}
    const leadId = String(body.id ?? req.query.id ?? '').trim()
    if (!leadId) {
      return json(res, 400, { error: 'Lead id is required' })
    }

    const updates: { outreach_status?: OutreachStatus; notes?: string | null } = {}

    if (body.outreach_status != null) {
      const status = String(body.outreach_status) as OutreachStatus
      if (!VALID_STATUSES.includes(status)) {
        return json(res, 400, { error: 'Invalid outreach_status' })
      }
      updates.outreach_status = status
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes == null ? null : String(body.notes)
    }

    if (Object.keys(updates).length === 0) {
      return json(res, 400, { error: 'No valid fields to update' })
    }

    try {
      const lead = await updateLead(leadId, updates)
      return json(res, 200, { lead })
    } catch (error) {
      return json(res, 500, { error: getErrorMessage(error) })
    }
  }

  return json(res, 405, { error: 'Method not allowed' })
}
