# The UX-DNA Baseline — the fixed rubric

This is the standard `/feel` scores against. It is **behavioral** — every rule is about how the app *acts*, not what
it looks like, so it ports across brands and stacks. Colors and typefaces are deliberately **out of scope**; the target
app brings its own. Extracted from the Hercules app (React Native + Reanimated); every value below is real, not
aspirational.

For each principle: what it means, **PASS / PARTIAL / FAIL** criteria, and the exact values. Paste the relevant
principle(s) into each audit agent. Paste-ready code for the fixes lives in `presets/rn.md` and `presets/web.md`.

---

## P1 — Spring, don't tween
Interactive motion (anything the user's touch or a state change drives) uses a **physics spring**, so it settles
naturally instead of arriving on a mechanical clock. Timed/eased curves are for *non-interactive* transitions
(fades, loading bars), not for presses, entrances, or value changes.

- **PASS** — press/entrance/value motion is spring-driven (`withSpring` / Framer `type:'spring'` / react-spring). An app
  that springs *consistently* with its **own** constants is PASS on behavior — conform the behavior, keep its values (doctrine §1).
- **PARTIAL** — springs used in some places, `withTiming`/CSS-`ease` on interactive feedback in others.
- **FAIL** — interactive motion is all linear/eased, or there's no motion at all where touch/state changes.

**Values (the house springs):**
- Press feedback: `damping 15, stiffness 300` — snappy, barely overshoots.
- Entrance settle: `damping 14, stiffness 120` — softer, a little weight.
- Value-change settle: `damping 12, stiffness 200` — bouncier, draws the eye.
> Spring constants port verbatim: Reanimated `{damping, stiffness}` == Framer Motion `{damping, stiffness}` ==
> react-spring `{friction: damping, tension: stiffness}`. Same physics model.

## P2 — Every touch answered in one beat
Every tappable element acknowledges the touch **visually and (on native) physically in the same frame**: a small
scale-down on press-in, a haptic tap, then the action. A tap that does nothing until the screen changes feels dead.

- **PASS** — every button/pressable/stepper scales on press-in and fires a haptic (native); the action runs after.
- **PARTIAL** — some controls answer, others (icon buttons, list rows, custom pressables) don't.
- **FAIL** — taps have no press feedback; the only signal is the eventual navigation/state change.

**Values:** scale to **0.97** (large surfaces: buttons, cards) or **0.90** (small circular controls: steppers), via
the press spring (P1). Haptic: **10ms** buzz, fired *before* the action. Release springs back to 1.0. Fire the haptic
in the handler, not after the async work.

## P3 — Understated and fast
Motion exists to make a state change legible, never to decorate. It stays in the **150–400ms** band. If you *notice
the animation itself*, it's too much.

- **PASS** — interactive/transition motion is ≤400ms; each animation maps to a real state change.
- **PARTIAL** — a few overlong (>400ms) or purely decorative animations.
- **FAIL** — slow, showy, or gratuitous motion; animation for its own sake.

**Values (timing scale):** `fast 150 / normal 250 / slow 400` (ms). Screen/route transitions **250ms**. Value-bump
snap **80ms** out, `60ms→120ms` opacity flash. (Looping "breathing" motion is exempt — see P4.)

## P4 — A few things breathe
Only **live or system state** loops — a connection indicator, a scan/search, a sync. Everything else holds still.
Motion means "this is alive / working"; when it stops meaning that, it stops. A looping animation that keeps running
off-screen or after the state ends is a battery/perf bug.

- **PASS** — exactly the live/system indicators loop (~1.2–1.5s, reversing); loops **cancel + reset** when the state
  ends or the element unmounts; nothing decorative loops.
- **PARTIAL** — right elements breathe but loops aren't cancelled when inactive, or a couple of decorative loops exist.
- **FAIL** — nothing breathes (dead), or everything animates constantly (busy/noisy).

**Values:** pulse cycle **1200ms**, reversing, infinite; glow scale **1→1.8**, opacity **1→0.4**. Scan/radar rings:
scale **1→2.5**, opacity **1→0**, **1500ms**, a 2nd ring offset for depth. Always `cancelAnimation` + reset on
inactive/unmount.

## P5 — Enter softly, then settle
Screens and cards arrive by **fading up a few px on a gentle spring** — never a hard cut, never a big slide. First
paint should feel like the content settling into place.

- **PASS** — screen roots / primary cards mount with a fade + small rise on the entrance spring.
- **PARTIAL** — some surfaces animate in, key ones hard-cut.
- **FAIL** — everything appears instantly / pops.

**Values:** from `opacity 0, translateY +24`; `opacity→1` over **350ms** (timing) **+** `translateY→0` on the entrance
spring (P1: `14/120`); **100ms** delay before it starts. Stagger lists/menus: item *i* delayed `100 + i*40` ms, 200ms
fade each.

## P6 — Strict rhythm
One spacing grid, one radius ladder, one title treatment — applied everywhere. Consistency is the bulk of what reads
as "clean." Magic numbers are the enemy.

- **PASS** — spacing/radius come from tokens on a 4px base; titles share one treatment; almost no magic numbers.
- **PARTIAL** — tokens exist but are bypassed in places; off-grid values scattered.
- **FAIL** — ad-hoc spacing/radius everywhere; no scale.

**Values:** spacing base **4px** → `4 / 8 / 16 / 24 / 32 / 48`; radius `8 / 12 / 16 / 24 / pill`; screen side-padding
16, section gaps 24; primary control height **52**; touch targets **≥44**. Title treatment: one display face, UPPERCASE,
letter-spacing ~1.5, weight 700 (behavior only — bring your own typeface). *(Adapt: if the target already has a token
scale, conform to ITS scale — the rule is "use a scale," not "use these exact numbers.")*

## P7 — Depth by light, not lines
Surfaces separate by **soft shadow on a small elevation ramp**, not by borders. The background sits one step below
cards; cards float. Borders are for inputs and dividers, not for boxing content.

- **PASS** — separation is a 3-step shadow ramp; background/card/elevated read as depth, not outlines.
- **PARTIAL** — mix of shadow and border-as-separator.
- **FAIL** — everything boxed with borders; flat, no elevation language.

**Values (shadow-opacity ramp):** `subtle 0.04 → card 0.08 → elevated 0.12`, with y-offset and blur growing along it
(`{y:2,blur:4} → {y:4,blur:16} → {y:8,blur:24}`). Background one step below the lowest card.

---

## How to score
- Each principle → PASS / PARTIAL / FAIL with **≥1 file:line + anchor** as evidence (a violation for FAIL/PARTIAL, or a
  representative conformant site for PASS).
- **Feel score** = count of PASS out of 7, plus the raw counts that make it concrete (dead taps, off-grid values,
  missing entrances, uncancelled loops, border-separators).
- Judgment call: a *deliberate, uniform* absence (an intentionally still, minimal app) is not 40 violations — note it
  as an identity choice in the scorecard and score PARTIAL with a one-line rationale, don't pathologize it.
