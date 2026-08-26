# The Loop — protocol for the compounding enhancement build

> The operational heart of `/ascend`. Read with [`doctrine.md`](doctrine.md), [`exemplars.md`](exemplars.md),
> [`goal-intake.md`](goal-intake.md), and [`state-schema.md`](state-schema.md). This is a **multi-turn, human-gated
> loop**: it yields the turn at every review gate and resumes on re-invoke.

## Execution model (how it actually runs in Claude Code)
- **BUILD runs inline in the main agent** — it calls `/run` and `/polish`, which subagents can't. MAP and the
  independent CHECK fan out to sub-agents (`Explore`/general-purpose); BUILD does not.
- **The loop yields the turn at the gate** (step 6): persist state, present, **STOP**. Never start the next pass in the
  same turn. (Slate-mode exception: the slate gate is the idea gate — approved items may build in one turn with a
  consolidated result gate; see § Slate mode.)
- **Lane:** human-gated, not a `/loom` auto-loop. `/loom` may wrap VERIFY, never BUILD.

## Pre-flight (once)
1. Resolve scope/flags: whole app (default) · path · theme · `--target` · `--loops N` (default 3, **min 3**) ·
   `--slate` · `--restart`.
2. **Resume check:** if `.ascend/state.json` exists and not `--restart` → `python3 scripts/state.py status`.
   - A pass is `awaiting_decision` → apply the user's approve/revert/adjust (see step 7), then start the next pass.
   - Else if `passes_done < loops_planned` → start the next pass. Skip Phase 0/0.5 (already done).
   - Else → go to Phase F SYNTH.
3. Fresh run: `scripts/init.sh [base]` (gitignore `.ascend/` first · stash dirty tree · create `ascend/integration`;
   not-a-git-repo or nested-in-a-larger-repo → stop; `init.sh --snapshot` is the copy-snapshot lane, revert via
   `.ascend/REVERT.md`; never auto-apply without revert) → `scripts/detect.py` (Project Profile) → `scripts/scan.py`
   (slices) → `scripts/state.py init --scope … --loops N --stack <type>`.

   **Snapshot mode adaptations** (when `.ascend/snapshot/` exists): `new-pass.sh` detects it and takes a per-pass
   snapshot (`.ascend/snapshot-pass-N/`) instead of branching — NO git ops (the target may sit inside an unrelated
   outer repo). BUILD edits in place. CARRY on approve = keep the edits + record the pass; on revert = restore
   `.ascend/snapshot-pass-N/` per REVERT.md (the base `.ascend/snapshot/` is the nuclear whole-run revert).

## Slate mode (`--slate`) — ideas first, build second
When the user wants to see the ideas before anything is built (or asks to "present the ideas first"):
1. Run Phase 0 + 0.5 as normal, then run steps **1–2 (BENCHMARK + GAP) for every planned pass** up front.
2. Present ONE combined, scored slate — organized by pass, each row with its exemplar + citation tag — as a gate.
   **YIELD THE TURN.** Nothing is built or written to the target before slate approval.
3. On approval (full or à la carte), run BUILD → VERIFY → CHECK for the approved items. An explicit "approve all"
   covers apply: present the consolidated result (verify tiers + CHECK findings + what was repaired) instead of
   re-gating each diff; anything the CHECK flags as blocker-severity is still repaired before apply, or re-gated.
4. A goal-lock correction at the slate gate re-runs GAP (see goal-intake.md § Re-runs) — corrections are cheap here;
   that is the point of gating the ideas first.

