#!/usr/bin/env python3
"""
gauntlet aggregate.py — the keystone. Reads desk findings JSON, VERIFIES every
citation (phantom file:line rejected), dedupes, scores per scoring-rubric.md,
computes delta vs prior run, and writes READINESS.md + updated history.

Usage:
    aggregate.py --findings .gauntlet/findings/<run> --root . \
                 --goal "payments live" --deadline 2026-05-29 \
                 [--history .gauntlet/history.json] [--out READINESS.md]

Finding schema (one JSON file per desk-section, {"desk","section","findings":[...]}):
    {file, line, type, severity:P0|P1|P2, confidence:0.5-1.0, blast:local|section|systemic,
     critical_path:bool, fix, gate_note, citation:"file:line",
     evidence:{type:cited|trace|run|mcp|NONE, verdict:PROVEN|UNPROVEN|DISPROVEN},
     status:open|resolved, id}
"""
from __future__ import annotations
import argparse, glob, hashlib, json, os, sys

SEV_W = {"P0": 40, "P1": 10, "P2": 2}
BLAST = {"local": 1.0, "section": 1.5, "systemic": 2.5}
RISK_W = {"payments": 5, "money": 5, "billing": 5, "data": 5, "auth": 4,
          "security": 4, "core": 3, "infra": 3}

# Every finding that leaves the punch-list leaves a receipt. A silent drop is
# indistinguishable from a miss — the appendix is what makes dedupe auditable.
DROP_REASONS = {
    "PHANTOM_CITATION": "file:line does not exist (citation-verification)",
    "DUPLICATE":        "collapsed into a canonical finding",
    "DOWNGRADED":       "R2 false-positive challenge / R4 cross-exam ruling",
    "DISPROVEN":        "R5 field-test ran it and it did not reproduce",
    "OUT_OF_SCOPE":     "outside the desk's beat or the locked mandate",
}


def file_hash(path: str) -> str:
    try:
        return hashlib.sha1(open(path, "rb").read()).hexdigest()[:12]
    except OSError:
        return ""


def load_findings(findings_dir: str) -> list[dict]:
    out = []
    for fp in sorted(glob.glob(os.path.join(findings_dir, "*.json"))):
        try:
            blob = json.load(open(fp))
        except (OSError, json.JSONDecodeError) as e:
            print(f"  ! skipping {fp}: {e}", file=sys.stderr)
            continue
        desk, section = blob.get("desk", "?"), blob.get("section", "?")
        for f in blob.get("findings", []):
            f.setdefault("desk", desk)
            f.setdefault("section", section)
            f.setdefault("confidence", 0.7)
            f.setdefault("blast", "section")
            f.setdefault("severity", "P1")
            f.setdefault("critical_path", False)
            f.setdefault("status", "open")
            f.setdefault("evidence", {"type": "NONE", "verdict": "UNPROVEN"})
            out.append(f)
    return out


def _drop(f: dict, reason: str, detail: str = "", canonical_id: str | None = None) -> dict:
    """Stamp a finding as dropped and return the audit-trail entry."""
    d = dict(f)
    d["drop_reason"] = reason
    d["drop_detail"] = detail or DROP_REASONS.get(reason, "")
    if canonical_id is not None:
        d["canonical_id"] = canonical_id
    return d


def partition_predropped(findings: list[dict]) -> tuple[list[dict], list[dict]]:
    """Route findings a round already killed (R2 downgrade, R4 ruling, R5 DISPROVEN)
    out of scoring and into the appendix. A desk sets `drop_reason`, or R5 stamps
    evidence.verdict == DISPROVEN."""
    kept, dropped = [], []
    for f in findings:
        reason = f.get("drop_reason")
        if not reason and f.get("evidence", {}).get("verdict") == "DISPROVEN":
            reason = "DISPROVEN"
        if reason in DROP_REASONS:
            dropped.append(_drop(f, reason, f.get("drop_detail", "")))
        else:
            kept.append(f)
    return kept, dropped


