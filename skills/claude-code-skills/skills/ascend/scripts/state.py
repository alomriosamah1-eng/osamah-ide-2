#!/usr/bin/env python3
"""
state.py — the loop's machine memory. Validates a pass record the model supplies
(JSON), appends it to .ascend/state.json, recomputes the value scores, enforces
citation + verify-tier discipline, and renders the human ledger (.ascend/state.md)
and the final report (ASCEND.md). The model produces structured data; this script
renders deterministically — the /polish aggregate.py pattern.

Usage:
    state.py init   --scope S --loops N --stack T [--root .]
    state.py add-pass PASS.json [--root .]      # validate + append + re-render
    state.py render [--root .]                  # regen state.md + ASCEND.md
    state.py status [--root .]                  # resume hint: passes done / awaiting decision
Stdlib only.
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

STATUSES = {"accepted", "reverted", "adjusted", "pending"}
TIERS = {"ran-in-app", "render-tested", "compiled-only",        # app targets
         "live-fired", "structure-linted", "read-only"}         # prompt-artifact targets
TAGS = {"PRINCIPLE", "VERIFIED"}
PHASES = {"skeleton", "refine", "detail"}
CONFIDENCES = {1.0, 0.8, 0.5}          # verified/observed · recalled/inferred · hypothesis
WEIGHT_CLASSES = {"S": 2, "M": 3, "L": 5}   # per-pass effort budget for chosen items


def adir(root: Path) -> Path:
    return root / ".ascend"


def load(root: Path) -> dict:
    p = adir(root) / "state.json"
    if not p.exists():
        sys.exit("no .ascend/state.json — run `state.py init` first")
    return json.loads(p.read_text())


def save(root: Path, st: dict):
    adir(root).mkdir(exist_ok=True)
    (adir(root) / "state.json").write_text(json.dumps(st, indent=2))


def fail(msg: str):
    sys.exit(f"REJECTED: {msg}")


def validate_pass(rec: dict, st: dict) -> list:
    warns = []
    for k in ("n", "phase", "axis", "status", "capability_added", "gap_closed", "verify"):
        if k not in rec:
            fail(f"pass missing required field: {k}")
    if rec["phase"] not in PHASES:
        fail(f"phase must be one of {PHASES}")
    if rec["status"] not in STATUSES:
        fail(f"status must be one of {STATUSES}")
    # citation discipline
    for ex in rec.get("exemplars", []):
        if ex.get("tag") not in TAGS:
            fail(f"exemplar '{ex.get('name')}' tag must be PRINCIPLE or VERIFIED")
        if ex["tag"] == "VERIFIED" and not ex.get("source"):
            fail(f"exemplar '{ex.get('name')}' is VERIFIED but has no source URL")
    # verify discipline — tier vocabulary is gated by target class (stack), so an app
    # pass can't claim a prompt tier to dodge the compiled-only warning (or vice versa)
    v = rec["verify"]
    prompt_tiers = {"live-fired", "structure-linted", "read-only"}
    allowed = prompt_tiers if st.get("stack") == "prompt-artifact" else TIERS - prompt_tiers
    if v.get("tier") not in allowed:
        fail(f"verify.tier must be one of {sorted(allowed)} for stack {st.get('stack', '?')!r} "
             f"(got {v.get('tier')!r})")
    if v.get("tier") == "compiled-only":
        warns.append(f"pass {rec['n']}: verify tier is COMPILED-ONLY — surface was NOT run; flag this at the gate")
    if v.get("tier") in ("structure-linted", "read-only"):
        warns.append(f"pass {rec['n']}: verify tier is {v['tier'].upper()} — artifact was NOT executed; flag this at the gate")
    # gate signals must use the documented enum; hard fails block the gate, lint warns
    states = {"pass", "fail", "not_run"}
    for g in ("typecheck", "lint", "build", "tests"):
        val = v.get(g)
        if val is not None and val not in states:
            fail(f"verify.{g} must be one of {states} (got {val!r})")
    for g in ("typecheck", "build", "tests"):
        if v.get(g) == "fail":
            fail(f"pass {rec['n']}: {g} FAILED — must not pass the gate until green")
    if v.get("tests") == "not_run":
        warns.append(f"pass {rec['n']}: tests NOT run — regressions unguarded; say so at the gate")
    if v.get("lint") == "fail":
        warns.append(f"pass {rec['n']}: lint is failing — clean it up before the gate")
    if rec.get("reachable") is False:
        fail(f"pass {rec['n']}: new surface is NOT reachable in the IA (orphaned screen)")
    # value math — impact = uv × fit × confidence RANKS; score = impact ÷ effort is the tiebreak.
    # A record is v1.2-aware when ANY modern field appears; modern rules then apply record-wide,
    # so scores can't be inflated by selectively omitting fields. Pure-v1 shapes stay valid (warned).
    bl = rec.get("build_list", [])
    wc = rec.get("weight_class")
    aware = wc is not None or any(("confidence" in b) or ("killed" in b) for b in bl)
    if wc is not None and wc not in WEIGHT_CLASSES:
        fail(f"weight_class must be one of {sorted(WEIGHT_CLASSES)} (got {wc!r})")
    if aware and wc is None:
        fail(f"pass {rec['n']}: v1.2-format record must declare weight_class (S/M/L) — doctrine § Value")
    budget = WEIGHT_CLASSES.get(wc) if wc else None
    for b in bl:
        uv, idf, eff = b.get("user_value"), b.get("identity_fit"), b.get("effort")
        if not all(isinstance(x, int) and 1 <= x <= 5 for x in (uv, idf, eff)):
            fail(f"build item '{b.get('item')}' needs integer user_value/identity_fit/effort in 1..5")
        conf = b.get("confidence")
        if isinstance(conf, bool):
            fail(f"build item '{b.get('item')}' confidence must be a number (1.0/0.8/0.5), not a boolean")
        if conf is None:
            if aware:
                fail(f"build item '{b.get('item')}' missing confidence — a v1.2-format record must score "
                     f"every row; omission is not a free 1.0 (doctrine § Value)")
            conf = 1.0  # pure legacy record: exact v1 arithmetic preserved, but say so
            warns.append(f"pass {rec['n']}: item '{b.get('item')}' has no confidence — scored as legacy (×1.0); "
                         f"new records must justify confidence per doctrine § Value")
        elif conf not in CONFIDENCES:
            fail(f"build item '{b.get('item')}' confidence must be one of 1.0/0.8/0.5 (got {conf!r})")
        killed = b.get("killed")
        if killed is not None and (not isinstance(killed, str) or not killed.strip()):
            fail(f"build item '{b.get('item')}' killed must be a non-empty reason string")
        if killed and b.get("chosen"):
            fail(f"build item '{b.get('item')}' is both killed and chosen — pick one")
        b["impact"] = round(uv * idf * conf, 2)
        b["score"] = round(uv * idf * conf / eff, 2)
    has_verified_exemplar = any(e.get("tag") == "VERIFIED" for e in rec.get("exemplars", []))
    for b in [x for x in bl if x.get("chosen")]:
        if b["user_value"] < 4:
            warns.append(f"pass {rec['n']}: chosen item '{b.get('item')}' has user_value "
                         f"{b['user_value']} < 4 — below the entry bar (see doctrine § Value)")
        if b.get("confidence") == 0.5:
            warns.append(f"pass {rec['n']}: chosen item '{b.get('item')}' is a HYPOTHESIS (confidence 0.5) — "
                         f"verify the need before building, or accept the gamble explicitly at the gate")
        if b.get("confidence") == 1.0 and not has_verified_exemplar:
            warns.append(f"pass {rec['n']}: chosen item '{b.get('item')}' claims confidence 1.0 with no "
                         f"[VERIFIED] exemplar on the pass — legitimate only if directly observed this run; "
                         f"justify at the gate")
        if budget is not None and b["effort"] > budget:
            fail(f"pass {rec['n']}: chosen item '{b.get('item')}' effort {b['effort']} exceeds "
                 f"weight class {wc} budget (≤{budget})")
    chosen = [x for x in bl if x.get("chosen")]
    benched = [x for x in bl if not x.get("chosen") and not x.get("killed")]
    if chosen and benched:
        cmax = max(c["impact"] for c in chosen)
        for x in (x for x in benched if x["impact"] > cmax):
            warns.append(f"pass {rec['n']}: benched item '{x.get('item')}' (impact {x['impact']}) outranks every "
                         f"chosen item — kill it with a reason or justify the bench at the gate")
    # status/baseline coherence
    if rec["status"] == "accepted" and not rec.get("new_baseline"):
        fail(f"accepted pass {rec['n']} must record new_baseline")
    if rec["status"] == "reverted":
        rec["new_baseline"] = None
    return warns


def cmd_init(a):
    root = Path(a.root).resolve()
    st = {
        "version": "1.0.0",
        "scope": a.scope, "loops_planned": max(3, a.loops), "stack": a.stack,
        "goal_locked": False,
        "baseline_capabilities": [],
        "passes": [],
        "still_on_table": [],
        "deferred_redesign": [],
    }
    save(root, st)
    render(root, st)
    print(f"initialized .ascend/state.json (scope={a.scope}, loops={st['loops_planned']}, stack={a.stack})")


def cmd_add_pass(a):
    root = Path(a.root).resolve()
    st = load(root)
    rec = json.loads(Path(a.passfile).read_text())
    warns = validate_pass(rec, st)
    # replace a same-n pending record if present, else append
    st["passes"] = [p for p in st["passes"] if p.get("n") != rec["n"]]
    st["passes"].append(rec)
    st["passes"].sort(key=lambda p: p["n"])
    save(root, st)
    render(root, st)
    print(f"pass {rec['n']} [{rec['status']}] recorded.")
    for w in warns:
        print("  ! " + w)


def cmd_status(a):
    root = Path(a.root).resolve()
    st = load(root)
    done = [p for p in st["passes"] if p["status"] in ("accepted", "reverted")]
    pending = [p for p in st["passes"] if p["status"] in ("pending", "adjusted")]
    print(json.dumps({
        "goal_locked": st["goal_locked"],
        "loops_planned": st["loops_planned"],
        "passes_done": len(done),
        "awaiting_decision": pending[-1]["n"] if pending else None,
        "resume": "apply decision to pending pass" if pending
                  else ("run next pass" if len(done) < st["loops_planned"] else "loop complete -> SYNTH"),
    }, indent=2))


def render(root: Path, st: dict):
    md = [f"# Ascend State", "",
          f"scope: {st['scope']}   loops_planned: {st['loops_planned']}   "
          f"stack: {st['stack']}   goal_locked: {st['goal_locked']}", "",
          "## Baseline (Phase 0 capability surface)"]
    md += [f"- {c}" for c in st["baseline_capabilities"]] or ["- (not yet mapped)"]
    for p in st["passes"]:
        md += ["", f"## Pass {p['n']} — {p['phase'].upper()} — {p['axis']}   [{p['status']}]"]
        md.append(f"added:     {p.get('capability_added','')}")
        ex = "; ".join(f"{e['name']} [{e['tag']}{(': '+e['source']) if e.get('source') else ''}]"
                       for e in p.get("exemplars", []))
        md.append(f"exemplars: {ex or '—'}")
        md.append(f"gap_closed:{p.get('gap_closed','')}")
        v = p.get("verify", {})
        md.append(f"verify:    tier={v.get('tier','?')} typecheck={v.get('typecheck','?')} "
                  f"lint={v.get('lint','?')} build={v.get('build','?')} tests={v.get('tests','?')} "
                  f"reachable={p.get('reachable','?')}")
        md.append(f"decisions: {p.get('decisions','')}")
        killed = [b for b in p.get("build_list", []) if b.get("killed")]
        if killed:
            md.append("graveyard: " + "; ".join(
                f"{b.get('item')} (impact {b.get('impact', '?')}) — {b['killed']}" for b in killed))
        md.append(f"new_baseline: {p.get('new_baseline') or '— (reverted)'}")
        if p.get("shots"):
            md.append(f"shots: {', '.join(p['shots'])}")
    md += ["", "## Still on the table (ranked)"]
    md += [f"- {s}" for s in st["still_on_table"]] or ["- —"]
    md += ["", "## Deferred (redesign — weighed, not built)"]
    md += [f"- {s}" for s in st["deferred_redesign"]] or ["- —"]
    (adir(root)).mkdir(exist_ok=True)
    (adir(root) / "state.md").write_text("\n".join(md) + "\n")

    # ASCEND.md — final report (regenerated each render; authoritative at SYNTH)
    rep = ["# ASCEND — enhancement-build report", "",
           f"Scope: {st['scope']} · Stack: {st['stack']} · Passes: "
           f"{len([p for p in st['passes'] if p['status']=='accepted'])} accepted", ""]
    for p in st["passes"]:
        if p["status"] != "accepted":
            continue
        rep += [f"## Pass {p['n']} — {p['phase']} — {p['axis']}",
                f"**Added:** {p.get('capability_added','')}",
                f"**Gap closed:** {p.get('gap_closed','')}",
                f"**Exemplars:** " + ("; ".join(
                    f"{e['name']} [{e['tag']}]" for e in p.get('exemplars', [])) or '—'),
                ""]
    rep += ["## Still on the table"] + [f"- {s}" for s in st["still_on_table"]]
    rep += ["", "## Deferred (redesign)"] + [f"- {s}" for s in st["deferred_redesign"]]
    rep += ["", "---", "_Built up with `/ascend` → run `/polish` to make it shine._"]
    (root / "ASCEND.md").write_text("\n".join(rep) + "\n")


def cmd_render(a):
    root = Path(a.root).resolve()
    render(root, load(root))
    print("rendered .ascend/state.md and ASCEND.md")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    pi = sub.add_parser("init"); pi.add_argument("--scope", required=True)
    pi.add_argument("--loops", type=int, default=3); pi.add_argument("--stack", default="unknown")
    pi.add_argument("--root", default="."); pi.set_defaults(fn=cmd_init)
    pa = sub.add_parser("add-pass"); pa.add_argument("passfile")
    pa.add_argument("--root", default="."); pa.set_defaults(fn=cmd_add_pass)
    pr = sub.add_parser("render"); pr.add_argument("--root", default="."); pr.set_defaults(fn=cmd_render)
    ps = sub.add_parser("status"); ps.add_argument("--root", default="."); ps.set_defaults(fn=cmd_status)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
