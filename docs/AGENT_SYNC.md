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
