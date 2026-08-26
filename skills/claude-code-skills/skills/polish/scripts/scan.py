#!/usr/bin/env python3
"""
polish scan.py — inventory a repo, detect the stack, flag UI-surface files, group
them into bounded slices, and classify package.json scripts into verify-gate tiers.

Deterministic, stdlib-only. This is the MAP step — not an LLM audit — so scanning
the whole tree here is fine and fast. Phase 1 fans out one desk agent per
(desk × slice) over the work-list this emits, so no single agent ever has to read
the whole codebase.

Usage:
    scan.py [path] [--budget-files 15] [--budget-loc 2500] [--json]
"""
from __future__ import annotations
import argparse, json, os, re, sys
from collections import defaultdict

SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", ".polish", ".gauntlet",
             "vendor", "Pods", ".venv", "venv", "__pycache__", ".turbo",
             "target", "DerivedData", "coverage", ".cache", ".expo"}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".swift", ".kt",
            ".dart", ".m", ".mm", ".css", ".scss"}
# extensions that can carry UI even without a components/screens path
UI_EXT = {".tsx", ".jsx", ".vue", ".svelte", ".swift", ".dart", ".css", ".scss"}

DEP_MANIFESTS = {"package.json", "pubspec.yaml", "Podfile", "Package.swift", "build.gradle"}

# stack signal -> (path/name regex, content regex). First match wins for primary stack.
STACK_PATTERNS = [
    ("react_native", r"(metro\.config|app\.json|\.expo)", r"(react-native|from ['\"]react-native['\"]|expo)"),
    ("nextjs",       r"(next\.config|app/|pages/)",       r"(\"next\"|from ['\"]next)"),
    ("react_web",    r"",                                  r"(react-dom|\"react\")"),
    ("vue",          r"(\.vue$|vite\.config)",             r"(\"vue\"|<template>)"),
    ("svelte",       r"(\.svelte$|svelte\.config)",        r"(\"svelte\")"),
    ("swiftui",      r"(\.xcodeproj|\.swift$|Package\.swift)", r"(import SwiftUI|import UIKit)"),
    ("flutter",      r"(pubspec\.yaml|\.dart$)",           r"(import 'package:flutter)"),
]
# content regexes that mark a file as carrying UI
UI_CONTENT = re.compile(
    r"(StyleSheet|className=|class=\"|style=|<Text|<View|<button|<View>|"
    r"createElement|styled\.|tw`|cva\(|@media|:focus|accessibilityLabel)", re.I)
UI_PATH = re.compile(r"(screens?/|components?/|views?/|pages?/|widgets?/|ui/|app/)", re.I)

# package.json script classification for the verify gate
GATE_TIER_A = re.compile(r"(tsc|type-?check|typecheck|eslint|\blint\b|vite build|next build|"
                         r"expo export|tsc --noEmit|svelte-check|vue-tsc|flutter analyze)", re.I)
GATE_TIER_B = re.compile(r"(snap|storybook|chromatic|percy|loki|reg-?suit|"
                         r"playwright.*(screenshot|visual)|toHaveScreenshot)", re.I)
GATE_EXCLUDE = re.compile(r"(\bstart\b|\bdev\b|\bserve\b|\bios\b|\bandroid\b|watch|"
                          r"expo start|react-native run|metro|nodemon|--watch)", re.I)


def loc_of(path: str) -> int:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for ln in f if ln.strip())
    except OSError:
        return 0


