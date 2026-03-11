import test from 'node:test'
import assert from 'node:assert'
import { calculateSharpeRatio, calculateROE, calculateDebtToEquity } from '../../src/services/analysis.js'

test('Sharpe Ratio', async (t) => {
  await t.test('calculates correctly', () => {
    const returns = [0.03, 0.04, 0.035, 0.045, 0.04]
    const sharpe = calculateSharpeRatio(returns)
    assert.strictEqual(typeof sharpe, 'number')
    assert.ok(sharpe > 0)
  })

  await t.test('throws on empty data', () => {
    assert.throws(() => calculateSharpeRatio([]), /No returns data/)
  })
})

test('ROE', async (t) => {
  await t.test('calculates correctly', () => {
    const roe = calculateROE(1000000, 5000000)
    assert.strictEqual(roe, 0.2)
  })
})

test('Debt-to-Equity', async (t) => {
  await t.test('calculates correctly', () => {
    const ratio = calculateDebtToEquity(2000000, 5000000)
    assert.strictEqual(ratio, 0.4)
  })
})
