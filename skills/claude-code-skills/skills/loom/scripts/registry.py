#!/usr/bin/env python3
"""registry.py — CRUD + dashboard for the loom fleet registry.

stdlib only. No LLM calls. Atomic, checksummed, snapshotted writes via loomlib.

Usage:
  registry.py add   <name> --owner <o> --repos a,b --body <skill|prompt>
                    --cadence nightly --mechanism schedule [--budget 5] [--priority 5]
  registry.py get   <name>
  registry.py set   <name> --field maturity --value pr-only
  registry.py rm    <name>
  registry.py list  [--json]
  registry.py status
  registry.py portfolio
  registry.py validate
"""
from __future__ import annotations
import argparse
import json
import sys

import loomlib as L


def _coerce(val: str, current):
    """Coerce a CLI string to the field's type. Uses the current value's type
    when known; falls back to best-effort (bool → int → float → str) when the
    current value is None (so a fresh numeric field doesn't stay a string)."""
    low = val.lower()
    if isinstance(current, bool):
        return low in ("1", "true", "yes", "on")
    if isinstance(current, int) and not isinstance(current, bool):
        return int(val)
    if isinstance(current, float):
        return float(val)
    if isinstance(current, str):
        return val
    # current is None / unknown → best effort
    if low in ("true", "false", "yes", "no", "on", "off"):
        return low in ("true", "yes", "on")
    try:
        return int(val)
    except ValueError:
        pass
    try:
        return float(val)
    except ValueError:
        return val


def _num(x):
    """Tolerate legacy string values when ranking."""
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def _get(reg, name):
    loop = reg["loops"].get(name)
    if loop is None:
        raise SystemExit(f"no such loop: {name}")
    return loop


def cmd_add(args):
    reg = L.load_registry()
    if args.name in reg["loops"]:
        raise SystemExit(f"loop already exists: {args.name}")
    rec = L.new_loop_record(
        name=args.name,
        owner=args.owner,
        repos=[r.strip() for r in args.repos.split(",") if r.strip()],
        body=args.body,
        cadence=args.cadence,
        mechanism=args.mechanism,
        budget_cap=args.budget,
        priority=args.priority,
        max_open_prs=args.max_open_prs,
    )
    reg["loops"][args.name] = rec
    L.save_registry(reg)
    print(json.dumps(rec, indent=2))


def cmd_get(args):
    reg = L.load_registry()
    print(json.dumps(_get(reg, args.name), indent=2))


def cmd_set(args):
    reg = L.load_registry()
    loop = _get(reg, args.name)
    if args.field not in loop:
        raise SystemExit(f"unknown field: {args.field}")
    loop[args.field] = _coerce(args.value, loop[args.field])
    L.save_registry(reg)
    print(f"{args.name}.{args.field} = {loop[args.field]}")


def cmd_rm(args):
    reg = L.load_registry()
    _get(reg, args.name)
    del reg["loops"][args.name]
    L.save_registry(reg)
    print(f"removed {args.name}")


def cmd_list(args):
    reg = L.load_registry()
    if args.json:
        print(json.dumps(reg["loops"], indent=2))
        return
    loops = reg["loops"]
    if not loops:
        print("no loops registered. Build one with /loom \"<task>\".")
        return
    hdr = f"{'LOOP':<18}{'REPOS':<14}{'STAGE':<12}{'STATUS':<16}{'ACCEPT':<8}{'VALUE':<7}{'NEXT':<10}"
    print(hdr)
    print("-" * len(hdr))
    for name, l in sorted(loops.items()):
        acc = "—" if l["accept_rate"] is None else f"{l['accept_rate']*100:.0f}%"
        val = "—" if l["value_score"] is None else f"{l['value_score']:.2f}"
        repos = ",".join(l["repos"])[:13]
        nxt = (l["next_run"] or "—")[:9]
        print(f"{name:<18}{repos:<14}{l['maturity']:<12}{l['status']:<16}{acc:<8}{val:<7}{nxt:<10}")


