# `/feel` Doctrine — the rules that keep it from doing harm

Paste this into every audit and apply step. These aren't bureaucracy; each exists because ignoring it produces a worse
app. The reasoning matters more than the rule — when a case is ambiguous, reason from the *why*.

## 1. Adapt, don't clone (the rule that wins every tie)
The baseline is a set of **behaviors**, not a skin. The goal is to give the target app the DNA's *feel* — springs that
settle, taps that answer, elements that breathe — **rendered in the target's own visual language.**

- Conform **behavior** (spring-not-tween, press-answered, breathe-sparingly, depth-by-shadow, motion-timing).
- Respect **identity** (palette, typefaces, spacing scale if one exists, density, deliberate signatures).
- When a baseline value and the app's identity conflict on *look* — a color, a font, its own 5px grid — **the app wins.**
  `/feel` insists on the spring *and* on "use a scale," not on "use *these* numbers."
- Erasing a deliberate identity choice to be "more like Hercules" is a **failure**, full stop. Homogenizing apps into
  one clone is the single worst outcome this skill can produce. This is why Phase 0.5 (calibrate to identity) runs
  *before* any scoring.
- **Corollary — an app that already has its own motion system.** If the target already springs *consistently* with its
  **own** constants, it already carries the DNA's behavior: score P1/P3 **PASS on behavior** and leave its values
  alone. Replacing a working, consistent motion system with the baseline's exact numbers is cloning, not conforming —
  do it only if the user explicitly asks for the exact baseline values. Wire springs in only where there are none.

## 2. Two tiers, never blurred
- **Mechanical** — safe to apply anywhere on `--apply`: press-scale + haptic, entrance/value-bump/pulse motion, tokens,
  borders→shadow, establishing a presentational primitive. Blast radius is small and reversible.
- **Structural** — architectural, `--structural`-gated, **pick-only** (never in "apply all"), report-first:
  flatten nested navigation, `reset()` across auth boundaries, drawer-navigator→modal-overlay, framework-header→custom
  header. These touch routing/state topology; a bad one breaks the app. Propose with the reasoning and let the human
  choose each one. When unsure which tier a finding is, it's structural.
- **Motion that rides a structural change is structural.** Entrance/value motion on surfaces that *already exist* is
  mechanical. But wiring motion into a route that only exists *because* of a structural refactor (e.g. a newly-flattened
  stack) travels **with** that structural finding — it applies only if that structural item is picked, never on its own
  in "apply all mechanical."

## 3. Primitives-first, not scatter-patch
The durable fix is **one** `Pressable`/`Button`/`Card`/`useHaptics`/tokens set that every call site routes through —
exactly how the baseline app works (a single `Button` that *always* scales on press and fires the haptic; a single
`StatusDot` that owns the breathing loop). So:
- If the primitive exists → wire the behavior into it once; the call sites inherit it for free.
- If it doesn't → establish it (`[NEW PRIMITIVE]`), then migrate call sites to it.
- Patching fifty raw `Pressable`s inline is whack-a-mole and drifts on the next feature. Prefer the primitive.
Apply order always: **primitives/tokens first**, then call-site migrations, then loose fixes.

## 4. Stay in the view layer
Touch presentation only. Never business logic, data models, auth internals, networking, persistence, or (in the source
repo) BLE/sync/crypto paths. If a feel fix would require a logic change to land, it's out of scope — **note it in the
scorecard, don't do it.** The feel lives in the components; keep the edits there.

## 5. Reduced-motion is not optional
Every motion you add must yield to the OS "reduce motion" setting — `useReducedMotion()` (Reanimated) /
`prefers-reduced-motion` (web). Under it: **kill the breathing loops and entrance/bump motion; keep the instant state
change** — screens and cards **appear immediately at full opacity, no fade or rise**; values update in place; content
is fully visible, just not animated (never dimmed, delayed, or stuck hidden). Press-scale can stay (it's
tiny and functional) but honor the setting if in doubt. The preset code ships the guard wired in — use it; don't leave
a11y as a follow-up. A motion upgrade that ignores reduced-motion is a regression, not an upgrade.

## 6. Performance is part of the feel
The feel *is* 60fps; jank erases it. So:
- Animate **transform and opacity only** (GPU-composited). Never animate layout props (width/height/top/left/margin) —
  they trigger layout on every frame and stutter. Flag any found.
- On RN, motion must run on the **UI thread** (Reanimated worklets / `useNativeDriver`), never JS-driven `Animated`
  without the native driver.
- Looping animations must `cancelAnimation` (RN) / stop (web) when the state ends or the element unmounts — a loop
  running off-screen burns battery and is a real bug (P4).

## 7. Dependencies are never silent
- RN motion needs `react-native-reanimated` (+ its babel plugin + `pod install`). Web springs need `framer-motion` or
  `react-spring`. Haptics on RN use the built-in `Vibration` (no dep) or `expo-haptics` if Expo.
- If a fix needs a missing dep: tag it `[REQUIRES DEP]`, surface the exact install + native config as an **approval
  step**, and apply the code only once the dep is confirmed present. Never auto-add a dependency.

## 8. Idempotency
`/feel` must be safe to run twice. Before any edit, check the target isn't already conformant — don't double-wrap a
press handler, stack a second entrance animation, or re-add a token that exists. If already done: skip and note it.
The `.feel/state.json applied[]` ledger is the source of truth for what's been applied (survives interruption).

## 9. Citation integrity
Every finding cites `file:line` + a verbatim **anchor** (the actual snippet at that line). Every fix is stack-idiomatic
and paste-ready, pulled from the presets file so the motion constants are exact. A finding you can't ground in real code
— or a fix with a value you re-derived from memory instead of the presets — doesn't ship. Fidelity to the baseline
numbers is the whole point; approximating them defeats it.

## 10. Don't pathologize a deliberate choice
An app that is *uniformly* still, flat, or minimal is probably that way **on purpose**. A uniform absence of motion is
an identity signal, not 40 bugs. Run the test: **uniform = intentional (score PARTIAL, note it); inconsistent = the
real finding.** Offer the feel as an upgrade with a one-line rationale; don't carpet-bomb an intentional aesthetic.
