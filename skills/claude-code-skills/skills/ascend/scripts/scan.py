#!/usr/bin/env python3
"""
scan.py — inventory a repo's UI surface and group it into bounded slices so
Phase 0 MAP can fan out with a real coverage guarantee (no single agent ever
reads the whole codebase). Deterministic, stdlib-only. Mirrors /polish's scan.py.

Emits a work-list of slices + the full UI-file set, so MAP can assert UNMAPPED =
(ui_files - union(covered_files)) is empty before the loop trusts its picture.

Usage:
    scan.py [PATH] [--budget-files 15] [--budget-loc 2500] [--json]
"""
from __future__ import annotations
import argparse, json, re
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", ".expo", ".ascend",
             ".polish", ".gauntlet", "vendor", "Pods", ".venv", "venv",
             "__pycache__", ".turbo", "target", "DerivedData", "coverage", ".cache"}
UI_EXT = {".tsx", ".jsx", ".vue", ".svelte", ".swift", ".dart", ".css", ".scss"}
CODE_EXT = UI_EXT | {".ts", ".js", ".kt", ".m", ".mm"}
UI_HINT = re.compile(r"(StyleSheet|className=|class=\"|style=|<Text|<View|<button|"
                     r"useState|useEffect|navigation|createStackNavigator|"
                     r"@Composable|struct \w+: View|Widget build)")
UI_PATH = re.compile(r"(screen|component|view|page|navigat|layout|widget|ui)", re.I)


def loc(p: Path) -> int:
    try:
        return sum(1 for _ in p.open(errors="ignore"))
    except Exception:
        return 0


def is_ui(p: Path, text: str) -> bool:
    if p.suffix in {".css", ".scss"}:
        return True
    if UI_PATH.search(str(p)):
        return True
    return bool(UI_HINT.search(text[:4000]))


def walk(root: Path):
    for p in root.rglob("*"):
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.is_file() and p.suffix in CODE_EXT:
            yield p


def slices(files, budget_files, budget_loc):
    out, cur, cur_loc = [], [], 0
    for f in files:
        fl = f["loc"]
        if cur and (len(cur) >= budget_files or cur_loc + fl > budget_loc):
            out.append(cur); cur, cur_loc = [], 0
        cur.append(f["path"]); cur_loc += fl
    if cur:
        out.append(cur)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default=".")
    ap.add_argument("--budget-files", type=int, default=15)
    ap.add_argument("--budget-loc", type=int, default=2500)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    root = Path(a.path).resolve()

    ui, all_code = [], 0
    for p in walk(root):
        all_code += 1
        text = p.read_text(errors="ignore") if p.suffix not in {".css", ".scss"} else ""
        if is_ui(p, text):
            rel = str(p.relative_to(root))
            ui.append({"path": rel, "loc": loc(p)})
    ui.sort(key=lambda f: f["path"])
    sl = slices(ui, a.budget_files, a.budget_loc)
    out = {
        "root": str(root),
        "code_files": all_code,
        "ui_files": [f["path"] for f in ui],
        "ui_file_count": len(ui),
        "slice_count": len(sl),
        "slices": [{"id": i, "files": s} for i, s in enumerate(sl)],
        "fanout": len(sl) > 1,  # >1 slice -> MAP should fan out one agent per slice
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
