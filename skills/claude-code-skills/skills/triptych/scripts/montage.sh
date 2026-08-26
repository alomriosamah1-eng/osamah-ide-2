#!/usr/bin/env bash
# Compose a triptych round's money shots (00-incumbent.png + NN-<slug>.png, excluding
# NN-<slug>--<state>.png state shots) into one side-by-side pick-sheet.png.
# No-ops politely if ImageMagick is missing — inline images on the Pick Sheet still work.
set -euo pipefail

dir="${1:?usage: montage.sh <capture-dir>}"
cd "$dir"

shopt -s nullglob
shots=()
for f in [0-9][0-9]-*.png; do
  [[ "$f" == *--* || "$f" == "pick-sheet.png" ]] && continue
  shots+=("$f")
done

if (( ${#shots[@]} < 2 )); then
  echo "montage.sh: need >=2 money shots in $dir, found ${#shots[@]}" >&2
  exit 1
fi

# +append (horizontal join) instead of `montage`: montage renders text labels and dies on
# machines whose ImageMagick has no font config; +append never touches a font.
if command -v magick >/dev/null 2>&1; then
  IM=(magick)
elif command -v convert >/dev/null 2>&1; then
  IM=(convert)
else
  echo "montage.sh: ImageMagick not installed — skipping composite"
  exit 0
fi

"${IM[@]}" "${shots[@]}" -bordercolor none -border 8 +append pick-sheet.png
echo "wrote $dir/pick-sheet.png (${#shots[@]} panels: ${shots[*]})"
