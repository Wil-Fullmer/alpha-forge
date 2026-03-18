import '../utils/env.js'
import http from 'http'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { getCompanyProfile } from '../services/financialData.js'
import { runFullAnalysis } from '../services/analysisRunner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

// How long data/{TICKER}-analysis.json is reused before triggering a rerun.
// Uses analysisDate from the JSON payload (YYYY-MM-DD). Default: 24 hours.
const ANALYSIS_CACHE_TTL_MS = parseInt(process.env.ANALYSIS_CACHE_TTL_MS ?? String(24 * 60 * 60 * 1000), 10)

/**
 * Return analysis for a ticker from disk if it is still fresh, otherwise run the full pipeline.
 * Freshness is determined by reading `analysisDate` from the cached JSON and comparing it
 * against ANALYSIS_CACHE_TTL_MS. Malformed or missing dates are treated as stale.
 */
async function getOrRunAnalysis(ticker, force) {
  if (!force) {
    const file = resolve(DATA_DIR, `${ticker}-analysis.json`)
    if (existsSync(file)) {
      try {
        const cached = JSON.parse(readFileSync(file, 'utf8'))
        const age = Date.now() - new Date(cached.analysisDate).getTime()
        if (Number.isFinite(age) && age <= ANALYSIS_CACHE_TTL_MS) {
          logger.info(`Serving analysis for ${ticker} from disk (age: ${Math.round(age / 60000)}m)`)
          return cached
        }
        logger.info(`Analysis file for ${ticker} is stale (age: ${Math.round(age / 60000)}m) — rerunning`)
      } catch {
        logger.warn(`Could not parse cached analysis for ${ticker} — rerunning`)
      }
    }
  }
  return runFullAnalysis(ticker, { force })
}

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
    // Route: GET / — landing page
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
    // Route: GET /dashboard/:ticker — serve HTML dashboard
    else if (pathname.match(/^\/dashboard\/[A-Z]+$/)) {
      const ticker = pathname.split('/')[2]
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
    // Route: GET /report/:ticker — serve Markdown report as HTML
    else if (pathname.match(/^\/report\/[A-Z]+$/)) {
      const ticker = pathname.split('/')[2]
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
    else if (pathname.match(/^\/api\/company\/[A-Z]+$/)) {
      const ticker = pathname.split('/')[3]
      logger.info(`Web request for company profile: ${ticker}`)
      const data = await getCompanyProfile(ticker)
      res.writeHead(200)
      res.end(JSON.stringify(data))
    }
    // Route: GET /api/analysis/:ticker
    else if (pathname.match(/^\/api\/analysis\/[A-Z]+$/)) {
      const ticker = pathname.split('/')[3]
      const force = url.searchParams.get('force') === 'true'
      logger.info(`Web request for full analysis: ${ticker}${force ? ' (force)' : ''}`)
      const data = await runFullAnalysis(ticker, { force })
      res.writeHead(200)
      res.end(JSON.stringify(data))
    }
    // Route: GET /api/technicals/:ticker
    else if (pathname.match(/^\/api\/technicals\/[A-Z]+$/)) {
      const ticker = pathname.split('/')[3]
      const force = url.searchParams.get('force') === 'true'
      logger.info(`Web request for technicals: ${ticker}${force ? ' (force)' : ''}`)
      const data = await getOrRunAnalysis(ticker, force)
      res.writeHead(200)
      res.end(JSON.stringify({ ticker: data.ticker, technicals: data.technicals, flags: data.flags }))
    }
    // Route: GET /api/metrics/:ticker
    else if (pathname.match(/^\/api\/metrics\/[A-Z]+$/)) {
      const ticker = pathname.split('/')[3]
      const force = url.searchParams.get('force') === 'true'
      logger.info(`Web request for core metrics: ${ticker}${force ? ' (force)' : ''}`)
      const data = await getOrRunAnalysis(ticker, force)
      res.writeHead(200)
      res.end(JSON.stringify({ ticker: data.ticker, coreMetrics: data.coreMetrics, flags: data.flags }))
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
    logger.error(`Server error: ${error.message}`)
    res.writeHead(500)
    res.end(JSON.stringify({ error: error.message }))
  }
})

server.listen(PORT, HOST, () => {
  logger.info(`Server running at http://${HOST}:${PORT}`)
  console.log(`\n🚀 Server started on http://${HOST}:${PORT}`)
})
