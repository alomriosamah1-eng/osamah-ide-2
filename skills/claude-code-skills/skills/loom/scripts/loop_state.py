#!/usr/bin/env python3
"""loop_state.py — record a loop run, recompute metrics, render STATE.md.

stdlib only. No LLM calls. Updates the registry record (accept-rate, value,
work/loop-health, hard-stop counters) and writes the human-readable
LOOM-<loop>.md + .loom/<loop>/state.json in the target repo.

Usage:
  loop_state.py record <loop> --repo <path> --gate pass|fail \
       --checker agree|disagree --action shadow|pr|merge|none \
       [--accepted true|false] [--tokens N] [--cost 0.12] \
       [--files-touched N] [--diff-similarity 0.0] [--net-loc N] \
       [--pr-url URL] [--empty true|false]
  loop_state.py metrics <loop>            # print recomputed metrics
  loop_state.py idempotent <loop> --key <work-unit-key>   # exit 0 = new, 1 = seen
  loop_state.py debt <loop> --add N       # accrue unread_loc_debt
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path

import loomlib as L

ACCEPT_WINDOW = 10          # last N PRs for accept-rate
CHURN_THRESHOLD = 0.9       # diff-similarity flag
CRASH_FAILS = 3             # consecutive failures → circuit
DEBT_CEILING = 400          # unread LOC before the loop stops opening PRs


def _bool(s):
    return str(s).lower() in ("1", "true", "yes", "on")


def cmd_record(args):
    reg = L.load_registry()
    loop = reg["loops"].get(args.loop)
    if loop is None:
        raise SystemExit(f"no such loop: {args.loop}")

    run = {
        "ts": L.utcnow(),
        "gate": args.gate,
        "checker": args.checker,
        "action": args.action,
        "accepted": _bool(args.accepted) if args.accepted is not None else None,
        "tokens": args.tokens,
        "cost": args.cost,
        "model": args.model,                      # attribute drift to a model (canary)
        "files_touched": args.files_touched,
        "diff_similarity": args.diff_similarity,   # CROSS-run churn signal
        "context_fill": args.context_fill,         # WITHIN-run: how full at completion
        "compactions": args.compactions,           # WITHIN-run: doom-loop pressure
        "net_loc": args.net_loc,
        "pr_url": args.pr_url,
        "empty": _bool(args.empty),
        "key": args.key,
    }
    # ---- model-change canary: mark a changepoint when the model swaps ----
    if args.model and loop.get("current_model") and loop["current_model"] != args.model:
        loop.setdefault("model_changepoints", []).append(
            {"ts": run["ts"], "from": loop["current_model"], "to": args.model})
        loop["canary_due"] = True  # /loom must re-run backtest+mutate+regress before next live run
    if args.model:
        loop["current_model"] = args.model
    loop.setdefault("runs", []).append(run)
    loop["runs"] = loop["runs"][-L.RUN_HISTORY_CAP:]
    loop["last_run"] = run["ts"]

    # ---- hard-stop / health counters ----
    if args.gate == "fail":
        loop["consecutive_failures"] = loop.get("consecutive_failures", 0) + 1
    else:
        loop["consecutive_failures"] = 0
    if run["empty"]:
        loop["consecutive_empty_runs"] = loop.get("consecutive_empty_runs", 0) + 1
    else:
        loop["consecutive_empty_runs"] = 0

    # ---- status transitions (mechanical, conservative) ----
    if loop["consecutive_failures"] >= CRASH_FAILS:
        loop["status"] = "circuit_open"
    if loop["consecutive_empty_runs"] >= 7:
        loop["status"] = "dormant"
    if args.diff_similarity is not None and args.diff_similarity > CHURN_THRESHOLD:
        loop["loop_health"] = "churn"
    else:
        loop["loop_health"] = "ok"

    # ---- accept-rate over the window (only PR/merge actions count) ----
    pr_runs = [r for r in loop["runs"] if r["action"] in ("pr", "merge") and r["accepted"] is not None]
    window = pr_runs[-ACCEPT_WINDOW:]
    if window:
        loop["accept_rate"] = sum(1 for r in window if r["accepted"]) / len(window)
        if loop["accept_rate"] < 0.5:
            loop["loop_health"] = loop.get("loop_health", "ok")
            _demote(loop, reason=f"accept_rate {loop['accept_rate']:.0%} < 50%")

    # ---- realized value = mean(value rating) × survival proxy ----
    rated = [r.get("value_rating") for r in loop["runs"] if r.get("value_rating")]
    if rated:
        loop["value_score"] = sum(rated) / len(rated) / 5.0  # normalize 1-5 → 0-1

    reg["loops"][args.loop] = loop
    L.save_registry(reg)

    if args.repo:
        _write_state_md(args.loop, loop, Path(args.repo))
    print(json.dumps({"accept_rate": loop["accept_rate"], "value_score": loop["value_score"],
                      "status": loop["status"], "loop_health": loop.get("loop_health"),
                      "consecutive_failures": loop["consecutive_failures"],
                      "consecutive_empty_runs": loop["consecutive_empty_runs"]}, indent=2))


def _demote(loop, reason):
    order = ["shadow", "pr-only", "auto-trivial"]
    cur = loop.get("maturity", "shadow")
    if cur in order and order.index(cur) > 0:
        loop["maturity"] = order[order.index(cur) - 1]
        loop.setdefault("demotions", []).append({"ts": L.utcnow(), "reason": reason})


def cmd_metrics(args):
    reg = L.load_registry()
    loop = reg["loops"].get(args.loop) or {}
    print(json.dumps({k: loop.get(k) for k in
                      ("maturity", "status", "accept_rate", "value_score",
                       "loop_health", "consecutive_failures", "consecutive_empty_runs",
                       "unread_loc_debt")}, indent=2))


def cmd_idempotent(args):
    """exit 0 if this work-unit key is new (safe to act), 1 if already seen."""
    reg = L.load_registry()
    loop = reg["loops"].get(args.loop) or {"runs": []}
    seen = {r.get("key") for r in loop.get("runs", []) if r.get("key")}
    if args.key in seen:
        print(f"DUPLICATE: {args.key} already acted on — skip (idempotency)")
        raise SystemExit(1)
    print(f"NEW: {args.key}")


def cmd_debt(args):
    reg = L.load_registry()
    loop = reg["loops"].get(args.loop)
    if loop is None:
        raise SystemExit(f"no such loop: {args.loop}")
    loop["unread_loc_debt"] = loop.get("unread_loc_debt", 0) + args.add
    blocked = loop["unread_loc_debt"] >= DEBT_CEILING
    if blocked:
        loop["status"] = "blocked_on_comprehension"
    L.save_registry(reg)
    print(f"unread_loc_debt={loop['unread_loc_debt']} "
          f"(ceiling {DEBT_CEILING}){' — BLOCKED until comprehension review' if blocked else ''}")


def _lessons_path(repo, loop):
    d = Path(repo).expanduser() / ".loom" / loop
    d.mkdir(parents=True, exist_ok=True)
    return d / "lessons.json"


def _load_lessons(repo, loop):
    p = _lessons_path(repo, loop)
    if p.exists():
        return json.loads(p.read_text())
    return []


def cmd_lesson_add(args):
    """Add a lesson with a TTL. Lessons are advisory DATA (security §7) — they
    never alter gates/scopes/rules; the TTL stops a once-true lesson governing
    forever (temporal fact-invalidation)."""
    lessons = _load_lessons(args.repo, args.loop)
    lessons.append({
        "text": args.text,
        "source": args.source,
        "asserted_on": L.utcnow(),
        "revalidate_by": L.days_from_now(args.ttl_days),
        "status": "active",
        "origin": "advisory",
    })
    L.atomic_write_json(_lessons_path(args.repo, args.loop), lessons)
    print(f"added lesson (revalidate_by {L.days_from_now(args.ttl_days)[:10]}): {args.text[:70]}")


def cmd_lesson_sweep(args):
    """Mark expired lessons stale and report the count. Stale lessons are
    excluded from the maker's context at loop start."""
    lessons = _load_lessons(args.repo, args.loop)
    now = L.parse_iso(L.utcnow())
    stale = 0
    for l in lessons:
        rb = L.parse_iso(l.get("revalidate_by"))
        if l.get("status") == "active" and rb and rb < now:
            l["status"] = "stale"
            stale += 1
    L.atomic_write_json(_lessons_path(args.repo, args.loop), lessons)
    active = sum(1 for l in lessons if l.get("status") == "active")
    print(f"swept: {stale} now stale · {active} active · stale_fact_count={stale}")


