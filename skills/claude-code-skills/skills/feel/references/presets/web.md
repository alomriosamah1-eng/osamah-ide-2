# React web presets — paste-ready

The spring constants are **identical** to the RN baseline (same physics model), so the feel transfers exactly. Given
in three flavors — pick what the app already uses: **Framer Motion** (best DX), **react-spring**, or **plain CSS**.
Reduced-motion wired in each way.

**Adapt before pasting:** conform spacing/radius/color to the target app's tokens (CSS vars / theme) if it has them.
Never hardcode a brand color.

## Motion constants — `motion.ts`
```ts
export const SPRING = {
  press:    {type: 'spring', damping: 15, stiffness: 300},  // Framer Motion form
  entrance: {type: 'spring', damping: 14, stiffness: 120},
  value:    {type: 'spring', damping: 12, stiffness: 200},
} as const;
// react-spring form: {tension: stiffness, friction: damping}. e.g. press → {tension: 300, friction: 15}
export const DURATION = {fast: 0.15, normal: 0.25, slow: 0.4} as const; // seconds
export const PRESS_SCALE = {large: 0.97, small: 0.9} as const;
```

## Tokens — CSS custom properties (only if the app has none)
```css
:root {
  --space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px; --space-xxl: 48px;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 24px; --radius-pill: 9999px;
  --shadow-subtle:   0 2px 4px  rgba(0,0,0,.04);
  --shadow-card:     0 4px 16px rgba(0,0,0,.08);
  --shadow-elevated: 0 8px 24px rgba(0,0,0,.12);
}
```

## P2 — Haptics — `useHaptics.ts`  (web has no real haptics; the press-scale carries feedback)
```ts
let enabled = true;
export const setHapticsEnabled = (v: boolean) => {enabled = v;};
export function useHaptics() {
  const buzz = (ms: number) => {if (enabled && 'vibrate' in navigator) navigator.vibrate(ms);};
  return {tap: () => buzz(10), signal: () => buzz(50)};  // no-ops on desktop; works on supporting mobile browsers
}
```

## P1 + P2 — Pressable primitive (Framer Motion) — `Pressable.tsx`
```tsx
import {motion, useReducedMotion} from 'framer-motion';
import {SPRING, PRESS_SCALE} from './motion';
import {useHaptics} from './useHaptics';

export function Pressable({children, onClick, size = 'large', haptic = true, ...rest}: any) {
  const reduce = useReducedMotion();
  const {tap} = useHaptics();
  return (
    <motion.button
      whileTap={reduce ? undefined : {scale: PRESS_SCALE[size]}}
      transition={SPRING.press}
      onClick={(e) => {if (haptic) tap(); onClick?.(e);}}
      {...rest}>
      {children}
    </motion.button>
  );
}
```
Plain-CSS equivalent (no Framer): `button:active {transform: scale(.97);} button {transition: transform .12s cubic-bezier(.2,.8,.2,1);}`

## P5 — Entrance (Framer Motion) — screen/card mount
```tsx
import {motion, useReducedMotion} from 'framer-motion';
import {SPRING, DURATION} from './motion';

export function Entrance({children}: {children: React.ReactNode}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;                     // appear instantly under reduced-motion
  return (
    <motion.div
      initial={{opacity: 0, y: 24}}
      animate={{opacity: 1, y: 0}}
      transition={{opacity: {duration: DURATION.slow}, y: SPRING.entrance, delay: 0.1}}>
      {children}
    </motion.div>
  );
}
```

## P1 — Value-bump (Framer Motion): on the value changing, animate `y: [0, -8, 0]` + `opacity: [1, .5, 1]` with the
`value` spring; `key={value}` to retrigger. Under reduced-motion, render the number plain.

## P4 — Breathing pulse (CSS) — only for live/system state
```css
@media (prefers-reduced-motion: no-preference) {
  .status-dot-glow { animation: feel-pulse 1200ms ease-in-out infinite alternate; }
  @keyframes feel-pulse { from {opacity: .3; transform: scale(1);} to {opacity: 0; transform: scale(1.8);} }
}
/* Mount the glow element only while active so the loop stops when the state ends (P4: no off-screen loops). */
```

## P5 — Stagger: children with `transition-delay: calc(100ms + var(--i) * 40ms)`, or Framer `staggerChildren: 0.04,
delayChildren: 0.1`. Gate under `prefers-reduced-motion`.

## P4 — Radar/scan: concentric rings, `@keyframes` `scale(1)→scale(2.5)` + `opacity 1→0`, `1500ms infinite`, 2nd ring
`animation-delay`. Render only while searching. Reduced-motion → static "searching…" state.

## P3/P7 note
Transitions on interactive feedback stay ≤400ms; use the springs above, not long CSS eases. For depth (P7), reach for
`box-shadow` on the 3-step ramp — not `border` — to separate surfaces.