def walk(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            yield os.path.join(dirpath, fn)


def read(path: str) -> str:
    try:
        return open(path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return ""


def detect_stack(root: str, files: list[str]) -> str:
    names = "\n".join(os.path.relpath(f, root) for f in files)
    blob, budget = [], 3_000_000
    for f in files:
        base, ext = os.path.basename(f), os.path.splitext(f)[1]
        if base in DEP_MANIFESTS or (ext in CODE_EXT and budget > 0):
            c = read(f)
            blob.append(c)
            if base not in DEP_MANIFESTS:
                budget -= len(c)
    content = "\n".join(blob)
    for name, path_re, content_re in STACK_PATTERNS:
        hit = bool(path_re and re.search(path_re, names, re.I))
        if not hit and content_re:
            hit = bool(re.search(content_re, content, re.I))
        if hit:
            return name
    return "unknown"


NON_UI_FILE = re.compile(r"(\.d\.ts$|\.test\.|\.spec\.|\.stories\.|__tests__|__mocks__|\.mock\.)", re.I)


def is_ui_file(path: str) -> bool:
    ext = os.path.splitext(path)[1]
    if ext not in UI_EXT and ext not in CODE_EXT:
        return False
    if NON_UI_FILE.search(path):
        return False
    if UI_PATH.search(path):
        return ext in UI_EXT or ext in CODE_EXT
    if ext in UI_EXT:
        return True
    # .ts/.js only count as UI if they actually contain UI markers
    return bool(UI_CONTENT.search(read(path)))


def slice_files(root: str, ui_files: list[str], budget_files: int, budget_loc: int):
    """Group UI files by their top functional seam, then split any group over budget
    into numbered sub-slices. Each slice is one desk-agent's bounded scope."""
    groups: dict[str, list[str]] = defaultdict(list)
    for f in ui_files:
        rel = os.path.relpath(f, root)
        parts = rel.split(os.sep)
        if len(parts) == 1:
            seam = "root"
        else:
            seam = parts[0]
            if parts[0] in ("src", "app", "lib", "packages") and len(parts) > 2:
                seam = f"{parts[0]}/{parts[1]}"
        groups[seam].append(f)

    slices = []
    for seam, fs in sorted(groups.items()):
        fs = sorted(fs)
        chunk, chunk_loc = [], 0
        sub = 0
        def flush():
            nonlocal chunk, chunk_loc, sub
            if not chunk:
                return
            sub += 1
            slices.append({
                "slice": f"{seam.replace('/', '-')}" + (f"-{sub}" if (len(chunk) and True) else ""),
                "seam": seam,
                "files": [os.path.relpath(p, root) for p in chunk],
                "file_count": len(chunk),
                "loc": chunk_loc,
            })
            chunk, chunk_loc = [], 0
        for f in fs:
            l = loc_of(f)
            if chunk and (len(chunk) + 1 > budget_files or chunk_loc + l > budget_loc):
                flush()
            chunk.append(f)
            chunk_loc += l
        flush()
    # collapse the "-1" suffix when a seam produced a single slice
    counts = defaultdict(int)
    for s in slices:
        counts[s["seam"]] += 1
    for s in slices:
        if counts[s["seam"]] == 1:
            s["slice"] = s["seam"].replace("/", "-")
    return slices


def classify_gate(root: str):
    pj = os.path.join(root, "package.json")
    tier_a, tier_b, exclude, unknown = [], [], [], []
    if os.path.isfile(pj):
        try:
            scripts = json.load(open(pj)).get("scripts", {})
        except (OSError, json.JSONDecodeError):
            scripts = {}
        for name, cmd in scripts.items():
            probe = f"{name} {cmd}"
            if GATE_EXCLUDE.search(probe):
                exclude.append(name)
            elif GATE_TIER_B.search(probe):
                tier_b.append(name)
            elif GATE_TIER_A.search(probe):
                tier_a.append(name)
            else:
                unknown.append(name)
    # snapshot files are a Tier-B signal even without a named script
    has_snap = any(f.endswith(".snap") for f in walk(root))
    return {"tier_a": tier_a, "tier_b": tier_b, "exclude": exclude,
            "unknown": unknown, "has_snapshot_files": has_snap}


def main() -> int:
    ap = argparse.ArgumentParser(description="Inventory + stack + UI-surface slices for /polish.")
    ap.add_argument("path", nargs="?", default=".")
    ap.add_argument("--budget-files", type=int, default=15)
    ap.add_argument("--budget-loc", type=int, default=2500)
    ap.add_argument("--json", action="store_true", help="emit JSON only")
    args = ap.parse_args()

    root = os.path.abspath(args.path)
    if not os.path.isdir(root):
        print(f"scan.py: not a directory: {root}", file=sys.stderr)
        return 2
    files = list(walk(root))
    code_files = [f for f in files if os.path.splitext(f)[1] in CODE_EXT]
    stack = detect_stack(root, files)
    ui_files = [f for f in code_files if is_ui_file(f)]
    if stack != "swiftui":  # android/ & ios/ are just native shells for JS/Dart apps
        ui_files = [f for f in ui_files
                    if not re.match(r"(android|ios)[\\/]", os.path.relpath(f, root))]
    ui_loc = sum(loc_of(f) for f in ui_files)
    slices = slice_files(root, ui_files, args.budget_files, args.budget_loc)
    gate = classify_gate(root)

    out = {
        "project": os.path.basename(root),
        "root": root,
        "stack": stack,
        "code_files": len(code_files),
        "ui_files": len(ui_files),
        "ui_loc": ui_loc,
        "budget": {"files": args.budget_files, "loc": args.budget_loc},
        "slices": slices,
        "gate": gate,
        "surface_map": sorted(os.path.relpath(f, root) for f in ui_files),
    }
    if args.json:
        print(json.dumps(out, indent=2))
        return 0

    print(f"POLISH SCAN — {out['project']}  ({stack})")
    print(f"  {out['code_files']} code files · {out['ui_files']} UI files / {ui_loc} LOC")
    print(f"  slices ({len(slices)}, budget {args.budget_files}f/{args.budget_loc}loc):")
    for s in slices:
        print(f"    ▸ {s['slice']:<26} {s['file_count']:>3} files / {s['loc']:>5} LOC")
    print("  verify gate:")
    print(f"    Tier A (revert on fail) : {', '.join(gate['tier_a']) or '—'}")
    print(f"    Tier B (update, no revert): {', '.join(gate['tier_b']) or '—'}"
          + (" + *.snap files present" if gate['has_snapshot_files'] else ""))
    print(f"    EXCLUDED (never run)    : {', '.join(gate['exclude']) or '—'}")
    if gate["unknown"]:
        print(f"    unclassified (confirm)  : {', '.join(gate['unknown'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
