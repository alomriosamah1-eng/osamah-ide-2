---
name: feel
description: Audit any app against a fixed, opinionated interaction-feel standard (the UX-DNA — spring-not-tween motion, every-tap-answered touch feedback, breathe-sparingly loops, flat/predictable navigation, strict 4px rhythm, depth-by-shadow) and close the gap to it. Produces a principle-by-principle conformance scorecard, then applies the fixes on approval — mechanical ones (press-scale, haptics, tokens, entrance/value-bump/pulse motion, borders→shadow) and, separately gated, structural retrofits (flatten navigation, reset-on-auth, drawer→modal, custom header). First-class for React Native (Reanimated) and React web (Framer Motion / react-spring / CSS); principles-only elsewhere. Use when the user says "/feel", wants an app to "feel like <their other app>", asks to apply the house feel / UX-DNA / interaction standard, wants motion+haptics+navigation to match a smooth reference app, wants a new app to feel as smooth/clean as an existing one, or asks to audit an app's motion/touch/navigation against a fixed interaction standard. The standard is fixed and embedded in the skill (references/baseline.md) — no reference app needs to be supplied. Unlike /polish (open-ended, app's-own-best-self, taste-classed, never touches navigation), /feel conforms an app to ONE specific behavioral standard and can do gated structural retrofits — reach for it whenever the goal is "make it feel like the good one" or "match our interaction standard," not "find any nice touch." If the request is open-ended refinement with no fixed standard in mind ("make it nicer / more premium / more Apple-like"), prefer /polish.
version: 1.0.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [linux, macos]
---

# `/feel` — Instill the House Feel

Take one app you already love the feel of, distill *why* it feels that way into a fixed standard, and drive
every other app toward that standard. `/feel` reads a codebase **statically**, scores it **principle-by-principle**
against the **UX-DNA baseline** (`references/baseline.md`), and returns a **conformance scorecard** — not a wishlist.
Then it closes the gap: mechanical fixes applied behind a safety gate, structural retrofits proposed and applied only
when you say so.

The baseline came from the Hercules app — the smoothest, cleanest build in this account's history. This skill is how
that feel travels. The point is **not** to clone Hercules. It's to give any app the same *behavioral DNA* — springs
that settle, taps that answer, elements that breathe, rhythm that holds — **in that app's own visual language.**

## `/feel` vs `/polish` (know which one you want)
- **`/polish`** — open-ended. Finds *any* refinement toward the app's **own** best self; classes each OBJECTIVE/
  CONVENTION/TASTE; cites a north-star company. Never touches navigation/IA/data model. Reach for it to *discover*.
- **`/feel`** — prescriptive. Measures against **one fixed standard** (the UX-DNA) and conforms the app *to it*,
  including gated **structural** changes polish refuses. Reach for it to *converge*.
They compose: run `/feel` to hit the baseline, then `/polish` to add the app's own signature touches on top.

## Invocation
```
/feel                    # audit the whole repo against the baseline → scorecard (report-only, default)
/feel src/screens        # narrow to a path
/feel --apply            # after the scorecard, apply mechanical fixes on approval
/feel --apply --structural   # also offer the gated structural retrofits (nav topology, reset-on-auth, …)
```
Default is **audit-only** — `/feel` never writes without `--apply`. `--structural` unlocks the invasive tier; it is
still gated per-finding and never bulk-applied.

## The Baseline (the fixed rubric — read `references/baseline.md` in full)
Seven principles are the whole standard. Each is a **behavior**, not a brand value, so it ports across apps and stacks:
1. **Spring, don't tween** — interactive motion is physics springs, not linear/eased durations.
2. **Every touch answered in one beat** — press → scale-down + haptic + action, same frame. No dead taps.
3. **Understated & fast** — 150–400ms; motion clarifies a state change, never decorates.
4. **A few things breathe** — only live/system state loops (~1.2–1.5s, reversing); everything else is still.
5. **Enter softly, then settle** — screens/cards fade up a few px on a gentle spring; never a hard cut.
6. **Strict rhythm** — one 4px grid, one radius ladder, one title treatment.
7. **Depth by light, not lines** — separation from a 3-step shadow ramp, not borders.
Exact values + the paste-ready recipes live in `references/baseline.md` and `references/presets/{rn,web}.md`.

