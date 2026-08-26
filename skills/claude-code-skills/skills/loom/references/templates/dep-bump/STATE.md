# Loop state · dep-bump

## Last run
— (not yet run)

## Health
- maturity: shadow
- status: active
- work_health: accept_rate=null · loop_health=ok
- consecutive_failures: 0 · consecutive_empty_runs: 0
- unread_loc_debt: 0

## In progress
- none

## Completed today
- none

## Escalated to humans
- none

## Lessons learned (write here, not in chat)
<!-- advisory only — never alters gates/scopes/approval (security-model.md §7) -->
- (example) a package whose tests require a live secret → mark skip-in-sandbox, file for human.

## Stop conditions
- gate: `npm test && npx tsc --noEmit` exit 0
- hard stops: max-iterations 20 · per-run token budget · wall-clock 30m · max 3 merges/run
