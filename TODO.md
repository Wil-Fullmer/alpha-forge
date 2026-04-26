# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-04-26 (updated)

---

## Current Status

Live app on `live-app-v1`. All 7 workbench tabs functional. Valuation pipeline hardened for
FMP-restricted tickers: SEC EDGAR capex fallbacks, DEI shares, Finnhub balance sheet fallback,
WACC guard rails. MXL DCF/WACC/net debt now accurate. Unit tests passing.

---

## Current Sprint

— empty —

---

## Agent Board

### TODO

— empty —

### BACKLOG

- **[DONE] AV key setup** — `Alpha_Vantage_KEYS` wired in `.env`. Key rotation implemented in
  `alphaVantage.js`: comma-separated keys, rotates on rate-limit, resets at midnight. Add more
  keys by appending to `Alpha_Vantage_KEYS=key1,key2,...` — no code changes needed.

- **Multi-company hardening** — Systematically test a cross-section of company types to find
  and fix data gaps. Execution plan (Phase 1):
  - Test matrix: SLAB (small-cap), O (REIT), JPM (bank), TSM (foreign 20-F), RDDT (recent IPO),
    MRNA (pre-revenue), ABNB (asset-light), BRK-B (holding company)
  - Known fix needed: SEC extractor filters `form === '10-K'` — must also accept `20-F` for
    foreign issuers (TSM, ASML)
  - REITs/banks: add sector flag "DCF not applicable" rather than full model
  - Goal: valid result OR clear ⚠ — never silently wrong
  - Do this BEFORE null-line UI notes (hardening reveals gap patterns that inform the notes)

- **Null-line UI notes** — After hardening, add inline context to frontend for null cells.
  Approach: backend passes `dataGaps` map `{ fieldName: "reason string" }`, frontend renders
  a small note next to N/A cells with a known cause. No hardcoded strings in frontend.

---

## Architecture Guardrails

These rules do not change without explicit decision:

- **Cache first.** Every provider fetch must check cache before making a network call. Force-refresh is opt-in only (`force=true` / `?force=true`).
- **Normalize at the boundary.** FMP and AV responses are normalized in `financialData.js` before being written to cache. `analysisRunner` must not depend on raw provider field names.
- **Data assembly is separate from analysis.** `dataAssembler.js` owns fetching and normalization. `analysisRunner.js` owns calculations and output. Do not re-merge them.
- **Routes are thin.** Business logic belongs in services. Routes parse input, call one service function, return output.
- **Pre-collected data is the fixture path.** `data/{TICKER}-collected.json` is how frontend dev and tests avoid live provider calls for statement data.

---

## API Usage Safeguards

- Default `force=false` everywhere — cache is always preferred
- `CACHE_ENABLED=false` bypasses cache (dev/debug only — never set in production)
- `MAX_PROVIDER_CALLS=20` — logs a warning when provider HTTP calls exceed threshold per session
- `ANALYSIS_CACHE_TTL_MS=86400000` — analysis files older than 24 h are treated as stale and rerun
- Integration tests use `data/AAPL-collected.json` fixture by default — live tests require `RUN_LIVE_TESTS=1`
- Alpha Vantage fallback activates only when FMP returns 402/429/401/403 — not on first attempt
- Do not add retry loops, polling, or background refresh without an explicit budget check
