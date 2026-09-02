# /videocut BUILD-SPEC (locked 2026-08-12, deepened same session)

Status: BUILT 2026-08-12. Selftest ALL PASS (22 assertions, synthetic footage,
probe->scan->picksheet->beatmap->cut->proxy->final). Implementation notes vs
this spec: all scripts are Python (probe.py/render.py, not .sh); previews are
mp4 loops not webp (homebrew ffmpeg lacks the webp encoder); venv at
~/.claude/venvs/videocut (python3.12: librosa needs numba, which doesn't
support the system 3.14 yet). NOT yet run on real iPhone footage.

## Purpose

Folder of raw iPhone footage in -> one 20-30s beat-synced 9:16 hero reel out
(two files: music-burned + clean), via a human-gated pick sheet. Content:
BlindBuddy world (hunts, trade shows, land work). All local, all free (ffmpeg
+ python audio libs). Zero cloud spend.

## Locked decisions

| Axis | Decision |
|---|---|
| Output | 9:16 vertical, 1080x1920, one hero reel per run, 20-30s |
| Versions | Both: music-burned + clean (same cut timing) per reel |
| Selection | Hybrid: auto-scan finds candidates -> pick sheet -> Bobby approves -> render |
| Sources | iPhone only (HEVC; tonemap stage for any HDR footage) |
| Captions | None (v1) |
| Music | Per-run: Bobby drops 1-2 tracks next to footage; skill beat-syncs to it |
| Edit grammar | Punchy: hard cuts on beat, speed ramps on money moments, no crossfades |
| Kill/harvest | No filtering. Impact moments get an info tag on the pick sheet, nothing more |
| Branding | End card only, 1.5-2s, logo + handle/CTA. One-time setup: build card from existing logo |
| Folders | ~/Desktop/Hansen Capital Group LLC/BlindBuddy Content/{inbox, tracks, reels, archive} |

---

# PART 1: CAPTURE DOCTRINE (the part no pipeline can fix)

Becomes `references/shooting.md` in the built skill. This is the contract
between Bobby-in-the-field and the machine at home.

## 1.1 iPhone settings (set once, tonight)

Settings > Camera > Record Video:
- **4K at 60 fps.** Non-negotiable. 60fps is what makes speed ramps possible;
  30fps footage gets a NO-RAMP flag from the pipeline.
- **HDR Video OFF.** Kills the Dolby Vision gray-wash problem at the source
  instead of tonemapping around it. SDR BT.709 end to end = predictable color
  on every viewer's screen. (Pipeline keeps a tonemap stage for pre-existing
  HDR footage; new footage should never need it.)
- **Enhanced Stabilization ON.**
- Settings > Camera: **Grid ON, Level ON.**
- Formats: High Efficiency (HEVC) is fine. **Never ProRes** (~6GB/min, zero
  benefit for social delivery).

Mode rules:
- **Action mode** for any walking/running shot (drops to 2.8K, still above the
  1080 delivery target, worth it).
- **Slo-mo 1080p240** only for a PLANNED money moment (birds committing, the
  splash, the retrieve). 240fps gives the pipeline 8x ramp headroom.
- **Cinematic mode NEVER.** Baked focus racks + depth metadata fight the pipeline.
- **Timelapse mode** for land work (see 1.4).

## 1.2 Universal field rules

1. **Vertical by default.** Deliverable is 9:16. Horizontal only when the
   subject IS the horizon (sunrise over the spread, land wides); it gets
   center-cropped and loses 65% of its width. Assume anything horizontal will
   be punched in hard.
2. **Hold every shot 4 seconds minimum.** The edit uses 1.5-2.5s per shot and
   needs handles on both sides. Count it out. A 2s clip is nearly uncuttable.
3. **Move-then-hold, never pan-and-hunt.** Static hold -> reposition -> static
   hold. Constant drifting pans are the #1 amateur tell and cut terribly on beat.
4. **3-shot rule per scene: wide, medium, detail.** Wide = where we are.
   Medium = who's doing what. Detail = hands, shells, dog's eyes, mud on boots.
   The detail shots are what make an edit feel expensive.
5. **10:1 shoot ratio.** A 25s reel wants ~25 pick-sheet candidates, which is
   ~10-15 min of shot footage per session. Two clips of the truck won't cut it.
6. **Keep rolling +5s after the moment.** The reaction after the shot outranks
   the shot. Premature stop-record is the most common lost-moment cause.
