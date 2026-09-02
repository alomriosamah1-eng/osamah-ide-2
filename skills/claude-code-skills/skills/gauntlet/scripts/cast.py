#!/usr/bin/env python3
"""
gauntlet cast.py — score the desk bench against project signals + the goal,
deploy the fit, bench the rest. Mirrors council's triad-selection.

Usage:
    split.py . --json | cast.py --goal "payments live by 5/29" [--mode deep] [--desk money]
    cast.py --signals signals.json --goal "..." [--mode fast|deep]
"""
from __future__ import annotations
import argparse, json, sys

# desk: trigger signal (None = always-eligible), scope, default model, tier, goal keywords
BENCH = {
    "security":       (None,          "fan-out", "opus",   "P0",   ["secur", "auth", "rls", "secret", "vuln"]),
    "reliability":    (None,          "scoped",  "sonnet", "P1",   ["stable", "crash", "reliab", "error"]),
    "field-test":     (None,          "scoped",  "opus",   "LegB", ["live", "work", "ship", "verify", "prove"]),
    "transferability":(None,          "fan-out", "sonnet", "P1",   ["handoff", "hand off", "transfer", "team", "onboard"]),
    "razor":          (None,          "fan-out", "sonnet", "trim", ["lean", "clean", "simplif", "cut", "dead"]),
    "money":          ("billing",     "scoped",  "opus",   "P0",   ["payment", "billing", "charge", "stripe", "subscri", "checkout"]),
    "data":           ("db",          "scoped",  "opus",   "P0",   ["data", "migrat", "persist", "db", "database"]),
    "api-contract":   ("public_api",  "scoped",  "sonnet", "P1",   ["api", "endpoint", "sdk", "contract", "version"]),
    "concurrency":    ("async_heavy", "scoped",  "opus",   "P1",   ["concurren", "race", "async", "thread", "lock"]),
    "mobile":         ("mobile",      "scoped",  "sonnet", "P1",   ["ios", "iphone", "android", "react native", "app store", "mobile"]),
    "ml-inference":   ("ml",          "scoped",  "opus",   "P1",   ["model", "inference", "llm", "ml", "quant", "token"]),
    "ai-llm-app":     ("llm_app",     "scoped",  "opus",   "P0",   ["llm", "ai", "rag", "prompt", "agent", "model", "chatbot", "embedding"]),
    "embedded":       ("embedded",    "scoped",  "opus",   "P0",   ["ble", "bluetooth", "firmware", "ota", "device", "hardware", "peripheral"]),
    "privacy":        ("pii",         "fan-out", "sonnet", "P1",   ["privacy", "pii", "gdpr", "consent", "personal", "retention", "deletion"]),
    "build-release":  ("ci",          "scoped",  "sonnet", "P1",   ["release", "deploy", "ci", "rollback", "pipeline"]),
    "dependency":     ("has_lockfile","fan-out", "sonnet", "P1",   ["depend", "cve", "supply", "license", "package"]),
    "performance":    ("perf_sensitive","scoped","sonnet", "P1/P2",["perf", "latenc", "fast", "scale", "speed", "optimi"]),
    "copy-ux":        ("has_ui",      "scoped",  "haiku",  "P2",   ["ui", "ux", "copy", "design", "a11y", "accessib"]),
}
ALWAYS = [d for d, v in BENCH.items() if v[0] is None]
FAST_CORE = {"security", "reliability", "field-test", "money", "data", "ai-llm-app", "embedded"}


def score(desk: str, signals: dict, goal: str) -> float:
    sig, _, _, _, kws = BENCH[desk]
    s = 0.0
    if sig is None or signals.get(sig):
        s += 1.0
    s += 0.5 * sum(1 for k in kws if k in goal.lower())
    return s


def main() -> int:
    ap = argparse.ArgumentParser(description="Cast the gauntlet desk bench.")
    ap.add_argument("--signals", help="signals JSON file (default: stdin from split.py)")
    ap.add_argument("--goal", default="", help="the goal string")
    ap.add_argument("--mode", choices=["fast", "deep"], default="deep")
    ap.add_argument("--desk", action="append", default=[], help="force-deploy a benched desk")
    ap.add_argument("--cap", type=int, default=8, help="max desks in deep mode")
    args = ap.parse_args()

    raw = open(args.signals).read() if args.signals else (sys.stdin.read() if not sys.stdin.isatty() else "{}")
    data = json.loads(raw or "{}")
    signals = data.get("signals", {})
    sections = [s["name"] for s in data.get("sections", [])]

    scored = {d: score(d, signals, args.goal) for d in BENCH}
    deployed, benched = [], []
    for d in BENCH:
        force = d in args.desk
        eligible_core = d in ALWAYS or scored[d] >= 1.0
        if args.mode == "fast":
            keep = force or (d in FAST_CORE and (BENCH[d][0] is None or signals.get(BENCH[d][0])))
        else:
            keep = force or eligible_core
        (deployed if keep else benched).append(d)

    if args.mode == "deep" and len(deployed) > args.cap:
        # the cap trims optional (P1/P2) desks only — never bench a P0 lens or an always-eligible desk
        protected = [d for d in deployed if d in ALWAYS or BENCH[d][3] == "P0"]
        optional = sorted((d for d in deployed if d not in protected), key=lambda d: scored[d], reverse=True)
        room = max(0, args.cap - len(protected))
        benched += optional[room:]
        deployed = protected + optional[:room]

    table = {d: {"scope": BENCH[d][1], "model": BENCH[d][2], "tier": BENCH[d][3],
                 "score": round(scored[d], 2),
                 "sections": ("all" if BENCH[d][1] == "fan-out" else sections)}
             for d in deployed}

    out = {"mode": args.mode, "goal": args.goal, "signals": signals,
           "deployed": table, "benched": benched,
           "agents_estimated": sum(len(v["sections"]) if isinstance(v["sections"], list) else len(sections) or 1
                                   for v in table.values())}
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
