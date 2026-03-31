# Agent Sync Guide

This project keeps Claude agent definitions as the source of truth in:

- `.claude/agents/*.md`

Codex uses a mirrored copy in:

- `.codex/agents/*.md`

This design allows both tools to work in cohesion without changing or removing Claude files.

## Safety Rules

- Never edit or delete files under `.claude/agents` as part of mirror sync.
- Sync only copies `*.md` files from `.claude/agents` into `.codex/agents`.
- Every sync run verifies SHA-256 hashes between source and mirror.
- Sync fails with a non-zero exit code if any file differs after copy.

## Sync Command

Run from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-agents.ps1
```

Optional custom paths:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-agents.ps1 -SourceDir ".claude/agents" -MirrorDir ".codex/agents"
```

## Expected Result

- `Agent mirror verification OK.`
- Table of filenames and hashes.

## Session Handoff Protocol

Use this when switching between Codex and Claude:

1. Start of session:
- Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\session-start.ps1
```

This prints branch/status, latest handoff context, ownership scope, and runs handoff checks.

2. End of session:
- Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\session-end.ps1 -Agent codex
```

For Claude handoff:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\session-end.ps1 -Agent claude
```

`session-end.ps1` behavior:
- If there are no workspace changes, it exits fast and skips worklog append.
- If there are changes, it auto-appends a worklog entry from git state and runs checks.

Checks validate:
- `TODO.md` date is current
- `docs/WORKLOG.md` has an entry for today
- latest worklog entry has `Owns Next` and `Do Not Touch`
- `.claude/agents` and `.codex/agents` hashes are in sync

## Automation Notes

- Claude remote sessions auto-run `.claude/hooks/session-start.sh`, which now calls `scripts/session-start.ps1`.
- Codex can be run with:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\codex-auto.ps1
```

This wraps Codex with automatic `session-start` and `session-end` handling.
- Git push is now guarded for both tools via `.githooks/pre-push`, which runs `scripts/handoff-check.ps1`.

## Recommended Commands

- Claude session start: automatic via hook (remote Claude sessions)
- Codex session start+end (automatic wrapper):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\codex-auto.ps1
```

- Manual session end (if needed):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\session-end.ps1 -Agent codex
```

## Usage-Limit Switchover

Single command handoff:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-handoff.ps1 -From claude -To codex
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-handoff.ps1 -From codex -To claude
```

Reference phrases and mapping are documented in `docs/USAGE_FAILOVER_SKILL.md`.