7. **Sound IS the index.** The scanner finds moments by audio spikes: gunshots,
   calls, laughing, "there he is," splashes. Don't talk over a working call;
   don't stop recording before the whoop.
8. **Wind kills audio.** Body-block the wind, cup the mic edge, or shoot from
   inside the blind wall. (Optional upgrade, flagged cost: DJI Mic Mini ~$89,
   one-time. Not required for v1.)
9. **Exposure: tap-hold AE/AF lock** on any sky-heavy frame, then drag exposure
   down slightly. Blown-out sky is unrecoverable; a dark subject is half recoverable.
   Never shoot people backlit against sunrise unless silhouette is the point.
10. **Lens hygiene.** Pocket lint + dawn condensation = hazy footage that reads
    as broken after processing. Wipe on shirt before every scene.

## 1.3 Coverage checklists per genre

Printed to the pick sheet as a coverage scorecard so gaps are visible per run.

**HUNT (the wait-then-explode genre)**
- [ ] Headlights/gear-load in the dark (arrival texture)
- [ ] Walk-in: boots, flashlight beams, decoy bag on back
- [ ] Setup: decoys hitting water, blind brushing, dog settling
- [ ] The wait: faces, breath in cold air, coffee, scanning eyes (these are the
      pacing valleys the edit needs between peaks)
- [ ] Wildlife b-roll: birds working, ducks landing wide
- [ ] THE MOMENT: shoot slo-mo if planned, keep rolling after (rule 6)
- [ ] Dog work / retrieve (single best-performing content class in the genre)
- [ ] Reaction: high-fives, the whoop
- [ ] Tailgate: birds on the gate, sunrise, group shot
- [ ] One deliberate golden-hour beauty shot

**TRADE SHOW (the speech-and-energy genre)**
- [ ] Venue establishing wide (signage legible)
- [ ] Aisle walk-through POV (Action mode)
- [ ] Booth interactions: handshakes, demos, pointing at product
- [ ] Detail: hands on product, badge, swag
- [ ] BlindBuddy on a phone screen IN someone's hand (the only shot that
      markets the app directly; get it every show)
- [ ] Crowd energy wide
- [ ] One face-to-camera moment (even 5 seconds)

**LAND WORK (the transformation genre)**
- [ ] BEFORE wide from a fixed landmark (same rock/post/corner EVERY visit;
      this is the money asset of the whole genre, comparisons need a constant)
- [ ] Timelapse of the work session (native Timelapse mode, phone propped/leaned)
- [ ] Machinery action: wide + tight on the implement
- [ ] Human texture: gloves, sweat, water break, dirt in hands
- [ ] AFTER wide from the SAME landmark
- [ ] Walk-the-result shot

## 1.4 Storage discipline

4K60 HEVC ~= 400 MB/min. A weekend hunt = 5-10 GB.
- AirDrop to Mac inbox/ same day (AirDrop preserves originals; do NOT let
  Photos "optimize" convert or strip anything).
- Pipeline policy: after a reel finalizes, approved candidate sub-clips + EDL
  + picksheet move to archive/<date-slug>/; raw inbox footage is flagged for
  manual delete after 30 days. Nothing auto-deletes in v1.

---

# PART 2: PIPELINE (deepened)

