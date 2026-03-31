# Usage Failover Skill

Purpose: one-command assistant switchover when usage is low.

## Trigger Phrase

Use either phrase with the active assistant:

- `usage is about to run out, prepare to move to codex`
- `usage is about to run out, prepare to move to claude`

## Command Mapping

From Claude to Codex:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-handoff.ps1 -From claude -To codex
```

From Codex to Claude:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-handoff.ps1 -From codex -To claude
```

## Behavior

- Runs `session-end` for the current side.
- If no changes happened, it fast-skips handoff entry append.
- For `-> codex`, launches the Codex wrapper with automatic start/end.
- For `-> claude`, pre-runs shared start checks and prepares the baton.

## Notes

- Claude remote sessions already run startup hook checks automatically.
- Codex startup is automatic when launched via `scripts/codex-auto.ps1`.
