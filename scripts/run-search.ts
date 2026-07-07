import { config } from 'dotenv'
import {
  completeSearch,
  createSearch,
  failSearch,
  leadsToCsv,
  upsertLeads,
} from '../src/lib/db/supabase'
import { runPipeline } from '../src/lib/pipeline/run-pipeline'

config({ path: '.env.local' })
config()

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args[key] = next
        i += 1
      } else {
        args[key] = 'true'
      }
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const category = args.category
  const location = args.location

  if (!category || !location) {
    console.error('Usage: npm run search -- --category "plumbers" --location "Austin, TX" [--max-pages 3] [--max-results 60] [--export-csv]')
    process.exit(1)
  }

  const maxPages = args['max-pages'] ? Number(args['max-pages']) : 3
  const maxResults = args['max-results'] ? Number(args['max-results']) : 60
  const budgetCapUsd = args['budget-cap'] ? Number(args['budget-cap']) : undefined
  const exportCsv = args['export-csv'] === 'true'

  const search = await createSearch(category, location)

  try {
    console.log(`Searching: ${category} in ${location}`)
    const result = await runPipeline({
      category,
      location,
      maxPages,
      maxResults,
      budgetCapUsd,
    })

    await upsertLeads(search.id, result.leads)
    await completeSearch(search.id, {
      totalFound: result.totalFound,
      leadsFound: result.leadsFound,
      textSearchPages: result.textSearchPages,
      placeDetailsCalls: result.placeDetailsCalls,
      estimatedCostUsd: result.estimatedCostUsd,
    })

    console.log(`Done. Scanned ${result.totalFound}, found ${result.leadsFound} leads without websites.`)
    console.log(`Estimated API cost: $${result.estimatedCostUsd.toFixed(2)}`)

    if (exportCsv && result.leads.length > 0) {
      const { writeFileSync } = await import('node:fs')
      const csv = leadsToCsv(
        result.leads.map((lead) => ({
          id: '',
          place_id: lead.placeId,
          name: lead.name,
          address: lead.address,
          phone: lead.phone,
          email: lead.email,
          rating: lead.rating,
          rating_count: lead.ratingCount,
          business_status: lead.businessStatus,
          has_website: lead.hasWebsite,
          google_maps_uri: lead.googleMapsUri,
          primary_type: lead.primaryType,
          outreach_status: 'new' as const,
          notes: null,
          search_id: search.id,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        })),
      )
      const filename = `leads-${Date.now()}.csv`
      writeFileSync(filename, csv)
      console.log(`Exported ${filename}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await failSearch(search.id, message)
    console.error(`Search failed: ${message}`)
    process.exit(1)
  }
}

main()
