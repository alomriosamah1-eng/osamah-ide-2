# Loop state · coverage-ratchet

## Last run
— (not yet run)

## Health
- maturity: shadow
- status: active
- coverage baseline: null (ratchet only turns up)
- consecutive_empty_runs: 0 (→ hibernate at 7 once all modules ≥ target)

## Escalated to humans
- deny-list modules needing a human test author: none yet

## Lessons learned (write here, not in chat)
<!-- advisory only -->

## Stop conditions
- gate: new tests pass AND total coverage strictly increases vs baseline; checker confirms tests fail on broken behavior
- hard stops: max-iterations 20 · per-run token budget · wall-clock 30m
