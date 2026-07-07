import { config } from 'dotenv'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { URL } from 'node:url'
import searchHandler from '../api/search'
import leadsHandler from '../api/leads'
import searchesHandler from '../api/searches'
import savedLocationsHandler from '../api/saved-locations'
import autocompleteHandler from '../api/autocomplete'
import cronRunHandler from '../api/cron/run'
import statsHandler from '../api/stats'

config({ path: '.env.local' })
config()

type Handler = (req: IncomingMessage & { body?: unknown; query?: Record<string, string | string[] | undefined> }, res: ServerResponse) => Promise<void>

const routes: Record<string, Handler> = {
  '/api/search': searchHandler as Handler,
  '/api/leads': leadsHandler as Handler,
  '/api/searches': searchesHandler as Handler,
  '/api/saved-locations': savedLocationsHandler as Handler,
  '/api/cron/run': cronRunHandler as Handler,
  '/api/stats': statsHandler as Handler,
  '/api/autocomplete': autocompleteHandler as Handler,
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function toVercelResponse(res: ServerResponse) {
  return {
    status(code: number) {
      res.statusCode = code
      return this
    },
    json(data: unknown) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    },
    send(data: string) {
      res.end(data)
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value)
    },
    end() {
      res.end()
    },
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const handler = routes[url.pathname]

  if (!handler) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  const query: Record<string, string | string[] | undefined> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  let body: unknown
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
    const raw = await readBody(req)
    body = raw ? JSON.parse(raw) : {}
  }

  const vercelReq = Object.assign(req, { query, body, headers: req.headers })
  const vercelRes = toVercelResponse(res)

  try {
    await handler(vercelReq, vercelRes as never)
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Server error' }))
  }
})

const port = Number(process.env.API_PORT ?? 3001)
server.listen(port, () => {
  console.log(`API dev server running at http://localhost:${port}`)
})