def verify_citations(findings: list[dict], root: str) -> tuple[list[dict], list[dict]]:
    """Reject any finding whose file:line does not exist. Doctrine: no phantoms."""
    kept, rejected = [], []
    for f in findings:
        path = os.path.join(root, f.get("file", ""))
        ok = bool(f.get("file")) and os.path.isfile(path)
        if ok and f.get("line"):
            try:
                n = sum(1 for _ in open(path, encoding="utf-8", errors="ignore"))
                ok = 1 <= int(f["line"]) <= n
            except (OSError, ValueError):
                ok = False
        if ok:
            kept.append(f)
        else:
            rejected.append(_drop(f, "PHANTOM_CITATION",
                                  f"cited {f.get('citation', f.get('file', '?'))}"))
    return kept, rejected


def _dupe_rank(f: dict) -> tuple:
    """Strongest report wins the collision: severity, then confidence, then proven-ness.

    First-seen-wins would let a P1 swallow a P0 filed on the same line by another desk —
    the merge still promoted the severity, but the survivor kept the weaker desk's `fix`
    text and id, so the punch-list shipped the wrong remedy for the right bug."""
    return (SEV_W.get(f.get("severity"), 0),
            float(f.get("confidence", 0)),
            0 if is_unproven(f) else 1)


def dedupe(findings: list[dict]) -> tuple[list[dict], list[dict]]:
    """Collapse (file, line, type) collisions. Returns (canonical, dropped-duplicates).

    The survivor is the strongest report (see `_dupe_rank`) and inherits the union of
    desks plus the max severity/confidence — collapsing loses the duplicate row, never
    the signal. Input order is preserved for the surviving findings."""
    groups: dict[tuple, list[dict]] = {}
    order: list[tuple] = []
    for f in findings:
        key = (f.get("file"), f.get("line"), f.get("type"))
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(f)

    canonical: list[dict] = []
    dropped: list[dict] = []
    for key in order:
        rows = groups[key]
        best = max(rows, key=_dupe_rank)
        cur = dict(best)
        for f in rows:
            if f is best:
                continue
            dropped.append(_drop(
                f, "DUPLICATE",
                f"same {f.get('file')}:{f.get('line')} / {f.get('type')} as "
                f"{cur.get('id', '(canonical)')} [{cur.get('desk')}]",
                canonical_id=cur.get("id"),
            ))
            cur["desk"] = ",".join(sorted(set(str(cur["desk"]).split(",") + [str(f["desk"])])))
            # Every field that feeds scoring takes the worst case across the collision.
            # Merging only severity/confidence silently discarded a desk's `systemic`
            # blast or `critical_path` call, under-scoring the surviving finding.
            if SEV_W.get(f["severity"], 0) > SEV_W.get(cur["severity"], 0):
                cur["severity"] = f["severity"]
            cur["confidence"] = max(cur["confidence"], f["confidence"])
            if BLAST.get(f.get("blast"), 0) > BLAST.get(cur.get("blast"), 0):
                cur["blast"] = f["blast"]
            cur["critical_path"] = bool(cur.get("critical_path")) or bool(f.get("critical_path"))
        canonical.append(cur)
    return canonical, dropped


def is_unproven(f: dict) -> bool:
    ev = f.get("evidence", {})
    return ev.get("verdict") != "PROVEN" or ev.get("type", "NONE") == "NONE"


def eff_weight(f: dict) -> int:
    # UNPROVEN on a critical path is scored as a P0-equivalent risk
    if f["critical_path"] and is_unproven(f):
        return SEV_W["P0"]
    return SEV_W.get(f["severity"], 10)


def impact(f: dict) -> float:
    return eff_weight(f) * max(0.5, float(f["confidence"])) * BLAST.get(f["blast"], 1.5)


