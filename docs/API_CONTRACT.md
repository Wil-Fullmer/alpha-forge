# Alpha Forge — Frontend Data Contract

This document is the authoritative reference for every API endpoint the frontend consumes.
All shapes, types, and null conditions are described here. Fixture files in `data/fixtures/`
implement this contract for offline frontend development.

---

## Base URLs

| Mode | Base URL | Notes |
|---|---|---|
| Real backend | `http://localhost:3000` | Requires `.env` with `FMP_API_KEY` |
| Fixture server | `http://localhost:3001` | No API key needed, static JSON only |

Both servers expose identical route paths and response shapes.

---

## Endpoints

### `GET /api/company/:ticker`

Returns the normalized company profile. Used for company identity, description, sector, and current price.

**Request**
```
GET /api/company/AAPL
```

**Response** — `Array` containing one profile object (FMP returns an array; always use `[0]`)

```jsonc
[
  {
    "symbol":            "AAPL",          // string
    "companyName":       "Apple Inc.",    // string | null
    "description":       "...",           // string | null — long-form company description
    "exchange":          "NASDAQ",        // string | null
    "currency":          "USD",           // string | null
    "country":           "US",            // string | null — ISO 2-letter code
    "sector":            "Technology",   // string | null
    "industry":          "Consumer Electronics", // string | null
    "marketCap":         3833365695626,  // number | null — raw dollars
    "beta":              1.116,          // number | null
    "eps":               null,           // number | null — not available from FMP /profile
    "pe":                null,           // number | null — not available from FMP /profile
    "sharesOutstanding": null,           // number | null — not available from FMP /profile
    "fullTimeEmployees": 164000,         // number | null
    "price":             260.81          // number | null — last known price
  }
]
```

**Null conditions**
- `eps`, `pe`, `sharesOutstanding` are always `null` — FMP's `/profile` endpoint does not include them. Source these from `analysis.coreMetrics.eps` and `analysis.coreMetrics.peRatio`.
- All other fields are `null` if absent from the provider response.

---

### `GET /api/analysis/:ticker`

Returns the full analysis result. This is the primary data source for the company page.
Runs the full pipeline on first request; subsequent requests respect `ANALYSIS_CACHE_TTL_MS` (default 24 h).

**Request**
```
GET /api/analysis/AAPL
GET /api/analysis/AAPL?force=true    // bypass disk cache, rerun pipeline
```

**Response**

```jsonc
{
  "ticker":       "AAPL",        // string — always uppercase
  "analysisDate": "2026-03-12",  // string — YYYY-MM-DD, date analysis was last computed

  "coreMetrics": {
    "sharpeRatio":   -0.9562,  // number (4 dp) | null — annualised Sharpe from daily returns
    "roe":            1.5191,  // number (4 dp) | null — net income / shareholders equity (ratio, not %)
    "debtToEquity":   1.5241,  // number (4 dp) | null — total debt / shareholders equity
    "peRatio":        34.82,   // number (2 dp) | null — current price / EPS
    "eps":             7.49    // number (2 dp) | null — earnings per share (dollars)
  },

  "dcf": {
    "intrinsicValuePerShare": 94.87,   // number (2 dp) | null — DCF fair value estimate
    "currentPrice":          260.81,   // number | null — price used as baseline
    "upDownside":            "-63.6%", // string | null — formatted as "+X.X%" or "-X.X%"
    "assumedGrowthRate":       0.0328, // number — decimal (0.0328 = 3.28%)
    "assumedWACC":             0.1,    // number — decimal (0.1 = 10%)
    "terminalGrowthRate":      0.03,   // number — decimal (0.03 = 3%)
    "growthRateSource":  "fmp_historical", // string — "fmp_historical" | "fmp_historical_clamped" | "default"
    "projectedFreeCashFlows": [        // number[] — 5 projected annual FCFs, rounded to integers
      102006557600,
      105352372689,
      108807930513,
      112376830634,
      116062790679
    ],
    "flags": []                        // string[] — DCF-specific warnings
  },

  "technicals": {
    "currentPrice":      260.81,   // number | null
    "ma50":              263.53,   // number (2 dp) | null — 50-day moving average
    "ma200":             245.03,   // number (2 dp) | null — 200-day moving average
    "rsi14":              45.4,    // number (2 dp) | null — 14-period RSI, range 0–100
    "momentumSignal":   "mixed",   // "bullish" | "bearish" | "mixed" | null
    "priceVsMa50Pct":   "-1.0%",  // string | null — formatted as "+X.X%" or "-X.X%"
    "priceVsMa200Pct":  "+6.4%"   // string | null
  },

  "flags": [],  // string[] — pipeline-level warnings (fetch failures, data gaps, skipped calcs)

  "metadata": {
    "dataSource":          "fmp_direct",  // "fmp_direct" | "pre_collected"
    "historicalPriceDays": 252            // number — trading days of price history used
  }
}
```

**Null conditions for `coreMetrics`**
| Field | Null when |
|---|---|
| `sharpeRatio` | Fewer than 2 days of price history, or zero variance in returns |
| `roe` | `netIncome` or `shareholderEquity` missing from statements |
| `debtToEquity` | `totalDebt` or `shareholderEquity` missing |
| `peRatio` | `currentPrice` or `eps` is null or zero |
| `eps` | Not in quote response and not in income statement |

