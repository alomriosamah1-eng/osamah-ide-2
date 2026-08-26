# Contracts — state.json, the pass record, the review-gate payload, handoff.json

> The loop's data layer. `scripts/state.py` validates and renders these — the model produces structured data, the
> script renders deterministically (the `/polish` aggregate.py pattern). If a field is wrong, `state.py` REJECTS the
> pass; honor-system prose is not the contract.

## `.ascend/state.json` (top level)
```jsonc
{
  "version": "1.0.0",
  "scope": "whole app | <path> | <theme>",
  "loops_planned": 3,                      // min 3
  "stack": "react-native",                 // from scripts/detect.py
  "goal_locked": true,                     // set true once .ascend/goal.md is written
  "baseline_capabilities": ["...", "..."], // Phase 0 capability surface
  "passes": [ <pass record>, ... ],
  "still_on_table": ["<ranked enhancement> — <exemplar>"],
  "deferred_redesign": ["<idea> — <why it's redesign, not enhancement>"]
}
```

## Pass record (one per pass; supplied to `state.py add-pass PASS.json`)
```jsonc
{
  "n": 1,
  "phase": "skeleton",                     // skeleton | refine | detail
  "axis": "ia-boards",                     // short slug; used for the branch name
  "status": "accepted",                    // pending | accepted | reverted | adjusted
  "capability_added": "Board view for tasks (status=column, drag to move)",
  "gap_closed": "No board/grouping view existed; only a flat list",
  "exemplars": [
    { "name": "Asana",  "tag": "PRINCIPLE", "source": null },
    { "name": "Linear", "tag": "VERIFIED",  "source": "https://linear.app/docs/..." }
  ],
  "weight_class": "M",                     // S | M | L — chosen items' effort must fit (S≤2 M≤3 L≤5).
                                           // REQUIRED on v1.2-format records (any confidence/killed row makes the
                                           // record v1.2-aware); absent only on pure-legacy shapes
  "build_list": [                          // ALL candidates considered this pass — chosen, benched, AND killed
    { "item": "Board screen", "user_value": 5, "identity_fit": 4, "effort": 3, "confidence": 1.0,
      "justification": "core job from goal.md", "chosen": true },
    { "item": "Realtime presence", "user_value": 3, "identity_fit": 2, "effort": 5, "confidence": 0.5,
      "killed": "solo-user app — fails the purpose gate" }
    // state.py computes impact = uv × fit × confidence (RANKS/SELECTS) and score = impact ÷ effort (tiebreak);
    // confidence ∈ 1.0 (verified/observed) | 0.8 (recalled) | 0.5 (hypothesis). Missing confidence: pure-legacy
    // record = ×1.0 (warned); v1.2-aware record = REJECTED — omission is not a free 1.0.
    // killed must be a non-empty reason string; killed rows can't be chosen; booleans REJECT;
    // chosen effort must fit weight_class; chosen user_value < 4 warns
  ],
  "decisions": "Added alongside list view; nothing removed",
  "new_baseline": "App now has list + board views",   // REQUIRED if accepted; null if reverted
  "verify": {
    "typecheck": "pass",                   // pass | fail | not_run
    "lint":      "pass",
    "build":     "pass",
    "tests":     "pass",                   // pass | fail | not_run  (fail → REJECTED at gate)
    "tier":      "render-tested"           // app: ran-in-app | render-tested | compiled-only
                                           // prompt-artifact: live-fired | structure-linted | read-only
  },
  "reachable": true,                       // new surface wired into nav? false → REJECTED (orphan)
  "shots": [".ascend/shots/pass-1/board.png"]
}
```

**What `state.py` HARD-ENFORCES (REJECTs the pass):** required fields present · `phase`/`status`/`verify.tier` and the
`typecheck`/`lint`/`build`/`tests` enums valid (tier gated by target class) · every exemplar tagged
`PRINCIPLE`/`VERIFIED` and `VERIFIED` carries a `source` · `typecheck`/`build`/`tests == "fail"` blocks the gate ·
`reachable:false` blocks the gate · accepted pass has `new_baseline` · value factors are ints 1–5 · confidence ∈
{1.0, 0.8, 0.5}, never boolean · v1.2-aware record missing `confidence` on any row or missing `weight_class` ·
chosen effort over the weight-class budget · `killed` not a non-empty string · killed+chosen on one row. **Warns (surfaced at the gate, not blocking):** `tier:"compiled-only"`
(NOT run) and its prompt-artifact analogs `structure-linted`/`read-only` (NOT executed) · `tests:"not_run"`
(regressions unguarded) · `lint == "fail"` · a `chosen` item with `user_value < 4` (below the entry bar) · a chosen
HYPOTHESIS (confidence 0.5) · a chosen 1.0 with no `[VERIFIED]` exemplar on the pass · a benched item outranking
every chosen item · legacy rows scored ×1.0. Tier vocabulary is gated by target class: `stack: prompt-artifact`
takes the prompt tiers, everything else the app tiers.

**What `state.py` CANNOT enforce — these are the independent CHECK agent's job (loop step 5), not the script's:** whether
a `[PRINCIPLE]` tag is wrongly on a distinctive specific or a `[VERIFIED]` source is actually strong; whether a row's
`confidence` actually matches its cited evidence (the script only warns on the missing-`[VERIFIED]` proxy for a chosen
1.0 — a padded 0.8 or an unearned 1.0 backed by "observation" is CHECK's to catch); whether the build
is genuinely additive (no lossy migration / no broken read-path); whether the chosen item truly maps to the locked job;
whether UNMAPPED is really empty. The script enforces *structure*; the CHECK agent + human gate enforce *judgment*. Do
not treat a green `state.py` as a passed review.

## Review-gate payload (what step 6 — the GATE — presents to the user)
Not a file — the message the loop prints before ending its turn:
- **What & why:** `capability_added` + `gap_closed` + exemplars (with tags).
- **The graveyard:** every candidate killed by the bar this pass, each with its impact + kill reason — the ranking is
  only trustworthy when the kills are visible.
- **Verify tier reached:** apps: `ran-in-app` / `render-tested` / `compiled-only — NOT run` · prompt artifacts:
  `live-fired` / `structure-linted` / `read-only — NOT executed` + tests-vs-baseline + reachable.
- **Diff:** the pass-branch diff (and before/after shots if captured).
- **Flags:** new deps (`[REQUIRES DEP]`), deprecations, anything uncertain.
- **The ask:** approve · revert · adjust — then END THE TURN.

## `.ascend/handoff.json` (written at SYNTH, for `/polish`)
```jsonc
{
  "style_profile": ".ascend/style-profile.md",
  "files_touched": ["src/screens/BoardScreen.tsx", "..."],   // per accepted pass, flattened
  "deferred_polish": ["micro-interaction on card drag", "empty state for board"]
}
```
`/polish` checks for this and seeds its App Style Profile + prioritizes these files instead of re-deriving from scratch.

## `.ascend/goal.md`
See [`goal-intake.md`](goal-intake.md). Read by every BENCHMARK/GAP step.
