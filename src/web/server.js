import '../utils/env.js'
import http from 'http'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { normalizeTicker, validateTicker } from '../utils/validation.js'
import { getCompanyProfile } from '../services/financialData.js'
import { getOrRunAnalysis } from '../services/analysisCache.js'
import { assemblePeers } from '../services/dataAssembler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')

function mapErrorToHttp(error) {
  const msg = (error && error.message) || ''
  if (msg.startsWith('TICKER_NOT_FOUND'))
    return { status: 404, type: 'NOT_FOUND', error: 'No data found for the requested ticker' }
  if (
    msg.startsWith('FMP_RATE_LIMITED') ||
    msg.startsWith('FMP_AUTH_FAILED') ||
    msg.startsWith('FMP_PLAN_RESTRICTED') ||
    msg.startsWith('FMP_API_ERROR') ||
    msg.startsWith('AV_ALL_KEYS_EXHAUSTED') ||
    msg.startsWith('FMP_NO_KEYS')
  )
    return { status: 503, type: 'PROVIDER_ERROR', error: 'Financial data provider is temporarily unavailable' }
  return { status: 500, type: 'INTERNAL', error: 'An unexpected server error occurred' }
}

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'


const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname

  try {
    // Route: GET / â€” landing page
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html')
      res.writeHead(200)
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Alpha Forge</title>
<style>body{font-family:system-ui;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.box{text-align:center}.box h1{font-size:2rem;margin-bottom:.5rem}
.box p{color:#94a3b8;margin-bottom:1.5rem}
.box a{display:inline-block;padding:.6rem 1.4rem;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;margin:.3rem;font-size:.95rem}
.box a:hover{background:#2563eb}</style></head>
<body><div class="box"><h1>Alpha Forge</h1><p>Financial Analysis Pipeline</p>
<a href="/dashboard/AAPL">AAPL Dashboard</a>
<a href="/api/analysis/AAPL">AAPL Analysis JSON</a>
</div></body></html>`)
    }
    // Route: GET /dashboard/:ticker â€” serve HTML dashboard
    else if (pathname.match(/^\/dashboard\/[^/]+$/)) {
      const ticker = normalizeTicker(pathname.split('/')[2])
      if (!validateTicker(ticker)) {
        res.setHeader('Content-Type', 'text/plain')
        res.writeHead(400)
        res.end('Invalid ticker format')
        return
      }
      const file = resolve(DATA_DIR, `${ticker}-dashboard.html`)
      if (!existsSync(file)) {
        res.setHeader('Content-Type', 'text/html')
        res.writeHead(404)
        res.end(`<p>No dashboard found for ${ticker}. Run analysis first.</p>`)
        return
      }
      res.setHeader('Content-Type', 'text/html')
      res.writeHead(200)
      res.end(readFileSync(file, 'utf8'))
    }
    // Route: GET /report/:ticker â€” serve Markdown report as HTML
    else if (pathname.match(/^\/report\/[^/]+$/)) {
      const ticker = normalizeTicker(pathname.split('/')[2])
      if (!validateTicker(ticker)) {
        res.setHeader('Content-Type', 'text/plain')
        res.writeHead(400)
        res.end('Invalid ticker format')
        return
      }
      const file = resolve(DATA_DIR, `${ticker}-report.md`)
      if (!existsSync(file)) {
        res.setHeader('Content-Type', 'text/plain')
        res.writeHead(404)
        res.end(`No report found for ${ticker}. Run analysis first.`)
        return
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.writeHead(200)
      res.end(readFileSync(file, 'utf8'))
    }
    // Route: GET /api/company/:ticker
    else if (pathname.match(/^\/api\/company\/[^/]+$/)) {
      const ticker = normalizeTicker(pathname.split('/')[3])
      if (!validateTicker(ticker)) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid ticker format' }))
        return
      }
      logger.info(`Web request for company profile: ${ticker}`)
      const data = await getCompanyProfile(ticker)
      res.writeHead(200)
      res.end(JSON.stringify(data))
    }
    // Route: GET /api/analysis/:ticker
    else if (pathname.match(/^\/api\/analysis\/[^/]+$/)) {
      const ticker = normalizeTicker(pathname.split('/')[3])
      if (!validateTicker(ticker)) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid ticker format' }))
        return
      }
      const force = url.searchParams.get('force') === 'true'
      logger.info(`Web request for full analysis: ${ticker}${force ? ' (force)' : ''}`)
      const data = await getOrRunAnalysis(ticker, force)
      res.writeHead(200)
      res.end(JSON.stringify(data))
    }
    // Route: GET /api/technicals/:ticker
    else if (pathname.match(/^\/api\/technicals\/[^/]+$/)) {
      const ticker = normalizeTicker(pathname.split('/')[3])
      if (!validateTicker(ticker)) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid ticker format' }))
        return
      }
      const force = url.searchParams.get('force') === 'true'
      logger.info(`Web request for technicals: ${ticker}${force ? ' (force)' : ''}`)
      const data = await getOrRunAnalysis(ticker, force)
      res.writeHead(200)
      res.end(JSON.stringify({ ticker: data.ticker, technicals: data.technicals, flags: data.flags }))
    }
    // Route: GET /api/metrics/:ticker
    else if (pathname.match(/^\/api\/metrics\/[^/]+$/)) {
      const ticker = normalizeTicker(pathname.split('/')[3])
      if (!validateTicker(ticker)) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid ticker format' }))
        return
      }
      const force = url.searchParams.get('force') === 'true'
      logger.info(`Web request for core metrics: ${ticker}${force ? ' (force)' : ''}`)
      const data = await getOrRunAnalysis(ticker, force)
      res.writeHead(200)
      res.end(JSON.stringify({ ticker: data.ticker, coreMetrics: data.coreMetrics, flags: data.flags }))
    }
    // Route: GET /api/peers/:ticker
    else if (pathname.match(/^\/api\/peers\/[^/]+$/)) {
      const ticker = normalizeTicker(pathname.split('/')[3])
      if (!validateTicker(ticker)) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid ticker format' }))
        return
      }
      const force = url.searchParams.get('force') === 'true'
      logger.info(`Web request for peers: ${ticker}${force ? ' (force)' : ''}`)
      const peers = await assemblePeers(ticker, { force })
      res.writeHead(200)
      res.end(JSON.stringify({ ticker, peers }))
    }
    // Route: GET /health
    else if (pathname === '/health') {
      res.writeHead(200)
      res.end(JSON.stringify({ status: 'ok' }))
    }
    // 404
    else {
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch (error) {
    const { status, type, error: msg } = mapErrorToHttp(error)
    logger.error(`[${status}] ${type}: ${error.message}`)
    if (pathname.match(/^\/(dashboard|report)\/[^/]+$/)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.writeHead(status)
      res.end(msg)
      return
    }
    res.writeHead(status)
    res.end(JSON.stringify({ error: msg, type }))
  }
})

server.listen(PORT, HOST, () => {
  logger.info(`Server running at http://${HOST}:${PORT}`)
  console.log(`\nðŸš€ Server started on http://${HOST}:${PORT}`)
})


