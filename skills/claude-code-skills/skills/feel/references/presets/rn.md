# React Native (Reanimated) presets — paste-ready

Exact baseline values, reduced-motion wired in. Reanimated v3 (`useSharedValue`, `useAnimatedStyle`, `withSpring`,
`withTiming`, `withSequence`, `withRepeat`, `withDelay`, `cancelAnimation`, `useReducedMotion`). Haptics via built-in
`Vibration` (no dep) — swap to `expo-haptics` on Expo if preferred.

**Adapt before pasting:** pull spacing/radius/colors from the *target app's* token file if it has one; the values below
are the reference scale for an app that has none. Never hardcode a color — reference the app's palette.

## Motion constants — `motion.ts`
```ts
export const SPRING = {
  press: {damping: 15, stiffness: 300},   // snappy, barely overshoots
  entrance: {damping: 14, stiffness: 120}, // soft, weighted
  value: {damping: 12, stiffness: 200},    // bouncier, eye-catching
} as const;

export const DURATION = {fast: 150, normal: 250, slow: 400} as const;

export const PRESS_SCALE = {large: 0.97, small: 0.9} as const;
```

## Tokens — `tokens.ts` (only if the app has none; otherwise conform to the app's existing scale)
```ts
export const SPACING = {xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48} as const;
export const RADIUS = {sm: 8, md: 12, lg: 16, xl: 24, pill: 9999} as const;
export const SHADOWS = {
  subtle:   {shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: {width: 0, height: 2}, shadowRadius: 4,  elevation: 2},
  card:     {shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: {width: 0, height: 4}, shadowRadius: 16, elevation: 4},
  elevated: {shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: {width: 0, height: 8}, shadowRadius: 24, elevation: 8},
} as const;
```

## P2 — Haptics — `useHaptics.ts`  (one wrapper → one place to disable globally / no-op)
```ts
import {Vibration} from 'react-native';
// Flip this from settings/context to disable app-wide. On Expo, replace bodies with expo-haptics calls.
let enabled = true;
export const setHapticsEnabled = (v: boolean) => {enabled = v;};
export function useHaptics() {
  return {
    tap: () => {if (enabled) Vibration.vibrate(10);},     // every UI press
    signal: () => {if (enabled) Vibration.vibrate(50);},  // system event felt without looking
  };
}
```
**Expo variant** (richer feedback — use this instead if the app is Expo and has `expo-haptics`):
```ts
import * as Haptics from 'expo-haptics';
let enabled = true;
export const setHapticsEnabled = (v: boolean) => {enabled = v;};
export function useHaptics() {
  return {
    tap: () => {if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);},        // every UI press
    signal: () => {if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);}, // system event
  };
}
```

## P1 + P2 — Pressable primitive — `Pressable.tsx`  (route every tappable through this)
```tsx
import React, {useCallback} from 'react';
import {Pressable as RNPressable, PressableProps} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withSpring} from 'react-native-reanimated';
import {SPRING, PRESS_SCALE} from './motion';
import {useHaptics} from './useHaptics';

const A = Animated.createAnimatedComponent(RNPressable);

export function Pressable({
  children, onPress, size = 'large', haptic = true, style, disabled, ...rest
}: PressableProps & {size?: 'large' | 'small'; haptic?: boolean}) {
  const scale = useSharedValue(1);
  const {tap} = useHaptics();
  const anim = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  const target = PRESS_SCALE[size];

  const onIn  = useCallback(() => {if (!disabled) scale.value = withSpring(target, SPRING.press);}, [disabled, target]);
  const onOut = useCallback(() => {scale.value = withSpring(1, SPRING.press);}, []);
  const press = useCallback((e: any) => {if (haptic) tap(); onPress?.(e);}, [haptic, onPress]);

  return (
    <A onPressIn={onIn} onPressOut={onOut} onPress={press} disabled={disabled}
       style={[style, anim]} {...rest}>
      {children}
    </A>
  );
}
```
> Press-scale is small and functional, so it's kept even under reduced-motion. If you'd rather gate it, wrap `onIn`
> with `useReducedMotion()` and skip the spring when true.

