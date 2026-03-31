#!/bin/bash
# Pre-push hook: blocks git push if TODO.md was not updated in the last commit.
# Receives Claude Code tool call JSON on stdin.

COMMAND=$(python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    cmd = data.get('tool_input', {}).get('command', '')
    print(cmd)
except Exception:
    print('')
")

case "$COMMAND" in
  *"git push"*)
    ;;
  *)
    exit 0
    ;;
esac

cd "$CLAUDE_PROJECT_DIR"

TODAY=$(date +%Y-%m-%d)

# Check 1: TODO.md must be in the most recent commit
if ! git log -1 --name-only --format="" | grep -q "^TODO\.md$"; then
  echo "BLOCKED: TODO.md was not updated in the last commit."
  echo ""
  echo "Before pushing, update TODO.md:"
  echo "  1. Set 'Current date:' to $TODAY"
  echo "  2. Check off completed sprint items"
  echo "  3. Update Current Status if project state changed"
  echo "  4. Update Current Sprint with the actual next steps"
  echo ""
  echo "Then commit TODO.md (new commit, not amend) and re-run the push."
  exit 2
fi

# Check 2: Date at top of TODO.md must be today
if ! grep -q "Current date: $TODAY" "$CLAUDE_PROJECT_DIR/TODO.md"; then
  echo "BLOCKED: TODO.md 'Current date:' is not today ($TODAY)."
  echo "Update the date at the top of TODO.md and commit before pushing."
  exit 2
fi

exit 0
