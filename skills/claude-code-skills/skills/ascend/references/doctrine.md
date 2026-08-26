# Ascend Doctrine — the law every build & review agent obeys

> **Read in full before any GAP, BUILD, or CHECK step** (by the inline build agent and by the independent reviewer).
> Your job is to **build the app UP** toward best-in-class — add real capability, depth, and richness — while keeping
> the app unmistakably *itself*. You are not polishing, and you are not redesigning.

## The Prime Directive
**Enhancement build, not redesign — and not mere polish.** The single test for every change:

> **Does it build UP what the app is, or replace what the app is?**
> Build up (add capability/depth to the existing thing) → IN. Replace (a different app now) → OUT → `DEFERRED (redesign)`.

## The Ladder
- **Below — `/polish`:** refines surface only. No new capability, no IA change. If your change merely tightens spacing,
  motion, copy, or states *without adding capability*, it's `/polish`'s job — note it for the handoff (except in the
  DETAIL pass, where polish-grade finishing is in scope).
- **You — `/ascend`:** add capability, depth, richness. You MAY add views, states, affordances, a presentational
  surface, or *extend* a flow — built on the app's existing identity and IA, never replacing them.
- **Above — redesign:** tears down/replaces identity, IA, or data-model wholesale. OUT, always.

## Preserve Identity (ascend ≠ homogenize)
Exemplars are a **capability & pattern library, not a skin.** You are handed the **App Style Profile** (Phase 0) — the
app's palette, type ramp, spacing/radius, motion, voice, signatures. **That profile is the build target.** Build
"Asana's board" = the *board capability* (columns, cards, drag, grouping) in the app's *own* colors/type/voice. Erasing
a deliberate distinctive choice to be "more like <exemplar>" is OUT. When the app's convention conflicts with an
exemplar's taste, **the app's convention wins.**

## The Three Axes — an enhancement is in scope ONLY if it passes all three

### Axis 1 — Builds UP, doesn't tear DOWN (additive & elevating)
IN when it **adds value to what exists**; OUT the moment it **replaces what exists**.
- ✅ IN: add a board/list/calendar *view* alongside the existing one; enrich a card (assignee/due/subtasks); deepen a
  dashboard with a real metric/viz; add an empty/onboarding/first-run experience; add an inline action/command; extend
  a flow with a missing step; surface data the UI already has but doesn't show.
- ❌ OUT (redesign): invert/replace the navigation model; remove/relocate a core surface; discard brand/identity;
  destructively rewrite the data model or query contracts.

**Objective OUT-triggers (these decide; the PM litmus is only an intuition-pump).** A change is OUT if *any* fires:
1. nav structure changes (route added that re-homes existing content, or nav reordered to change meaning);
2. an existing surface is removed or relocated;
3. an existing DB column/contract is broken (drop/rename/retype, lossy migration, an existing read query breaks);
4. a brand/identity token changes.
If none fires, the change is presumptively additive. *Then* the PM litmus is a sanity check, not the gate.

**Additive data-model clause.** Non-breaking schema growth is IN — a new nullable column, a new table, a new optional
field, a new read query — **iff every existing column/contract keeps working unchanged**. Build-time test: *does the
existing data + read-path still work untouched?* Yes → IN. No → OUT → `DEFERRED`.

**Definitions.** *Core surface* = reachable from primary navigation. *Extend a flow* (IN) = add-only, with every
existing step's purpose preserved. *Redesign a flow* (OUT) = reorder, remove, change re-entry, or merge existing steps.
A new view that **can't coexist** with and would supersede an existing one → `DEFERRED` (let the user decide), never a
silent replacement.

### Axis 2 — Preserves identity (the App Style Profile is the target)
The new capability adopts the app's existing palette, type ramp, spacing/radius, motion, components, and voice. Borrow
the exemplar's *mechanism*, never its *chrome*. If building it requires abandoning the app's design language, you're
redesigning → OUT (or rescope to fit).

### Axis 3 — Earns its place (the value gate — two stages)
**Stage 1, binary purpose gate:** does this serve the **locked job** in `.ascend/goal.md`? No → OUT/DEFERRED. (Without
goal-lock this axis is unenforceable — Phase 0.5 is mandatory.) Also: anything touching a `no_go` surface is OUT.
**Stage 2, rank survivors** by the value formula below. When scope is genuinely ambiguous after the OUT-triggers +
purpose gate, route to `DEFERRED` — don't guess.

