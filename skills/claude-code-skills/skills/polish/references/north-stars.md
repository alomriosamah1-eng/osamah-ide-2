# North Stars — the gold-standard reference library

> Pasted **in full** into every desk agent. This file is the **single source of truth** for any number you attribute
> to a company. The App Style Profile (Phase 0.5) is your primary target; these are a *technique* library you borrow
> craft from — never a skin to clone (see doctrine § Preserve Identity).

## How to cite (WHO field rules — read doctrine § Citation Integrity)
- **Tag every WHO `[DOCUMENTED]` or `[PRINCIPLE]`.** `[DOCUMENTED]` = a number that appears in THIS file (you may
  quote it). `[PRINCIPLE]` = the company's documented approach stated WITHOUT a number.
- **Never invent a number and attribute it to a company.** If the figure isn't in this file, cite the principle, not
  a figure. The "Blessed numbers" lists below are the only company-attributable figures; treat them as this skill's
  recommended values aligned to that company's known approach (the exact value in your FIX is *your* call).
- Prefer the exemplar whose platform matches the detected stack (Apple/Things for native; Vercel/Linear for web).
- One company per finding. **WHO is optional** — if none genuinely exemplifies the mechanism, write
  `WHO: — (principle, no exemplar)`. A forced/irrelevant brand is worse than none.
- ✅ "Linear keeps transitions short (~120–160ms ease-out) so the UI feels instant [DOCUMENTED]."
- ✅ "Stripe reveals field focus with a short, subtle transition [PRINCIPLE]."   ❌ "Linear shifts background exactly 4%."

---

## Apple / Human Interface Guidelines  — *the native gold standard; restraint + physics*
- **Motion is physical.** Spring-based, interruptible animations; nothing moves linearly. Sheets, navigation
  pushes, and modals use spring curves, not fixed easing. Default feel ≈ spring(response 0.4–0.5, damping 0.8).
- **Touch feedback is instant.** Controls respond on touch-*down*, not touch-up: subtle scale (~0.96) / highlight.
- **Haptics are meaningful.** `selection` on picker ticks, `impact(light)` on toggles, `notification(success/error)`
  on outcomes — never gratuitous.
- **Dynamic Type & legibility.** Text scales with user settings; never hard-clamp font sizes. SF text styles
  (Title/Body/Caption) carry consistent line-heights.
- **Accessibility is first-class.** Every control has a label; Reduce Motion swaps slides for cross-fades; targets ≥ 44pt.
- **Materials & depth.** Blur/vibrancy and layered shadows imply hierarchy; elevation is meaningful, not decorative.
- Use for: Motion, A11y, Layout (safe areas), and any React Native target.

## Linear  — *speed as a feeling; the web's crispness benchmark*
- **Everything is fast and ~120–160ms.** Hover, selection, and panel transitions are short ease-outs; nothing
  lingers. Snappiness is the brand.
- **Keyboard-first.** Every action has a shortcut; hints shown inline; focus states are crisp and always visible.
- **Empty states do work.** They explain the feature, show a sample, and offer the primary action — never a bare
  "No items."
- **Optimistic UI.** Actions reflect instantly; the network catches up silently. No spinners for things that
  "should" be instant.
- **Restrained palette + tight type scale.** High signal, low chrome.
- Use for: Motion (timing), States (empty), A11y (keyboard/focus), Typography.

## Stripe  — *trust through microcopy + forms; quiet micro-interactions*
- **Forms are the masterclass.** Inline validation on blur (not on every keystroke); errors appear directly under
  the field in plain, fixable language ("Your card number is incomplete"), not codes.
- **Microcopy is human and exact.** Buttons state the outcome ("Pay $20", not "Submit"); helper text preempts confusion.
- **Subtle motion.** Card-element focus rings animate in; row reveals are gentle fades/slides ~150ms.
- **Numerals & money are formatted impeccably** — locale, currency, alignment.
- Use for: Forms, Copy (errors, CTAs), Motion (focus rings).

