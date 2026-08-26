#!/usr/bin/env python3
"""regress.py — freeze real failures into permanent gate fixtures.

stdlib only. The BACKWARD complement to mutate_gate.py:
  - mutate_gate.py (forward):  inject a synthetic bug, expect the gate to catch it.
  - regress.py     (backward): capture a REAL failure the gate let through (a RED
                   or human-rejected run), freeze it, and assert the current
                   harness still catches it on every future run.

A fixture asserts an OBJECTIVE outcome (the captured input must still produce the
recorded failure signal), NOT an advisory lesson — so it lives inside the gate
boundary and never touches the §7 lessons firewall.

Usage:
  regress.py freeze <loop> --repo <path> --run-id <id> [--expect red|rejected]
  regress.py list   <loop> --repo <path>
  regress.py run    <loop> --repo <path>     # replay all fixtures; exit !=0 if any drifted
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path


def _traces(repo, loop):
    return Path(repo).expanduser() / ".loom" / loop / "traces"


def _fixtures(repo, loop):
    d = Path(repo).expanduser() / ".loom" / loop / "fixtures"
    d.mkdir(parents=True, exist_ok=True)
    return d


def cmd_freeze(args):
    src = _traces(args.repo, args.loop) / f"{args.run_id}.json"
    if not src.exists():
        raise SystemExit(f"no stored trace {args.run_id} (capture it with trace_store.py first)")
    trace = json.loads(src.read_text())
    fixture = {
        "id": args.run_id,
        "frozen_from": "trace",
        "expect": args.expect or trace.get("status", "red"),
        "gate_cmd": trace.get("gate_cmd"),
        "recorded_gate_exit": trace.get("gate_exit"),
        "inputs": trace.get("inputs", {}),      # the repro slice
        "note": trace.get("summary", ""),
        "origin": "gate-fixture",               # a GATE, not a lesson
    }
    out = _fixtures(args.repo, args.loop) / f"{args.run_id}.json"
    out.write_text(json.dumps(fixture, indent=2, sort_keys=True))
    print(f"froze fixture → {out}\n"
          f"  expect: this input keeps producing '{fixture['expect']}'. "
          f"Replay with: regress.py run {args.loop} --repo {args.repo}")


def cmd_list(args):
    fx = sorted(_fixtures(args.repo, args.loop).glob("*.json"))
    if not fx:
        print("no regression fixtures frozen yet")
        return
    for p in fx:
        f = json.loads(p.read_text())
        print(f"{f['id']:<16} expect={f['expect']:<10} gate={f.get('gate_cmd')!r}")


def cmd_run(args):
    """Replay every fixture against the loop body and assert it still fails.

    This driver checks fixture integrity + emits the replay plan. The actual
    re-execution of the loop body against `inputs` is performed by the /loom
    skill (Agent tool) which writes the observed outcome back via
    `regress.py record`. A fixture whose observed outcome != expect = harness
    DRIFT: a known break can recur → block promotion + alert.
    """
    fx = sorted(_fixtures(args.repo, args.loop).glob("*.json"))
    if not fx:
        print("no fixtures to replay")
        return
    drifted, plan = [], []
    for p in fx:
        f = json.loads(p.read_text())
        observed = f.get("last_observed")          # set by `record`
        if observed is None:
            plan.append(f["id"])
        elif observed != f["expect"]:
            drifted.append((f["id"], f["expect"], observed))
    if plan:
        print("REPLAY PLAN (the /loom skill must re-run these via the Agent tool, "
              "then `regress.py record`):")
        for i in plan:
            print(f"  - replay fixture {i}")
    if drifted:
        print("\n⛔ HARNESS DRIFT — fixtures that no longer fail as expected:")
        for i, exp, obs in drifted:
            print(f"  - {i}: expected {exp}, observed {obs} → a known break can recur")
        raise SystemExit(3)
    if not plan and not drifted:
        print(f"✓ all {len(fx)} fixtures still caught (no harness drift)")


def cmd_record(args):
    p = _fixtures(args.repo, args.loop) / f"{args.run_id}.json"
    if not p.exists():
        raise SystemExit(f"no such fixture: {args.run_id}")
    f = json.loads(p.read_text())
    f["last_observed"] = args.observed
    p.write_text(json.dumps(f, indent=2, sort_keys=True))
    drift = f["last_observed"] != f["expect"]
    print(f"{args.run_id}: observed={args.observed} expect={f['expect']}"
          f"{' → DRIFT' if drift else ' → ok'}")
    if drift:
        sys.exit(3)


def main():
    p = argparse.ArgumentParser(description="loom regression fixtures (backward gate defense)")
    sub = p.add_subparsers(dest="cmd", required=True)
    fr = sub.add_parser("freeze")
    fr.add_argument("loop"); fr.add_argument("--repo", default=".")
    fr.add_argument("--run-id", dest="run_id", required=True)
    fr.add_argument("--expect", choices=["red", "rejected"], default=None)
    fr.set_defaults(func=cmd_freeze)
    ls = sub.add_parser("list"); ls.add_argument("loop"); ls.add_argument("--repo", default=".")
    ls.set_defaults(func=cmd_list)
    rn = sub.add_parser("run"); rn.add_argument("loop"); rn.add_argument("--repo", default=".")
    rn.set_defaults(func=cmd_run)
    rc = sub.add_parser("record"); rc.add_argument("loop"); rc.add_argument("--repo", default=".")
    rc.add_argument("--run-id", dest="run_id", required=True)
    rc.add_argument("--observed", required=True, choices=["red", "rejected", "green", "accepted"])
    rc.set_defaults(func=cmd_record)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