## Value (the only mechanism for choosing WHAT to build — make it real)
**Selection metric:** `impact = user_value × identity_fit × confidence` — candidates are RANKED and CHOSEN by impact.
**Efficiency metric:** `score = impact ÷ effort` — reported as the tiebreak between near-equal impacts, never the selector.
- **user_value** (1–5, int) — 5 = directly serves the locked #1 job in `goal.md`; 3 = helps a secondary job; 1 = tangential.
- **identity_fit** (1–5, int) — 5 = built entirely from existing tokens/components/voice; 1 = needs a new design language.
- **confidence** (exactly one of — no other values exist): **1.0** = the need is `[VERIFIED]`-sourced or directly
  observed this run · **0.8** = sound `[PRINCIPLE]` recall or strong inference · **0.5** = hypothesis. Confidence MUST
  match the evidence actually cited on the row — a 1.0 without a source/observation is a CHECK finding, not a taste call.
- **effort** (1–5, int) — does NOT divide the selector. Each pass declares a **weight class** — S (effort ≤2) ·
  M (≤3) · L (≤5) — via goal.md `ambition:` or at pass start; chosen items must fit the class (state.py enforces).
  Ambition is a declared choice, not an automatic penalty: an L pass of effort-4 items is legitimate if impact earns it.

Every build-list row records the numbers + a one-line justification tied to `goal.md`. **Bar to enter a pass:** maps
to the locked job AND `user_value ≥ 4`. A chosen item at confidence 0.5 is flagged — verify the need first, or accept
the gamble explicitly at the gate. **The graveyard is part of the deliverable:** every candidate that failed the bar
is recorded (`killed: <reason>`) and shown at the slate/gate — a ranking is only trustworthy when the kills are
visible. `scripts/state.py` computes, enforces, and pins impact + score.

## New code, surfaces, dependencies
- **New code & surfaces are expected here** (the difference from `/polish`). Every new surface must (a) live within the
  existing IA and be **reachable** (route registered AND linked — VERIFY checks this), (b) render in the App Style
  Profile, (c) be built to the verified exemplar principle. Build the smallest coherent version; depth comes in later
  passes.
- **New dependencies are surfaced, never silently added.** Tag `[REQUIRES DEP: name — why]`, raise at the gate. Prefer
  what's in `package.json`; prefer a small local primitive over a heavy dep.
- **Never delete/replace existing capability.** Add alongside; flag any deprecation at the gate for the user to decide.

## Citation Integrity (LAW — and it is checked, not honor-system)
- **`[PRINCIPLE]`** = unverified recall. Safe **only** as a general approach ("Asana uses columns for status"). **Never**
  attach it to a distinctive or recently-changed specific. If a specific is load-bearing for the build, **upgrade it to
  `[VERIFIED]` or downgrade to a generic best-practice attributed to no company.**
- **`[VERIFIED: source]`** = a specific you confirmed THIS run. **Source hierarchy:** vendor docs / help center /
  changelog / engineering blog = strong (may authorize a build). A community forum, marketing page, or third-party blog
  = weak — corroborate or treat as `[PRINCIPLE]`; **never let it alone authorize a spec.**
- **Verification-fail fallback (the common case):** if you can't pull a sourced specific, the GAP must be **qualitative,
  not numeric** — never quote a competitor number you didn't source. Live SaaS apps are usually auth/JS-walled; verify
  from docs/help/changelog, not `app.<vendor>.com`.
- One exemplar per claim. If none genuinely owns the mechanism: `WHO: — (principle, no exemplar)`.
- The independent CHECK agent (loop step 5) re-checks every citation; an unsourced `[VERIFIED]` or a `[PRINCIPLE]` on a
  distinctive specific is a finding.

## Scope, safety & honesty per pass
- **One pass = one coherent, reviewable increment** on its own branch. Diff sprawls beyond human review → split it, say so.
- **Nothing lands on `main` unreviewed.** Auto-apply = commit to the pass branch; merge to integration only on approve.
- **Verify before you claim, and report the TIER honestly.** `compiled-only` is never described as "working." A new red
  test or an unreachable surface blocks the gate.
- **The maker never grades itself.** Step 5 is an independent reviewer; the human gate is not the only check.
- **Carry forward honestly.** `state.json` records what was actually built and verified, not what was hoped.

## The Escalate-Fidelity contract (go deeper, don't redo)
- **PASS 1 SKELETON** — breadth: stand up the highest-value new capability end-to-end. Rough but real and reachable.
- **PASS 2 REFINE** — depth: take PASS 1 as baseline and deepen it (more states, real data, integration, a 2nd exemplar
  lens). Don't re-litigate PASS 1's direction.
- **PASS 3 DETAIL** — finish: edge/empty/loading/error states, motion, density, accessibility — polish-grade (or hand to `/polish`).
- Each pass reads `.ascend/state.md` first and starts from the improved app. Compounding, not restarting.
