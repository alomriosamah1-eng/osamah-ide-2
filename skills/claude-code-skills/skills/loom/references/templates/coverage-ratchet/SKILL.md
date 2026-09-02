---
name: loop-coverage-ratchet
description: "Nightly coverage loop. Finds the lowest-coverage module, writes tests for it, opens a PR if they pass and raise coverage. Literally builds quality — the ratchet only turns one way."
owner: REQUIRED — set to you
maturity: shadow
cadence: nightly
gate: "npm test -- --coverage (new tests pass AND coverage strictly increases)"
---

# Loop · coverage-ratchet

The ratchet: each run can only raise coverage, never lower it. A loop that makes the safety net the loops depend on stronger over time.

## What it does (per run)
1. **Find work** — parse the coverage report; pick the lowest-coverage module not on the deny-list.
2. **Body** — write tests for the uncovered branches. Tests must assert real behavior, not just execute lines.
3. **Gate (two-part):** (a) the new tests pass; (b) total coverage **strictly increases** vs the baseline in state. Both required, or discard.
4. **Independent checker** — confirms the tests would FAIL if the behavior broke (mutation-style spot check on the new tests) — not just that they pass green.
5. **Action** — one PR per module; the rationale block names the branch it now covers.
6. **Record** — store the new coverage baseline; convergence kicks in when modules stop being below target (→ hibernate).

## Never-do
- Never add a test that passes trivially (asserts nothing / always-true). The checker rejects these.
- Never lower the coverage threshold to make a run "succeed."
- Never write tests for deny-list paths (auth/payments) — those need a human author.

## Deploy
```
/loom "nightly coverage ratchet" --dry-run
/loom --deploy coverage-ratchet
```
