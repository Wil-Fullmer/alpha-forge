#!/usr/bin/env node
import '../utils/env.js'
import logger from '../utils/logger.js'
import { getCompanyProfile } from '../services/financialData.js'

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Financial Analysis Tool

Usage:
  npm start -- <ticker>               Get company profile
  npm start -- --help                 Show this help message

Example:
  npm start -- AAPL
    `)
    process.exit(0)
  }

  const ticker = args[0].toUpperCase()

  try {
    logger.info(`Fetching data for ticker: ${ticker}`)
    const data = await getCompanyProfile(ticker)
    console.log(`\n📊 Company Profile: ${ticker}`)
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    logger.error(`CLI error: ${error.message}`)
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

main()
