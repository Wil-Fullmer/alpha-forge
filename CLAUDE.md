# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## API Key Handling

The FMP API key is stored in the .env file as FMP_API_KEY.
Use this key only for authorized Financial Modeling Prep API requests.
Never print, reveal, repeat, log, or echo the API key in responses, code output, terminal output, or comments.
Never hardcode the API key into source files.
Prefer reading the key from environment variables at runtime.

## TODO.md Update Policy

Before every `git push`, TODO.md must be updated and included in the most recent commit.

Required updates:
1. Set `Current date:` at the top to today's date (YYYY-MM-DD)
2. Check off any sprint items completed in the commits being pushed
3. Update `Current Status` if the project state changed
4. Update `Current Sprint` with the actual next steps (not what was just finished)

A pre-push hook enforces this. If TODO.md is missing from the last commit or its date
is not today, the push will be blocked with instructions. Update TODO.md, commit it
(new commit — do not amend), then re-run the push.

See docs/WORKFLOW_CHECKPOINT_SKILL.md Section 3 for the full checklist.

## Claude and Codex Interop

Claude agent files in `.claude/agents/` are the canonical source.
Codex consumes a mirrored copy in `.codex/agents/` so both tools stay aligned.
Use `scripts/sync-agents.ps1` to refresh the mirror and verify file hashes.
See `docs/AGENT_SYNC.md` for the full process.
For session continuity, append handoff notes to `docs/WORKLOG.md`.

## Current Audit Artifacts

Latest workbook-fidelity audit deliverables live in `logs/`:
- `logs/master-lineage.md`
- `logs/audit-report.html`
- `logs/lineage.json`
- `logs/executive-summary.md`

These files compare Alpha Forge against the Summit Fund HW1 workbook using the AAPL fixture path and should be treated as the current reference for architecture gaps before any refactor or model-unification work begins.
