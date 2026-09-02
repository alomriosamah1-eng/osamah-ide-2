#!/usr/bin/env python3
"""backtest.py — predict a loop's accept-rate + cost before spending live.

stdlib only. Two deterministic halves around the one LLM step (which the /loom
skill drives via the Agent tool, not this script):

  1. `corpus`  — assemble a case corpus from history (recent merged PRs / commits)
                 the loop would have acted on. Emits cases.json.
  2. `score`   — given results.json ([{case, gate, checker, would_accept, tokens}]),
                 compute predicted accept-rate, mean tokens, and projected $/period.
                 Gates the deploy: refuse if predicted accept-rate < threshold.

Usage:
  backtest.py corpus <repo> [--n 20] [--out cases.json]
  backtest.py score --results results.json --runs-per-month 30 [--min-accept 0.5]
"""
from __future__ import annotations
import argparse
import json
import subprocess
from pathlib import Path


def cmd_corpus(args):
    try:
        out = subprocess.run(
            ["git", "-C", args.repo, "log", "--merges", "-n", str(args.n),
             "--pretty=%H%x09%s%x09%ad", "--date=short"],
            capture_output=True, text=True, timeout=30)
        lines = out.stdout.splitlines() if out.returncode == 0 else []
    except (subprocess.TimeoutExpired, FileNotFoundError):
        lines = []
    if not lines:
        # fall back to plain commits
        out = subprocess.run(
            ["git", "-C", args.repo, "log", "-n", str(args.n),
             "--pretty=%H%x09%s%x09%ad", "--date=short"],
            capture_output=True, text=True, timeout=30)
        lines = out.stdout.splitlines() if out.returncode == 0 else []
    cases = []
    for ln in lines:
        parts = ln.split("\t")
        if len(parts) >= 2:
            cases.append({"id": parts[0][:10], "subject": parts[1],
                          "date": parts[2] if len(parts) > 2 else None})
    Path(args.out).write_text(json.dumps({"repo": args.repo, "cases": cases}, indent=2))
    print(f"wrote {len(cases)} cases → {args.out}")
    print("Next: the /loom skill replays the loop body over each case (Agent tool, bounded), "
          "writes results.json, then `backtest.py score`.")


def cmd_score(args):
    data = json.loads(Path(args.results).read_text())
    results = data if isinstance(data, list) else data.get("results", [])
    if not results:
        raise SystemExit("no results to score")
    n = len(results)
    accepts = sum(1 for r in results if r.get("would_accept"))
    gate_pass = sum(1 for r in results if r.get("gate") == "pass")
    checker_agree = sum(1 for r in results if r.get("checker") == "agree")
    tokens = [r.get("tokens", 0) for r in results]
    mean_tok = sum(tokens) / n
    accept_rate = accepts / n

    # cost projection (reuse budget.py pricing assumptions)
    in_p, out_p, out_frac = 3.0, 15.0, 0.25
    per_run = ((mean_tok * (1 - out_frac)) / 1e6) * in_p + ((mean_tok * out_frac) / 1e6) * out_p
    monthly = per_run * args.runs_per_month

    report = {
        "cases": n,
        "predicted_accept_rate": round(accept_rate, 3),
        "gate_pass_rate": round(gate_pass / n, 3),
        "checker_agreement": round(checker_agree / n, 3),
        "mean_tokens_per_run": int(mean_tok),
        "projected_cost_per_run": round(per_run, 4),
        "projected_cost_per_month": round(monthly, 2),
    }
    print(json.dumps(report, indent=2))
    if accept_rate < args.min_accept:
        print(f"\n⛔ predicted accept-rate {accept_rate:.0%} < {args.min_accept:.0%} "
              "— DO NOT DEPLOY. Tighten the gate or keep it a manual prompt.")
        raise SystemExit(2)
    print(f"\n✓ predicted accept-rate {accept_rate:.0%} ≥ {args.min_accept:.0%} — clear to deploy at shadow.")


def main():
    p = argparse.ArgumentParser(description="loom backtest / eval harness")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("corpus")
    c.add_argument("repo"); c.add_argument("--n", type=int, default=20)
    c.add_argument("--out", default="cases.json"); c.set_defaults(func=cmd_corpus)
    s = sub.add_parser("score")
    s.add_argument("--results", required=True)
    s.add_argument("--runs-per-month", dest="runs_per_month", type=int, default=30)
    s.add_argument("--min-accept", dest="min_accept", type=float, default=0.5)
    s.set_defaults(func=cmd_score)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
