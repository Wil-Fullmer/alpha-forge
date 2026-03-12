#!/usr/bin/env node
import '../utils/env.js'
import logger from '../utils/logger.js'
import { runFullAnalysis } from '../services/analysisRunner.js'

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Financial Analysis Tool

Usage:
  npm start -- <ticker>               Run full financial analysis (core metrics, DCF, technicals)
  npm start -- <ticker> --force       Bypass cache and re-fetch all data
  npm start -- --help                 Show this help message

Example:
  npm start -- AAPL
  npm start -- AAPL --force
    `)
    process.exit(0)
  }

  const ticker = args[0].toUpperCase()
  const force = args[1] === '--force'

  try {
    logger.info(`Starting analysis for ticker: ${ticker}`)
    await runFullAnalysis(ticker, { force })
  } catch (error) {
    logger.error(`CLI error: ${error.message}`)
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

main()
