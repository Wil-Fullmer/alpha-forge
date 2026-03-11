import '../utils/env.js'
import http from 'http'
import logger from '../utils/logger.js'
import { getCompanyProfile } from '../services/financialData.js'

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
    // Route: GET /api/company/:ticker
    if (pathname.match(/^\/api\/company\/[A-Z]+$/)) {
      const ticker = pathname.split('/')[3]
      logger.info(`Web request for ticker: ${ticker}`)
      const data = await getCompanyProfile(ticker)
      res.writeHead(200)
      res.end(JSON.stringify(data))
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
