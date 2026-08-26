---
name: ascend
description: Read an entire codebase, lock its purpose and users, then run a compounding enhancement-build loop (≥3 passes that escalate fidelity) that levels the app UP toward billion-dollar SaaS standards — adding capability, depth, and richness while preserving what the app already is. Each pass benchmarks the 2-3 best-in-class exemplars for THIS app's job (Asana for boards/movement, Linear for speed/triage, Stripe for forms/data, Notion for views, Figma for collaboration), researches their real patterns (hybrid: recall + web-verify, cited truthfully), scores quantified gaps, BUILDS the enhancement on an isolated branch in the app's own design language, verifies it actually works (tests + liveness + reachability), has an independent agent review it, then pauses for your diff review and carries the new state forward as the baseline for the next pass. Enhancement build, NOT redesign (never tears down identity/IA wholesale) and NOT mere polish (it adds real capability). Use when the user says "/ascend", wants to level an app up to best-in-class, "make it world-class", enrich features toward a billion-dollar competitor, or run an iterative build loop that compounds on itself.
version: 1.2.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [linux, macos]
---

# `/ascend` — Enhancement-Build Loop

Take an app from "good" to "best-in-class" by **building it up** — not tearing it down. `/ascend` reads the whole
codebase, **locks what the app is for and who it serves**, then runs a **compounding loop (≥3 passes, escalating
fidelity)**. Each pass studies how the best product companies in the world solve the same problem *for this app's job*,
scores the real capability gaps, **builds the enhancement** in the app's own design language on an isolated branch,
verifies it actually works, has an independent agent check it against the doctrine, and pauses for your review — then
carries that new, better state forward as the baseline for the next pass.

## The Ladder — where `/ascend` sits
```
/polish    refine what's already there — NO new capability, NO IA change          "make it shine"
/ascend    build it UP — ADD capability/depth/richness, preserve identity   ← THIS  "make it world-class"
redesign   tear down & replace identity/IA wholesale                       OUT OF SCOPE
```
The test for every change: **does it build UP what the app is, or replace what the app is?** Build up = in. Replace =
out (logged to `DEFERRED (redesign)` so you see it was weighed). Full law in [`references/doctrine.md`](references/doctrine.md).

