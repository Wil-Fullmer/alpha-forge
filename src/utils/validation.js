// Accepted format (after normalization): 1–10 uppercase letters, optionally followed
// by a hyphen or dot and 1–5 alphanumeric chars (e.g. BRK-B, BRK.B, BF.B).
const TICKER_REGEX = /^[A-Z]{1,10}([.\-][A-Z0-9]{1,5})?$/

export function normalizeTicker(ticker) {
  if (typeof ticker !== 'string') return ''
  return ticker.trim().toUpperCase()
}

export function validateTicker(ticker) {
  return TICKER_REGEX.test(ticker)
}
