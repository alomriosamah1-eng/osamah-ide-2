# Scorecard template — `.feel/SCORECARD.md`

The scorecard is the core deliverable — on a plain `/feel` (no `--apply`) it's the *only* output. It has to read
clearly at a glance: how conformant is this app, where exactly does it miss, and what closes the gap. Use this exact
structure.

```markdown
# Feel Scorecard — <app name>
Stack: <RN + Reanimated | React web + Framer Motion | plain CSS | Other (principles-only)>
Feel score: **<N>/7 principles** · <D> dead taps · <O> off-grid values · <M> screens w/o entrance · <L> uncancelled loops · <B> border-separators
Identity: <one line from the App Identity Profile — what this app is, so the reader trusts we adapted, not cloned>

## Principles
| # | Principle | Verdict | Evidence (file:line) | Gap |
|---|-----------|---------|----------------------|-----|
| 1 | Spring, don't tween        | PASS/PARTIAL/FAIL | `path:line` | <one line> |
| 2 | Every touch answered        | … | `path:line` | … |
| 3 | Understated & fast          | … | … | … |
| 4 | A few things breathe        | … | … | … |
| 5 | Enter softly, settle        | … | … | … |
| 6 | Strict rhythm               | … | … | … |
| 7 | Depth by light, not lines   | … | … | … |

## Mechanical findings — apply on `--apply`
Safe anywhere; small blast radius. Grouped by principle. Primitives/tokens first (others migrate onto them).
- **[F1] P2 · dead tap** — `src/components/IconButton.tsx:22`
  anchor: `<TouchableOpacity onPress={onPress}>`
  fix: route through the `Pressable` primitive (press-scale + haptic). `[NEW PRIMITIVE]` if none exists yet.
- **[F2] P6 · off-grid** — `src/screens/Home.tsx:88` anchor: `padding: 13` → `SPACING.md` (16).
- … (one per finding: id, principle, file:line, anchor, fix, flags, confidence)

## Structural findings — `--structural`, pick-only, gated
Architectural; propose with reasoning, apply only when named. NEVER in "apply all".
- **[S1] P-nav · nested stacks** — `src/navigation/…` : three nested navigators where a flat stack fits.
  why: <reasoning> · risk: <what could break> · change: <what the retrofit does>
- **[S2] P-nav · push across auth** — sign-in `navigate()` should `reset()` so you can't back into a logged-out state.
- …

## Dependencies to add (approval required — never auto-added)
- `react-native-reanimated` — needed for [F#…]. Install: `<cmd>` + babel plugin + `pod install`. (skip if present)
- … or "none — all fixes use libs already installed."

## Reduced-motion
- <Does the app honor reduce-motion today? Which added motions ship the guard? Any existing motion missing it?>

## Out of scope (needs logic change / not view-layer)
- <anything a feel fix would require touching business logic/data/auth to land — named, not done>

## Verify & eyeball
- Static gate after apply: `tsc --noEmit`, eslint on changed files, build. (Never runs the app.)
- Feel is temporal — end with: "run `/verify` or `/run` to watch the presses, entrances, and breathing loops, and
  toggle reduce-motion to confirm the guards."
```

## Inline summary (print after writing the file)
One tight block: `Feel <N>/7 · <D> dead taps · <O> off-grid · <M> no-entrance · <L> loops` then
`Mechanical: <count> ready · Structural: <count> gated · Deps: <count>`, then the single highest-leverage next move
(usually: "establish the `Pressable` primitive → <D> dead taps fixed at once"). If audit-only, end with
"re-run with `--apply` to close the mechanical gap."