def cmd_lesson_list(args):
    lessons = _load_lessons(args.repo, args.loop)
    for l in lessons:
        if args.active_only and l.get("status") != "active":
            continue
        print(f"[{l.get('status'):<6}] revalidate_by={l.get('revalidate_by','?')[:10]} "
              f"· {l.get('source','?')} · {l['text'][:70]}")


def _write_state_md(name, loop, repo: Path):
    d = repo / ".loom" / name
    d.mkdir(parents=True, exist_ok=True)
    L.atomic_write_json(d / "state.json", loop)
    runs = loop.get("runs", [])
    last = runs[-1] if runs else {}
    completed = [r for r in runs if r["action"] in ("pr", "merge") and r.get("accepted")]
    escalated = [r for r in runs if r["action"] == "none" and r["gate"] == "fail"]
    md = f"""# Loop state · {name}

## Last run
{last.get('ts','—')} · gate={last.get('gate','—')} · checker={last.get('checker','—')} · action={last.get('action','—')}

## Health
- maturity: {loop.get('maturity')}
- status: {loop.get('status')}
- work_health: accept_rate={loop.get('accept_rate')} · loop_health={loop.get('loop_health','ok')}
- consecutive_failures: {loop.get('consecutive_failures',0)} · consecutive_empty_runs: {loop.get('consecutive_empty_runs',0)}
- unread_loc_debt: {loop.get('unread_loc_debt',0)}

## Completed (accepted) — last {min(len(completed),10)}
""" + ("".join(f"- {r['ts']} · {r.get('pr_url','(no url)')}\n" for r in completed[-10:]) or "- none\n") + f"""
## Escalated to humans
""" + ("".join(f"- {r['ts']} · gate failed\n" for r in escalated[-10:]) or "- none\n") + """
## Lessons learned (write here, not in chat)
<!-- advisory only — never alters gates/scopes/approval (security-model.md §7) -->
"""
    (repo / f"LOOM-{name}.md").write_text(md)