## The Doctrine (read `references/doctrine.md` in full; paste it into every audit agent)
The rules that keep `/feel` from doing harm. The load-bearing ones:
- **Adapt, don't clone.** Conform the *behavior* of the DNA; **respect the target app's own scale, palette, type,
  and personality.** If the app already has a design system, layer onto it — never bulldoze it. Erasing a deliberate
  identity to "look like Hercules" is a failure, not a fix. This rule wins every tie.
- **Two tiers, never blurred.** *Mechanical* findings (press-scale, haptics, tokens, entrance/value-bump/pulse motion,
  borders→shadow) are safe to apply anywhere on `--apply`. *Structural* findings (navigation topology, reset-on-auth,
  drawer→modal, custom-header retrofit) are architectural — **report-first, `--structural`-gated, per-finding, never
  bulk.** Retrofitting nav into a live app can break things; treat it with respect.
- **Primitives-first, not scatter-patch.** The durable fix is *one* `Pressable`/`Button`/`Card`/`useHaptics`/tokens
  set that every call site routes through — that's how the baseline app works (one Button that always scales + taps).
  Establish/adopt the primitive, then migrate call sites. Patching each offender inline is whack-a-mole.
- **Stay in the view layer.** Touch presentation only — never business logic, data, auth internals, networking, or
  (in the source repo) BLE/sync/crypto. If a fix needs a logic change, it's out of scope; note it, don't do it.
- **Reduced-motion is not optional.** Every motion you add must yield to `prefers-reduced-motion` (web) /
  `useReducedMotion()` (RN) — kill breathing loops and entrance/bump motion, keep the state change. Skipping this
  turns a feel upgrade into an accessibility regression.
- **Deps are never silent.** Applying RN springs needs `react-native-reanimated` (+ babel plugin + pods); web springs
  need `framer-motion` or `react-spring`. Detect what's missing and surface install/config as an explicit approval
  step — never auto-add.
- **Citation integrity.** Every finding cites `file:line` + a verbatim `anchor` snippet. A gap you can't point to in
  real code doesn't ship.

## Execution Protocol

