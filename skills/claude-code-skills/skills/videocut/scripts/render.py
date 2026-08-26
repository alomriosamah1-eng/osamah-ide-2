#!/usr/bin/env python3
"""RENDER stage: edl.json -> draft.mp4 (--proxy) or hero-music.mp4 + hero-clean.mp4 (--final)

Mezzanine architecture: each shot renders to a uniform intermediate
(exact duration, same codec/params), concat demuxer joins them, music +
loudness happen in one final mux. Debuggable at every seam.

Usage: render.py <work_dir> <out_dir> (--proxy | --final)
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import (DUCK_DB, FFMPEG, OUT_FPS, OUT_H, OUT_W, PROXY_H, PROXY_W,
                    TARGET_LUFS, die, load_json, run)

TONEMAP_ZSCALE = ("zscale=transfer=linear:npl=100,format=gbrpf32le,"
                  "zscale=primaries=bt709,tonemap=hable:desat=0,"
                  "zscale=transfer=bt709:matrix=bt709:range=tv")
# Fallback for ffmpeg builds without libzimg: colorspace converts the
# BT.2020 primaries/matrix (the main cause of washed color); HLG transfer
# is overridden as bt2020-10 (close in the SDR-compatible range) with a
# mild eq lift to compensate highlights.
TONEMAP_FALLBACK = ("colorspace=all=bt709:iall=bt2020:itrc=bt2020-10,"
                    "eq=gamma=1.05:saturation=1.10")
_tonemap = None


def tonemap_chain():
    global _tonemap
    if _tonemap is None:
        p = run([FFMPEG, "-hide_banner", "-filters"], check=False, capture=True)
        _tonemap = TONEMAP_ZSCALE if "zscale" in (p.stdout or "") else TONEMAP_FALLBACK
        if _tonemap is TONEMAP_FALLBACK:
            print("  (no zscale in this ffmpeg build: using colorspace fallback tonemap)")
    return _tonemap


def scale_crop(w, h, crop):
    ar = f"{w}/{h}"
    x = {"left": "0", "right": "iw-ow", "center": "(iw-ow)/2"}[crop]
    return (f"scale=w='if(gt(a,{ar}),-2,{w})':h='if(gt(a,{ar}),{h},-2)',"
            f"crop={w}:{h}:{x}:(ih-oh)/2")


def enc_args(proxy):
    if proxy:
        return ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
                "-pix_fmt", "yuv420p"]
    return ["-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-maxrate", "14M", "-bufsize", "28M",
            "-profile:v", "high", "-level:v", "4.2", "-pix_fmt", "yuv420p",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"]


def shot_mezz(shot, i, mezz_dir, proxy, has_audio):
    w, h = (PROXY_W, PROXY_H) if proxy else (OUT_W, OUT_H)
    out = mezz_dir / f"s{i:03d}.mov"
    dur = shot["dur"]
    vf = []
    if shot["hdr"]:
        vf.append(tonemap_chain())
    vf.append(scale_crop(w, h, shot["crop"]))
    if shot["speed"] != 1.0:
        vf.append(f"setpts=(PTS-STARTPTS)/{shot['speed']}")
    vf.append(f"fps={OUT_FPS}")
    vf.append(f"tpad=stop_mode=clone:stop_duration=3,trim=duration={dur},setpts=PTS-STARTPTS")

    # -t on the INPUT side: reads span source-seconds, so a ramped shot can
    # stretch past span up to its slot; tpad+trim below lock the exact dur
    cmd = [FFMPEG, "-y", "-v", "error",
           "-ss", str(shot["in"]), "-t", str(shot["span"]), "-i", shot["src"]]
    natural = has_audio and shot["audio"] != "mute" and shot["speed"] == 1.0
    if not natural:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-filter:v", ",".join(vf)]
    cmd += ["-map", "0:v:0", "-map", "0:a:0" if natural else "1:a:0"]
    cmd += ["-af", f"aresample=48000,apad,atrim=0:{dur}"]
    cmd += enc_args(proxy) + ["-c:a", "pcm_s16le", "-ac", "2", str(out)]
    run(cmd)
    return out


def endcard_mezz(card, seconds, mezz_dir, proxy):
    w, h = (PROXY_W, PROXY_H) if proxy else (OUT_W, OUT_H)
    out = mezz_dir / "endcard.mov"
    run([FFMPEG, "-y", "-v", "error",
         "-loop", "1", "-t", str(seconds), "-i", str(card),
         "-f", "lavfi", "-t", str(seconds), "-i", "anullsrc=r=48000:cl=stereo",
         "-filter:v", f"scale={w}:{h},fps={OUT_FPS},fade=t=in:st=0:d=0.3",
         "-map", "0:v:0", "-map", "1:a:0"]
        + enc_args(proxy) + ["-c:a", "pcm_s16le", "-ac", "2", str(out)])
    return out


def concat(parts, out, mezz_dir):
    lst = mezz_dir / "concat.txt"
    # absolute paths: the concat demuxer resolves relative entries against
    # the list file's own directory, not the cwd
    lst.write_text("".join(f"file '{Path(p).resolve()}'\n" for p in parts))
    run([FFMPEG, "-y", "-v", "error", "-f", "concat", "-safe", "0",
         "-i", str(lst), "-c", "copy", str(out)])
    return out


def duck_expr(shots):
    ranges = [(s["t_timeline"], s["t_timeline"] + s["dur"])
              for s in shots if s["audio"] == "duck"]
    if not ranges:
        return None
    enable = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in ranges)
    return f"volume=volume={DUCK_DB}dB:enable='{enable}'"


def music_chain(shots, reel):
    """Volume envelope composed from the EDL, not a blanket bed:
    low under the cold-open tease -> full slam on the first build cut,
    dips wherever natural audio is hot (impacts), fades under the end card."""
    chain = f"atrim=0:{reel},asetpts=PTS-STARTPTS"
    if shots and shots[0]["kind"] == "tease":
        chain += f",volume=0.35:enable='between(t,0,{shots[0]['dur']:.3f})'"
    hot = [(s["t_timeline"], s["t_timeline"] + s["dur"])
           for s in shots if s["audio"] == "hot"]
    if hot:
        enable = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in hot)
        chain += f",volume=0.5:enable='{enable}'"
    chain += f",afade=t=out:st={max(0, reel - 1.5)}:d=1.5"
    return chain


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work_dir")
    ap.add_argument("out_dir")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--proxy", action="store_true")
    g.add_argument("--final", action="store_true")
    args = ap.parse_args()

    work = Path(args.work_dir)
    outd = Path(args.out_dir); outd.mkdir(parents=True, exist_ok=True)
    edl = load_json(work / "edl.json")
    clips = {c["path"]: c for c in load_json(work / "clips.json")["clips"]}
    card = Path(__file__).parent.parent / "assets" / "endcard.png"
    if not card.exists():
        die(f"missing end card asset: {card} (run make_endcard.py setup)")

    mezz = work / ("mezz-proxy" if args.proxy else "mezz-final")
    mezz.mkdir(exist_ok=True)

    parts = []
    for i, s in enumerate(edl["shots"]):
        has_audio = clips.get(s["src"], {}).get("has_audio", False)
        parts.append(shot_mezz(s, i, mezz, args.proxy, has_audio))
        print(f"  mezz {i+1}/{len(edl['shots'])} ({s['kind']} #{s['id']})")
    parts.append(endcard_mezz(card, edl["endcard_seconds"], mezz, args.proxy))
    base = concat(parts, mezz / "base.mov", mezz)

    reel = edl["reel_seconds"]
    music, off = edl["music"]["file"], edl["music"]["offset"]
    duck = duck_expr(edl["shots"])
    nat = (duck + "," if duck else "") + "anull"

    if args.proxy:
        out = outd / "draft.mp4"
        run([FFMPEG, "-y", "-v", "error", "-i", str(base),
             "-ss", str(off), "-i", music,
             "-filter_complex",
             f"[0:a]{nat}[n];"
             f"[1:a]{music_chain(edl['shots'], reel)}[m];"
             f"[n][m]amix=inputs=2:duration=first:normalize=0,"
             f"loudnorm=I={TARGET_LUFS}:TP=-1[a]",
             "-map", "0:v:0", "-map", "[a]",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", str(out)])
        print(f"draft -> {out}")
        return

    m_out = outd / "hero-music.mp4"
    run([FFMPEG, "-y", "-v", "error", "-i", str(base),
         "-ss", str(off), "-i", music,
         "-filter_complex",
         f"[0:a]{nat}[n];"
         f"[1:a]{music_chain(edl['shots'], reel)}[m];"
         f"[n][m]amix=inputs=2:duration=first:normalize=0,"
         f"loudnorm=I={TARGET_LUFS}:TP=-1[a]",
         "-map", "0:v:0", "-map", "[a]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", str(m_out)])

    c_out = outd / "hero-clean.mp4"
    run([FFMPEG, "-y", "-v", "error", "-i", str(base),
         "-af", f"loudnorm=I={TARGET_LUFS}:TP=-1",
         "-map", "0:v:0", "-map", "0:a:0",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", str(c_out)])
    print(f"final -> {m_out}\n         {c_out}")


if __name__ == "__main__":
    main()
