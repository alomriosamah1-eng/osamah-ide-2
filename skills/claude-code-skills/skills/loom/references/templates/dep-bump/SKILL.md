---
name: loop-dep-bump
description: "Weekly dependency-bump loop. Scan for updates, test compatibility against the suite, open one PR per safe bump. Highest accept-rate, lowest risk — the harden-first loop. Trigger weekly or on a dependency-advisory webhook."
owner: REQUIRED — set to you
maturity: shadow
cadence: weekly
gate: "npm test && npx tsc --noEmit"
---

# Loop · dep-bump

The reference loop. Safe because every bump is gated by the suite and starts in shadow.

## What it does (per run)
1. **Find work** — list outdated deps (`npm outdated --json`). One work-unit per package.
2. **Idempotency** — `loop_state.py idempotent dep-bump --key <pkg>@<version>`; skip if already acted.
3. **Backpressure** — if open `loom:dep-bump` PRs ≥ `max_open_prs` (3), STOP, set `blocked_on_review`, spend nothing.
4. **Per package:** bump to the latest **safe** version (see Never-do), run the gate in the sandbox.
5. **Gate** = `npm test && npx tsc --noEmit` via `sandbox.py run` (no creds in env). Green → proceed; red → discard the branch, log, next package.
6. **Action by maturity:** shadow → record would-have-done only · pr-only → open one PR with the rationale block · auto-trivial → auto-merge **patch-level only** that also passed supply-chain checks.
7. **Record** — `loop_state.py record dep-bump --repo . --gate pass|fail --action ... --key <pkg>@<v>`.

## Classification (which lane)
- **patch** (x.y.Z) + green gate + supply-chain pass → auto-trivial lane eligible.
- **minor** (x.Y.z) → pr-only always.
- **major** (X.y.z) → pr-only, flagged "breaking — review", never auto.

## Supply-chain checks (security-model.md §8) — before any merge
- exact-pin + lockfile hash/integrity match
- release **cooldown**: version must be ≥ 7 days old
- block any bump that **adds a postinstall/install script**
- diff the published tarball, not just the changelog

## Never-do
- Never bump a package on the CLAUDE.md deny-list / load-bearing list.
- Never auto-merge a minor/major bump.
- Never merge a bump younger than the cooldown.
- Never bypass the gate ("tests are flaky" → escalate, don't skip).

## Rationale block (every PR body)
- **triggered by:** `<pkg>` outdated `<old>`→`<new>` (`npm outdated`)
- **considered/rejected:** holding back (rejected: no breaking changes in range) OR major (rejected: needs human)
- **least confident about:** `<the transitive dep or peer range to eyeball first>`

## State
After each run update `LOOM-dep-bump.md` + `.loom/dep-bump/state.json` via `loop_state.py`. Lessons (e.g. "package X's tests need a Stripe webhook secret → skip in sandbox") go in the Lessons section — advisory only.

## Deploy
```
/loom --readiness .            # must be loop-ready (has gate)
/loom "weekly dependency bumps" --dry-run     # run the Gate, scaffold, backtest
/loom --deploy dep-bump        # registers at maturity=shadow, /schedule weekly cloud routine
```
