#!/usr/bin/env python3
"""candidates.py — proactive loop candidate detection from YOUR git history.

stdlib only (shells out to git). The highest-ROI loop is the one you haven't
built — the task you keep doing by hand. This clusters recent commits by shape
(prefix + touched-area + keywords) and surfaces repetition as a loop proposal
with a rough cadence estimate. It does NOT run anything; it suggests.

Usage:
  candidates.py <repo> [--days 60] [--min-count 3] [--json]
"""
from __future__ import annotations
import argparse
import json
import re
import subprocess
from collections import defaultdict

# map a commit-subject signature → a loom template + the 4-condition hint
SIGNATURES = [
    (re.compile(r"\b(bump|upgrade|update)\b.*\b(dep|deps|dependency|package|version|lock)\b", re.I),
     "dep-bump", "weekly"),
    (re.compile(r"\b(lint|format|prettier|eslint|style)\b", re.I), "lint-fix", "on-PR-open"),
    (re.compile(r"\b(flaky|retry|rerun|intermittent)\b", re.I), "ci-triage", "nightly"),
    (re.compile(r"\b(test|spec|coverage)\b", re.I), "coverage-ratchet", "nightly"),
    (re.compile(r"\b(polish|ux|spacing|a11y|accessib|micro.?interaction)\b", re.I),
     "nightly-polish", "nightly"),
    (re.compile(r"\b(dead code|unused|remove|cleanup|prune|trim)\b", re.I), "elon-trim", "nightly"),
    (re.compile(r"\b(ci|pipeline|workflow|build fail)\b", re.I), "ci-triage", "nightly"),
]


def git_subjects(repo, days):
    try:
        out = subprocess.run(
            ["git", "-C", repo, "log", f"--since={days} days ago", "--pretty=%s"],
            capture_output=True, text=True, timeout=30)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []
    if out.returncode != 0:
        return []
    return [s for s in out.stdout.splitlines() if s.strip()]


def main():
    ap = argparse.ArgumentParser(description="loom candidate detection")
    ap.add_argument("repo")
    ap.add_argument("--days", type=int, default=60)
    ap.add_argument("--min-count", dest="min_count", type=int, default=3)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    subjects = git_subjects(args.repo, args.days)
    buckets = defaultdict(list)
    for s in subjects:
        for pat, template, cadence in SIGNATURES:
            if pat.search(s):
                buckets[(template, cadence)].append(s)
                break

    proposals = []
    for (template, cadence), hits in buckets.items():
        if len(hits) >= args.min_count:
            proposals.append({
                "template": template,
                "suggested_cadence": cadence,
                "manual_occurrences": len(hits),
                "window_days": args.days,
                "evidence": hits[:5],
                "pitch": f"You did '{template}'-shaped work by hand {len(hits)}× in {args.days}d — "
                         f"a {cadence} loop would amortize it.",
            })
    proposals.sort(key=lambda p: p["manual_occurrences"], reverse=True)

    if args.json:
        print(json.dumps(proposals, indent=2))
        return
    if not proposals:
        print(f"no repeated manual patterns ≥{args.min_count}× in {args.days}d. "
              "Nothing worth a loop yet — a good prompt still wins.")
        return
    print(f"Loop candidates from your last {args.days} days of commits:\n")
    for p in proposals:
        print(f"  • {p['template']} ({p['suggested_cadence']}) — seen {p['manual_occurrences']}×")
        print(f"    {p['pitch']}")
        print(f"    e.g. {p['evidence'][0]!r}")
        print(f"    → /loom --wrap or scaffold from references/templates/{p['template']}/ ; "
              f"run the Gate before deploying.\n")


if __name__ == "__main__":
    main()
