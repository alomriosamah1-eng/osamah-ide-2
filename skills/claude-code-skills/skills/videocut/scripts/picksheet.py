#!/usr/bin/env python3
"""PICK SHEET stage: candidates.json -> picksheet.html (static, self-contained refs)

Usage: picksheet.py <work_dir> [--genre hunt|tradeshow|landwork]
"""
import argparse
import html
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import load_json

CHECKLISTS = {
    "hunt": ["Arrival in the dark", "Walk-in (boots/flashlights)", "Setup (decoys/blind/dog)",
             "The wait (faces, coffee, scanning)", "Wildlife b-roll", "THE MOMENT (+5s after)",
             "Dog work / retrieve", "Reaction", "Tailgate / group", "Golden-hour beauty shot"],
    "tradeshow": ["Venue wide (signage legible)", "Aisle walk-through POV", "Booth interactions",
                  "Detail (hands on product)", "BlindBuddy on a phone in-hand", "Crowd energy",
                  "Face-to-camera moment"],
    "landwork": ["BEFORE wide from fixed landmark", "Timelapse of session", "Machinery wide + tight",
                 "Human texture (gloves/sweat/dirt)", "AFTER wide from SAME landmark", "Walk-the-result"],
}

CSS = """
body{background:#0e1210;color:#e8ece9;font:15px -apple-system,Helvetica,sans-serif;margin:0;padding:24px}
h1{font-size:22px;margin:0 0 4px} .sub{color:#9fb0a6;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.card{background:#161d19;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.4)}
.card video{width:100%;display:block;aspect-ratio:9/16;object-fit:cover;background:#000}
.meta{padding:10px}
.idn{font-size:20px;font-weight:700;color:#ffd66b}
.src{color:#9fb0a6;font-size:12px;word-break:break-all}
.badge{display:inline-block;font-size:11px;padding:2px 7px;border-radius:20px;margin:4px 4px 0 0}
.b-impact{background:#5c2a2a;color:#ffb3b3}.b-ramp{background:#23422e;color:#9fe0b5}
.b-noramp{background:#3a3a20;color:#e0d89f}.b-noaudio{background:#333;color:#aaa}.b-hdr{background:#2a3a5c;color:#b3ccff}
.score{color:#6fa886;font-size:12px}
.panel{background:#161d19;border-radius:10px;padding:16px 20px;margin-bottom:22px}
.panel h2{font-size:15px;margin:0 0 8px;color:#ffd66b}
.panel ul{margin:0;padding-left:20px;color:#c4cec8;line-height:1.7}
code{background:#0b0f0d;padding:2px 6px;border-radius:4px;color:#9fe0b5;font-size:13px}
"""

PROTOCOL = """Reply in chat, plain words. Examples:
<code>keep 3,7,9,12,15. kill the rest. 7 is MONEY.</code> &nbsp;
<code>12 crop-left</code> (subject sits left of a horizontal frame) &nbsp;
<code>reorder: 9 before 3</code> &nbsp;
MONEY = gets the slow-mo ramp and opens the reel as the cold-open tease.
Aim to keep 12-18 shots for a 20-30s reel."""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("work_dir")
    ap.add_argument("--genre", default="hunt", choices=sorted(CHECKLISTS))
    args = ap.parse_args()
    work = Path(args.work_dir)
    cands = load_json(work / "candidates.json")["candidates"]

    cards = []
    for c in cands:
        badges = ""
        if "impact" in c["tags"]:
            badges += '<span class="badge b-impact">impact/loud</span>'
        badges += ('<span class="badge b-ramp">RAMP OK</span>' if c["ramp_ok"]
                   else '<span class="badge b-noramp">30fps no-ramp</span>')
        if "no-audio" in c["tags"]:
            badges += '<span class="badge b-noaudio">no audio</span>'
        if c["hdr"]:
            badges += '<span class="badge b-hdr">HDR→tonemap</span>'
        cards.append(f"""
<div class="card">
  <video src="{c['preview']}" poster="{c['thumb']}" autoplay muted loop playsinline></video>
  <div class="meta">
    <span class="idn">#{c['id']}</span>
    <span class="score">score {c['score']:.2f}</span><br>
    <span class="src">{html.escape(c['clip'])} @ {c['t_start']:.0f}s</span><br>
    {badges}
  </div>
</div>""")

    checklist = "".join(f"<li>{html.escape(item)}</li>" for item in CHECKLISTS[args.genre])
    page = f"""<!doctype html><html><head><meta charset="utf-8">
<title>videocut pick sheet</title><style>{CSS}</style></head><body>
<h1>Pick Sheet</h1>
<div class="sub">{len(cands)} candidates, shoot order. Genre: {args.genre}</div>
<div class="panel"><h2>How to reply</h2><p>{PROTOCOL}</p></div>
<div class="panel"><h2>Coverage checklist ({args.genre}) — did the shoot get these?</h2>
<ul>{checklist}</ul></div>
<div class="grid">{''.join(cards)}</div>
</body></html>"""
    out = work / "picksheet.html"
    out.write_text(page)
    print(f"pick sheet -> {out}")


if __name__ == "__main__":
    main()
