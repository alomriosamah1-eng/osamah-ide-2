# Loop state · nightly-polish

## Last run
— (not yet run)

## Health
- maturity: shadow
- status: active
- work_health: accept_rate=null · loop_health=ok
- consecutive_failures: 0 · consecutive_empty_runs: 0
- unread_loc_debt: 0

## Escalated to humans
- TASTE-class refinements awaiting your call: none yet

## Lessons learned (write here, not in chat)
<!-- advisory only — never alters gates/scopes/approval -->

## Stop conditions
- gate: `npm test && npx tsc --noEmit` exit 0; independent checker agrees
- hard stops: max-iterations 20 · per-run token budget · wall-clock 30m
