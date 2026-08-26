"""Shared helpers for the /videocut pipeline."""
import json
import shlex
import subprocess
import sys
from pathlib import Path

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"

# Delivery spec (BUILD-SPEC Part 2)
OUT_W, OUT_H, OUT_FPS = 1080, 1920, 30
PROXY_W, PROXY_H = 720, 1280
TARGET_LUFS = -14
DUCK_DB = -15  # natural audio under music
ENDCARD_SECONDS = 1.75

VIDEO_EXTS = {".mov", ".mp4", ".m4v"}


def run(cmd, check=True, capture=False):
    """Run a command list; return CompletedProcess."""
    if isinstance(cmd, str):
        cmd = shlex.split(cmd)
    return subprocess.run(
        cmd, check=check,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        text=True,
    )


def ffprobe_json(path):
    p = run([FFPROBE, "-v", "quiet", "-print_format", "json",
             "-show_format", "-show_streams", str(path)], capture=True)
    return json.loads(p.stdout)


def load_json(path):
    return json.loads(Path(path).read_text())


def save_json(path, obj):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(obj, indent=2))


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def is_hdr(vstream):
    """True if the stream needs the tonemap fallback (BUILD-SPEC gotcha 1)."""
    return vstream.get("color_transfer") in ("smpte2084", "arib-std-b67")


def rotation_of(vstream):
    """Rotation lives in side_data (gotcha 4). ffmpeg 5+ autorotates on decode;
    we record it so probe output tells the truth about display orientation."""
    for sd in vstream.get("side_data_list", []) or []:
        if "rotation" in sd:
            return int(sd["rotation"])
    return 0


def fps_of(vstream):
    """Real stream fps, not playback rate (gotcha 5: slo-mo edit lists lie)."""
    num, den = (vstream.get("r_frame_rate") or "30/1").split("/")
    den = float(den) or 1.0
    return float(num) / den


def display_dims(vstream):
    w, h = int(vstream["width"]), int(vstream["height"])
    if abs(rotation_of(vstream)) in (90, 270):
        w, h = h, w
    return w, h