## How it runs — the execution model (read this first)
`/ascend` is a **multi-turn, human-gated loop** — not an autonomous run.
- **BUILD runs inline in the main agent** (it calls the `/run` and `/polish` skills, which subagents can't). MAP and
  the independent review fan out to sub-agents; BUILD does not.
- **At each pass's review gate the loop YIELDS THE TURN:** it runs CARRY (persists state), presents the diff, and
  **stops**. It does **not** start the next pass in the same turn — that would defeat the gate. (Slate-mode
  exception: the slate gate is the idea gate; approved items build in one turn — loop.md § Slate mode.)
- **Resume:** a bare `/ascend` in a repo that already has `.ascend/state.json` **resumes, not restarts** — run
  `python3 scripts/state.py status` first; if a pass is awaiting a decision, apply the user's approve/revert/adjust to
  it, then begin the next pass. Skip Phase 0/0.5 when already done.
- **Lane:** `/ascend` is human-gated and is **not** a `/loom` auto-loop. `/loom` may wrap its VERIFY step; never its
  BUILD.
- **Isolation:** passes run on **shared-tree branches** (`ascend/pass-N-*` off `ascend/integration`), not isolated
  git worktrees — simpler revert/merge; this is why `init.sh` stashes a dirty tree before starting.
- The reference files below are **read in full before any BUILD/GAP step** (by the inline agent and any review agent) —
  they are the doctrine, not optional context.

## Invocation
```
/ascend                          # whole app · resume if .ascend/ exists, else ≥3 escalating passes
/ascend src/screens/Dashboard    # focus a surface (dir, screen, or component)
/ascend "kanban for tasks"       # focus a capability/theme
/ascend --loops 4                # set pass count (default 3 · minimum 3)
/ascend --target asana,linear    # pin exemplars (else inferred from the goal-lock)
/ascend --slate                  # ideas-first: BENCHMARK+GAP every planned pass, gate on the scored
                                 # slate BEFORE building, then build only approved items (loop.md § Slate mode)
/ascend --restart                # ignore existing .ascend/ and start fresh
```

## Pre-flight & scaffolding (deterministic — `scripts/`)
1. `scripts/init.sh` — gitignores `.ascend/` **first**, stashes a dirty tree, creates the `ascend/integration` branch
   off the base (accepted passes merge here with `--no-ff`; `main` is untouched until SYNTH by explicit request). Not
   a git repo → it stops and offers `git init` or `init.sh --snapshot`; target **nested inside a larger repo** (e.g.
   a skills dir inside a home-dir repo) → it **refuses branch mode** and requires `--snapshot` (copy-snapshot
   isolation, scripted revert via `.ascend/REVERT.md`); **never auto-applies without a working revert.**
2. `python3 scripts/detect.py .` → the **Project Profile** (`type/typecheck/lint/test/build/launch_adapter`) so VERIFY
   never guesses a command. (Mirrors `/ship`'s detect.py.)
3. `python3 scripts/scan.py .` → UI-file inventory + **bounded slices** so Phase 0 MAP has a real coverage guarantee.
4. `python3 scripts/state.py init …` → `.ascend/state.json` (schema in [`references/state-schema.md`](references/state-schema.md)).

## Phase 0 — MAP (coverage-guaranteed)
Read the codebase as a product designer on day one. If `scan.py` reports >1 slice, **fan out one agent per slice**
(`Explore`/general-purpose), each returning `covered_files[]`; stitch the fragments and **assert UNMAPPED = (ui_files −
covered) is empty** before the loop trusts its picture. Produce:
1. `.ascend/map.md` — UX & **capability inventory** (what the app can/can't do today = the gap-search space) + a
   coverage checklist.
2. `.ascend/style-profile.md` — **App Style Profile** (palette, type ramp, spacing/radius, motion, voice, signatures).
   This is the identity every enhancement preserves; exemplars are a *pattern* library, never a skin.

## Phase 0.5 — GOAL-LOCK (once — the highest-leverage step)
Infer the app's purpose/users/"better" from the code, then **confirm with the user** and write `.ascend/goal.md`. This
gives Axis 3 (the value gate) ground truth so the loop benchmarks against *relevant* exemplars and never builds
plausible-but-useless features. Full protocol: [`references/goal-intake.md`](references/goal-intake.md).

## The Loop — escalate fidelity, compound on yourself
Each pass inherits the previous pass's accepted output as its new baseline. Pass 1 SKELETON (breadth) → Pass 2 REFINE
(depth) → Pass 3 DETAIL (finish). Full protocol: [`references/loop.md`](references/loop.md).

```
1 BENCHMARK   read goal.md → pick 2-3 RELEVANT exemplars → research their real patterns (hybrid; cite truthfully)
2 GAP         current vs exemplar → rank by impact = value × fit × confidence → record the kills → pick by impact
3 BUILD       scripts/new-pass.sh → implement on the pass branch, in the app's OWN design language
4 VERIFY      profile's typecheck/lint/build · run tests vs baseline · liveness (render/boot) · reachable in nav · record TIER
5 CHECK       an independent agent (doctrine pasted) adversarially judges the 3 axes + citations — maker never grades itself
6 GATE        present diff + verify TIER + flags → YIELD THE TURN (approve / revert / adjust) — STOP
7 CARRY       state.py add-pass (validates + renders) · merge accepted branch into integration · next pass starts here
```

## VERIFY — prove it works (don't claim it)
Drive every command from the Project Profile. **Tiers** (recorded + shown at the gate, never overstated):
`ran-in-app` (launched simulator/dev-server + screenshot) > `render-tested` (react-test-renderer mounts `App` + the new
surface without throwing) > `compiled-only` (typecheck/build/lint only — **NOT run**, flagged as such). Always:
re-run the test suite and **diff against the pre-pass baseline** (any new red blocks the gate); confirm the new surface
is **reachable** (route registered AND linked) — an orphaned screen is rejected. If there's no test suite or no
bootable target, say so at the gate.
**Prompt-artifact targets** (Project Profile `target_class: prompt-artifact` — skills/prompts): the tier ladder is
`live-fired` (a subagent executes the artifact cold against realistic + adversarial input) > `structure-linted` >
`read-only` — protocol in loop.md § VERIFY adapters. The same honesty law applies: a live-fired opening is not a
live-fired full run; report what was actually exercised.

## The value formula (impact-ranked, confidence-weighted, ambition-budgeted)
`impact = user_value × identity_fit × confidence` **ranks and selects** (confidence ∈ 1.0 verified/observed · 0.8
recalled · 0.5 hypothesis — must match the cited evidence). `score = impact ÷ effort` is the efficiency tiebreak,
never the selector. Effort is a per-pass **weight class** budget (S ≤2 · M ≤3 · L ≤5, goal.md `ambition:`) — ambition
is chosen, not auto-penalized. Bar: maps to the locked job AND `user_value ≥ 4`; a chosen 0.5-confidence item is
flagged verify-before-build. Killed candidates are recorded + shown (**the graveyard**). Anchors in
[`references/doctrine.md`](references/doctrine.md § Value); `state.py` computes, enforces, and pins both numbers.

## Citation integrity (hardened — see doctrine § Citation)
`[PRINCIPLE]` = unverified recall, safe only as a *general approach* (never a distinctive/recent specific).
`[VERIFIED: source]` = confirmed this run from a **vendor doc/help/changelog/eng-blog** (a forum/marketing/3rd-party
post is weak and never the sole authority). Can't verify a specific number → the gap stays **qualitative**; never quote
an unsourced competitor figure. Note: live SaaS UIs are usually auth/JS-walled — verify from docs, not `app.<vendor>`.

## Carry-forward & resume
`.ascend/state.json` (+ rendered `state.md`) is the loop's machine memory and resume ledger — schema-pinned, written by
`state.py`. Each pass reads it first so the loop compounds instead of re-deriving; `state.py status` drives resume.

## Phase F — SYNTH
`state.py render` finalizes `ASCEND.md` (before→after per accepted pass, decisions, every exemplar with its tag, the
ranked `STILL ON THE TABLE`). Writes `.ascend/handoff.json` (style profile + files touched + deferred polish-grade
items) and offers the handoff: **built it up with `/ascend` → run `/polish` to make it shine** (`/polish` reads the
handoff and skips re-deriving).

## Guardrails — what `/ascend` never does
- **Never a redesign** — no nav-model inversion, no identity/brand erasure, no destructive data-model rewrite. → `DEFERRED`.
- **Never homogenize** — capability in the app's *own* visuals; identity (Style Profile) beats any exemplar's chrome.
- **Never lands on `main` unreviewed** — branch-isolated, independently checked, human-gated, cleanly revertible.
- **Never grades its own build** — step 5 is an independent agent; the human gate is not the only check.
- **Never overstates verification** — the verify TIER is reported honestly; `compiled-only` is never called "working."
- **Never invents an exemplar fact** — `[PRINCIPLE]`/`[VERIFIED]` only; unsourced numbers are forbidden.
- **Never builds for its own sake** — every enhancement must clear the goal-locked value gate.
- **Never adds a dependency silently** — `[REQUIRES DEP]`, surfaced at the gate for an explicit yes.
