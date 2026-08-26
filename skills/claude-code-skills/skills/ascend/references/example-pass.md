# Worked Example — one full pass, end to end

> A concrete trace of PASS 1 so the loop is unambiguous. Fictional but realistic: a React-Native task app whose only
> task view is a flat list. Follow this shape exactly.

## Pre-flight (once, before the loop)
```
$ scripts/init.sh                      # gitignores .ascend/, stashes dirty tree, makes ascend/integration
$ python3 scripts/detect.py . | tee .ascend/profile.json
  → { "type":"react-native", "target_class":"app", "typecheck":"npx tsc --noEmit",
      "test":"npm run test", "lint":"npm run lint", "launch_adapter":"render-test", "has_tests":true }
$ python3 scripts/scan.py .            # 1 slice, 9 UI files → MAP runs inline (no fan-out needed)
$ python3 scripts/state.py init --scope "whole app" --loops 3 --stack react-native
```

## Phase 0 — MAP
Wrote `.ascend/map.md` (capability surface: *"task CRUD, flat list, no grouping, no status workflow, no calendar"*;
coverage checklist asserts all 9 UI files mapped → no UNMAPPED) and `.ascend/style-profile.md` (*indigo accent,
8pt spacing grid, SF type ramp, calm/minimal voice, no motion — intentional*).

## Phase 0.5 — GOAL-LOCK (once)
Drafted from the code, confirmed with the user → `.ascend/goal.md`:
```
purpose:  help solo founders triage their day's tasks fast
user:     a busy founder · job: see what to do next and move it forward
better:   speed + clarity
ambition: M
no_go:    keep the indigo brand, keep the minimal voice
exemplars: Linear (triage/speed), Asana (board/movement), Things (native calm)
inferred: user-confirmed
```

## PASS 1 — SKELETON

**1 · BENCHMARK** (exemplars from goal.md, not the generic map)
- Asana: *status is a column; drag a card between columns to change its state* `[PRINCIPLE]`.
- Linear: *triage/board feels instant via optimistic UI* — web-verified the optimistic-update behavior from Linear's
  docs `[VERIFIED: https://linear.app/docs]`. (Did NOT quote any latency number — couldn't pull a sourced figure, so
  the gap stays qualitative.)

**2 · GAP** (ranked by impact = value × fit × confidence; score = impact ÷ effort is the tiebreak · pass weight
class **M** from goal.md `ambition:` — chosen effort must be ≤3)
| Candidate | value | fit | conf | **impact** | effort | score | verdict |
|---|---|---|---|---|---|---|---|
| Board view (status=column, drag) | 5 | 4 | 1.0 | **20.0** | 3 | 6.67 | ✅ chosen — "move it forward", Linear mechanism `[VERIFIED]` |
| Calendar view | 4 | 4 | 0.8 | 12.8 | 4 | 3.2 | killed: effort 4 exceeds M budget — resubmit as an L pass or split |
| Realtime presence | 3 | 2 | 0.5 | 3.0 | 5 | 0.6 | killed: solo-user app — fails the purpose gate |
Bar: value ≥4 AND maps to locked job AND fits the weight class. Confidence matches the cited evidence (board need
observed in the repo = 1.0; calendar = recalled pattern = 0.8; presence = hypothesis = 0.5). **Build the board.**
The two kills ride to the gate as the graveyard; presence also logged to `deferred_redesign`.

**3 · BUILD** (on its own branch, in the app's OWN visuals)
```
$ scripts/new-pass.sh 1 ia-boards      # branch ascend/pass-1-ia-boards off integration
```
Added `BoardScreen.tsx` *alongside* the list (nothing deleted), reusing the indigo tokens + 8pt grid + existing
`TaskCard`. Registered the route AND linked it from the existing view toggle (reachability). New dep needed for drag →
flagged `[REQUIRES DEP: react-native-gesture-handler — drag-to-move]` for the gate, used a no-dep long-press-move
fallback for now.

**4 · VERIFY** (prove it, don't claim it)
```
$ npx tsc --noEmit        → pass
$ npm run lint            → pass
$ npm run test            → pass (diffed vs .ascend/baseline-tests.txt — no new red)
```
No simulator headless → **render-test tier**: react-test-renderer mounts `<App/>` and `<BoardScreen/>` without
throwing; grepped nav config to confirm the route is registered + linked → `reachable:true`. Tier recorded:
`render-tested` (not `ran-in-app`).

**5 · REVIEW gate** — present, then STOP:
> **Pass 1 added a Board view** (status columns + move), closing the "no status workflow" gap. Modeled on Asana
> `[PRINCIPLE]` + Linear `[VERIFIED]`. **Verify: render-tested** (not run in a simulator) · tests green vs baseline ·
> reachable. **Flag:** wants `react-native-gesture-handler` for true drag (long-press fallback shipped). Diff +
> before/after below. **Approve / revert / adjust?**

→ **END TURN.** (Multi-turn: the next pass starts only after the user replies.)

**6 · CARRY** (after the user approves, next turn)
```
$ python3 scripts/state.py add-pass .ascend/pass-1.json
  pass 1 [accepted] recorded.
$ git checkout ascend/integration && git merge --no-ff ascend/pass-1-ia-boards
```
`new_baseline: "app has list + board, board move works (long-press)"`. PASS 2 REFINE starts from here — deepen the
board (drag dep decision, empty/loading states, swimlanes), not re-litigate it.
