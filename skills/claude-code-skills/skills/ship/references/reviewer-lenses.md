# Reviewer Lenses

The Review station's keystone: **independent, adversarial fan-out.** Each lens is a separate subagent with a distinct objective, run in parallel (Agent tool, batch 3). Diversity catches what redundancy can't. Every lens gets: the diff, the acceptance criteria, `doctrine.md`, and its charter below — framed *default to REJECT until proven*.

## The lenses (map to installed agent types)

| Lens | agentType | Hunts for |
|---|---|---|
| **Correctness** | `code-reviewer` | logic bugs, wrong edge-case handling, off-by-one, broken contracts, acceptance-criteria misses |
| **Silent failures** | `silent-failure-hunter` | swallowed errors, empty catch, ignored promise rejections, fallbacks that mask real failure |
| **Security** | `security-auditor` (code-modernization) or `/security-review` | injection, authz/authn gaps, secrets, unsafe deserialization, missing RLS on Supabase tables |
| **Tests** | `pr-test-analyzer` | tests that don't test the change, missing critical-path coverage, assertions that can't fail |
| **Type design** | `type-design-analyzer` | unsound types, `any` escape hatches, illegal states made representable |

`--ultra` adds: `/gauntlet --fast` as a sixth, heavyweight tier (readiness desks against the change), and a second correctness pass with a fresh seed.

Lens count scales to risk: trivial diff → Correctness + Silent-failures (2). Default → 3–4. `--ultra` or anything touching auth/money/data → all 5 + gauntlet.

## Charter (paste per lens)
```
You are the {LENS} reviewer for a /ship run. Operating standard: [paste doctrine.md].
Acceptance criteria the change must meet: {criteria}.
Diff under review: {diff or files}.

Review adversarially — default to REJECT until a claim is proven. For each finding:
  - cite file:line
  - state what is wrong and WHY it matters (which criterion / which failure mode)
  - severity P0 | P1 | P2 (see doctrine severity scale)
  - give an EXACT fix
  - if it depends on another finding being fixed first, note deps:[id]
Do NOT fix anything — report only. Do NOT nitpick style as P0/P1.
If the change is clean on your lens, say so explicitly with the evidence you checked.
Output: JSON array of findings {id, lens, file, line, severity, issue, why, fix, deps}.
```

## Aggregation & the gate
1. Collect all lens outputs → dedupe by `file:line + issue` (keep highest severity).
2. **Block on any P0 or P1.** P2 → log to `SHIP.md`, do not block.
3. Hand the blocking set to the **Fix** station, ordered by `deps` (gauntlet STEP-3: order → make-safe → apply), then re-enter Test → Review.
4. **Cap = 3 rounds.** Still P0 after round 3 → handback (doctrine principle 8).

## Anti-rubber-stamp checks
- A round where every lens returns zero findings on a non-trivial diff is suspicious → run one more lens with a fresh seed before trusting it.
- A lens that approves without naming what it checked is invalid → re-run it.
- Never let the Build/Fix writer's own reasoning stand in for a review.
