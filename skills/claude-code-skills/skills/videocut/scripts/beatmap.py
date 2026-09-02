#!/usr/bin/env python3
"""BEAT MAP stage: music track -> beats.json (BPM, beat grid, drop estimate)

Usage: beatmap.py <track.(mp3|m4a|wav)> <out_beats.json>
Run with the videocut venv python.
"""
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from common import FFMPEG, die, run, save_json


def main():
    if len(sys.argv) != 3:
        die("usage: beatmap.py <track> <out_beats.json>")
    track = Path(sys.argv[1])
    if not track.exists():
        die(f"no track at {track}")

    import librosa
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav = tf.name
    try:
        run([FFMPEG, "-y", "-v", "quiet", "-i", str(track),
             "-ac", "1", "-ar", "22050", wav])
        y, sr = librosa.load(wav, sr=22050, mono=True)
    finally:
        Path(wav).unlink(missing_ok=True)

    duration = len(y) / sr
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr).tolist()
    if len(beats) < 8:
        die("fewer than 8 beats detected; track too short or arrhythmic")

    # drop estimate: biggest RMS step-up between consecutive 4s windows
    hop = sr  # 1s
    win = 4 * sr
    n = max(1, (len(y) - win) // hop)
    rms = np.array([np.sqrt(np.mean(y[i * hop:i * hop + win] ** 2)) for i in range(n)])
    drop_t = 0.0
    if len(rms) > 4:
        deltas = rms[1:] - rms[:-1]
        drop_t = float(np.argmax(deltas) + 1)  # seconds
        # snap to nearest beat
        drop_t = min(beats, key=lambda b: abs(b - drop_t))

    # first strong beat = where the cut grid starts (skip dead intro)
    env = librosa.onset.onset_strength(y=y, sr=sr)
    env_t = librosa.times_like(env, sr=sr)
    thresh = 0.35 * env.max()
    strong = env_t[env >= thresh]
    start = float(min(beats, key=lambda b: abs(b - strong[0]))) if strong.size else beats[0]

    save_json(sys.argv[2], {
        "track": str(track.resolve()),
        "duration": round(duration, 2),
        "bpm": round(tempo, 2),
        "beat_interval": round(60.0 / tempo, 4),
        "beats": [round(b, 3) for b in beats],
        "grid_start": round(start, 3),
        "drop": round(drop_t, 3),
    })
    print(f"beat map: {tempo:.1f} BPM, grid starts {start:.2f}s, drop ~{drop_t:.2f}s, {duration:.1f}s track")


if __name__ == "__main__":
    main()
