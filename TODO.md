# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-04-28 (updated)

---

## Current Status

v2 UI overhaul active. Active branch: `v2`.

Shipped 2026-04-28 (this session):
- Conviction Toggle now affects valuation — re-seeds AssumptionsContext with scenario multipliers
  (CONS: growth ×0.75, COGS ×1.05, CAPEX ×1.10, WACC +50bps, EV/EBITDA −1, P/E −2;
   AGG: opposite; grid centers shift live in DCF sensitivity heat maps)
- Aggressive palette fully red (--color-accent red across sparklines, tabs, inputs, header glow)
- Friendly error messages — 404 maps to "No data found for X" in hook layer, raw API strings never reach UI
- Branch switched from live-app-v1 to v2 as primary working branch

Shipped 2026-04-27/28 (prior sessions):
- Cmd+K global command bar, Conviction Toggle, Liquid Gauge, Theme switcher
- 12-row micro-sparklines (Projections tab income statement)
- DCF cockpit band (price / FCFF / FCFE / range bar / market-zone cells)
- API-limited gate screen (SEC-only mode)
Landing page has full-screen video background (`hero-bg.mp4`) + glassmorphism card.

---

## Current Sprint

- **Begin v2 UI overhaul** — Landing page video background complete (proof of concept).
  Next: full workbench tab redesign, typography refresh, component visual pass.

- **[DONE] UI redesign layer (from Gemini brainstorm 2026-04-27)** — All 4 items shipped:
  1. ✅ Cmd+K global command bar
  2. ✅ Conviction Toggle (Conservative / Base / Aggressive)
  3. ✅ Margin of Safety Liquid Gauge (Final Valuation tab)
  4. ✅ Theme switcher: Gold / Oxidized Copper / Monolithic Slate
  Full spec: `vault/projects/alpha-forge/design-specs/ui-redesign-brainstorm-2026-04-27.md`

- **[DONE] Micro-sparklines** — All 12 income statement rows in Projections tab have inline SVG sparklines.
  Pure SVG MiniSparkline component (no Recharts). Semantic colors: accent=revenue, positive=gross/op/net income,
  negative=COGS/tax, auto=others. Spark column isolated to Income Statement section; Common Size and
  Other Forecasted Terms use colHeadersNoSpark to avoid column misalignment.

- **[DONE] DCF cockpit** — Cockpit banner bar (current price | FCFF/FCFE intrinsic + upside | price range bar
  across sensitivity span). Sensitivity grids moved above FCF table. FCF Projection Model collapsible
  (default closed). Market-zone highlight (±5%) on heat map cells.

- **[DONE] API-limited gate screen** — Blocks workbench when analysis.technicals.currentPrice is null
  but historical financials exist (SEC data available). Two options: "View SEC Data" (Assumptions +
  Revenue + Projections tabs only) or "Return to Search". SEC-mode banner with "Change view" dismiss.

- **[DONE] Conviction Toggle valuation wiring** — AssumptionsContext re-seeds with scenario multipliers
  on conviction change. DcfTab sensitivity grid centers shift by conviction deltas. Aggressive palette
  fully red across all --color-accent consumers.

- **[DONE] Friendly error messages** — 404 mapped to "No data found for X" in useCompanyPage hook.
  Dev fixture hint removed from error screen. Raw API strings never reach UI.

- **Next visual pass** — projected column visual refinements. DCF cockpit further polish.

---

## Agent Board

### TODO

— empty —

### BACKLOG

- **[DONE] AV key setup** — `Alpha_Vantage_KEYS` wired in `.env`. Key rotation implemented in
  `alphaVantage.js`: comma-separated keys, rotates on rate-limit, resets at midnight. Add more
  keys by appending to `Alpha_Vantage_KEYS=key1,key2,...` — no code changes needed.

- **[DONE] Multi-company hardening** — Tested SLAB, O, JPM, TSM, RDDT, MRNA, ABNB, BRK-B.
  Fixes: 20-F filter, IFRS detection, asset-light capex concept, share count cross-check,
  REIT/bank sector flags, AV rate-limit/plan-restriction disambiguation, hyphen ticker support.
  Remaining known gap: TSM/foreign-filer FX normalization (TWD→USD via AV rate, live in prod).

- **[DONE] Null-line UI notes** — `dataGaps` map in analysis output, `DataGapNote.jsx` badge
  component with tooltip, wired into MarketSnapshot (P/E, EPS), CoreMetrics (ROE, D/E),
  Technicals (degraded state message). No hardcoded strings in frontend.

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
