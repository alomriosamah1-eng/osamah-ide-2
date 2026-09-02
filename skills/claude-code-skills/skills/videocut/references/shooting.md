# Capture Doctrine (shooting.md)

This is the contract
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

