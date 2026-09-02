# Loop state · lint-fix

## Last run
— (not yet run, event-triggered on PR-open)

## Health
- maturity: shadow
- status: active
- behavior-neutral streak: 0 (formatting-only diffs; auto-trivial-eligible once proven)

## Escalated to humans
- lint errors that need a real fix (not autofixable): none yet

## Lessons learned (write here, not in chat)
<!-- advisory only -->

## Stop conditions
- gate: autofix leaves `npx tsc --noEmit` + `npm test` green; diff is formatting-only
- hard stops: per-event wall-clock; no behavior-changing rules