def cmd_status(args):
    reg = L.load_registry()
    cfg = L.load_config()
    loops = reg["loops"]
    budget = cfg.get("monthly_budget_usd")
    spent = cfg.get("spent", 0.0)
    budget_str = f"${spent:.2f} / ${budget:.2f}" if budget else f"${spent:.2f} / (no pool)"
    bar = "=" * 62
    print(bar)
    print(f"LOOM — fleet  ·  budget {budget_str}  ·  freeze: {'ON' if cfg.get('freeze') else 'OFF'}"
          f"  ·  kill_all: {'ON' if cfg.get('kill_all') else 'OFF'}")
    print(bar)
    cmd_list(argparse.Namespace(json=False))
    print(bar)
    blocked = sum(1 for l in loops.values() if l["status"] == "blocked_on_review")
    circuit = sum(1 for l in loops.values() if l["status"] == "circuit_open")
    dormant = sum(1 for l in loops.values() if l["status"] == "dormant")
    print(f"summary: {len(loops)} loops · {circuit} circuit-open · {blocked} blocked_on_review · {dormant} dormant")
    # flags
    for name, l in sorted(loops.items()):
        if l["consecutive_failures"] >= 3:
            print(f"  ⚠ {name}: consecutive_failures={l['consecutive_failures']} (crash-loop)")
        if l["unread_loc_debt"] > 0:
            print(f"  ⚠ {name}: unread_loc_debt={l['unread_loc_debt']}")
        rd = L.parse_iso(l["renewal_date"])
        if rd and rd < L.parse_iso(L.utcnow()):
            print(f"  ⚠ {name}: ownership TTL expired ({l['renewal_date']}) — renew or retire")


def cmd_portfolio(args):
    """Rank loops by realized-value-per-dollar. Marginal framing."""
    reg = L.load_registry()
    rows = []
    for name, l in reg["loops"].items():
        runs = l.get("runs", [])
        cost = sum(_num(r.get("cost", 0.0)) for r in runs) or 0.0
        value = _num(l.get("value_score")) * _num(l.get("accept_rate"))
        per_dollar = (value / cost) if cost > 0 else 0.0
        rows.append((per_dollar, name, value, cost))
    rows.sort(reverse=True)
    print(f"{'LOOP':<18}{'VALUE/$':<10}{'VALUE':<8}{'COST':<8}")
    print("-" * 44)
    for pd, name, value, cost in rows:
        print(f"{name:<18}{pd:<10.3f}{value:<8.2f}${cost:<7.2f}")
    if rows:
        worst = rows[-1]
        print(f"\nmarginal: bottom loop '{worst[1]}' returns {worst[0]:.3f} value/$ "
              f"— kill and reallocate?")


def cmd_validate(args):
    try:
        L.load_registry(strict=True)
        print("registry OK (schema + checksum valid)")
    except SystemExit as e:
        print(f"INVALID: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    p = argparse.ArgumentParser(description="loom fleet registry")
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("add")
    a.add_argument("name")
    a.add_argument("--owner", required=True)
    a.add_argument("--repos", required=True)
    a.add_argument("--body", required=True)
    a.add_argument("--cadence", default="nightly")
    a.add_argument("--mechanism", default="schedule")
    a.add_argument("--budget", type=float, default=5.0)
    a.add_argument("--priority", type=int, default=5)
    a.add_argument("--max-open-prs", dest="max_open_prs", type=int, default=3)
    a.set_defaults(func=cmd_add)

    g = sub.add_parser("get"); g.add_argument("name"); g.set_defaults(func=cmd_get)

    s = sub.add_parser("set")
    s.add_argument("name"); s.add_argument("--field", required=True)
    s.add_argument("--value", required=True); s.set_defaults(func=cmd_set)

    r = sub.add_parser("rm"); r.add_argument("name"); r.set_defaults(func=cmd_rm)

    ls = sub.add_parser("list"); ls.add_argument("--json", action="store_true")
    ls.set_defaults(func=cmd_list)

    sub.add_parser("status").set_defaults(func=cmd_status)
    sub.add_parser("portfolio").set_defaults(func=cmd_portfolio)
    sub.add_parser("validate").set_defaults(func=cmd_validate)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
