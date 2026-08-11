# Alpha Forge - Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-05-11

---

## Current Status

v2 shipped (2026-04-28). Final Valuation accuracy fixes applied (2026-05-11). Active branch: `v2`.
Next: verify live AAPL peer enrichment and continue v3 implementation roadmap in `vault/projects/alpha-forge/brainstorming.md`.

---

## Current Sprint

**Final Valuation accuracy fixes** - audit complete 2026-04-29, full findings in `vault/projects/alpha-forge/bugs/final-valuation-accuracy.md`

- [x] **FV-1** `dataAssembler.js assemblePeers()` - derive peer netDebt from totalDebt-cash when null; unlocks EV multiples for GOOGL/MSFT.
- [x] **FV-2** `DcfTab.jsx` - seed terminal P/E from a normalized 20x value instead of current market P/E.
- [x] **FV-3** `dataAssembler.js assemblePeers()` - add D&A fallback from cash flow statement for EBITDA when income statement D&A is null.
- [x] **FV-4** `dataAssembler.js assemblePeers()` - filter out peers with all-null financials (revenue/ebitda/netIncome all null).
- [x] **FV-5** `RelativeValuationTab.jsx` - change subject `netDebt` truthy check to `!= null`.

---

## Agent Board

### TODO

- [ ] **UX-1** Allow user to adjust decimal places for Revenue and Projections tabs (input or toggle - precision control per tab)

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

- Default `force=false` everywhere - cache is always preferred
- `CACHE_ENABLED=false` bypasses cache (dev/debug only - never set in production)
- `MAX_PROVIDER_CALLS=20` - logs a warning when provider HTTP calls exceed threshold per session
- `ANALYSIS_CACHE_TTL_MS=86400000` - analysis files older than 24 h are treated as stale and rerun
- Integration tests use `data/AAPL-collected.json` fixture by default - live tests require `RUN_LIVE_TESTS=1`
- Alpha Vantage fallback activates only when FMP returns 402/429/401/403 - not on first attempt
- Do not add retry loops, polling, or background refresh without an explicit budget check