### Phase 0 — Detect the stack (decides which column applies)
Read `package.json` + a few components. Classify:
- **RN** if `react-native` + (`react-native-reanimated` and/or `@react-navigation/*`). Use `references/presets/rn.md`.
- **React web** if `react` + (`framer-motion` / `react-spring`) or plain CSS. Use `references/presets/web.md`.
- **Other** (Vue/Svelte/Flutter/SwiftUI/…): **principles-only** — score against the 7 principles and describe fixes in
  prose, but do **not** emit code (you'd be guessing APIs). Say so plainly in the scorecard.

Then, before choosing fixes, note:
- **Monorepo / mixed stack** — a repo can hold both RN and web packages. Classify **per app/package directory, not
  repo-wide**: files in an RN package use `rn.md`, web packages use `web.md`. Never apply one column across both.
- **Expo vs bare RN** — if Expo (`expo` in `app.json`/deps, or `eas.json`): haptics can use `expo-haptics` (richer
  feedback types) instead of built-in `Vibration`. Offer the Expo `useHaptics` variant in `rn.md` as a gated option.
- **Existing motion system** — check for a motion/animation constants file and whether a spring lib is already used
  *consistently*. If the app already springs everywhere with its **own** constants, that's P1 **PASS on behavior** —
  do **not** replace its values (doctrine §1). Only wire springs in where there are none.
- **Design-system library** — if the app uses Tamagui / NativeBase / React Native Paper / gluestack / `moti` etc., its
  `Button`/`Pressable` may already conform. Audit **those** primitives against the baseline; don't flag raw-pressable
  absence when the app doesn't use raw pressables.
- **Primitive + tokens present?** — decides "wire it in" vs "establish it first," and whether a dep gate is needed.

### Phase 0.5 — Calibrate to the target's identity (run once, before scoring — this is the anti-clone step)
Before judging the app against the baseline, learn what it already *is*. Read (don't skim) the theme/tokens source, the
2–3 most-developed screens, and the shared primitives. Write a short **App Identity Profile**: its palette, type ramp,
spacing/radius scale, existing motion, and any deliberate signatures. **Paste this into every audit agent alongside the
doctrine.** When a baseline recipe and the app's identity conflict on *look* (a color, a font, a scale), the app wins;
`/feel` only insists on *behavior*. This step is **mandatory and precedes all scoring** — don't start Phase 1 until the
profile is written; it's what prevents cloning. Keep it a short structured note (name · palette usage · type ramp ·
spacing/radius scale · existing-motion system · deliberate signatures); in a monorepo, scope one per app. Persist to
`.feel/identity.json` and, on re-run, refresh by re-reading the theme/tokens.

### Phase 1 — Audit against the baseline (principle-by-principle)
For each of the 7 principles, sweep the relevant surface and collect **violations** with evidence. Fan out with the
Agent tool (`general-purpose`, ≤3 concurrent) over bounded slices when the repo is large; inline for small ones. A
**slice** is ≤15 UI files / ≤2500 LOC (never split a file); fan out only if ≥5 slices, else audit inline. If a
`.polish/scan.json` already exists, reuse its slices rather than re-deriving them. Into
each agent paste **in full**: `references/doctrine.md` + the relevant part of `references/baseline.md` + the **App
Identity Profile** + the slice's files. Each finding records: `principle` (1–7), `file`, `line`, **`anchor`** (verbatim
snippet), `what` (the violation), `fix` (stack-idiomatic, paste-ready — pull from the presets file), **`tier`**
(`mechanical` | `structural`), `flags` (`[REQUIRES DEP]`, `[NEW PRIMITIVE]`, `[REDUCED-MOTION]`), `confidence`.
Common violations to hunt, by principle:
- **P2 dead taps** — a `Pressable`/`TouchableOpacity`/`<button>` with no press-scale and/or no haptic.
- **P1 tween-where-spring-belongs** — a press/entrance driven by `withTiming`/CSS `ease` that should be a spring.
- **P6 off-grid** — spacing/radius as magic numbers instead of the token ladder.
- **P7 border-as-separator** — `borderWidth`/`border:` used where a shadow-ramp elevation belongs.
- **P5 hard-cut mount** — a screen/card that appears with no entrance motion.
- **P4 static-live-state** — a status/connection/loading indicator that doesn't breathe (or one that breathes but never
  cancels off-screen — a perf bug, flag it).
- **P3 overlong/decorative motion** — durations >400ms on interactive feedback, or motion with no state-change meaning.
- **Structural (P-nav)** — nested navigators/tabs where flat fits, push across an auth boundary (should `reset`), a
  drawer navigator where a modal overlay is the pattern, framework header where a custom one gives control.

### Phase 2 — Scorecard (always produced; the core deliverable)
Render `.feel/SCORECARD.md` per `references/scorecard.md`: a headline **feel score** (principles passed / 7 + the raw
counts — dead taps, off-grid values, missing entrances), then a row per principle (PASS / PARTIAL / FAIL + evidence +
the gap), then the finding list split into **Mechanical (apply on `--apply`)** and **Structural (gated, `--structural`)**,
then **Dependencies to add** (if any) and **Reduced-motion work** as their own callouts. Print a tight inline summary.
On a plain `/feel` (no `--apply`), **stop here** — the scorecard is the product.

