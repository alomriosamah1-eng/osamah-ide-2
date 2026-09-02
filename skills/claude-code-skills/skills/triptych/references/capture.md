# Capture — per-platform recipes for screenshots + video

Read this in Phase 3. Goal: identical capture conditions across all panels — incumbent included — (same
device/viewport, same data snapshot, same walkthrough script) so the comparison is about the design, not the
photography. Capture the incumbent FIRST when the target already exists; it sets the bar the challengers are
filmed against. All artifacts land in `<project>/design/triptych/<yyyy-mm-dd>-<target-slug>/`:
`00-incumbent.png` / `00-incumbent.mp4`, then challengers in thesis order as `01-<thesis-slug>.png` (money
shot), `01-<thesis-slug>.mp4`, extra states as `01-<thesis-slug>--<state>.png` (double hyphen — the montage
script keys on it).

## iOS (native / SwiftUI / UIKit) — simulator

1. If the user is present, attach the live simulator panel FIRST (it's their window into the round), then
   build and launch each variant via the switcher.
2. Screenshot per key state with the simulator control tool (headless, no panel needed).
3. Video: drive the interaction while recording —
   ```bash
   xcrun simctl io booted recordVideo --codec h264 --force "design/triptych/<dir>/01-<slug>.mp4" &
   REC_PID=$!
   # …perform the walkthrough (taps/scrolls via the simulator control tool)…
   kill -INT $REC_PID && wait $REC_PID
   ```
   Keep it 10–30s: entrance → scroll → the signature moment. Same walkthrough script for every concept.
4. Same simulator device for all N (pick one mainstream device, e.g. the current base iPhone).

## React Native

Same as iOS above when running in the simulator (Metro: `npm start`, then build once — the variant switcher
means one build serves all N). For Android-first projects: `adb exec-out screencap -p > file.png` and
`adb shell screenrecord` are the equivalents; pick ONE platform for the round and say which.

## Web

1. Start the dev server via the browser preview tooling; set a fixed viewport (mobile 375×812 or desktop
   1280×800 — whichever the brief targets) and keep it fixed across all N.
2. Screenshot per key state via the browser tooling.
3. Video: prefer a real screen recording of the browser pane; if unavailable, a scripted capture
   (e.g. Playwright `--video`) is fine — it's still the real running app. An animated GIF of the interaction
   is an acceptable substitute where mp4 tooling is missing; label it as such.

## States to capture (all platforms)

For each concept: the 2–4 key states locked in Phase 0 — typically loaded/happy-path (the money shot),
empty, and the active/signature state. Empty states are where weak concepts hide; capturing them keeps the
vote honest.

## Verification before the Pick Sheet

- Build succeeded and each variant was actually rendered (a capture that errored ≠ a capture).
- Screenshots are pairwise visually distinct — eyeball all N side by side yourself first. Two near-identical
  captures mean divergence failed: return to Phase 1 rather than presenting a fake choice.
- Every image presented as a screenshot came from the running app. Never present a drawn/generated image as
  a screen capture.

## Prototype lane (only when the app cannot run)

If the project can't build (broken env, missing signing, no simulator), don't fake it. Offer two honest
options and let the owner choose: (a) fix the build first, then run the round properly; or (b) a clearly
labeled **prototype round** — self-contained HTML/SwiftUI-preview prototypes rendered and screenshotted from
a real browser/preview, presented with the label "prototype, not the app" on the Pick Sheet. The pick from a
prototype round locks direction only; a follow-up build in the real app confirms it.
