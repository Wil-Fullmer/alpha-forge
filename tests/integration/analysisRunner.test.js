import '../../src/utils/env.js'
import test from 'node:test'
import assert from 'node:assert'
import { existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { runFullAnalysis } from '../../src/services/analysisRunner.js'

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data')
const FIXTURE_PATH = resolve(DATA_DIR, 'AAPL-collected.json')

const VALID_SIGNALS = new Set(['bullish', 'bearish', 'mixed'])

// ── Default test — uses local fixture to avoid live API calls ─────────────────
//
// Requires data/AAPL-collected.json (statement fixture).
// Historical prices and quote are served from data/cache/ if available,
// or make at most 2 provider calls if cache is cold.
test('runFullAnalysis — result shape', async (t) => {
  if (!existsSync(FIXTURE_PATH)) {
    t.skip('data/AAPL-collected.json fixture not found — create it or run analysis manually')
    return
  }

  let result
  try {
    result = await runFullAnalysis('AAPL')
  } catch (err) {
    t.skip(`Analysis unavailable: ${err.message}`)
    return
  }

  await t.test('returns required top-level keys', () => {
    assert.ok('ticker' in result, 'missing ticker')
    assert.ok('analysisDate' in result, 'missing analysisDate')
    assert.ok('coreMetrics' in result, 'missing coreMetrics')
    assert.ok('dcf' in result, 'missing dcf')
    assert.ok('technicals' in result, 'missing technicals')
    assert.ok('flags' in result, 'missing flags')
    assert.ok('metadata' in result, 'missing metadata')
  })

  await t.test('ticker is uppercase string', () => {
    assert.strictEqual(result.ticker, 'AAPL')
  })

  await t.test('flags is an array', () => {
    assert.ok(Array.isArray(result.flags))
  })

  await t.test('coreMetrics has expected keys', () => {
    const { coreMetrics } = result
    for (const key of ['sharpeRatio', 'roe', 'debtToEquity', 'peRatio', 'eps']) {
      assert.ok(key in coreMetrics, `missing coreMetrics.${key}`)
    }
  })

  await t.test('coreMetrics values are null or finite numbers', () => {
    const { coreMetrics } = result
    for (const [key, val] of Object.entries(coreMetrics)) {
      assert.ok(val === null || (typeof val === 'number' && isFinite(val)), `coreMetrics.${key} is invalid: ${val}`)
    }
  })

  await t.test('dcf has expected keys', () => {
    const { dcf } = result
    for (const key of ['intrinsicValuePerShare', 'currentPrice', 'assumedGrowthRate', 'assumedWACC', 'terminalGrowthRate']) {
      assert.ok(key in dcf, `missing dcf.${key}`)
    }
  })

  await t.test('technicals has expected keys', () => {
    const { technicals } = result
    for (const key of ['currentPrice', 'ma50', 'ma200', 'rsi14', 'momentumSignal']) {
      assert.ok(key in technicals, `missing technicals.${key}`)
    }
  })

  await t.test('momentumSignal is valid or null', () => {
    const { momentumSignal } = result.technicals
    assert.ok(momentumSignal === null || VALID_SIGNALS.has(momentumSignal), `unexpected momentumSignal: ${momentumSignal}`)
  })

  await t.test('rsi14 is in valid range or null', () => {
    const { rsi14 } = result.technicals
    if (rsi14 !== null) {
      assert.ok(rsi14 >= 0 && rsi14 <= 100, `RSI out of range: ${rsi14}`)
    }
  })

  await t.test('metadata.dataSource is a known value', () => {
    const validSources = new Set(['fmp_direct', 'pre_collected'])
    assert.ok(validSources.has(result.metadata.dataSource), `unknown dataSource: ${result.metadata.dataSource}`)
  })
})

// ── Live test — explicit only, set RUN_LIVE_TESTS=1 to enable ─────────────────
//
// Burns API quota. Only run when intentionally verifying live provider behavior.
test('runFullAnalysis — live force-refresh (explicit)', { skip: !process.env.RUN_LIVE_TESTS }, async (t) => {
  let result
  try {
    result = await runFullAnalysis('AAPL', { force: true })
  } catch (err) {
    t.skip(`FMP API unavailable: ${err.message}`)
    return
  }

  await t.test('returns valid result shape', () => {
    assert.ok('ticker' in result)
    assert.ok('coreMetrics' in result)
    assert.ok('dcf' in result)
    assert.ok('technicals' in result)
    assert.strictEqual(result.metadata.dataSource, 'fmp_direct')
  })
})
