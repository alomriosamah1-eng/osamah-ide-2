#!/usr/bin/env python3
"""
gauntlet split.py — inventory a repo, detect project signals, suggest functional
sections, and flag any section that exceeds the bounded-slice budget.

Deterministic, stdlib-only. This is the MAP step — not an LLM audit — so scanning
the whole tree here is fine (see doctrine.md §0: inventory ≠ audit).

Usage:
    split.py [path] [--budget-files 25] [--budget-loc 3000] [--json]
"""
from __future__ import annotations
import argparse, json, os, re, sys
from collections import defaultdict

SKIP_DIRS = {".git", "node_modules", "dist", "build", ".next", ".gauntlet",
             "vendor", "Pods", ".venv", "venv", "__pycache__", ".turbo",
             "target", "DerivedData", "coverage", ".cache"}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".py", ".swift", ".rs", ".go", ".rb",
            ".java", ".kt", ".c", ".cc", ".cpp", ".h", ".m", ".mm", ".vue",
            ".svelte", ".sql", ".sh"}

# signal -> (path/name regexes, content regexes to grep in dep manifests/code)
SIGNAL_PATTERNS = {
    "billing":   (r"(webhook|checkout|invoice|subscription|billing|payment)", r"(stripe|paddle|lemonsqueezy|braintree)"),
    "db":        (r"(migrations?|schema|prisma|drizzle)", r"(prisma|drizzle|supabase|sequelize|typeorm|mongoose|knex)"),
    "public_api":(r"(routes?|controllers?|api|handlers?)", r"(openapi|swagger|fastify|express|@trpc|graphql|FastAPI|flask)"),
    "async_heavy":(r"(workers?|queue|jobs?)", r"(asyncio|goroutine|Promise\.all|DispatchQueue|Thread\(|actor )"),
    "mobile_ios":(r"(\.xcodeproj|Info\.plist|Package\.swift)", r"(import SwiftUI|import UIKit)"),
    "ml":        (r"(\.safetensors|\.gguf|models?/)", r"(mlx|llama\.cpp|torch|transformers|coreml|onnx)"),
    "ci":        (r"(\.github/workflows|\.gitlab-ci|fastlane|Dockerfile)", r""),
    "has_lockfile":(r"(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|poetry\.lock|Podfile\.lock)", r""),
    "has_ui":    (r"(components?/|\.storyboard)", r"(import React|<template>|svelte)"),
    "react_native":(r"(metro\.config|\.expo)", r"(react-native|from ['\"]react-native['\"]|expo)"),
    "llm_app":   (r"(prompts?/|embeddings?|rag|vectorstore)", r"(openai|anthropic|langchain|llama[-_]?index|llamaindex|ollama|\bmlx\b|sentence-transformers|tiktoken|pinecone|chromadb)"),
    "embedded":  (r"(firmware|\.ino|peripheral|bluetooth)", r"(react-native-ble|CoreBluetooth|CBCentralManager|noble|bleak|\bOTA\b|\bDFU\b)"),
    "pii":       (r"(privacy|consent|gdpr|ccpa)", r"(personal data|HealthKit|Contacts|date of birth|\bssn\b|\bpii\b|hipaa)"),
}
DEP_MANIFESTS = {"package.json", "requirements.txt", "pyproject.toml", "Cargo.toml",
                 "go.mod", "Gemfile", "Package.swift", "Podfile", "build.gradle"}


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


def detect_signals(root: str, files: list[str]) -> dict:
    names = "\n".join(os.path.relpath(f, root) for f in files)
    # content for matching: full dependency manifests + a capped sweep of source files,
    # so imports in native code (e.g. CoreBluetooth, import SwiftUI, openai) are detected —
    # not just JS deps. Capped so huge repos stay fast.
    blob, budget = [], 5_000_000
    for f in files:
        base, ext = os.path.basename(f), os.path.splitext(f)[1]
        is_manifest = base in DEP_MANIFESTS
        if is_manifest or (ext in CODE_EXT and budget > 0):
            try:
                c = open(f, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            blob.append(c)
            if not is_manifest:
                budget -= len(c)
    content = "\n".join(blob)
    signals = {}
    for sig, (path_re, content_re) in SIGNAL_PATTERNS.items():
        hit = bool(re.search(path_re, names, re.I))
        if not hit and content_re:
            hit = bool(re.search(content_re, content, re.I))
        signals[sig] = hit
    signals["mobile"] = signals.get("mobile_ios") or signals.get("react_native")  # derived: native or RN
    return signals


def suggest_sections(root: str, files: list[str], budget_files: int, budget_loc: int):
    """Group by the top functional seam: the first dir under src/app/lib, else top-level."""
    groups: dict[str, list[str]] = defaultdict(list)
    for f in files:
        rel = os.path.relpath(f, root)
        parts = rel.split(os.sep)
        if len(parts) == 1:  # loose top-level file — bucket configs/entrypoints into §root unless substantial
            seam = "root" if loc_of(f) < 50 else os.path.splitext(parts[0])[0]
        else:
            seam = parts[0]
            if parts[0] in ("src", "app", "lib", "packages") and len(parts) > 2:
                seam = f"{parts[0]}/{parts[1]}"
        groups[seam].append(f)
    sections = []
    for seam, fs in sorted(groups.items()):
        code = [f for f in fs if os.path.splitext(f)[1] in CODE_EXT]
        if not code:
            continue
        loc = sum(loc_of(f) for f in code)
        over = len(code) > budget_files or loc > budget_loc
        sections.append({
            "name": seam.replace("/", "-"),
            "paths": [seam],
            "files": len(code),
            "loc": loc,
            "over_budget": over,
            "needs_subsplit": over,
        })
    return sections


def main() -> int:
    ap = argparse.ArgumentParser(description="Inventory + signals + section seams for gauntlet.")
    ap.add_argument("path", nargs="?", default=".")
    ap.add_argument("--budget-files", type=int, default=25)
    ap.add_argument("--budget-loc", type=int, default=3000)
    ap.add_argument("--json", action="store_true", help="emit JSON only")
    args = ap.parse_args()

    root = os.path.abspath(args.path)
    files = list(walk(root))
    code_files = [f for f in files if os.path.splitext(f)[1] in CODE_EXT]
    total_loc = sum(loc_of(f) for f in code_files)
    signals = detect_signals(root, files)
    sections = suggest_sections(root, files, args.budget_files, args.budget_loc)

    out = {
        "project": os.path.basename(root),
        "root": root,
        "files": len(code_files),
        "loc": total_loc,
        "budget": {"files": args.budget_files, "loc": args.budget_loc},
        "signals": signals,
        "sections": sections,
    }
    if args.json:
        print(json.dumps(out, indent=2))
        return 0

    print(f"GAUNTLET SPLIT — {out['project']}")
    print(f"  {out['files']} code files / {out['loc']} LOC")
    print("  signals: " + ", ".join(f"{k}{'✓' if v else '✗'}" for k, v in signals.items()))
    print(f"  sections ({len(sections)}):")
    for s in sections:
        flag = "  ⚠ OVER BUDGET → sub-split" if s["over_budget"] else ""
        print(f"    §{s['name']:<24} {s['files']:>3} files / {s['loc']:>5} LOC{flag}")
    over = [s["name"] for s in sections if s["over_budget"]]
    if over:
        print(f"\n  scope gate: {len(over)} section(s) exceed budget and MUST sub-split: {', '.join(over)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
