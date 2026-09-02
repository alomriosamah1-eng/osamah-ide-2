#!/usr/bin/env python3
"""PROBE stage: footage dir -> clips.json
Usage: probe.py <footage_dir> <out_clips.json>
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import (VIDEO_EXTS, die, display_dims, ffprobe_json, fps_of,
                    is_hdr, rotation_of, save_json)


def probe_clip(path):
    info = ffprobe_json(path)
    vstreams = [s for s in info.get("streams", []) if s.get("codec_type") == "video"]
    astreams = [s for s in info.get("streams", []) if s.get("codec_type") == "audio"]
    if not vstreams:
        return None
    v = vstreams[0]
    w, h = display_dims(v)
    fmt = info.get("format", {})
    creation = (v.get("tags", {}) or {}).get("creation_time") or \
               (fmt.get("tags", {}) or {}).get("creation_time") or ""
    return {
        "path": str(path),
        "name": path.name,
        "duration": float(fmt.get("duration", 0.0)),
        "fps": round(fps_of(v), 3),
        "width": w,
        "height": h,
        "vertical": h >= w,
        "rotation": rotation_of(v),
        "hdr": is_hdr(v),
        "has_audio": bool(astreams),
        "creation_time": creation,
        "ramp_ok": fps_of(v) >= 59.0,  # gotcha 2: no 30fps ramps
    }


def main():
    if len(sys.argv) != 3:
        die("usage: probe.py <footage_dir> <out_clips.json>")
    footage = Path(sys.argv[1])
    if not footage.is_dir():
        die(f"not a directory: {footage}")
    clips = []
    for p in sorted(footage.iterdir()):
        if p.suffix.lower() in VIDEO_EXTS and not p.name.startswith("."):
            c = probe_clip(p)
            if c and c["duration"] > 0.5:
                clips.append(c)
    if not clips:
        die(f"no video clips found in {footage}")
    # chronology from creation_time metadata, not filename (gotcha 6);
    # clips missing metadata sort last, in name order
    clips.sort(key=lambda c: (c["creation_time"] == "", c["creation_time"], c["name"]))
    save_json(sys.argv[2], {"clips": clips})
    hdr_n = sum(c["hdr"] for c in clips)
    ramp_n = sum(c["ramp_ok"] for c in clips)
    total = sum(c["duration"] for c in clips)
    print(f"probed {len(clips)} clips, {total:.0f}s total, "
          f"{ramp_n} ramp-capable, {hdr_n} HDR (will tonemap)")


if __name__ == "__main__":
    main()
