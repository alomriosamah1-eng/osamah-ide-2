#!/usr/bin/env python3
"""One-time setup: build assets/endcard.png (1080x1920) from a logo image.

The logo's flat background plate is removed by flood-fill from the image
borders (color-distance mask, connected to the border only, so dark artwork
INSIDE the mark survives). The transparent mark then composites onto a full
canvas painted in that same background color with a soft vignette, so the
card reads as one surface, no visible plate seam.

Usage: make_endcard.py <logo.png> [--tagline "text"] [--out path]
Run with the videocut venv python (needs Pillow, numpy, scipy).
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

W, H = 1080, 1920
GOLD = (201, 160, 76)
FONTS = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
         "/System/Library/Fonts/Helvetica.ttc"]


def load_font(size):
    for f in FONTS:
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    return ImageFont.load_default()


def cut_out(logo, tol=48):
    """Return (RGBA logo with background removed, background RGB color)."""
    a = np.asarray(logo.convert("RGB"), dtype=float)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    near_bg = np.linalg.norm(a - bg, axis=2) < tol
    labels, _ = ndimage.label(near_bg)
    edge_labels = set(labels[0]) | set(labels[-1]) | set(labels[:, 0]) | set(labels[:, -1])
    edge_labels.discard(0)
    is_plate = np.isin(labels, list(edge_labels))
    alpha = np.where(is_plate, 0, 255).astype(np.uint8)
    alpha = np.asarray(
        Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(1.2)))
    out = np.dstack([a.astype(np.uint8), alpha])
    return Image.fromarray(out, "RGBA"), tuple(int(c) for c in bg)


def vignette_canvas(bg, strength=0.22):
    """Full-frame canvas in the logo's own bg color, softly darker at edges."""
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    fall = 1.0 - strength * np.clip(d / d.max(), 0, 1) ** 2
    arr = (np.array(bg)[None, None, :] * fall[:, :, None]).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("logo")
    ap.add_argument("--tagline", default="")
    ap.add_argument("--out", default=str(Path(__file__).parent.parent / "assets" / "endcard.png"))
    args = ap.parse_args()

    logo = Image.open(args.logo)
    mark, bg = cut_out(logo)
    card = vignette_canvas(bg)

    lw = 920
    lh = round(mark.height * lw / mark.width)
    mark = mark.resize((lw, lh), Image.LANCZOS)
    card.paste(mark, ((W - lw) // 2, (H - lh) // 2 - 80), mark)

    if args.tagline:
        d = ImageDraw.Draw(card)
        f = load_font(52)
        tw = d.textlength(args.tagline, font=f)
        d.text(((W - tw) / 2, (H + lh) // 2 + 40), args.tagline, fill=GOLD, font=f)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    card.save(args.out)
    print(f"end card -> {args.out} (plate color {bg})")


if __name__ == "__main__":
    main()