## Vercel / Geist  — *typographic rhythm + dark mode done right*
- **Type scale & vertical rhythm.** Deliberate size/line-height ramp; generous, consistent spacing on an 8pt grid.
- **Dark mode is engineered, not inverted.** Layered near-blacks for elevation (not pure #000), borders carry
  hierarchy, contrast stays AA+. Shadows are replaced by subtle borders/lighter surfaces in dark.
- **Monochrome restraint + one accent.** Color is information, not decoration.
- **Crisp focus + border treatments**; hairline dividers; precise radii.
- Use for: Typography, Consistency (dark-mode parity, tokens), A11y (contrast).

## Notion  — *content density, calm states, forgiving editing*
- **Empty/first-run states teach.** Templates and inline prompts ("Type '/' for commands") guide the next action.
- **Density with air.** High information density that still breathes via consistent spacing and quiet dividers.
- **Hover affordances appear on approach** (drag handles, + buttons) — discoverable without cluttering rest state.
- **Skeletons over spinners** for content loads; layout reserved so nothing jumps.
- Use for: States (empty/first-run/loading), Copy (guiding), Typography (density), Layout (no shift).

## Things (Cultured Code)  — *native delight in the details*
- **Signature micro-interactions.** The "magic plus" and the satisfying check-off animation reward routine actions.
- **Spring + haptics pairing.** Completion animates and taps a haptic — the action *feels* done.
- **Impeccable spacing & type hierarchy**; nothing is a pixel off; generous touch targets.
- **Reduce Motion respected** with graceful fallbacks.
- Use for: Motion (delight, completion feedback), A11y, Typography, Layout.

## RAIL / FlashList  — *the perceived-performance & jank benchmark*
- **RAIL response budget (Google, documented):** respond to input within **100ms**; render frames within **~16ms**
  (60fps); chunk work in **≤50ms** idle blocks. If work exceeds 100ms, show feedback (spinner/optimistic).
- **Virtualized lists (FlashList / FlatList) hit 60fps** by recycling rows — never mount a long `.map()` in a ScrollView.
- **Jank is unintended motion:** dropped frames from re-renders read as cheapness even when nothing is "animated."
- Use for: Performance (the whole desk), Motion (native-driver / 60fps).

## iOS interaction physics  — *fluid, interruptible, direct-manipulation gestures*
- **Interactive pop (swipe-back), sheet detents with rubber-banding, drag-to-dismiss with velocity** — gestures are
  interruptible and track the finger 1:1, never a fixed timed animation. [PRINCIPLE]
- **Expected affordances:** destructive rows swipe to reveal delete; secondary actions live behind long-press
  (context menus); bottom sheets dismiss by drag. Polishing these is in-scope; inventing a new gesture flow is not.
- Use for: Gestures (the whole desk), Motion (transition feel).

---

## Blessed numbers (the ONLY company-attributable figures — cite these as `[DOCUMENTED]`)
> These are this skill's recommended values, aligned to each company's documented approach. Anything not here →
> cite the principle without a number. Genuinely-standard figures (★) are formal specs, not just convention.
- **Apple:** touch-down scale ≈ 0.96–0.97 · sheet/modal spring ≈ response 0.4–0.5, damping 0.8 · ★ min touch target
  **44×44pt** · dark elevation grays `#1C1C1E` / `#2C2C2E` / `#3A3A3C` (layered, not pure `#000`) · Reduce Motion →
  cross-fade (no slide/parallax) · haptics: `selection` on tick, `impact(light/medium)` on toggle/drag, `notification`
  on outcome.
- **Linear:** transitions ~120–160ms ease-out · list-row entrance stagger ~20–30ms apart · optimistic UI updates next
  frame (<16ms) · destructive actions offer an **Undo** toast (~5s window).
- **Stripe:** validate **on blur** (not per keystroke) · inline plain-language errors under the field · outcome
  buttons ("Pay $20") · tabular-nums for money.
- **Vercel / Geist:** ★ **8pt spacing grid** · modular type ramp (e.g. 12/14/16/20/24/32 with matched line-heights) ·
  dark elevation via layered near-blacks + hairline borders (not `#000`) · near-black body text (~`#171717`) not pure
  `#000` · 2px focus ring with offset.
- **Notion:** content-shaped skeletons (not generic gray boxes) · first-run inline prompts · hover affordances appear
  on approach, hidden at rest.
- **Things:** completion = spring + `notification(success)`/`impact` haptic pairing · tabular-nums for dates/counts ·
  pixel-precise spacing.
- **RAIL (Google, ★ documented):** 100ms input response · 16ms frame · 50ms idle chunks.
- **WCAG (★ standard):** text contrast AA **4.5:1** (large/UI **3:1**) · target ≥ 44×44pt.

## Quick map: desk → primary exemplars
| Desk | Primary north stars |
|------|---------------------|
| Motion | Apple (springs/touch-down), Linear (120–160ms), Things (completion + haptics) |
| Copy | Stripe (errors/CTAs), Linear (terse), Notion (guiding) |
| States | Linear (empty/optimistic/undo), Notion (first-run/skeletons) |
| A11y | Apple HIG (labels/targets/Reduce Motion), Vercel (focus/contrast), WCAG (ratios) |
| Typography | Vercel/Geist (scale, dark mode, near-black), Apple (text styles), Things (tabular-nums) |
| Consistency | Vercel (tokens/dark parity), Apple (system materials/grays) |
| Layout | Apple (safe areas/Dynamic Island), Notion (no layout shift), responsive web |
| Forms | Stripe (validation/microcopy), Linear (keyboard) |
| Performance | RAIL (100ms/16ms), FlashList/FlatList (60fps virtualization) |
| Gestures | iOS physics (interactive pop, sheet detents, drag-to-dismiss), Apple haptics |
