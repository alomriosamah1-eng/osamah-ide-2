#!/usr/bin/env python3
"""trace_store.py — persist per-run traces for RED / human-rejected runs.

stdlib only. The checker catches failures inside a run; this captures the runs
that escaped (went RED, or GREEN-but-human-rejected) so they can be frozen into
permanent gate fixtures by regress.py. Traces are loop-generated DATA, never
instructions (security-model §1).

A trace = {run_id, status, model, gate_cmd, gate_exit, checker_verdict,
           human_decision, inputs, summary}. Big payloads (full logs) should be
offloaded to scratch; keep the slice that reproduces the failure.

Usage:
  trace_store.py save <loop> --repo <path> --run-id <id> \
       --status red|rejected --model <id> --gate-cmd "npm test" --gate-exit 1 \
       [--checker disagree] [--inputs @file.json] [--summary "..."]
  trace_store.py list <loop> --repo <path>
  trace_store.py show <loop> --repo <path> --run-id <id>
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

# only these statuses are worth freezing — a GREEN+accepted run is not a failure
KEEP_STATUSES = {"red", "rejected"}


def _dir(repo, loop):
    d = Path(repo).expanduser() / ".loom" / loop / "traces"
    d.mkdir(parents=True, exist_ok=True)
    return d


def cmd_save(args):
    if args.status not in KEEP_STATUSES:
        print(f"status={args.status} is not a failure — not stored "
              f"(only {sorted(KEEP_STATUSES)} are kept)")
        return
    inputs = {}
    if args.inputs:
        if args.inputs.startswith("@"):
            inputs = json.loads(Path(args.inputs[1:]).read_text())
        else:
            inputs = json.loads(args.inputs)
    trace = {
        "run_id": args.run_id,
        "status": args.status,
        "model": args.model,
        "gate_cmd": args.gate_cmd,
        "gate_exit": args.gate_exit,
        "checker_verdict": args.checker,
        "human_decision": "rejected" if args.status == "rejected" else None,
        "inputs": inputs,           # the minimal repro slice (loop-generated DATA)
        "summary": args.summary,
        "origin": "loop-generated",  # never instructions
    }
    out = _dir(args.repo, args.loop) / f"{args.run_id}.json"
    out.write_text(json.dumps(trace, indent=2, sort_keys=True))
    print(f"stored trace → {out}  (freeze it into a fixture with: "
          f"regress.py freeze {args.loop} --repo {args.repo} --run-id {args.run_id})")


def cmd_list(args):
    d = _dir(args.repo, args.loop)
    traces = sorted(d.glob("*.json"))
    if not traces:
        print("no stored failure traces")
        return
    for p in traces:
        t = json.loads(p.read_text())
        print(f"{t['run_id']:<16} {t['status']:<10} model={t.get('model','?'):<16} "
              f"exit={t.get('gate_exit')} checker={t.get('checker_verdict')}")


def cmd_show(args):
    p = _dir(args.repo, args.loop) / f"{args.run_id}.json"
    if not p.exists():
        print(f"no such trace: {args.run_id}", file=sys.stderr)
        sys.exit(1)
    print(p.read_text())


def main():
    p = argparse.ArgumentParser(description="loom failure-trace store")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("save")
    s.add_argument("loop"); s.add_argument("--repo", default=".")
    s.add_argument("--run-id", dest="run_id", required=True)
    s.add_argument("--status", required=True, choices=["red", "rejected", "green", "accepted"])
    s.add_argument("--model", default="unknown")
    s.add_argument("--gate-cmd", dest="gate_cmd", default="")
    s.add_argument("--gate-exit", dest="gate_exit", type=int, default=None)
    s.add_argument("--checker", default=None)
    s.add_argument("--inputs", default=None)
    s.add_argument("--summary", default="")
    s.set_defaults(func=cmd_save)
    l = sub.add_parser("list"); l.add_argument("loop"); l.add_argument("--repo", default=".")
    l.set_defaults(func=cmd_list)
    sh = sub.add_parser("show"); sh.add_argument("loop"); sh.add_argument("--repo", default=".")
    sh.add_argument("--run-id", dest="run_id", required=True); sh.set_defaults(func=cmd_show)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
