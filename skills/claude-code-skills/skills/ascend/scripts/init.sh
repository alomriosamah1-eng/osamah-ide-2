#!/usr/bin/env bash
# init.sh — set up the /ascend working area safely, ONCE, before the loop.
# Order matters: stash the dirty tree FIRST, then branch, then COMMIT the
# .gitignore entry on the integration branch — so .ascend/ is really ignored,
# is committed (not floating in the working tree), and survives the stash.
#
# Usage:  init.sh [BASE_BRANCH]      (BASE defaults to the current branch)
#         init.sh --snapshot         (copy-snapshot isolation: no git required — for
#                                     non-repo targets or targets nested in a larger repo)
# After this, call:  state.py init --scope ... --loops N --stack ...
set -euo pipefail

SNAPSHOT="no"
BASE=""
for arg in "$@"; do
  case "$arg" in
    --snapshot) SNAPSHOT="yes" ;;
    *) BASE="$arg" ;;
  esac
done

# --- snapshot mode: revert = restore the copy; works with or without git ---------
if [ "$SNAPSHOT" = "yes" ]; then
  if [ -d ".ascend/snapshot" ]; then
    echo "SNAPSHOT-EXISTS: .ascend/snapshot already holds this run's baseline — re-running"
    echo "  would silently redefine the whole-run revert point. Resume the loop instead,"
    echo "  or remove .ascend/ first to intentionally restart."
    exit 2
  fi
  mkdir -p .ascend/snapshot .ascend/shots
  rsync -a --exclude .ascend --exclude .git --exclude node_modules --exclude dist \
        --exclude build --exclude .next --exclude .expo --exclude Pods ./ .ascend/snapshot/
  cat > .ascend/REVERT.md <<'EOF'
# Revert this /ascend run (snapshot mode) — run from the target root
rsync -a --delete --exclude .ascend --exclude .git --exclude node_modules --exclude dist \
      --exclude build --exclude .next --exclude .expo --exclude Pods .ascend/snapshot/ ./
# Per-pass revert: same command with .ascend/snapshot-pass-N/ as the source.
EOF
  echo "snapshot mode: baseline copied to .ascend/snapshot (revert: see .ascend/REVERT.md)"
  echo "NOTE: no branches created — passes edit in place; the snapshot is the revert."
  echo "WARNING: .ascend/ is NOT gitignored in this mode. If this directory is published"
  echo "or synced elsewhere (e.g. a skills library), keep loop state OUTSIDE the target."
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "NOT-A-GIT-REPO: /ascend needs version control for safe, revertible passes."
  echo "  -> run 'git init && git add -A && git commit -m baseline' first, OR"
  echo "  -> re-run as 'init.sh --snapshot' for copy-snapshot isolation. Do NOT auto-apply without revert."
  exit 2
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "NO-COMMITS-YET: make an initial commit so passes are revertible."
  echo "  -> git add -A && git commit -m baseline"
  exit 2
fi

# --- refuse branch machinery when the target is nested inside a LARGER repo -------
# (e.g. a skills dir inside a home-directory repo): stash/branch here would touch
# UNRELATED work in the outer repo. Detected = git toplevel != this directory.
TOPLEVEL="$(git rev-parse --show-toplevel)"
TARGET="$(pwd -P)"
if [ "$TOPLEVEL" != "$TARGET" ]; then
  echo "NESTED-IN-LARGER-REPO: this directory sits inside a repo rooted at:"
  echo "    $TOPLEVEL"
  echo "  Branching/stashing would touch UNRELATED work in that repo."
  echo "  -> re-run as 'init.sh --snapshot' for copy-snapshot isolation, OR"
  echo "  -> if the WHOLE repo is the target (monorepo subdir), run init.sh from the repo"
  echo "     root instead and scope the passes to this subpath."
  exit 2
fi

# capture the base branch BEFORE we move off it
[ -z "$BASE" ] && BASE="$(git rev-parse --abbrev-ref HEAD)"

# 1) quarantine a dirty tree FIRST so each pass diff contains ONLY ascend's changes
STASHED="no"
if [ -n "$(git status --porcelain)" ]; then
  git stash push -u -m "ascend: pre-loop stash $(git rev-parse --short HEAD)" >/dev/null
  STASHED="yes"
  echo "dirty tree stashed (git stash) — restore with 'git stash pop' after the loop"
fi

# 2) integration branch off BASE (accepted passes merge here; main untouched until SYNTH)
git checkout -b ascend/integration "$BASE" 2>/dev/null || git checkout ascend/integration

# 3) gitignore .ascend/ and COMMIT it on the integration branch (real + survives the stash)
if [ ! -f .gitignore ] || ! grep -qxF ".ascend/" .gitignore 2>/dev/null; then
  printf '\n# /ascend working artifacts\n.ascend/\n' >> .gitignore
  git add .gitignore
  git commit -m "ascend: ignore working artifacts (.ascend/)" >/dev/null
  echo "committed .ascend/ to .gitignore on ascend/integration"
fi

mkdir -p .ascend/shots
echo "integration branch: ascend/integration (base=$BASE, stashed=$STASHED)"
echo "NOTE: /ascend works on shared-tree BRANCHES (not isolated worktrees) — that is why a dirty tree is stashed."
