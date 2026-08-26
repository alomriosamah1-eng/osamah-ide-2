#!/usr/bin/env python3
"""End-to-end pipeline self-test on synthetic footage. No real clips needed.

Generates 3 test clips (bursts at known times = fake gunshots) + a 120 BPM
kick track, then runs probe -> scan -> picksheet -> beatmap -> auto-picks ->
cut -> render --proxy -> render --final, asserting at each stage.

Usage: selftest.py <scratch_dir>   (run with the videocut venv python)
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

SCRIPTS = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS))
from common import FFMPEG, ffprobe_json, load_json, run, save_json

PY = sys.executable
FAILS = []


def check(label, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}: {label}" + (f" ({detail})" if detail else ""))
    if not ok:
        FAILS.append(label)


def gen_clip(path, seconds, w, h, fps, bursts, creation, quiet=False):
    base = 0.005 if quiet else 0.02
    expr = f"{base}*(random(0)-0.5)"
    for b in bursts:
        expr += f"+0.95*(random(1)-0.5)*between(t,{b},{b + 0.4})"
    run([FFMPEG, "-y", "-v", "error",
         "-f", "lavfi", "-i", f"testsrc2=size={w}x{h}:rate={fps}:duration={seconds}",
         "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=48000:d={seconds}",
         "-metadata", f"creation_time={creation}",
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
         "-c:a", "aac", str(path)])


def gen_track(path, seconds=45, bpm=120):
    sr = 44100
    t = np.arange(int(seconds * sr)) / sr
    y = np.zeros_like(t)
    beat = 60.0 / bpm
    for i, bt in enumerate(np.arange(0.0, seconds - 0.3, beat)):
        amp = 0.9 if i % 4 == 0 else 0.5
        if bt > 16:  # "drop": everything louder after 16s
            amp *= 1.6
        n = (t >= bt) & (t < bt + 0.12)
        y[n] += amp * np.sin(2 * np.pi * 70 * (t[n] - bt)) * np.exp(-30 * (t[n] - bt))
    y += 0.05 * np.sin(2 * np.pi * 220 * t) * (t > 16)  # sustain layer after drop
    y = np.clip(y, -1, 1)
    sf.write(path, y, sr)


def main():
    scratch = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/videocut-selftest")
    footage = scratch / "footage"; work = scratch / "work"; out = scratch / "out"
    footage.mkdir(parents=True, exist_ok=True)

    print("== generating synthetic media ==")
    gen_clip(footage / "a_vertical60.mp4", 22, 540, 960, 60, [8.0], "2026-08-12T07:00:00Z")
    gen_clip(footage / "b_horizontal60.mp4", 18, 960, 540, 60, [5.0, 12.0], "2026-08-12T07:10:00Z")
    gen_clip(footage / "c_vertical30_quiet.mp4", 12, 540, 960, 30, [], "2026-08-12T07:20:00Z", quiet=True)
    track = scratch / "track.wav"
    gen_track(track)

    print("== probe ==")
    run([PY, str(SCRIPTS / "probe.py"), str(footage), str(work / "clips.json")])
    clips = load_json(work / "clips.json")["clips"]
    check("3 clips probed", len(clips) == 3)
    check("chronology by creation_time", clips[0]["name"].startswith("a_"))
    check("30fps clip flagged no-ramp", not [c for c in clips if "30" in c["name"]][0]["ramp_ok"])

    print("== scan ==")
    run([PY, str(SCRIPTS / "scan.py"), str(work / "clips.json"), str(work), "--top", "12"])
    cands = load_json(work / "candidates.json")["candidates"]
    check("candidates found", len(cands) >= 5, f"{len(cands)}")
    near8 = [c for c in cands if c["clip"].startswith("a_") and abs((c["t_start"] + c["t_end"]) / 2 - 8.2) <= 2.5]
    check("burst at 8s in clip A detected", bool(near8))
    check("burst tagged impact", any("impact" in c["tags"] for c in near8))
    check("thumbs+previews exist", all((work / c["thumb"]).exists() and (work / c["preview"]).exists() for c in cands))

    print("== pick sheet ==")
    run([PY, str(SCRIPTS / "picksheet.py"), str(work), "--genre", "hunt"])
    check("picksheet.html written", (work / "picksheet.html").stat().st_size > 2000)

    print("== beat map ==")
    run([PY, str(SCRIPTS / "beatmap.py"), str(track), str(work / "beats.json")])
    beats = load_json(work / "beats.json")
    check("BPM near 120", abs(beats["bpm"] - 120) < 6, f"{beats['bpm']}")
    check("drop near 16s", abs(beats["drop"] - 16) < 4, f"{beats['drop']}")

    print("== auto-picks + cut ==")
    money = max(cands, key=lambda c: ("impact" in c["tags"], c["score"]))
    keep = [c["id"] for c in cands][:12]
    if money["id"] not in keep:
        keep.append(money["id"])
    save_json(work / "picks.json", {"keep": keep, "money": money["id"], "crop": {}})
    run([PY, str(SCRIPTS / "cut.py"), str(work), "--target", "25"])
    edl = load_json(work / "edl.json")
    check("reel 18-32s", 18 <= edl["reel_seconds"] <= 32, f"{edl['reel_seconds']}s")
    check("tease opens the reel", edl["shots"][0]["kind"] == "tease")
    ramped = [s for s in edl["shots"] if s["ramp"]]
    check("money shot ramped (60fps source)", len(ramped) == 1 and ramped[0]["speed"] < 1)

    print("== render proxy ==")
    run([PY, str(SCRIPTS / "render.py"), str(work), str(out), "--proxy"])
    check("draft.mp4 exists", (out / "draft.mp4").stat().st_size > 50000)

    print("== render final ==")
    run([PY, str(SCRIPTS / "render.py"), str(work), str(out), "--final"])
    for name in ("hero-music.mp4", "hero-clean.mp4"):
        f = out / name
        check(f"{name} exists", f.exists() and f.stat().st_size > 100000)
        info = ffprobe_json(f)
        v = [s for s in info["streams"] if s["codec_type"] == "video"][0]
        a = [s for s in info["streams"] if s["codec_type"] == "audio"][0]
        dur = float(info["format"]["duration"])
        check(f"{name} is 1080x1920 h264", v["codec_name"] == "h264" and v["width"] == 1080 and v["height"] == 1920)
        check(f"{name} audio aac 48k", a["codec_name"] == "aac" and a["sample_rate"] == "48000")
        check(f"{name} duration matches EDL", abs(dur - edl["reel_seconds"]) < 0.8, f"{dur:.1f}s vs {edl['reel_seconds']}s")

    print(f"\n{'ALL PASS' if not FAILS else f'{len(FAILS)} FAILURES: ' + ', '.join(FAILS)}")
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
