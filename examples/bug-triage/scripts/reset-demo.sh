#!/usr/bin/env bash
set -euo pipefail

# Safety guard: refuse if there are uncommitted changes OUTSIDE examples/bug-triage/
if git status --porcelain | grep -vE '^.. examples/bug-triage/' | grep -q .; then
  echo "reset-demo.sh: refusing — uncommitted changes outside examples/bug-triage/"
  echo "Commit, stash, or revert them first."
  exit 1
fi

# Restore the skeleton
git checkout -- examples/bug-triage/
git clean -fd examples/bug-triage/.deliveryos-handoff/ 2>/dev/null || true

# Remove the four files the demo run creates
rm -f examples/bug-triage/src/backend/api/bugs.py
rm -f examples/bug-triage/src/backend/models/bug_report.py
rm -f examples/bug-triage/src/backend/services/bug_report_service.py
rm -f examples/bug-triage/tests/integration/test_bugs_api.py

echo "Demo reset complete."
