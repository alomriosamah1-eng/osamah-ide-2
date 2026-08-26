# Trust ladder — how a loop earns write access

A new loop is untrusted by default. It climbs three stages; promotion is a **human tap**, demotion is **automatic**.

```
SHADOW ──(≥5 clean runs: gate+checker agree, human taps promote)──▶ PR-ONLY
PR-ONLY ──(accept-rate ≥50% over last 10 + value-positive + human tap)──▶ AUTO-TRIVIAL
  any stage ──(accept-rate<50% / gate-rot / churn / rubber-stamp / escalation)──▶ auto-DEMOTE one stage
```

## Stages

### shadow (default for every new loop)
Runs on cadence. Does the real work in a **scratch worktree** and runs the gate against its proposed diff — but **takes no external action** (no PR, no merge, no Slack, no ticket). Writes a `would-have-done` report + the gate verdict to `STATE.md`. Purpose: accumulate a real accept-rate and value estimate *before* the loop can touch anything.

**Promotion criterion:** ≥5 runs where the objective gate passed AND the independent checker agreed the proposed change is correct — then a human reviews the digest and taps promote.

### pr-only
Opens PRs / tickets, **never merges**. A human merges. This is where most loops should live for a long time.

**Promotion criterion:** accept-rate (merged ÷ opened) ≥ 50% over the last 10 PRs AND value-positive (see `value-and-human-factors.md`) AND a human tap.

### auto-trivial
Auto-merges **only** changes pre-blessed as trivially safe:
- patch-level dependency bump with a green gate and supply-chain checks passed
- lint-only / formatter-only diffs

Everything else stays pr-only. **Never** auto-merges a path on the CLAUDE.md load-bearing / deny-list. The per-run action cap is enforced (max merges/run).

## Auto-demotion triggers (any one, one stage down)

- accept-rate < 50% over the last 10 PRs
- gate-rot detected (see below)
- `loop_health` churn (diff-similarity to prior run > 0.9)
- rubber-stamp detected on the human reviewer (see `value-and-human-factors.md`)
- an escalation the loop couldn't resolve

A demoted loop notifies its owner with the reason. Re-promotion requires the normal criteria again.

## Gate-rot watch (`--verify-gates`, scheduled weekly via `scripts/mutate_gate.py`)

Gates rot — a test that used to catch the failure stops catching it. To prove the gate still bites:

1. Inject a **known-bad mutation** into a copy of the repo (e.g., flip a comparison, drop a null check in the path the loop touches).
2. Run the loop's objective gate.
3. **Expect RED.** If the gate returns GREEN on known-bad code, the gate is rotten → auto-demote the loop + alert the owner.

This makes "spot-check the gate" rigorous and automatic instead of a good intention.
