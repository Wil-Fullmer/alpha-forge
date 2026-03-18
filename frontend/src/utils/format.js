// Null sentinel used throughout the UI for missing values.
export const EM_DASH = '\u2014';

// Returns EM_DASH when the value is null or undefined.
function nullSafe(value, formatter) {
  if (value == null) return EM_DASH;
  return formatter(value);
}

// Formats raw dollar amounts into human-readable scale strings.
// e.g. 3_833_365_695_626 → "$3.83T", 482_000_000_000 → "$482.0B"
export function formatMarketCap(value) {
  return nullSafe(value, (v) => {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (abs >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  });
}

// Formats raw large-dollar integers for projected FCF display.
// e.g. 102_006_557_600 → "$102.0B"
export function formatLargeNumber(value) {
  return nullSafe(value, (v) => {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
    if (abs >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
    return `$${v.toLocaleString()}`;
  });
}

// Converts a decimal ratio to a percentage string.
// e.g. 0.0328 → "3.28%"
export function formatPct(value, decimalPlaces = 2) {
  return nullSafe(value, (v) => `${(v * 100).toFixed(decimalPlaces)}%`);
}

// Formats a plain ratio to fixed decimal places with no unit.
// e.g. 1.5191 → "1.52"
export function formatRatio(value, decimalPlaces = 2) {
  return nullSafe(value, (v) => v.toFixed(decimalPlaces));
}

// Formats a dollar price value.
// e.g. 260.81 → "$260.81"
export function formatPrice(value, decimalPlaces = 2) {
  return nullSafe(value, (v) => `$${v.toFixed(decimalPlaces)}`);
}

// Passes through pre-formatted percentage strings from the API.
// Returns EM_DASH when the value is null.
export function formatPreformatted(value) {
  return value ?? EM_DASH;
}

// Formats a number with a fixed number of decimal places.
export function formatFixed(value, decimalPlaces = 2) {
  return nullSafe(value, (v) => v.toFixed(decimalPlaces));
}

// Formats employee count with locale-aware thousands separators.
export function formatEmployees(value) {
  return nullSafe(value, (v) => v.toLocaleString());
}

// Returns how many calendar days ago a date string (YYYY-MM-DD) was,
// relative to today's actual date (new Date()).
// Returns null if the value is null/undefined or not a valid date.
export function formatDaysAgo(dateString) {
  if (dateString == null) return null;
  const analysisMs = Date.parse(dateString);
  if (isNaN(analysisMs)) return null;
  const nowMs = Date.now();
  const diffDays = Math.floor((nowMs - analysisMs) / 86400000);
  if (diffDays < 0) return null;
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

// Returns a staleness tier string based on how old the analysis is.
// 'fresh'  : 0–1 days
// 'recent' : 2–7 days
// 'stale'  : 8+ days
export function stalenessLevel(dateString) {
  if (dateString == null) return null;
  const analysisMs = Date.parse(dateString);
  if (isNaN(analysisMs)) return null;
  const diffDays = Math.floor((Date.now() - analysisMs) / 86400000);
  if (diffDays <= 1) return 'fresh';
  if (diffDays <= 7) return 'recent';
  return 'stale';
}
