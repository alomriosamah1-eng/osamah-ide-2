#!/usr/bin/env python3
"""mutate_gate.py — gate-rot detection via mutation testing.

stdlib only. Injects a known-bad mutation into a COPY of a source file, runs the
loop's objective gate against the copy, and asserts the gate goes RED. If the
gate stays GREEN on known-bad code, the gate is rotten → the caller demotes the
loop. Operates on a temp copy of the repo; never mutates the working tree.

Usage:
  mutate_gate.py <repo> --file src/x.ts --gate "npm test" [--timeout 900]
  mutate_gate.py <repo> --auto --gate "npm test"     # pick a mutatable file
"""
from __future__ import annotations
import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# textual mutations: (pattern, replacement, label). Order = try in sequence.
MUTATORS = [
    (re.compile(r"([^=!<>])===([^=])"), r"\1!==\2", "flip === to !=="),
    (re.compile(r"([^=!<>])!==([^=])"), r"\1===\2", "flip !== to ==="),
    (re.compile(r"\breturn true\b"), "return false", "return true→false"),
    (re.compile(r"\breturn false\b"), "return true", "return false→true"),
    (re.compile(r"([ (])>=([ ])"), r"\1>\2", "weaken >= to >"),
    (re.compile(r"([ (])<=([ ])"), r"\1<\2", "weaken <= to <"),
    (re.compile(r"&&"), "||", "flip && to ||"),
]

CANDIDATE_GLOBS = ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "**/*.py"]


def _pick_file(repo: Path):
    for g in CANDIDATE_GLOBS:
        for p in sorted(repo.glob(g)):
            if "node_modules" in str(p) or ".loom" in str(p):
                continue
            txt = p.read_text(errors="ignore")
            if any(m[0].search(txt) for m in MUTATORS):
                return p
    return None


def _apply_one(text):
    for pat, repl, label in MUTATORS:
        new, n = pat.subn(repl, text, count=1)
        if n:
            return new, label
    return None, None


def main():
    ap = argparse.ArgumentParser(description="loom gate-rot mutation test")
    ap.add_argument("repo")
    ap.add_argument("--file")
    ap.add_argument("--auto", action="store_true")
    ap.add_argument("--gate", required=True)
    ap.add_argument("--timeout", type=int, default=900)
    args = ap.parse_args()

    repo = Path(args.repo).expanduser().resolve()
    target = Path(args.file) if args.file else (_pick_file(repo) if args.auto else None)
    if target is None:
        raise SystemExit("no mutatable file found/given (use --file or --auto)")
    if not target.is_absolute():
        target = repo / target
    if not target.exists():
        raise SystemExit(f"no such file: {target}")

    # work on a full copy of the repo so the gate can build/run
    with tempfile.TemporaryDirectory(prefix="loom-mut-") as tmp:
        dst = Path(tmp) / repo.name
        shutil.copytree(repo, dst, ignore=shutil.ignore_patterns("node_modules", ".git", ".loom"))
        rel = target.relative_to(repo)
        mfile = dst / rel
        mutated, label = _apply_one(mfile.read_text(errors="ignore"))
        if mutated is None:
            raise SystemExit(f"no mutation applicable to {rel}")
        mfile.write_text(mutated)
        print(f"[mutate] {rel}: {label}", file=sys.stderr)
        # symlink node_modules back so the gate can run without reinstall
        nm = repo / "node_modules"
        if nm.exists() and not (dst / "node_modules").exists():
            try:
                (dst / "node_modules").symlink_to(nm)
            except OSError:
                pass
        try:
            r = subprocess.run(args.gate, cwd=dst, shell=True, timeout=args.timeout,
                               capture_output=True, text=True)
            red = r.returncode != 0
        except subprocess.TimeoutExpired:
            red = True  # a hang on bad code still counts as caught
        if red:
            print("GATE-OK: the gate caught the injected bug (went RED). Gate is alive.")
            raise SystemExit(0)
        else:
            print("GATE-ROT: the gate PASSED known-bad code (stayed GREEN). DEMOTE the loop + alert.")
            raise SystemExit(3)


if __name__ == "__main__":
    main()