### Phase 3 — Apply (only on `--apply`; safe, surgical, idempotent)
Ask: **Apply? [ all mechanical · by principle · pick <ids> · none ]**. Structural items appear only with `--structural`
and are **pick-only** (never in "all"). Apply order: **primitives/tokens first** (so call-site migrations have
something to point at), then per-site migrations, then loose fixes.
- **Idempotency** — before each edit, check the target isn't already conformant. Detect by searching the file for the
  finding's `anchor` **and** the fix markers (spring already in the style, haptic already called, token already used);
  if present, skip and log `[~] already applied`. Never double-wrap a handler or stack a second entrance animation.
- **Back up** each target to `.feel/backup/<id>/<relative-path>` before editing; apply via Edit.
- **Reduced-motion** — any motion primitive you create ships with the reduced-motion guard wired in from the presets
  file, not as a follow-up.
- **Dep gate** — if a fix needs a missing dep, don't apply it silently: surface the install + native config as an
  approval step; apply the code only once the dep is confirmed.

### Phase 3b — Verify gate (static; never runs the app)
After a batch: `tsc --noEmit`, `eslint` on changed files, and any build/compile script. A real failure → restore that
finding's backup (most-recent-first) and mark it reverted with the error. Never run `start`/`dev`/`ios`/`android` — that
launches the app. Snapshot/visual test failures are *expected* (appearance changed) → update, don't revert.
- **Reduced-motion (static check)** — confirm every motion primitive you added references `useReducedMotion()` (RN) /
  `prefers-reduced-motion` (web). The real toggle-and-watch is deferred to Phase 4; here just verify the guard exists.

### Phase 4 — Visual handoff (feel is temporal; static checks can't see it)
`/feel` can't watch the animation. End by listing every applied motion/haptic/structural change as "compiles, needs
eyeballing," and suggest **`/verify` or `/run`** to watch the presses, entrances, and breathing loops on a device/preview.
Reduced-motion changes especially want a real toggle-and-look.

### Re-run = stateful delta
Persist `.feel/state.json` (identity profile hash + applied[] ids). On re-run, refresh identity, skip unchanged files,
tick already-applied findings, and offer to finish the remainder before hunting anything new. `applied[]` (not the
checkbox) is the source of truth → crash-resumable. Suggest the user gitignore `.feel/`.

## Claude Code Notes
- Parallelism via the **Agent tool**, ≤3 concurrent, sequential between batches (avoid context saturation).
- **Paste charters in full** into each audit agent — `doctrine.md` + the relevant `baseline.md` section + the App
  Identity Profile. Never summarize them; the agent's whole job is its slice through the fixed rubric.
- Pull fixes from `references/presets/{rn,web}.md` verbatim — they carry the exact spring constants and the
  reduced-motion guards. Don't re-derive motion values from memory; fidelity to the baseline is the point.
- All artifacts under `.feel/`. Write `.feel/SCORECARD.md` there, not repo root.

## Pitfalls
1. **Cloning instead of conforming** — stamping Hercules' red uppercase header / exact scale onto an app with its own
   identity. Calibrate first (Phase 0.5); the App Identity Profile wins every look-tie. Conform *behavior*, not brand.
2. **Structural creep** — auto-applying a nav refactor because it "matches the baseline." Structural is `--structural`,
   pick-only, gated. When in doubt, report it, don't write it.
3. **Scatter-patching** — wrapping fifty call sites by hand instead of establishing one primitive and migrating. The
   primitive is the fix; the migrations are mechanical.
4. **Motion without a reduced-motion path** — shipping breathing loops that ignore the OS setting. That's a regression.
5. **Silent deps** — adding `reanimated`/`framer-motion` without surfacing native config. Gate it.
6. **Stack mismatch** — emitting `withSpring` for a web app or `whileTap` for RN. Detect first (Phase 0), adapt always;
   for unsupported stacks stay principles-only and say so.
7. **Pathologizing a decision** — flagging an app that is *deliberately* still/flat/minimal as N violations. A uniform
   absence is usually intentional; an *inconsistent* one is the real finding. Note the judgment call in the scorecard.
8. **Faking the feel with numbers** — a green `tsc` is not a smooth app. Always end on the visual handoff (Phase 4).
