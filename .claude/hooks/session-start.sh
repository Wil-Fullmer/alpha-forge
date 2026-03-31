#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

npm install

# Shared cross-tool bootstrap: print latest handoff context + validate sync/checks.
if command -v powershell >/dev/null 2>&1; then
  powershell -ExecutionPolicy Bypass -File "$CLAUDE_PROJECT_DIR/scripts/session-start.ps1" || true
fi