## P5 — Entrance — `useEntrance.ts`  (call in a screen/card, spread the style on the root)
```ts
import {useEffect} from 'react';
import {useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, useReducedMotion} from 'react-native-reanimated';
import {SPRING, DURATION} from './motion';

export function useEntrance(delay = 100) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(reduce ? 1 : 0);
  const y = useSharedValue(reduce ? 0 : 24);
  useEffect(() => {
    if (reduce) return;                       // reduced-motion → appear instantly, no animation
    opacity.value = withDelay(delay, withTiming(1, {duration: DURATION.slow - 50})); // 350ms
    y.value = withDelay(delay, withSpring(0, SPRING.entrance));
  }, [reduce, delay]);
  return useAnimatedStyle(() => ({opacity: opacity.value, transform: [{translateY: y.value}]}));
}
```

## P1 — Value-bump — `useValueBump.ts`  (a live number/stat that changes should hop + flash)
```ts
import {useEffect} from 'react';
import {useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, useReducedMotion} from 'react-native-reanimated';
import {SPRING} from './motion';

export function useValueBump(value: number) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    y.value = withSequence(withTiming(-8, {duration: 80}), withSpring(0, SPRING.value));
    opacity.value = withSequence(withTiming(0.5, {duration: 60}), withTiming(1, {duration: 120}));
  }, [value, reduce]);
  return useAnimatedStyle(() => ({transform: [{translateY: y.value}], opacity: opacity.value}));
}
```

## P4 — Breathing pulse — `StatusDot.tsx`  (only for live/system state; cancels when inactive)
```tsx
import React, {useEffect} from 'react';
import {View} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation, useReducedMotion} from 'react-native-reanimated';

export function StatusDot({active, color, size = 12}: {active: boolean; color: string; size?: number}) {
  const reduce = useReducedMotion();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active && !reduce) {
      opacity.value = withRepeat(withTiming(0.4, {duration: 1200}), -1, true);
      scale.value   = withRepeat(withTiming(1.8, {duration: 1200}), -1, true);
    } else {
      cancelAnimation(opacity); cancelAnimation(scale);   // stop loop when inactive/unmount → no wasted frames
      opacity.value = 1; scale.value = 1;
    }
    return () => {cancelAnimation(opacity); cancelAnimation(scale);};
  }, [active, reduce]);
  const glow = useAnimatedStyle(() => ({opacity: active ? opacity.value * 0.3 : 0, transform: [{scale: scale.value}]}));
  return (
    <View style={{width: size * 2.2, height: size * 2.2, alignItems: 'center', justifyContent: 'center'}}>
      <Animated.View style={[{position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color}, glow]} />
      <View style={{width: size, height: size, borderRadius: size / 2, backgroundColor: active ? color : '#9CA3AF'}} />
    </View>
  );
}
```

## P5 — Stagger (list/menu reveal): item `i` starts at `withDelay(100 + i * 40, withTiming(1, {duration: 200}))` on
opacity (and a small translateY). Gate the whole thing on `useReducedMotion()` → render fully visible.

## P4 — Radar/scan — `useRadarRing.ts`  (searching indicator; cancels on stop, like the pulse)
```ts
import {useEffect} from 'react';
import {useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation, useReducedMotion} from 'react-native-reanimated';

export function useRadarRing(active: boolean, offset = 0) {  // render 2+ rings with staggered `offset` for depth
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (active && !reduce) {
      t.value = withRepeat(withTiming(1, {duration: 1500}), -1, false);  // no reverse — rings expand outward
    } else {
      cancelAnimation(t); t.value = 0;
    }
    return () => cancelAnimation(t);
  }, [active, reduce]);
  return useAnimatedStyle(() => ({opacity: 1 - t.value, transform: [{scale: 1 + t.value * 1.5}]}));  // 1→2.5 scale, 1→0 opacity
}
```
Reduced-motion → the hook returns a static (opacity 1, scale 1) ring; pair it with a plain "Searching…" label instead
of animation. Mount rings only while `active` so the loop can't run off-screen.
