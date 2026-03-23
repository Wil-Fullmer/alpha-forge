// Accepted format (after normalization): 1–10 uppercase ASCII letters.
// Extend TICKER_REGEX if future symbol formats (e.g. BRK.B, ADR suffixes) are needed.
const TICKER_REGEX = /^[A-Z]{1,10}$/

export function normalizeTicker(ticker) {
  if (typeof ticker !== 'string') return ''
  return ticker.trim().toUpperCase()
}

export function validateTicker(ticker) {
  return TICKER_REGEX.test(ticker)
}
