#!/usr/bin/env python3
"""SCAN stage: clips.json -> candidates.json + thumbs/ + previews/

Signals per 2s window (hop 1s):
  1. audio RMS peak + onset strength (librosa) - gunshots, calls, laughs, speech
  2. scene-change score (ffmpeg scene detection at 4fps, 160px)
  3. no-audio fallback: scene/motion only
Impact tag: sharp short loud transient (info only, never filtered).

Usage: scan.py <clips.json> <work_dir> [--top 25] [--per-clip-cap 6]
Run with the videocut venv python (needs librosa/numpy/soundfile).
"""
import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from common import FFMPEG, load_json, run, save_json

WINDOW = 2.0
HOP = 1.0
MIN_GAP = 3.0  # non-max suppression within a clip, seconds


def audio_signals(path, duration):
    """Return (times, rms, onset) arrays at HOP resolution, or None if no audio."""
    import librosa
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav = tf.name
    try:
        p = run([FFMPEG, "-y", "-v", "quiet", "-i", str(path),
                 "-vn", "-ac", "1", "-ar", "16000", wav], check=False, capture=True)
        if p.returncode != 0 or Path(wav).stat().st_size < 1000:
            return None
        y, sr = librosa.load(wav, sr=16000, mono=True)
        if y.size < sr:  # under a second of audio
            return None
        hop = int(sr * HOP)
        frame = int(sr * WINDOW)
        n = max(1, int((len(y) - frame) // hop) + 1)
        times = np.arange(n) * HOP
        rms = np.array([np.sqrt(np.mean(y[i * hop:i * hop + frame] ** 2)) for i in range(n)])
        env = librosa.onset.onset_strength(y=y, sr=sr)
        env_t = librosa.times_like(env, sr=sr)
        onset = np.array([env[(env_t >= t) & (env_t < t + WINDOW)].max(initial=0.0) for t in times])
        return times, rms, onset
    finally:
        Path(wav).unlink(missing_ok=True)


def scene_signal(path):
    """Scene scores from a cheap downscaled 4fps pass. Returns (times, scores)."""
    p = run([FFMPEG, "-v", "info", "-i", str(path),
             "-vf", "fps=4,scale=160:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score",
             "-f", "null", "-"], check=False, capture=True)
    times, scores = [], []
    t_cur = None
    for line in p.stderr.splitlines():
        m = re.search(r"pts_time:([\d.]+)", line)
        if m:
            t_cur = float(m.group(1))
        m = re.search(r"lavfi\.scene_score=([\d.]+)", line)
        if m and t_cur is not None:
            times.append(t_cur)
            scores.append(float(m.group(1)))
    return np.array(times), np.array(scores)


def norm(x):
    x = np.asarray(x, dtype=float)
    if x.size == 0 or x.max() <= 0:
        return np.zeros_like(x)
    return x / x.max()


def scan_clip(clip, ci):
    dur = clip["duration"]
    n = max(1, int((dur - WINDOW) // HOP) + 1)
    times = np.arange(n) * HOP

    aud = audio_signals(clip["path"], dur) if clip["has_audio"] else None
    s_t, s_v = scene_signal(clip["path"])
    scene = np.array([s_v[(s_t >= t) & (s_t < t + WINDOW)].max(initial=0.0) for t in times]) \
        if s_v.size else np.zeros(n)

    if aud is not None:
        a_t, rms, onset = aud
        m = min(n, len(rms))
        score = 0.5 * norm(rms)[:m] + 0.3 * norm(onset)[:m] + 0.2 * norm(scene)[:m]
        times = times[:m]
        # impact = short sharp transient: window RMS >= 3x clip median and near max
        med = np.median(rms[:m]) + 1e-9
        impact = (rms[:m] / med >= 3.0) & (norm(rms)[:m] >= 0.85)
    else:
        score = norm(scene)
        impact = np.zeros(n, dtype=bool)

    # non-max suppression within the clip
    picked = []
    order = np.argsort(score)[::-1]
    for i in order:
        t = float(times[i])
        if all(abs(t - p["t"]) >= MIN_GAP for p in picked):
            picked.append({"t": t, "score": float(score[i]), "impact": bool(impact[i])})
    return [{
        "clip_index": ci,
        "clip": clip["name"],
        "path": clip["path"],
        "t_start": round(p["t"], 2),
        "t_end": round(min(p["t"] + WINDOW, dur), 2),
        "score": round(p["score"], 4),
        "tags": (["impact"] if p["impact"] else []) + ([] if clip["has_audio"] else ["no-audio"]),
        "fps": clip["fps"],
        "ramp_ok": clip["ramp_ok"],
        "hdr": clip["hdr"],
        "vertical": clip["vertical"],
    } for p in picked]


def make_media(cand, work):
    thumbs = work / "thumbs"; previews = work / "previews"
    thumbs.mkdir(exist_ok=True); previews.mkdir(exist_ok=True)
    mid = (cand["t_start"] + cand["t_end"]) / 2
    thumb = thumbs / f"c{cand['id']:03d}.jpg"
    prev = previews / f"c{cand['id']:03d}.mp4"
    vf9x16 = "scale=w='if(gt(a,9/16),-2,270)':h='if(gt(a,9/16),480,-2)',crop=270:480"
    run([FFMPEG, "-y", "-v", "quiet", "-ss", f"{mid:.2f}", "-i", cand["path"],
         "-frames:v", "1", "-vf", vf9x16, str(thumb)], check=False)
    run([FFMPEG, "-y", "-v", "quiet", "-ss", f"{cand['t_start']:.2f}", "-i", cand["path"],
         "-t", "2", "-vf", f"fps=12,{vf9x16}", "-an",
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(prev)], check=False)
    cand["thumb"] = str(thumb.relative_to(work))
    cand["preview"] = str(prev.relative_to(work))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clips_json")
    ap.add_argument("work_dir")
    ap.add_argument("--top", type=int, default=25)
    ap.add_argument("--per-clip-cap", type=int, default=6)
    args = ap.parse_args()

    clips = load_json(args.clips_json)["clips"]
    work = Path(args.work_dir); work.mkdir(parents=True, exist_ok=True)

    all_c = []
    for ci, clip in enumerate(clips):
        cs = scan_clip(clip, ci)[: args.per_clip_cap]
        all_c.extend(cs)
        print(f"  scanned {clip['name']}: {len(cs)} candidates")

    all_c.sort(key=lambda c: -c["score"])
    all_c = all_c[: args.top]
    # present in shoot chronology (clip order, then time)
    all_c.sort(key=lambda c: (c["clip_index"], c["t_start"]))
    for i, c in enumerate(all_c, 1):
        c["id"] = i
    for c in all_c:
        make_media(c, work)

    save_json(work / "candidates.json", {"candidates": all_c})
    n_imp = sum("impact" in c["tags"] for c in all_c)
    print(f"scan complete: {len(all_c)} candidates ({n_imp} impact-tagged) -> {work / 'candidates.json'}")


if __name__ == "__main__":
    main()