def score(findings: list[dict]) -> dict:
    sections: dict[str, dict] = {}
    for f in findings:
        if f["status"] != "open":
            continue
        s = sections.setdefault(f["section"], {"impact": 0.0, "p0": 0, "unproven_crit": 0,
                                               "razor": False, "findings": 0})
        s["impact"] += impact(f)
        s["findings"] += 1
        if f["severity"] == "P0":
            s["p0"] += 1
        if f["critical_path"] and is_unproven(f):
            s["unproven_crit"] += 1
        if str(f["desk"]).find("razor") >= 0 or "subtract" in f.get("type", "") or "dead" in f.get("type", ""):
            s["razor"] = True

    for name, s in sections.items():
        readiness = max(0, round(100 - s["impact"]))
        if s["p0"] or s["unproven_crit"]:
            band = "RED"
        elif not s["razor"]:
            band = "YELLOW"  # subtraction not run → cannot certify GREEN
            readiness = min(readiness, 84)
        elif readiness >= 85:
            band = "GREEN"
        elif readiness >= 60:
            band = "YELLOW"
        else:
            band = "RED"
        s["readiness"], s["band"] = readiness, band

    total_p0 = sum(s["p0"] for s in sections.values())
    total_unproven = sum(s["unproven_crit"] for s in sections.values())
    if sections:
        num = sum(s["readiness"] * RISK_W.get(n, 1) for n, s in sections.items())
        den = sum(RISK_W.get(n, 1) for n in sections)
        ship = max(0, round(num / den - 10 * total_unproven))
    else:
        ship = 0
    go = total_p0 == 0 and total_unproven == 0 and ship >= 80
    return {"sections": sections, "p0": total_p0, "unproven_crit": total_unproven,
            "ship_confidence": ship, "go": go}


def delta_line(cur: dict, hist: dict) -> str:
    if not hist:
        return ""
    def d(now, was):
        if was is None:
            return ""
        diff = now - was
        arrow = "▼" if (diff < 0 and now < was) else ("▲" if diff > 0 else "■")
        return f" ({arrow} from {was})"
    return (f"P0: {cur['p0']}{d(cur['p0'], hist.get('p0'))}   "
            f"ship-confidence: {cur['ship_confidence']}%{d(cur['ship_confidence'], hist.get('ship_confidence'))}")


def reopened_green(hist: dict, root: str) -> list[str]:
    out = []
    for g in (hist or {}).get("proven_green", []):
        f = g.get("file")
        if f not in out and file_hash(os.path.join(root, f or "")) != g.get("hash"):
            out.append(f)
    return out


