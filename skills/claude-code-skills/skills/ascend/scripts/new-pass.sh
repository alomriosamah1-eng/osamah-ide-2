#!/usr/bin/env bash
# new-pass.sh — start one pass on its own branch off the integration branch.
# Usage:  new-pass.sh N AXIS-SLUG
#   e.g.  new-pass.sh 1 ia-boards
set -euo pipefail

N="${1:?pass number required}"
AXIS="${2:?axis slug required}"
BRANCH="ascend/pass-${N}-${AXIS}"

# snapshot mode (init.sh --snapshot): NO git ops — the target may sit inside an
# unrelated outer repo. Take a per-pass snapshot instead; edits happen in place.
if [ -d ".ascend/snapshot" ]; then
  DEST=".ascend/snapshot-pass-${N}"
  mkdir -p "$DEST" ".ascend/shots/pass-${N}"
  rsync -a --exclude .ascend --exclude .git --exclude node_modules --exclude dist \
        --exclude build --exclude .next --exclude .expo --exclude Pods ./ "$DEST/"
  echo "pass $N (snapshot mode): pre-pass state saved to $DEST — BUILD edits in place."
  echo "REVERT this pass only: see .ascend/REVERT.md (use $DEST/ as the source)."
  exit 0
fi

git checkout ascend/integration >/dev/null 2>&1 || {
  echo "no ascend/integration branch — run init.sh first"; exit 2; }
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
mkdir -p ".ascend/shots/pass-${N}"
echo "pass $N on branch $BRANCH (forked from ascend/integration)"
echo "BUILD here; commit to this branch only. APPROVE -> merge --no-ff into integration. REVERT -> abandon branch."
