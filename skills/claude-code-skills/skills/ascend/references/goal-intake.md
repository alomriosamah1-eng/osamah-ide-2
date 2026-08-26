# Phase 0.5 — Goal-Lock Intake (run ONCE, before any pass)

> Without this, Axis 3 (the value gate) is unenforceable: the agent has no ground truth for "serve the app's actual
> purpose and users," so it benchmarks a real app against irrelevant exemplars and builds plausible-but-useless
> features (a Kanban board bolted onto a BLE device app). This step is the single highest-leverage part of `/ascend`.
> Modeled on `/gauntlet`'s GRILL: **infer a draft from the code, then make the user confirm/correct — never guess
> silently.**

## Protocol
1. **Infer a draft** from Phase 0's `map.md` + README + package metadata: what the app appears to be, who it's for,
   what it's optimized for.
2. **Present the draft and ask the user to confirm or correct** the five facts below. Ask as ONE compact batch (use
   `AskUserQuestion` where possible). If the user is absent/says "you decide," lock your best inference and **mark each
   field `inferred: true`** so later passes know it's unconfirmed.
3. **Write `.ascend/goal.md`** (and set `goal_locked: true` in state.json). Every BENCHMARK and GAP step MUST read it.

## The five locked facts → `.ascend/goal.md`
```md
# Goal Lock
purpose:   <one sentence — what this app is FOR>
user:      <primary user> · job: <their #1 job-to-be-done>
better:    <what "better" means for THIS app — pick: speed | trust | safety | depth | delight | clarity | reach>
ambition:  <default per-pass weight class: S (effort ≤2) | M (≤3) | L (≤5) — overridable per pass; see doctrine § Value>
no_go:     <sacred/off-limits surfaces; brand elements that must not change; flows that must not move>
exemplars: <which billion-$ products are RELEVANT to this app's job (overrides the generic exemplars.md picks)>
inferred:  <true|false per field, or "user-confirmed">
```

## How goal.md governs the loop (enforced, not advisory)
- **BENCHMARK** picks exemplars that serve the *locked job* — not the generic map. A BLE device app's job is
  monitoring/control/safety, so it benchmarks Apple HIG, Things, status/telemetry dashboards — **not** Asana boards.
- **GAP** rejects any candidate that doesn't map to the locked `job` or `better`. Building speed when the locked
  "better" is *trust* is out.
- **Axis 3 becomes two-stage:** (1) binary purpose gate — does this serve the locked job? No → OUT/DEFERRED; then
  (2) rank survivors by the value formula.
- **`no_go` is law** — anything touching a sacred surface is OUT regardless of how good the idea is.

## Re-runs
On a later `/ascend` run, if `.ascend/goal.md` exists, **show it and ask "still accurate?"** rather than re-grilling
from scratch. Update only what changed.

**Mid-loop corrections.** When the user corrects any locked fact at a gate (it happens — the draft was inferred),
update `goal.md` immediately (mark the field user-confirmed), then **re-run GAP for every not-yet-built pass** against
the corrected goal — the biggest gap usually moves. Accepted passes stand: corrected goals govern forward, they never
re-litigate backward.