def render(cur, dropped, hist, root, goal, deadline) -> str:
    L = []
    L.append("# READINESS — gauntlet\n")
    L.append(f"**Goal:** {goal or '—'}  **Deadline:** {deadline or '—'}\n")
    verdict = "GO" if cur["go"] else "NO-GO"
    blockers = []
    if cur["p0"]:
        blockers.append(f"{cur['p0']} P0")
    if cur["unproven_crit"]:
        blockers.append(f"{cur['unproven_crit']} UNPROVEN critical path")
    tail = f" — {' + '.join(blockers)} between you and ship." if blockers else ""
    L.append(f"## VERDICT: **{verdict}**  (ship-confidence {cur['ship_confidence']}%){tail}\n")
    dl = delta_line(cur, hist)
    if dl:
        L.append(f"_{dl}_\n")
    ro = reopened_green(hist, root)
    if ro:
        L.append(f"_Re-opened (files changed since proven-green): {', '.join(ro)}_\n")

    L.append("\n## Sections (worst-first)\n")
    for name, s in sorted(cur["sections"].items(), key=lambda kv: kv[1]["readiness"]):
        emoji = {"GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}[s["band"]]
        L.append(f"- {emoji} **§{name}** — {s['readiness']}/100 · "
                 f"{s['p0']} P0 · {s['unproven_crit']} unproven-crit · {s['findings']} findings"
                 f"{'' if s['razor'] else ' · ⚠ subtraction not run'}")
    if dropped:
        by_reason: dict[str, list[dict]] = {}
        for f in dropped:
            by_reason.setdefault(f.get("drop_reason", "?"), []).append(f)
        L.append(f"\n## Dropped findings — audit trail: {len(dropped)}\n")
        L.append("_Raised by a desk, removed before the punch-list. Listed so dedupe and "
                 "downgrades are auditable, not silent. Scan this before trusting a clean run._\n")
        for reason in sorted(by_reason, key=lambda r: -len(by_reason[r])):
            rows = by_reason[reason]
            L.append(f"\n**{reason}** ({len(rows)}) — {DROP_REASONS.get(reason, '')}\n")
            for f in rows[:10]:
                cite = f.get("citation") or f"{f.get('file')}:{f.get('line')}"
                canon = f" → canonical `{f['canonical_id']}`" if f.get("canonical_id") else ""
                L.append(f"- ~~{cite}~~ [{f.get('desk')}/{f.get('type')}] "
                         f"{f.get('severity', '?')} — {f.get('drop_detail', '')}{canon}")
            if len(rows) > 10:
                L.append(f"- _…{len(rows) - 10} more — see `.gauntlet/dropped.json`_")
    L.append("\n_Full punch-list, evidence ledger, and live-test scripts follow in the inline report._\n")
    return "\n".join(L) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="Aggregate, verify, score gauntlet findings.")
    ap.add_argument("--findings", required=True)
    ap.add_argument("--root", default=".")
    ap.add_argument("--history", default=None)
    ap.add_argument("--out", default="READINESS.md")
    ap.add_argument("--goal", default="")
    ap.add_argument("--deadline", default="")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    findings = load_findings(args.findings)
    kept, dropped = partition_predropped(findings)
    kept, phantoms = verify_citations(kept, root)
    kept, dupes = dedupe(kept)
    dropped += phantoms + dupes
    cur = score(kept)
    hist = {}
    if args.history and os.path.isfile(args.history):
        try:
            hist = json.load(open(args.history))
        except (OSError, json.JSONDecodeError):
            hist = {}

    md = render(cur, dropped, hist, root, args.goal, args.deadline)
    open(args.out, "w").write(md)

    # Full trail — READINESS.md caps each reason at 10 rows, this keeps every one.
    if dropped:
        trail = os.path.join(os.path.dirname(os.path.abspath(args.findings)) or ".",
                             "..", "dropped.json")
        trail = os.path.normpath(trail)
        try:
            os.makedirs(os.path.dirname(trail), exist_ok=True)
            json.dump(dropped, open(trail, "w"), indent=2)
        except OSError as e:
            print(f"  ! could not write {trail}: {e}", file=sys.stderr)

    if args.history:
        pg = {f["file"]: file_hash(os.path.join(root, f["file"]))
              for f in kept if not is_unproven(f) and f["severity"] != "P0"}  # one entry per file
        json.dump({"p0": cur["p0"], "ship_confidence": cur["ship_confidence"], "unproven_crit": cur["unproven_crit"],
                   "sections": {n: s["readiness"] for n, s in cur["sections"].items()},
                   "proven_green": [{"file": k, "hash": v} for k, v in pg.items()]},
                  open(args.history, "w"), indent=2)

    if not args.quiet:
        drop_bits = ", ".join(f"{r.lower()}: {sum(1 for f in dropped if f.get('drop_reason') == r)}"
                              for r in DROP_REASONS
                              if any(f.get("drop_reason") == r for f in dropped)) or "none"
        print(f"verdict: {'GO' if cur['go'] else 'NO-GO'}  ship-confidence: {cur['ship_confidence']}%  "
              f"P0: {cur['p0']}  unproven-crit: {cur['unproven_crit']}  "
              f"dropped: {len(dropped)} ({drop_bits})  → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
