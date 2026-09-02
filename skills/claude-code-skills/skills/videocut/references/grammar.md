# Cut Grammar (grammar.md)

The fixed editorial rules the pipeline enforces. Punchy social grammar:
hard cuts on beat, speed ramps on the money moment, no crossfades.

## Structure of a 20-30s reel

1. **Cold open (0 to ~1.5s):** a 2-beat tease of the MONEY moment. Best frame
   first; retention is decided in the first 1.5 seconds.
2. **Build (chronological):** approved shots in shoot order, valleys between
   peaks (the wait, faces, walking) so the payoff has contrast.
3. **Payoff:** the money shot in its chronological place, slow-motion ramped,
   ideally landing on the track's drop (cut.py aligns music offset for this).
4. **End card (last 1.75s):** logo card, music fades out under it.

## Numbers

| Rule | Value |
|---|---|
| Shot slot lengths | 2 or 4 beats (120 BPM: 1.0s / 2.0s; 90 BPM: 1.33s / 2.67s) |
| Slot pattern | mostly 2-beat, every 3rd shot 4-beat (avoids metronome feel) |
| Money ramp | 0.35x speed on a 4-beat slot, sources >=60fps only |
| Natural audio under music | -15 dB duck |
| Impact shots (gunshot/splash/laugh) | natural audio stays hot (0 dB) |
| Ramped + tease shots | natural audio muted (slowed audio sounds broken) |
| Loudness | -14 LUFS integrated, -1 dBTP peak |
| Music fade-out | last 1.5s, under the end card |
| Track BPM sweet spot | 90-140 for punchy reels |

## Transitions

- Hard cuts only.
- One dissolve allowed per LAND reel for time-passage (before -> after).
  v1 renderer does not implement dissolves; when a land reel needs one, note
  it and cut hard anyway or handle manually.
- Whip transitions only if whipped in camera (a fast pan cut mid-motion).

## Framing / safe zones (9:16 platforms)

- Critical action inside the center 80% of frame width.
- Nothing that matters in the bottom 25% (caption/UI zone) or top 10%
  (platform chrome).
- Horizontal sources are center-cropped by default; `crop-left`/`crop-right`
  per shot when the subject sits off-center (pick sheet protocol).

## Delivery spec

1080x1920 @ 30fps, H.264 High L4.2, CRF 18 capped ~14 Mbps, yuv420p, BT.709,
AAC-LC 192k 48kHz stereo, +faststart. Two files per reel:
- `hero-music.mp4` — music burned in (embeds, DMs, YouTube Shorts)
- `hero-clean.mp4` — identical cut, natural audio only (post with trending
  in-platform audio when reach matters; platforms can suppress unrecognized
  burned music)
