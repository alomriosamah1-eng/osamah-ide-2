#!/usr/bin/env python3
"""budget.py — forward cost projection + global pool accounting.

stdlib only. No LLM calls.

Usage:
  budget.py project --tokens-per-run N --runs-per-month M [--in 3 --out 15]
  budget.py set <amount>                 # set the monthly pool ($)
  budget.py show                         # pool + per-loop spend, auto-pause check
  budget.py charge <loop> --cost 0.12    # add to spent (records against pool)
"""
from __future__ import annotations
import argparse

import loomlib as L

# default per-MTok prices (USD); override with --in/--out. Mixed maker/checker.
DEFAULT_IN_PER_MTOK = 3.0
DEFAULT_OUT_PER_MTOK = 15.0


def _run_cost(tokens, in_price, out_price, out_frac=0.25):
    out_tok = tokens * out_frac
    in_tok = tokens - out_tok
    return (in_tok / 1_000_000) * in_price + (out_tok / 1_000_000) * out_price


def cmd_project(args):
    per_run = _run_cost(args.tokens_per_run, args.in_price, args.out_price)
    monthly = per_run * args.runs_per_month
    print(f"projected cost/run:   ${per_run:.4f}")
    print(f"projected cost/month: ${monthly:.2f}  ({args.runs_per_month} runs × "
          f"{args.tokens_per_run} tok)")
    cfg = L.load_config()
    pool = cfg.get("monthly_budget_usd")
    if pool:
        share = monthly / pool * 100
        print(f"= {share:.0f}% of the ${pool:.2f} monthly pool")
        if share > 50:
            print("⚠ this single loop would consume >50% of the pool — reconsider cadence/model routing")
    print("\ntip: route checker/triage to the local MLX tier (free) to cut this materially.")


def cmd_set(args):
    cfg = L.load_config()
    cfg["monthly_budget_usd"] = args.amount
    L.save_config(cfg)
    print(f"monthly budget pool = ${args.amount:.2f}")


def cmd_charge(args):
    cfg = L.load_config()
    cfg["spent"] = round(cfg.get("spent", 0.0) + args.cost, 4)
    L.save_config(cfg)
    _show(cfg)


def cmd_show(args):
    _show(L.load_config())


def _show(cfg):
    pool = cfg.get("monthly_budget_usd")
    spent = cfg.get("spent", 0.0)
    print(f"spent: ${spent:.2f}" + (f" / ${pool:.2f} pool" if pool else " (no pool set)"))
    if not pool:
        return
    frac = spent / pool
    print(f"pool used: {frac*100:.0f}%")
    if frac >= 1.0:
        print("⛔ pool exhausted — HARD STOP: no loop runs until reset or raised")
    elif frac >= 0.9:
        reg = L.load_registry()
        low = sorted(reg["loops"].values(), key=lambda l: l.get("priority", 5), reverse=True)
        names = [l["name"] for l in low[:2]]
        print(f"⚠ 90% pool — auto-pause lowest-priority first: {names}")


def main():
    p = argparse.ArgumentParser(description="loom cost governance")
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("project")
    pr.add_argument("--tokens-per-run", dest="tokens_per_run", type=int, required=True)
    pr.add_argument("--runs-per-month", dest="runs_per_month", type=int, required=True)
    pr.add_argument("--in", dest="in_price", type=float, default=DEFAULT_IN_PER_MTOK)
    pr.add_argument("--out", dest="out_price", type=float, default=DEFAULT_OUT_PER_MTOK)
    pr.set_defaults(func=cmd_project)

    st = sub.add_parser("set"); st.add_argument("amount", type=float); st.set_defaults(func=cmd_set)
    sh = sub.add_parser("show"); sh.set_defaults(func=cmd_show)
    ch = sub.add_parser("charge"); ch.add_argument("loop"); ch.add_argument("--cost", type=float, required=True)
    ch.set_defaults(func=cmd_charge)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