```
inbox/*.mov
  -> PROBE      ffprobe batch: duration, fps, resolution, rotation (side_data,
                not filename), HDR/colorspace flag, creation_time, audio streams
  -> SCAN       candidate detection, signals merged per 2s window:
                  1. audio onsets + RMS spikes (gunshot/call/laugh/speech)
                  2. scene changes (scdet)
                  3. motion density (frame-diff at 2fps sample rate)
                  4. NO-audio fallback: motion-only scoring (wind-destroyed clips)
                long clips (>10 min sits) scanned windowed, thumbnailed sparsely
  -> PICK SHEET static HTML: thumbnail grid + 2s animated webp per candidate,
                genre guess, impact-tag, coverage scorecard vs genre checklist,
                clip source + timestamp. Reply protocol in chat:
                  "keep 3,7,9. kill 4. 7 is MONEY. 12 crop-left. reorder 9 before 3"
                MONEY tag = gets the slow-mo ramp + becomes the cold-open hook
  -> BEAT MAP   BPM + onset grid + drop detection (librosa). Track prep: trim
                dead intro, align drop to money moment, outro under end card
  -> CUT        EDL build:
                  - cold open: 1.0-1.5s tease of the money moment FIRST
                  - then chronological build to the payoff
                  - shot length = 2 or 4 beats (90 BPM -> 1.33/2.67s;
                    120 BPM -> 1.0/2.0s); vary 2-beat/4-beat to avoid metronome feel
                  - ramp: money moment to 25-40% speed, 6-10 frame ramp in/out,
                    ONLY if source >=60fps (240fps slo-mo = full luxury ramp)
                  - natural audio ducked -15 dB under music, auto-spiked to full
                    for signature sounds (gunshot, splash, laugh) for 1-2s
                  - hard cuts only; one dissolve allowed per land reel for
                    time-passage; whip-cuts only if whipped in camera
                  - safe zones: critical action inside center 80% width; nothing
                    that matters in bottom 25% or top 10% (platform UI overlay zones)
  -> RENDER     draft: 720x1280 proxy, ultrafast preset -> SendUserFile (<1 min)
                final: 1080x1920@30, H.264 High L4.2, ~12 Mbps VBR, yuv420p,
                BT.709, +faststart, AAC-LC 192k 48kHz stereo,
                loudness -14 LUFS integrated / -1 dBTP peak
                HDR fallback: zscale linear -> tonemap=hable -> zscale bt709
                end card appended (1.5-2s, music outro under it), then x2 mux:
                hero-music.mp4 + hero-clean.mp4 (identical cut timing)
  -> DELIVER    reels/<date>-<slug>/{hero-music.mp4, hero-clean.mp4, edl.json,
                picksheet.html, coverage-report.txt}
```

## Iteration loop

Draft proxy -> Bobby reacts in plain words ("first 3 shots drag", "end on the
retrieve") -> EDL edited -> proxy re-render (<1 min) -> approve -> final render.
EDL persists: re-cuts to a different track are one render, not a session.

## Skill anatomy (build session)

```
~/.claude/skills/videocut/
  SKILL.md          workflow prompt: gates, pick-sheet protocol, iteration loop
  scripts/
    probe.sh        ffprobe batch -> clips.json
    scan.py         signals -> candidates.json + thumbs/ + previews/
    picksheet.py    candidates.json + coverage checklist -> picksheet.html
    beatmap.py      track -> beats.json (BPM, onsets, drop)
    cut.py          picks + beats.json -> edl.json
    render.sh       edl.json -> filtergraph -> mp4 (--proxy | --final)
  assets/
    endcard.png     built once from BlindBuddy logo (setup step)
  references/
    shooting.md     PART 1 above, verbatim (the field contract)
    grammar.md      PART 2 cut rules: BPM tables, ramp spec, duck/spike rules,
                    safe zones, retention structure
```

Deps (all free): ffmpeg (brew), python3 + librosa, Pillow. No paid APIs.

## v1 explicitly OUT (v2 candidates)

- Captions/transcription (local Whisper, free, easy add)
- Subject-tracking auto-crop (v1 = center crop + per-shot manual offset via pick sheet)
- Face/dog detection as a scan signal
- Multi-reel batch per run; 16:9 YouTube master
- Per-genre auto grammar switching
- Title/text overlays beyond end card
- Auto-delete archive policy

## Gotchas locked during planning

1. HDR/Dolby Vision washes gray through naive ffmpeg. Fixed at capture (HDR
   OFF) + tonemap fallback stage for legacy footage.
2. Ramps need >=60fps source; pipeline hard-refuses juddery 30fps ramps.
3. Burned music can suppress platform reach -> that is WHY hero-clean.mp4
   exists. Post clean + trending in-app audio when reach matters.
4. iPhone rotation metadata lives in side_data; filenames and containers lie.
5. iPhone slo-mo (240fps) containers carry the full high-fps stream + an edit
   list; probe must read the real stream fps, not the playback rate.
6. Chronology from creation_time metadata, not filename sort.
7. 20-30s at beat pace = 10-15 shots = ~25 candidates needed = 10:1 shoot ratio.
8. Impact/harvest content: IG/TikTok moderate graphic hunting footage. Info
   tag only per Bobby's call; he owns platform risk.
9. Long sit clips: windowed scan, never thumbnail a 30-min file densely.
10. AirDrop originals; Photos-app export can transcode/strip metadata.

## One-time setup (build session)

1. brew install ffmpeg; pip install librosa Pillow (pin versions in SKILL.md)
2. Create BlindBuddy Content folder tree
3. Build endcard.png from BlindBuddy logo (pull from app repo assets)
4. Bobby sets iPhone per 1.1 (2 minutes, manual)
5. End-to-end test on real sample clips before calling it live
