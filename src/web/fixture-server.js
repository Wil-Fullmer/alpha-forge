/**
 * fixture-server.js
 *
 * Serves static fixture JSON from data/fixtures/{TICKER}/ at the same URL paths
 * as the real backend. Runs independently — no FMP API calls, no analysis pipeline.
 *
 * Use this for frontend development when you don't need live data:
 *   npm run web:fixtures
 *
 * Runs on FIXTURE_PORT (default 3001) to avoid conflicting with the real server on 3000.
 * CORS is open so browser-based frontend tools can call it without a proxy.
 *
 * Supported routes (mirrors src/web/server.js):
 *   GET /api/company/:ticker    → data/fixtures/{TICKER}/company.json
 *   GET /api/analysis/:ticker   → data/fixtures/{TICKER}/analysis.json
 *   GET /api/technicals/:ticker → data/fixtures/{TICKER}/technicals.json
 *   GET /api/metrics/:ticker    → data/fixtures/{TICKER}/metrics.json
 *   GET /health                 → { status: "ok", mode: "fixture" }
 */

import http from 'http'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(__dirname, '../../data/fixtures')

const PORT = parseInt(process.env.FIXTURE_PORT ?? '3001', 10)
const HOST = process.env.HOST ?? 'localhost'

// Route pattern → fixture file resolver
function resolveFixture(pathname) {
  // Normalize: strip trailing slash, uppercase ticker
  const clean = pathname.replace(/\/$/, '')
  let m

  if ((m = clean.match(/^\/api\/company\/([A-Za-z0-9-]+)$/)))
    return resolve(FIXTURES_DIR, m[1].toUpperCase(), 'company.json')

  if ((m = clean.match(/^\/api\/analysis\/([A-Za-z0-9-]+)$/)))
    return resolve(FIXTURES_DIR, m[1].toUpperCase(), 'analysis.json')

  if ((m = clean.match(/^\/api\/technicals\/([A-Za-z0-9-]+)$/)))
    return resolve(FIXTURES_DIR, m[1].toUpperCase(), 'technicals.json')

  if ((m = clean.match(/^\/api\/metrics\/([A-Za-z0-9-]+)$/)))
    return resolve(FIXTURES_DIR, m[1].toUpperCase(), 'metrics.json')

  return null
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', mode: 'fixture' }))
    return
  }

  // /api/peers/:ticker — extract peers array from analysis fixture
  const peersMatch = url.pathname.match(/^\/api\/peers\/([A-Za-z0-9-]+)$/)
  if (peersMatch) {
    const ticker = peersMatch[1].toUpperCase()
    const analysisFile = resolve(FIXTURES_DIR, ticker, 'analysis.json')
    if (!existsSync(analysisFile)) {
      res.writeHead(404)
      res.end(JSON.stringify({ error: `No fixture data for ${ticker}` }))
      return
    }
    try {
      const analysis = JSON.parse(readFileSync(analysisFile, 'utf8'))
      res.writeHead(200)
      res.end(JSON.stringify({ ticker, peers: analysis.peers ?? [] }))
    } catch {
      res.writeHead(500)
      res.end(JSON.stringify({ error: 'Failed to parse fixture' }))
    }
    return
  }

  const file = resolveFixture(url.pathname)

  if (!file) {
    res.writeHead(404)
    res.end(JSON.stringify({ error: `No fixture route for ${url.pathname}` }))
    return
  }

  if (!existsSync(file)) {
    res.writeHead(404)
    res.end(JSON.stringify({
      error: `No fixture file for ${url.pathname}`,
      hint: `Create ${file.replace(FIXTURES_DIR, 'data/fixtures')}`,
    }))
    return
  }

  try {
    const body = readFileSync(file, 'utf8')
    res.writeHead(200)
    res.end(body)
  } catch (err) {
    res.writeHead(500)
    res.end(JSON.stringify({ error: `Failed to read fixture: ${err.message}` }))
  }
})

server.listen(PORT, HOST, () => {
  console.log(`\nFixture server  http://${HOST}:${PORT}`)
  console.log('Mode: static JSON — no API calls, no pipeline\n')
  console.log('Available fixtures:')
  console.log(`  GET /api/company/:ticker`)
  console.log(`  GET /api/analysis/:ticker`)
  console.log(`  GET /api/technicals/:ticker`)
  console.log(`  GET /api/metrics/:ticker`)
  console.log(`  GET /health\n`)
  console.log(`Fixture root: data/fixtures/{TICKER}/`)
  console.log(`To add a ticker: create data/fixtures/{TICKER}/ and add company/analysis/technicals/metrics JSON files\n`)
})
