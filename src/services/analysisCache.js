import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { runFullAnalysis } from './analysisRunner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = resolve(__dirname, '../../../data')
const DEFAULT_TTL_MS = parseInt(process.env.ANALYSIS_CACHE_TTL_MS ?? String(24 * 60 * 60 * 1000), 10)

export async function getOrRunAnalysis(ticker, force = false, {
  dataDir = DEFAULT_DATA_DIR,
  ttl = DEFAULT_TTL_MS,
  runAnalysis = runFullAnalysis,
} = {}) {
  if (!force) {
    const file = resolve(dataDir, `${ticker}-analysis.json`)
    if (existsSync(file)) {
      try {
        const cached = JSON.parse(readFileSync(file, 'utf8'))
        const age = Date.now() - new Date(cached.analysisDate).getTime()
        if (Number.isFinite(age) && age <= ttl) {
          logger.info(`Serving analysis for ${ticker} from disk (age: ${Math.round(age / 60000)}m)`)
          return cached
        }
        logger.info(`Analysis file for ${ticker} is stale (age: ${Math.round(age / 60000)}m) — rerunning`)
      } catch {
        logger.warn(`Could not parse cached analysis for ${ticker} — rerunning`)
      }
    }
  }
  return runAnalysis(ticker, { force })
}
