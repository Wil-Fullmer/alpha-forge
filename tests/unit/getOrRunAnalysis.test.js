import '../../src/utils/env.js'
import test from 'node:test'
import assert from 'node:assert'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { getOrRunAnalysis } from '../../src/services/analysisCache.js'

function tempDir() {
  const dir = resolve(tmpdir(), 'af-test-' + randomBytes(4).toString('hex'))
  mkdirSync(dir, { recursive: true })
  return dir
}

function writeAnalysis(dir, ticker, data) {
  writeFileSync(resolve(dir, `${ticker}-analysis.json`), JSON.stringify(data))
}

// ── Fresh cache ───────────────────────────────────────────────────────────────

test('getOrRunAnalysis — returns cached data when fresh', async () => {
  const dir = tempDir()
  try {
    const cached = { ticker: 'AAPL', analysisDate: new Date().toISOString(), fromCache: true }
    writeAnalysis(dir, 'AAPL', cached)

    let runnerCalled = false
    const mockRunner = async () => { runnerCalled = true; return { fromRunner: true } }

    const result = await getOrRunAnalysis('AAPL', false, { dataDir: dir, ttl: 60_000, runAnalysis: mockRunner })

    assert.strictEqual(result.fromCache, true, 'should return cached data')
    assert.strictEqual(runnerCalled, false, 'should not call runner for fresh cache')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── Stale cache ───────────────────────────────────────────────────────────────

test('getOrRunAnalysis — reruns when cache is stale', async () => {
  const dir = tempDir()
  try {
    const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    writeAnalysis(dir, 'AAPL', { ticker: 'AAPL', analysisDate: staleDate, fromCache: true })

    let runnerCalled = false
    const mockRunner = async () => { runnerCalled = true; return { fromRunner: true } }

    const result = await getOrRunAnalysis('AAPL', false, { dataDir: dir, ttl: 60_000, runAnalysis: mockRunner })

    assert.strictEqual(result.fromRunner, true, 'should return fresh runner result')
    assert.strictEqual(runnerCalled, true, 'should call runner for stale cache')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── Malformed date ────────────────────────────────────────────────────────────

test('getOrRunAnalysis — reruns when analysisDate is missing', async () => {
  const dir = tempDir()
  try {
    writeAnalysis(dir, 'AAPL', { ticker: 'AAPL' }) // no analysisDate

    let runnerCalled = false
    const mockRunner = async () => { runnerCalled = true; return { fromRunner: true } }

    const result = await getOrRunAnalysis('AAPL', false, { dataDir: dir, ttl: 60_000, runAnalysis: mockRunner })

    assert.strictEqual(runnerCalled, true, 'should call runner when analysisDate is missing')
    assert.strictEqual(result.fromRunner, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('getOrRunAnalysis — reruns when analysisDate is invalid string', async () => {
  const dir = tempDir()
  try {
    writeAnalysis(dir, 'AAPL', { ticker: 'AAPL', analysisDate: 'not-a-date' })

    let runnerCalled = false
    const mockRunner = async () => { runnerCalled = true; return { fromRunner: true } }

    const result = await getOrRunAnalysis('AAPL', false, { dataDir: dir, ttl: 60_000, runAnalysis: mockRunner })

    assert.strictEqual(runnerCalled, true, 'should call runner when date is invalid')
    assert.strictEqual(result.fromRunner, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('getOrRunAnalysis — reruns when file is malformed JSON', async () => {
  const dir = tempDir()
  try {
    writeFileSync(resolve(dir, 'AAPL-analysis.json'), 'this is not json{{{')

    let runnerCalled = false
    const mockRunner = async () => { runnerCalled = true; return { fromRunner: true } }

    const result = await getOrRunAnalysis('AAPL', false, { dataDir: dir, ttl: 60_000, runAnalysis: mockRunner })

    assert.strictEqual(runnerCalled, true, 'should call runner when JSON is malformed')
    assert.strictEqual(result.fromRunner, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── Force refresh ─────────────────────────────────────────────────────────────

test('getOrRunAnalysis — force=true bypasses fresh cache', async () => {
  const dir = tempDir()
  try {
    writeAnalysis(dir, 'AAPL', { ticker: 'AAPL', analysisDate: new Date().toISOString(), fromCache: true })

    let runnerCalled = false
    const mockRunner = async () => { runnerCalled = true; return { fromRunner: true } }

    const result = await getOrRunAnalysis('AAPL', true, { dataDir: dir, ttl: 60_000, runAnalysis: mockRunner })

    assert.strictEqual(runnerCalled, true, 'should call runner when force=true')
    assert.strictEqual(result.fromRunner, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── No cache file ─────────────────────────────────────────────────────────────

test('getOrRunAnalysis — runs analysis when no cache file exists', async () => {
  const dir = tempDir()
  try {
    let runnerCalled = false
    const mockRunner = async () => { runnerCalled = true; return { fromRunner: true } }

    const result = await getOrRunAnalysis('AAPL', false, { dataDir: dir, ttl: 60_000, runAnalysis: mockRunner })

    assert.strictEqual(runnerCalled, true, 'should call runner when no file exists')
    assert.strictEqual(result.fromRunner, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
