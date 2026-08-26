#!/usr/bin/env python3
"""
summarize.py — render the /ship Launch summary + write SHIP.md.

The pipeline hands this a JSON record of the run; it emits the ASCII summary box
(for the chat) and writes/refreshes SHIP.md at the repo root (the durable report).

Usage:
    python3 summarize.py --data run.json [--out SHIP.md]
    cat run.json | python3 summarize.py            # data on stdin

Expected JSON (all keys optional — missing → shown as TODO/—):
{
  "project": "hcc-quote", "slug": "csv-export-button", "lane": "FULL",
  "idea": "add a CSV export button to the quote tool",
  "criteria": [{"text": "button exports current quote as CSV", "met": true}, ...],
  "changed": "4 files, +210/-12",
  "review": {"p0": 0, "p1": 0, "p2": 3, "verdict": "PASS"},
  "tests": [{"cmd": "npx vitest run", "status": "PASS", "n": 24},
            {"cmd": "npm run lint", "status": "PASS"}],
  "verify": "PASS",
  "decisions": ["used papaparse (already a dep) over hand-rolled CSV"],
  "launch_cmd": "merge ship/csv-export-button -> main (Vercel prod)",
  "rollback_cmd": "vercel rollback  (or git revert <merge> && git push)",
  "blocked_on": []
}
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BAR = "━" * 56


def load_data() -> dict:
    args = sys.argv[1:]
    if "--data" in args:
        p = args[args.index("--data") + 1]
        return json.loads(Path(p).read_text())
    if not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            return json.loads(raw)
    return {}


def out_path() -> Path:
    args = sys.argv[1:]
    if "--out" in args:
        return Path(args[args.index("--out") + 1])
    return Path("SHIP.md")


def _crit_line(criteria: list) -> str:
    if not criteria:
        return "— none captured —"
    marks = []
    for c in criteria:
        box = "☑" if c.get("met") else "☐"
        marks.append(f"{box} {c.get('text', '?')}")
    return "   ".join(marks)


def _tests_line(tests: list) -> str:
    if not tests:
        return "⚠ NONE RUN — gate is theater; do not treat as passing"
    parts = []
    for t in tests:
        n = f" ({t['n']})" if t.get("n") is not None else ""
        parts.append(f"{t.get('cmd', '?')} → {t.get('status', '?')}{n}")
    return "   ".join(parts)


def render(d: dict) -> str:
    review = d.get("review", {})
    blocked = d.get("blocked_on") or []
    status = "BLOCKED" if blocked else "READY TO LAUNCH"
    lines = [
        BAR,
        f"SHIP — {d.get('project', '?')}  ·  ship/{d.get('slug', '?')}  ·  {d.get('lane', '?')}  ·  {status}",
        BAR,
        f"IDEA        {d.get('idea', '—')}",
        f"CRITERIA    {_crit_line(d.get('criteria', []))}",
        f"CHANGED     {d.get('changed', '—')}",
        f"REVIEW      P0:{review.get('p0', '?')} P1:{review.get('p1', '?')} P2:{review.get('p2', '?')}   verdict: {review.get('verdict', '—')}",
        f"TESTS       {_tests_line(d.get('tests', []))}",
        f"VERIFY      {d.get('verify', '—')}",
    ]
    for dec in d.get("decisions", []):
        lines.append(f"DECISION    {dec}")
    if blocked:
        lines.append(f"BLOCKED ON  {', '.join(blocked)}   → fix + /ship --resume; NOT launched")
    else:
        lines.append(f"LAUNCH →    {d.get('launch_cmd', 'TODO')}        [awaiting your tap]")
        lines.append(f"ROLLBACK    {d.get('rollback_cmd', 'TODO')}")
    lines.append(BAR)
    return "\n".join(lines)


def write_ship_md(d: dict, box: str, path: Path) -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%MZ")
    md = [
        f"# SHIP — {d.get('project', '?')} · ship/{d.get('slug', '?')}",
        f"_Generated {ts} by /ship ({d.get('lane', '?')} lane)_",
        "",
        "```",
        box,
        "```",
        "",
        "## Acceptance criteria",
    ]
    for c in d.get("criteria", []) or ["—"]:
        if isinstance(c, dict):
            md.append(f"- [{'x' if c.get('met') else ' '}] {c.get('text', '?')}")
        else:
            md.append(f"- {c}")
    if d.get("decisions"):
        md += ["", "## Decisions (auto-picked forks)"]
        md += [f"- {x}" for x in d["decisions"]]
    if d.get("blocked_on"):
        md += ["", "## ⚠ Blocked", f"- {', '.join(d['blocked_on'])}", "- Not launched. Fix, then `/ship --resume`."]
    else:
        md += ["", "## Launch", f"- Command: `{d.get('launch_cmd', 'TODO')}`",
               f"- Rollback: `{d.get('rollback_cmd', 'TODO')}`",
               "- Requires explicit human approval (the gate)."]
    path.write_text("\n".join(md) + "\n")


def main() -> int:
    d = load_data()
    if not d:
        print("summarize.py: no data (pass --data run.json or pipe JSON on stdin)", file=sys.stderr)
        return 2
    box = render(d)
    print(box)
    op = out_path()
    write_ship_md(d, box, op)
    print(f"\n→ wrote {op}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
