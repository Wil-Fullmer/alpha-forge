# Branch Handoff: claude/tender-stonebraker

> State as of 2026-03-17. Not yet merged to main.

---

## What This Branch Contains

### Backend stabilization

The live request flow now matches the intended cache-first architecture documented in `docs/ARCHITECTURE.md`.

| Component | File | What changed |
|---|---|---|
| FMP normalization | `src/services/normalizers/fmp.js` | Five idempotent normalizers applied before every cache write — raw FMP field names never leak past the cache boundary |
| Data assembly | `src/services/dataAssembler.js` | Extracted from `analysisRunner.js`; owns all fetching and normalization; `analysisRunner` only does math |
| CACHE_ENABLED wire | `src/services/financialData.js` | `CACHE_ENABLED=false` now actually bypasses cache (was documented but ignored) |
| Budget guard | `src/services/financialData.js` | In-process counter warns at `MAX_PROVIDER_CALLS` (default 20) per session |
| Partial endpoint safety | `src/web/server.js` | `/api/technicals` and `/api/metrics` read from disk when a fresh analysis file exists; no full-pipeline re-run |
| Analysis TTL | `src/web/server.js` | `getOrRunAnalysis()` checks `analysisDate` age against `ANALYSIS_CACHE_TTL_MS` (default 24 h); stale/malformed files are rerun |
| Integration tests | `tests/integration/analysisRunner.test.js` | Fixture-first by default (`data/AAPL-collected.json`); live tests gated by `RUN_LIVE_TESTS=1` |

### Frontend scaffold

A full Vite + React SPA lives in `frontend/`. No backend changes were needed for the frontend to function — it calls the same endpoints the SPA dashboard uses.

| Component | Path |
|---|---|
| App entry | `frontend/src/main.jsx`, `frontend/src/App.jsx` |
| Company page | `frontend/src/pages/CompanyPage.jsx` |
| Components | `frontend/src/components/{CompanyOverview,CoreMetrics,DcfValuation,Technicals,FlagsPanel}.jsx` |
| API client | `frontend/src/api/{client,company,analysis}.js` |
| Fixture switching | `frontend/src/fixtures.js`, `frontend/src/components/FixtureSelector.jsx` |
| Format helpers | `frontend/src/utils/format.js` |

### Fixture infrastructure

Frontend development requires no API key. Three fixture states cover the full surface of the UI:

| Fixture | Path | What it tests |
|---|---|---|
| AAPL happy-path | `data/fixtures/AAPL/` | All fields populated, positive values, real AAPL FY2025 numbers |
| AAPL null/flags | `data/fixtures/AAPL-null/` | All technical indicators null, DCF skipped, 6 flags active — tests null-state rendering |
| MSFT | `data/fixtures/MSFT/` | Second ticker, real MSFT numbers, cross-ticker switching |

### Fixture server

`src/web/fixture-server.js` — minimal HTTP server (port 3001) that mirrors the real API routes exactly. No pipeline, no API key.

### API contract

`docs/API_CONTRACT.md` — canonical reference for all endpoint shapes, types, null conditions, and company page field mapping.

---

## Why It Matters

1. **API safety.** Before this branch, any request to `/api/technicals` or `/api/metrics` re-ran the full FMP pipeline regardless of cached data. With 6+ provider calls per run and no budget guard, it was easy to exhaust free-tier rate limits accidentally.

2. **Frontend/backend separation.** The fixture server means frontend work can proceed without a live backend or API key. The `FixtureSelector` component lets a browser toggle between all three data states instantly.

3. **Test reliability.** Integration tests now run without provider calls by default. The live-test gate (`RUN_LIVE_TESTS=1`) prevents accidental API usage in CI.

---

## What Remains

See `TODO.md` → Current Sprint for the authoritative list. Summary:

- Wire real API calls in frontend (env toggle between fixture and live)
- Surface `analysisDate` staleness indicator in UI
- Surface `flags[]` warnings panel in UI
- Apply `analysisDate` TTL to `/api/analysis/:ticker` (currently always reruns)
- Ticker input validation at route level
- End-to-end smoke test: all three fixture variants render cleanly

---

## Setup on a New Machine

```bash
# 1. Clone and switch to branch
git clone <repo-url>
git checkout claude/tender-stonebraker

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Set up environment (API key only needed for live backend mode)
cp .env.example .env
# Edit .env and add FMP_API_KEY if using live pipeline

# 5. Start fixture server (no API key needed)
npm run web:fixtures
# → http://localhost:3001/api/analysis/AAPL should return JSON immediately

# 6. Start frontend dev server
cd frontend && npm run dev
# → http://localhost:5173 — company page with AAPL fixture data

# 7. Run tests (no API key needed)
npm test
```

**Live backend mode** (requires `FMP_API_KEY` in `.env`):
```bash
npm run web:dev           # backend on :3000
# In frontend, set VITE_API_URL=http://localhost:3000 before npm run dev
```

---

## Safe-by-Default Paths

| Mode | API key required | What runs |
|---|---|---|
| `npm run web:fixtures` | No | Static JSON from `data/fixtures/` |
| `npm test` | No | Fixture-first integration tests |
| `npm run web` / `npm run web:dev` | Yes | Full backend with FMP calls and TTL cache |
| `npm start -- AAPL` | Yes | CLI analysis pipeline |

The fixture server is intentionally isolated — it imports nothing from `src/services/`.

---

## What Is NOT Merged Into main

Everything in this branch is unreleased:

- All backend stabilization work (normalization, data assembly split, TTL, budget guard)
- Frontend scaffold (entire `frontend/` directory)
- Fixture server and fixture data
- API contract documentation
- Integration test fixture (`data/AAPL-collected.json`)
- `docs/BRANCH_HANDOFF.md` and `docs/WORKFLOW_CHECKPOINT_SKILL.md` (this file)

The `master` branch is at commit `071c4e7` (SPA dashboard / backend pipeline). A PR from this branch to master is the next milestone after the Current Sprint items are complete.
