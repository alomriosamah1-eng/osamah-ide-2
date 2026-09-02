#!/usr/bin/env python3
"""audit.py — tamper-evident, hash-chained append-only audit log.

stdlib only. Each entry chains the prior entry's hash, so any deletion or edit
breaks the chain and `verify` detects it. In production the log file should be
written with a write-only credential the loop token cannot delete from; this
script provides the chain mechanics.

Usage:
  audit.py append <loop> <event> [--data '{"k":"v"}']
  audit.py verify
  audit.py tail [N]
"""
from __future__ import annotations
import argparse
import hashlib
import json

import loomlib as L

GENESIS = "0" * 64


def _entry_hash(prev_hash, record_no_hash):
    payload = (prev_hash + json.dumps(record_no_hash, sort_keys=True, separators=(",", ":"))).encode()
    return hashlib.sha256(payload).hexdigest()


def _read_chain():
    L.ensure_home()
    if not L.AUDIT_LOG.exists():
        return []
    out = []
    for line in L.AUDIT_LOG.read_text().splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def cmd_append(args):
    chain = _read_chain()
    prev = chain[-1]["hash"] if chain else GENESIS
    rec = {
        "ts": L.utcnow(),
        "loop": args.loop,
        "event": args.event,
        "data": json.loads(args.data) if args.data else {},
        "prev": prev,
    }
    rec["hash"] = _entry_hash(prev, {k: rec[k] for k in ("ts", "loop", "event", "data", "prev")})
    with open(L.AUDIT_LOG, "a") as f:
        f.write(json.dumps(rec, sort_keys=True) + "\n")
    print(rec["hash"])


def cmd_verify(args):
    chain = _read_chain()
    prev = GENESIS
    for i, rec in enumerate(chain):
        body = {k: rec[k] for k in ("ts", "loop", "event", "data", "prev")}
        expect = _entry_hash(prev, body)
        if rec.get("prev") != prev:
            raise SystemExit(f"CHAIN BREAK at entry {i}: prev mismatch (tampered/deleted)")
        if rec.get("hash") != expect:
            raise SystemExit(f"CHAIN BREAK at entry {i}: hash mismatch (edited)")
        prev = rec["hash"]
    print(f"audit chain OK · {len(chain)} entries")


def cmd_tail(args):
    chain = _read_chain()
    for rec in chain[-args.n:]:
        print(f"{rec['ts']}  {rec['loop']:<16} {rec['event']:<20} {json.dumps(rec['data'])}")


def main():
    p = argparse.ArgumentParser(description="loom tamper-evident audit log")
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("append")
    a.add_argument("loop"); a.add_argument("event"); a.add_argument("--data")
    a.set_defaults(func=cmd_append)
    sub.add_parser("verify").set_defaults(func=cmd_verify)
    t = sub.add_parser("tail"); t.add_argument("n", nargs="?", type=int, default=20)
    t.set_defaults(func=cmd_tail)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
