---
name: videocut
description: Cut a folder of raw iPhone footage into a 20-30s beat-synced 9:16 vertical reel (music-burned + clean versions) via a human-gated pick sheet. Auto-detects candidate moments from audio spikes and scene changes, maps approved shots onto the music's beat grid, renders hard-cut/speed-ramp social edits with ffmpeg. Use when the user says "/videocut", wants a highlight reel, a social edit, a hunting/trade-show/land-work recap video, or "cut this footage into a reel". Fully local, zero paid APIs.
---

# /videocut — Reel Cutter

Folder of raw footage in, one hero reel out (two files: `hero-music.mp4` +
`hero-clean.mp4`), through a mandatory human pick gate. Doctrine lives in
`references/grammar.md` (cut rules) and `references/shooting.md` (capture
contract, share it when the user asks how to shoot better).

## Hard gates (never skip)

1. **Pick sheet gate**: never build an EDL until the user has replied to the
   pick sheet. Auto-picks are for `selftest.py` only.
2. **Final render gate**: never run `--final` until the user approves a proxy
   draft. Proxy first, always.
3. Never delete raw footage. Archive moves are additive; deletion is the
   user's manual act.

## Paths

- Python for all scripts: `~/.claude/venvs/videocut/bin/python` (has librosa,
  soundfile, numpy, Pillow). Plain `python3` will fail.
- Default footage inbox: `~/Desktop/Hansen Capital Group LLC/BlindBuddy Content/inbox/`
  (user may pass any folder instead).
- Music: user drops 1-2 tracks in `.../BlindBuddy Content/tracks/` or next to
  the footage. If no track is present, STOP and ask for one — the beat grid is
  the pacing engine, there is no no-music mode.
- Output: `.../BlindBuddy Content/reels/<YYYY-MM-DD>-<slug>/` with `work/`
  underneath for pipeline state.

## Workflow

Let `S=~/.claude/skills/videocut/scripts`, `P=~/.claude/venvs/videocut/bin/python`,
`R=<reel dir>`, `W=$R/work`.

1. **Intake.** Confirm footage folder, track file, genre (hunt | tradeshow |
   landwork), target seconds (default 25). Create `$R`.
2. **Probe**: `$P $S/probe.py <footage_dir> $W/clips.json`
   Report the summary line (clip count, total seconds, ramp-capable count,
   HDR count). If total footage < ~3 min, warn the user the reel may be thin
   (10:1 shoot ratio, see shooting.md) but continue.
3. **Scan**: `$P $S/scan.py $W/clips.json $W --top 25`
4. **Pick sheet**: `$P $S/picksheet.py $W --genre <genre>` then send
   `$W/picksheet.html` to the user (SendUserFile). Summarize: candidate count,
   impact-tagged count, any 30fps no-ramp or HDR flags. **STOP — wait for picks.**
5. **Record picks.** Parse the user's reply (protocol is printed on the sheet)
   into `$W/picks.json`: `{"keep": [ids in order], "money": id|null,
   "crop": {"<id>": "left|center|right"}}`. Echo back your parse in one line
   ("keeping 12 shots, #7 is money, #12 crops left") before proceeding.
6. **Beat map**: `$P $S/beatmap.py <track> $W/beats.json`
7. **Cut**: `$P $S/cut.py $W --target <seconds>` — report the EDL line. If it
   warns about being outside 20-30s, tell the user and adjust (picks or target)
   before rendering.
8. **Draft**: `$P $S/render.py $W $R --proxy` then send `$R/draft.mp4`.
   **STOP — wait for reaction.**
9. **Iterate.** Plain-language notes ("first 3 shots drag", "end on the
   retrieve") become edits to `$W/picks.json` (reorder/drop/swap money) and a
   re-run of steps 7-8. Proxy re-renders are cheap; iterate freely.
10. **Final** (only after explicit approval): `$P $S/render.py $W $R --final`
    Verify both outputs with ffprobe (h264, 1080x1920, aac 48k, duration
    matches EDL) and send both files. Remind: post `hero-clean.mp4` with
    trending in-app audio when reach matters; `hero-music.mp4` for embeds/DMs.
11. **Archive.** Copy `$W/{edl.json,picks.json,picksheet.html}` into
    `.../archive/<date>-<slug>/`. Tell the user which raw clips fed the reel
    (they own deletion; nothing auto-deletes).

## One-time setup (if pieces are missing)

- venv: `/opt/homebrew/opt/python@3.12/bin/python3.12 -m venv ~/.claude/venvs/videocut
  && ~/.claude/venvs/videocut/bin/pip install librosa soundfile numpy Pillow`
- End card: `$P $S/make_endcard.py <logo.png> [--tagline "..."]`
  (current card built from the BlindBuddy app icon)
- Health check: `$P $S/selftest.py <scratch_dir>` runs the whole pipeline on
  synthetic footage and must print ALL PASS.

## Failure notes

- `probe.py` dies on an empty folder — ask the user where the footage is
  (AirDrop originals or Photos "Export Unmodified Original"; plain export
  transcodes and strips metadata).
- `cut.py` dies if the track is shorter than the reel — ask for a longer track.
- 30fps sources are never ramped; if the user tags a 30fps candidate as money,
  it still opens the reel but plays at 1x — tell them why (shooting.md rule:
  4K60 from now on).
- HDR clips tonemap automatically; colors are correct but flat-ish. Fix at
  capture: HDR Video OFF.