def main():
    p = argparse.ArgumentParser(description="loom per-loop state")
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("record")
    r.add_argument("loop")
    r.add_argument("--repo")
    r.add_argument("--gate", choices=["pass", "fail"], required=True)
    r.add_argument("--checker", choices=["agree", "disagree", "na"], default="na")
    r.add_argument("--action", choices=["shadow", "pr", "merge", "none"], required=True)
    r.add_argument("--accepted")
    r.add_argument("--tokens", type=int, default=0)
    r.add_argument("--cost", type=float, default=0.0)
    r.add_argument("--model", default=None)
    r.add_argument("--files-touched", dest="files_touched", type=int)
    r.add_argument("--diff-similarity", dest="diff_similarity", type=float)
    r.add_argument("--context-fill", dest="context_fill", type=float,
                   help="0-1 fraction of the context window used at completion")
    r.add_argument("--compactions", type=int, default=0,
                   help="how many times the run had to compact (doom-loop pressure)")
    r.add_argument("--net-loc", dest="net_loc", type=int)
    r.add_argument("--pr-url", dest="pr_url")
    r.add_argument("--empty", default="false")
    r.add_argument("--key")
    r.set_defaults(func=cmd_record)

    m = sub.add_parser("metrics"); m.add_argument("loop"); m.set_defaults(func=cmd_metrics)

    i = sub.add_parser("idempotent"); i.add_argument("loop")
    i.add_argument("--key", required=True); i.set_defaults(func=cmd_idempotent)

    db = sub.add_parser("debt"); db.add_argument("loop")
    db.add_argument("--add", type=int, required=True); db.set_defaults(func=cmd_debt)

    la = sub.add_parser("lesson-add"); la.add_argument("loop"); la.add_argument("--repo", default=".")
    la.add_argument("--text", required=True); la.add_argument("--source", default="run")
    la.add_argument("--ttl-days", dest="ttl_days", type=int, default=30); la.set_defaults(func=cmd_lesson_add)
    lsw = sub.add_parser("lesson-sweep"); lsw.add_argument("loop"); lsw.add_argument("--repo", default=".")
    lsw.set_defaults(func=cmd_lesson_sweep)
    ll = sub.add_parser("lesson-list"); ll.add_argument("loop"); ll.add_argument("--repo", default=".")
    ll.add_argument("--active-only", dest="active_only", action="store_true"); ll.set_defaults(func=cmd_lesson_list)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