**Null conditions for `dcf`**
| Field | Null when |
|---|---|
| `intrinsicValuePerShare` | FCF is negative, FCF is missing, or `sharesOutstanding` cannot be derived |
| `upDownside` | Either `intrinsicValuePerShare` or `currentPrice` is null |

**`flags[]` examples**
- `"Sharpe ratio: No returns data provided"` — price history empty
- `"DCF skipped: negative free cash flow ($-2.30B) — model requires positive FCF"`
- `"Net debt: totalDebt missing from balance sheet, assumed 0"`
- `"Income statement fetch failed: FMP_RATE_LIMITED: All 1 key(s) rate limited"`

**`momentumSignal` logic**
- `"bullish"` — price > MA50 > MA200
- `"bearish"` — price < MA50 < MA200
- `"mixed"` — any other arrangement
- `null` — any of price, MA50, MA200 is null

---

### `GET /api/technicals/:ticker`

Subset of the analysis response. Served from `data/{TICKER}-analysis.json` on disk if file is
fresh (within `ANALYSIS_CACHE_TTL_MS`); otherwise reruns the full pipeline.

**Request**
```
GET /api/technicals/AAPL
GET /api/technicals/AAPL?force=true
```

**Response**
```jsonc
{
  "ticker": "AAPL",
  "technicals": {
    // identical shape to analysis.technicals — see above
  },
  "flags": []  // string[] — pipeline warnings, same as analysis.flags
}
```

---

### `GET /api/metrics/:ticker`

Subset of the analysis response. Same disk-reuse logic as `/api/technicals`.

**Request**
```
GET /api/metrics/AAPL
GET /api/metrics/AAPL?force=true
```

**Response**
```jsonc
{
  "ticker": "AAPL",
  "coreMetrics": {
    // identical shape to analysis.coreMetrics — see above
  },
  "flags": []  // string[] — pipeline warnings
}
```

---

### `GET /health`

```jsonc
{ "status": "ok" }                        // real backend
{ "status": "ok", "mode": "fixture" }     // fixture server
```

---

## Company Page Data Model

The company page requires two API calls. Fetch in parallel.

```
GET /api/company/:ticker   →  identity, description, sector, market cap
GET /api/analysis/:ticker  →  price, metrics, valuation, technicals, freshness
```

**Field mapping for UI components**

| UI element | Source field |
|---|---|
| Company name | `company[0].companyName` |
| Ticker + exchange | `company[0].symbol`, `company[0].exchange` |
| Sector / industry | `company[0].sector`, `company[0].industry` |
| Description | `company[0].description` |
| Current price | `analysis.technicals.currentPrice` |
| Market cap | `company[0].marketCap` |
| Beta | `company[0].beta` |
| P/E ratio | `analysis.coreMetrics.peRatio` |
| EPS | `analysis.coreMetrics.eps` |
| ROE | `analysis.coreMetrics.roe` |
| Debt/Equity | `analysis.coreMetrics.debtToEquity` |
| Sharpe ratio | `analysis.coreMetrics.sharpeRatio` |
| DCF intrinsic value | `analysis.dcf.intrinsicValuePerShare` |
| Up/downside | `analysis.dcf.upDownside` |
| Growth rate used | `analysis.dcf.assumedGrowthRate` |
| WACC used | `analysis.dcf.assumedWACC` |
| MA50 / MA200 | `analysis.technicals.ma50`, `analysis.technicals.ma200` |
| RSI | `analysis.technicals.rsi14` |
| Momentum signal | `analysis.technicals.momentumSignal` |
| Data freshness | `analysis.analysisDate` (YYYY-MM-DD) |
| Pipeline warnings | `analysis.flags` |

**Formatting conventions** (applied by backend, pass through as-is)
- Percentage strings: `"+6.4%"` / `"-63.6%"` — always include sign, one decimal place
- `roe` and `debtToEquity` are ratios, not percentages — multiply by 100 to display as %
- `assumedGrowthRate`, `assumedWACC`, `terminalGrowthRate` are decimals — multiply by 100 for display
- `marketCap` is raw dollars — format as `$3.83T` / `$482B` in the UI
- `projectedFreeCashFlows` are raw integers in dollars — format as `$102.0B` etc.

---

## Fixture Files

Located at `data/fixtures/{TICKER}/`. Files are committed to the repo.

```
data/fixtures/
└── AAPL/
    ├── company.json      → /api/company/AAPL
    ├── analysis.json     → /api/analysis/AAPL
    ├── technicals.json   → /api/technicals/AAPL
    └── metrics.json      → /api/metrics/AAPL
```

**To add a new ticker fixture:**
1. Create `data/fixtures/{TICKER}/`
2. Copy and adjust the AAPL files with the new ticker's data
3. The fixture server picks them up automatically — no code changes

---

## Staleness and Caching

The real backend manages three cache layers:

| Layer | TTL | Location |
|---|---|---|
| Provider API responses | 15 min (quote), 24 h (prices), 7 days (statements) | `data/cache/{TICKER}-*.json` |
| Full analysis file | 24 h (configurable via `ANALYSIS_CACHE_TTL_MS`) | `data/{TICKER}-analysis.json` |
| Fixture files | Never expire | `data/fixtures/{TICKER}/*.json` |

The frontend can detect analysis freshness via `analysis.analysisDate` (YYYY-MM-DD).
Use `?force=true` to request a full refresh (will make provider API calls).

The fixture server has no caching — it always reads from disk at request time.
