#!/usr/bin/env bash
# elon-vision phase 3: runtime instrumentation and coverage, where the stack allows.
#
#   measure.sh [--dry-run] [--coverage a.ts,b.ts] [PATH]
#
# Prints JSON on stdout. Every value is MEASURED or ABSENT. Never inferred.
# Exits 0 even when nothing can be measured: ABSENT is a valid, reportable answer.

set -uo pipefail

ROOT=""; DRY=0; COV_FILES=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)   DRY=1; shift ;;
    --coverage)  shift; IFS=',' read -r -a COV_FILES <<< "${1:-}"; shift ;;
    --coverage=*) IFS=',' read -r -a COV_FILES <<< "${1#*=}"; shift ;;
    -h|--help)   sed -n '2,9p' "$0"; exit 0 ;;
    --)          shift ;;
    -*)          shift ;;                      # unknown flag: ignore, never a path
    *)           ROOT="$1"; shift ;;
  esac
done
ROOT="${ROOT:-.}"
# A bare "--" or an empty arg once became ROOT, and `cd --` lands in $HOME,
# which turns a scoped scan into a recursive walk of the entire home directory.
case "$ROOT" in ""|"--"|"~") ROOT="." ;; esac
[ -d "$ROOT" ] || { echo "{\"error\":\"no such path: $ROOT\"}"; exit 0; }
cd "$ROOT" 2>/dev/null || { echo "{\"error\":\"cannot enter: $ROOT\"}"; exit 0; }

emit=()
add() { emit+=("\"$1\":$2"); }
str() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

run_timed() {           # run_timed <label> <cmd...>  -> ms, or ABSENT
  local label="$1"; shift
  if ! command -v "$1" >/dev/null 2>&1; then echo "ABSENT"; return; fi
  if [ "$DRY" = "1" ]; then echo "DRY:$*"; return; fi
  local s e
  s=$(python3 -c 'import time;print(int(time.time()*1000))')
  "$@" >/dev/null 2>&1 || { echo "ABSENT"; return; }
  e=$(python3 -c 'import time;print(int(time.time()*1000))')
  echo $((e - s))
}

# ---- profile -------------------------------------------------------------
PROFILE="unknown"
if [ -f package.json ]; then
  if   grep -q '"react-native"' package.json 2>/dev/null; then PROFILE="react-native"
  elif grep -q '"next"'         package.json 2>/dev/null; then PROFILE="nextjs"
  elif grep -q '"react"'        package.json 2>/dev/null; then PROFILE="react-web"
  else PROFILE="node"; fi
elif [ -f Package.swift ];   then PROFILE="swift"
elif [ -f Cargo.toml ];      then PROFILE="rust"
elif [ -f go.mod ];          then PROFILE="go"
elif [ -f pyproject.toml ] || [ -f requirements.txt ]; then PROFILE="python"
fi
add profile "\"$PROFILE\""

# ---- cycle time: what a change actually costs to verify -------------------
TYPECHECK="ABSENT"; TEST="ABSENT"; BUILD="ABSENT"
case "$PROFILE" in
  react-native|nextjs|react-web|node)
    [ -f tsconfig.json ] && TYPECHECK=$(run_timed typecheck npx tsc --noEmit)
    grep -q '"test"' package.json 2>/dev/null && TEST=$(run_timed test npm test --silent)
    ;;
  rust)   TYPECHECK=$(run_timed typecheck cargo check); TEST=$(run_timed test cargo test) ;;
  go)     TYPECHECK=$(run_timed typecheck go vet ./...); TEST=$(run_timed test go test ./...) ;;
  python) TEST=$(run_timed test python3 -m pytest -q) ;;
esac
add cycle_typecheck_ms "\"$TYPECHECK\""
add cycle_test_ms      "\"$TEST\""
add cycle_build_ms     "\"$BUILD\""

# ---- bundle size: COUNTED, not measured ----------------------------------
BUNDLE="ABSENT"
for f in dist/*.js build/static/js/*.js .next/static/chunks/*.js; do
  [ -f "$f" ] || continue
  BUNDLE=$( { du -kc dist/*.js build/static/js/*.js .next/static/chunks/*.js 2>/dev/null \
              | tail -1 | awk '{print $1}'; } )
  break
done
add bundle_kb "\"$BUNDLE\""

# ---- runtime perf harness present? ---------------------------------------
# Every scan below is bounded. An unbounded recursive grep on a real repo walks
# node_modules and never returns, which turns "measure it" into "hang forever".
PRUNE=( -name node_modules -o -name .git -o -name Pods -o -name build -o -name dist
        -o -name .next -o -name .expo -o -name vendor -o -name DerivedData )
GREP_EX=( --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=Pods
          --exclude-dir=build --exclude-dir=dist --exclude-dir=.next
          --exclude-dir=.expo --exclude-dir=vendor --exclude-dir=DerivedData )

HARNESS="ABSENT"
if [ -d .maestro ] || [ -f lighthouserc.json ] || [ -f .lighthouserc.js ]; then
  HARNESS="present"
elif [ -n "$(find . \( "${PRUNE[@]}" \) -prune -o \
             \( -name '*.perf.*' -o -name '*benchmark*' -o -name '*.bench.*' \) \
             -print -quit 2>/dev/null)" ]; then
  HARNESS="present"
elif grep -rqsI "${GREP_EX[@]}" -e "XCTMetric" -e "measure(metrics" \
     --include="*.swift" . 2>/dev/null; then
  HARNESS="present"
elif grep -rqsI "${GREP_EX[@]}" -e "performance.mark" -e "PerformanceObserver" \
     --include="*.ts" --include="*.tsx" . 2>/dev/null; then
  HARNESS="partial"
fi
add perf_harness "\"$HARNESS\""

# ---- coverage on the files a move would touch ----------------------------
# Green tests over uncovered code prove nothing, so this gates apply, not report.
# One pass, not one per file. Grepping the whole tree per candidate file took
# 2m37s for four files; indexing the test corpus once takes about a second.
COV="\"ABSENT\""
if [ ${#COV_FILES[@]} -gt 0 ]; then
  total=${#COV_FILES[@]}
  tests=$(mktemp); stems=$(mktemp); hits=$(mktemp)
  trap 'rm -f "$tests" "$stems" "$hits"' EXIT

  find . \( "${PRUNE[@]}" \) -prune -o \
       \( -name '*.test.*' -o -name '*.spec.*' -o -name 'test_*.py' \
          -o -name '*_test.go' -o -name '*Tests.swift' \) -print \
       > "$tests" 2>/dev/null

  for f in "${COV_FILES[@]}"; do
    base=$(basename "$f"); printf '%s\n' "${base%.*}"
  done | sort -u > "$stems"

  if [ -s "$tests" ] && [ -s "$stems" ]; then
    tr '\n' '\0' < "$tests" \
      | xargs -0 grep -hoIF -f "$stems" -- 2>/dev/null \
      | sort -u > "$hits"
  fi
  covered=$(wc -l < "$hits" | tr -d ' ')
  COV="{\"covered\":${covered:-0},\"total\":$total,\"test_files\":$(wc -l < "$tests" | tr -d ' ')}"
fi
add coverage "$COV"

printf '{'; printf '%s' "$(IFS=,; echo "${emit[*]}")"; printf '}\n'
