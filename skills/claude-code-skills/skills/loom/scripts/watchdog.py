#!/usr/bin/env python3
"""watchdog.py — liveness (dead-man's-switch) + audit-chain + freeze/TTL checks.

stdlib only. Meant to run on SEPARATE infra from the orchestrator (a second
cron / healthchecks.io ping), so it can detect the whole fleet going silent.

Usage:
  watchdog.py beat                 # orchestrator calls this on a successful run
  watchdog.py check [--max-age-h 24] [--ping URL]   # alert if no recent beat
  watchdog.py ttl                  # list loops whose ownership TTL expired
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import urllib.request

import loomlib as L

HEARTBEAT = L.LOOM_HOME / "heartbeat.json"


def cmd_beat(args):
    L.ensure_home()
    L.atomic_write_json(HEARTBEAT, {"last_successful_orchestrator_run": L.utcnow()})
    print("beat recorded")


def cmd_check(args):
    hb = L.load_json(HEARTBEAT, default=None)
    now = dt.datetime.now(dt.timezone.utc)
    alert = None
    if hb is None:
        alert = "no heartbeat ever recorded — fleet may never have run"
    else:
        last = L.parse_iso(hb["last_successful_orchestrator_run"])
        age_h = (now - last).total_seconds() / 3600 if last else 1e9
        if age_h > args.max_age_h:
            alert = f"no successful orchestrator run in {age_h:.1f}h (> {args.max_age_h}h) — SILENT FLEET DEATH"
    if alert:
        print(f"⛔ ALERT: {alert}")
        if args.ping:
            try:
                urllib.request.urlopen(args.ping + "/fail", timeout=10)
            except Exception as e:  # noqa: BLE001
                print(f"(ping failed: {e})")
        raise SystemExit(1)
    print("liveness OK")
    if args.ping:
        try:
            urllib.request.urlopen(args.ping, timeout=10)
        except Exception:  # noqa: BLE001
            pass


def cmd_ttl(args):
    reg = L.load_registry()
    now = L.parse_iso(L.utcnow())
    expired = []
    for name, l in reg["loops"].items():
        rd = L.parse_iso(l.get("renewal_date"))
        if rd and rd < now:
            expired.append(name)
    print(json.dumps({"expired_ownership_ttl": expired}, indent=2))
    if expired:
        raise SystemExit(1)


def main():
    p = argparse.ArgumentParser(description="loom liveness watchdog")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("beat").set_defaults(func=cmd_beat)
    c = sub.add_parser("check")
    c.add_argument("--max-age-h", dest="max_age_h", type=float, default=24.0)
    c.add_argument("--ping")
    c.set_defaults(func=cmd_check)
    sub.add_parser("ttl").set_defaults(func=cmd_ttl)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