## Phase 0 — MAP (coverage-guaranteed)
Read the codebase as a product designer. If `scan.py` reports `fanout:true` (>1 slice), spawn one agent per slice
(each returns `covered_files[]`), stitch, and **assert UNMAPPED = ui_files − ∪covered is empty**; if not, map the
remainder before continuing. Write:
- `.ascend/map.md` — UX + **capability surface** (can/can't do today) + coverage checklist.
- `.ascend/style-profile.md` — **App Style Profile** (identity to preserve).
Record `baseline_capabilities` in state.json.

## Phase 0.5 — GOAL-LOCK (once — mandatory)
Run [`goal-intake.md`](goal-intake.md): infer purpose/users/"better"/no-go from the code, **confirm with the user**,
write `.ascend/goal.md`, set `goal_locked:true`. Every BENCHMARK/GAP reads it. Without it, Axis 3 can't be enforced.

## The pass (repeat ≥3×, escalating fidelity)

> Read `.ascend/state.md` + `.ascend/goal.md` FIRST. Start from the improved app; never re-litigate a prior accepted
> direction — go deeper/wider. **PASS 1 SKELETON** (breadth) → **PASS 2 REFINE** (depth) → **PASS 3 DETAIL** (finish).

### 1 · BENCHMARK
Pick this pass's target surface (highest leverage not yet addressed). From `goal.md`'s `exemplars` (+ `exemplars.md`),
pick 2-3 that own it **for this app's job**. Web-verify the specific mechanism (`WebSearch`/`WebFetch`) from vendor
docs/help/changelog; tag `[PRINCIPLE]`/`[VERIFIED: source]` per doctrine § Citation. Can't source a specific → keep the
gap qualitative.

### 2 · GAP
Write the delta vs the exemplar. Build a **scored candidate list** ranked by `impact = user_value × identity_fit ×
confidence` (anchors + the three legal confidence values in doctrine § Value); report `score = impact ÷ effort` as the
efficiency tiebreak, never the selector. Each row justified against `goal.md`, its confidence matched to the evidence
actually cited. Keep candidates that **map to the locked job AND have user_value ≥ 4 AND fit the pass's weight class**
(goal.md `ambition:`, overridable per pass); record every kill with its reason (`killed:`) — **the graveyard is
presented at the slate/gate**, not silently dropped. Route redesign-class ideas to `deferred_redesign`. Pick the top
item(s) by impact that fit one reviewable pass.

### 3 · BUILD
`scripts/new-pass.sh <N> <axis-slug>` → branch `ascend/pass-<N>-<axis>` off integration; `.ascend/shots/pass-<N>/`
created. Implement **in the App Style Profile**, reusing existing tokens/components/patterns, within the existing IA.
Commit to the pass branch only (this is what "auto-apply within the pass" means). Flag any new dep `[REQUIRES DEP]`;
never delete existing capability (add alongside + flag deprecation).

### 4 · VERIFY (drive every command from the Project Profile)
- typecheck (`profile.typecheck`, e.g. `npx tsc --noEmit` — RN does NOT typecheck at bundle time) · lint · build.
- **Tests vs baseline:** capture `.ascend/baseline-tests.txt` before PASS 1; re-run the suite each pass and **diff** —
  any new red **blocks the gate**. No suite → say so at the gate.
- **Liveness TIER** (record honestly, never overstate): `ran-in-app` (launch via `profile.launch_cmd` + screenshot to
  `.ascend/shots/pass-N/`) > `render-tested` (react-test-renderer mounts `App` + the new surface without throwing, when
  no simulator boots headless) > `compiled-only` (NOT run — flagged).
- **Reachability:** grep the nav config — route registered AND linked? `reachable:false` (orphan) **blocks the gate**.

#### VERIFY adapters — prompt-artifact targets (`target_class: prompt-artifact`)
Skills/prompts have no typecheck/build; the tier ladder is **`live-fired` > `structure-linted` > `read-only`**:
- **`live-fired`** — a fresh subagent executes the artifact COLD (its text pasted or read from disk, no other context),
  against (a) a realistic input and (b) at least one **adversarial input designed to trip each newly-added rule**
  (e.g. a hypothetical-heavy answer to test an evidence rule). Judge the transcript against a rule-adherence checklist
  derived from the artifact's own text. Multi-turn behavior can be exercised with canned replies in the same prompt.
- **`structure-linted`** — frontmatter parses, required trigger phrases survive, line budget held; NOT executed.
- **`read-only`** — a read-through only; flagged at the gate like `compiled-only`.
Honesty law unchanged: a live-fired *opening* is not a live-fired *full run* — state exactly which behaviors were
exercised and which weren't. state.py accepts these tiers and warns on the non-executed ones.

### 5 · CHECK (independent reviewer — the maker never grades itself)
Spawn a separate agent (doctrine.md pasted) that adversarially judges: real named gap? in-scope (Axis 1 OUT-triggers,
additive-only)? identity-fit (Axis 2)? serves the locked job (Axis 3)? citations sound (sourced `[VERIFIED]`, no
`[PRINCIPLE]` on a distinctive specific)? verify TIER honest? Default to flagging. Its findings go into the gate
payload. (Pattern: `/ship`'s Review station — reference, don't re-derive.)

### 6 · GATE (human — YIELD THE TURN)
Present the review-gate payload (see [`state-schema.md`](state-schema.md § gate): what & why · verify TIER + tests +
reachable · diff + before/after shots · flags · the independent CHECK's findings). Ask **approve / revert / adjust** —
then **END THE TURN.** Write the pass record with `status:"pending"` so resume can find it.

### 7 · CARRY (next turn, after the decision)
- **approve →** `state.py add-pass .ascend/pass-<N>.json` (status `accepted`; validates + renders state.md/ASCEND.md);
  `git checkout ascend/integration && git merge --no-ff ascend/pass-<N>-<axis>`. `new_baseline` recorded. Next pass
  starts here.
- **revert →** abandon the pass branch (`git branch -D`), leave integration untouched; record status `reverted` (no
  `new_baseline`); discard that pass's shots.
- **adjust →** stay on the pass branch, re-run BUILD/VERIFY/CHECK for the requested change, re-present the gate.

## `.ascend/state.md` shape
Rendered by `state.py` from `state.json` — do not hand-edit. Schema + the pass-record contract live in
[`state-schema.md`](state-schema.md).

## Stop conditions
Completed `--loops N` (≥3) · OR no candidate clears the value bar · OR remaining work is pure polish → stop and **hand
off to `/polish`**.

## Phase F — SYNTH
`state.py render` finalizes `ASCEND.md` (before→after per accepted pass · decisions · exemplars with tags · ranked
STILL ON THE TABLE · DEFERRED). Write `.ascend/handoff.json` (style profile + files touched + deferred polish items) so
`/polish` seeds from it. Close: **built it up with `/ascend` → run `/polish` to make it shine.**
