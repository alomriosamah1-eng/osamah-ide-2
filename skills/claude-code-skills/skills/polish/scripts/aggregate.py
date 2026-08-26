#!/usr/bin/env python3
"""
polish aggregate.py — the keystone. Reads per-(desk,slice) findings JSON, VERIFIES
every citation (phantom file:line AND read-proof anchor), dedupes, detects and
resolves cross-desk conflicts, assigns stable content-hash IDs, scores tier (S/A/B)
× class (OBJECTIVE/CONVENTION/TASTE), asserts coverage vs the scan surface-map,
computes apply ordering, renders .polish/POLISH.md, and writes a machine sidecar +
file-hash state ledger for the stateful delta.

Deterministic, stdlib-only.

Usage:
    aggregate.py --findings .polish/findings --root . [--scan .polish/scan.json] \
                 [--state .polish/state.json] [--out .polish/POLISH.md]

Desk findings file (one JSON per desk-slice):
    {
      "desk": "MOTION", "slice": "src-components",
      "covered_files": ["src/components/Button.tsx", ...],
      "findings": [ {
          "file": "src/components/Button.tsx", "line": 42,
          "anchor": "activeOpacity={0.2}",            # verbatim snippet at that line (read-proof)
          "what": "...", "why": "...", "who": "...", "fix": "...",
          "class": "OBJECTIVE|CONVENTION|TASTE",
          "change_type": "press-feedback",            # for dedup/conflict
          "fix_target": "activeOpacity",              # optional; conflict detection
          "flags": ["NEW CODE"],                       # NEW CODE | REQUIRES DEP: x
          "confidence": 0.8, "effort": "low|med|high"
      } ],
      "out_of_scope": [ {"file": "...", "what": "...", "axis": "1 (nav/IA)"} ]
    }
"""
from __future__ import annotations
import argparse, glob, hashlib, json, os, re, sys

CLASS_W = {"OBJECTIVE": 3.0, "CONVENTION": 2.0, "TASTE": 1.0}
EFFORT_W = {"low": 1.0, "med": 1.6, "high": 2.6}
DESK_PREFIX = {"MOTION": "MO", "COPY": "CP", "STATES": "ST", "A11Y": "AY",
               "TYPOGRAPHY": "TY", "CONSISTENCY": "CN", "LAYOUT": "LO",
               "FORMS": "FM", "PERFORMANCE": "PF", "GESTURES": "GS"}
# conflict precedence: lower rank wins the shared fix_target (Copy>all text,
# A11y>all a11y attrs, Consistency>Typography for tokens/values).
DESK_RANK = {"COPY": 0, "A11Y": 1, "CONSISTENCY": 2, "TYPOGRAPHY": 3, "STATES": 4,
             "MOTION": 5, "GESTURES": 6, "PERFORMANCE": 7, "LAYOUT": 8, "FORMS": 9}
REQUIRED = ("file", "line", "what", "why", "who", "fix", "class")


def slug(s: str, n: int = 40) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())[:n]


def file_hash(path: str) -> str:
    try:
        return hashlib.sha1(open(path, "rb").read()).hexdigest()[:12]
    except OSError:
        return ""


def fid(desk: str, relpath: str, what: str) -> str:
    pre = DESK_PREFIX.get(desk.upper(), (desk[:2].upper() if desk else "XX"))
    h = hashlib.sha1(f"{desk}|{relpath}|{slug(what, 80)}".encode()).hexdigest()[:6]
    return f"{pre}-{h}"


def load(findings_dir: str):
    findings, oos, malformed, covered, receipts = [], [], [], set(), {}
    for fp in sorted(glob.glob(os.path.join(findings_dir, "*.json"))):
        try:
            blob = json.load(open(fp))
        except (OSError, json.JSONDecodeError) as e:
            print(f"  ! skipping {fp}: {e}", file=sys.stderr)
            malformed.append({"file": os.path.basename(fp), "reason": str(e)})
            continue
        desk = str(blob.get("desk", "?")).upper()
        for f in blob.get("covered_files", []):
            covered.add(f)
        for path, tok in (blob.get("receipts") or {}).items():
            receipts.setdefault(path, tok)
        for f in blob.get("findings", []):
            f.setdefault("desk", desk)
            f["desk"] = str(f["desk"]).upper()
            missing = [k for k in REQUIRED if not f.get(k) and f.get(k) != 0]
            if missing:
                malformed.append({"file": os.path.basename(fp), "desk": desk,
                                  "what": f.get("what", "?"), "reason": f"missing {missing}"})
                continue
            f.setdefault("confidence", 0.7)
            f.setdefault("effort", "low")
            f.setdefault("flags", [])
            f.setdefault("change_type", slug(f["what"], 30))
            f["class"] = str(f["class"]).upper()
            findings.append(f)
        for o in blob.get("out_of_scope", []):
            oos.append(o)
    return findings, oos, malformed, covered, receipts


def verify(findings, root):
    """Reject phantom file:line and anchors that don't match the real line (read-proof)."""
    kept, rejected = [], []
    for f in findings:
        path = os.path.join(root, f["file"])
        reason = ""
        if not os.path.isfile(path):
            reason = "file not found"
        else:
            try:
                lines = open(path, encoding="utf-8", errors="ignore").read().splitlines()
                ln = int(f["line"])
                if not (1 <= ln <= len(lines)):
                    reason = f"line {ln} out of range (1..{len(lines)})"
                else:
                    anchor = f.get("anchor", "")
                    if not anchor:
                        reason = "no anchor (read-proof required)"
                    else:
                        window = "\n".join(lines[max(0, ln - 3):ln + 2])
                        if slug(anchor, 60) and slug(anchor, 24) not in slug(window, 100000):
                            # normalize loosely: compare stripped, case-insensitive substrings
                            a = re.sub(r"\s+", "", anchor).lower()
                            w = re.sub(r"\s+", "", window).lower()
                            if a[:24] not in w:
                                reason = "anchor does not match cited line"
            except (OSError, ValueError) as e:
                reason = f"read error: {e}"
        if reason:
            f["_reject"] = reason
            rejected.append(f)
        else:
            kept.append(f)
    return kept, rejected


def assign_ids(findings):
    for f in findings:
        f["id"] = fid(f["desk"], f["file"], f["what"])
    return findings


def verify_citations(findings, ns_path):
    """Truth gate: a [DOCUMENTED] WHO may only quote numbers that exist in north-stars.md.
    Misses auto-downgrade to [PRINCIPLE] + flag CITATION-DOWNGRADED — never silently kept."""
    downgrades = []
    try:
        ns = open(ns_path, encoding="utf-8", errors="ignore").read().lower()
    except OSError:
        return downgrades, False
    ns_nums = set(re.findall(r"#[0-9a-f]{3,8}|\d+(?:\.\d+)?", ns))
    for f in findings:
        who = str(f.get("who", ""))
        if "[documented]" not in who.lower():
            continue
        nums = set(re.findall(r"#[0-9a-f]{3,8}|\d+(?:\.\d+)?", who.lower()))
        bad = sorted(nums - ns_nums)
        if bad:
            f["who"] = re.sub(r"\[documented\]", "[PRINCIPLE]", who, flags=re.I) + \
                       " _(auto-downgraded: number not in north-stars.md)_"
            f.setdefault("flags", []).append("CITATION-DOWNGRADED")
            downgrades.append({"id": f.get("id", "?"), "file": f["file"], "bad": bad, "was": who})
    return downgrades, True


def verify_receipts(receipts, claimed, root):
    """Read receipts: a covered_files claim only counts if its receipt matches the file's
    first non-empty line on disk. No receipt / mismatch -> NOT covered (falls into UNSWEPT)."""
    covered, unreceipted = set(), []
    for path in sorted(claimed):
        tok = receipts.get(path)
        if not tok:
            unreceipted.append((path, "no receipt"))
            continue
        try:
            first = next((l for l in open(os.path.join(root, path), encoding="utf-8",
                                          errors="ignore") if l.strip()), "")
        except OSError:
            unreceipted.append((path, "unreadable on disk"))
            continue
        a = re.sub(r"\s+", "", str(tok)).lower()[:24]
        b = re.sub(r"\s+", "", first).lower()
        if not a:
            unreceipted.append((path, "no receipt"))
        elif len(a) < 16:
            # a short receipt only counts when the file's first line is itself short AND matches exactly
            if len(b) < 16 and a == b:
                covered.add(path)
            else:
                unreceipted.append((path, "receipt too short"))
        elif a in b[:len(a) + 8]:
            covered.add(path)
        else:
            unreceipted.append((path, "receipt does not match first line"))
    return covered, unreceipted


def dedupe(findings):
    """Merge findings sharing (file, line, change_type)."""
    by_key = {}
    for f in sorted(findings, key=lambda x: (x["file"], int(x["line"]), x["change_type"], DESK_RANK.get(x["desk"], 99))):
        key = (f["file"], int(f["line"]), f["change_type"])
        if key in by_key:
            cur = by_key[key]
            cur["desks"] = sorted(set(cur.get("desks", [cur["desk"]]) + [f["desk"]]))
            if len(f.get("why", "")) > len(cur.get("why", "")):
                cur["why"] = f["why"]
            if len(f.get("who", "")) > len(cur.get("who", "")):
                cur["who"] = f["who"]
            cur["confidence"] = max(float(cur["confidence"]), float(f["confidence"]))
            cur["flags"] = sorted(set(cur.get("flags", []) + f.get("flags", [])))
        else:
            f["desks"] = [f["desk"]]
            by_key[key] = dict(f)
    return list(by_key.values())


def find_conflicts(findings):
    """Same (file,line) + same fix_target + different fix => conflict. Lowest DESK_RANK wins;
    losers become pick-only and are listed in the Conflicts section."""
    conflicts = []
    groups = {}
    for f in findings:
        tgt = f.get("fix_target")
        if not tgt:
            continue
        groups.setdefault((f["file"], int(f["line"]), tgt), []).append(f)
    for (file, line, tgt), grp in groups.items():
        fixes = {slug(x["fix"], 120) for x in grp}
        if len(grp) > 1 and len(fixes) > 1:
            grp_sorted = sorted(grp, key=lambda x: DESK_RANK.get(x["desk"], 99))
            winner = grp_sorted[0]
            losers = grp_sorted[1:]
            for l in losers:
                l["_conflicted"] = winner["id"]
                l.setdefault("flags", []).append("CONFLICT")
            conflicts.append({"file": file, "line": line, "target": tgt,
                              "winner": winner["id"], "winner_desk": winner["desk"],
                              "losers": [(x["id"], x["desk"]) for x in losers]})
    return conflicts


def score(f) -> str:
    s = CLASS_W.get(f["class"], 1.0) * max(0.5, float(f["confidence"]))
    flags = " ".join(f.get("flags", []))
    eff = f.get("effort", "low")
    if "NEW CODE" in flags or "REQUIRES DEP" in flags:
        eff = "high" if eff == "low" else eff
    s = s / EFFORT_W.get(eff, 1.0)
    return "S" if s >= 2.2 else ("A" if s >= 1.2 else "B")


def is_minor(f) -> bool:
    return float(f["confidence"]) < 0.6


def pick_only(f) -> bool:
    fl = " ".join(f.get("flags", []))
    return f["class"] == "TASTE" or "NEW CODE" in fl or "REQUIRES DEP" in fl or "CONFLICT" in fl


def apply_order(findings):
    """NEW CODE primitives first (others may depend on them), then by file/line.
    Excludes pick-only items from the bulk order (they apply only when picked)."""
    bulk = [f for f in findings if not pick_only(f)]
    newcode = [f for f in findings if "NEW CODE" in " ".join(f.get("flags", []))]
    order = [f["id"] for f in sorted(newcode, key=lambda x: (x["file"], int(x["line"])))]
    for f in sorted(bulk, key=lambda x: (x["file"], int(x["line"]))):
        if f["id"] not in order:
            order.append(f["id"])
    return order


def render(ctx, by_desk, conflicts, oos, rejected, malformed, unswept, applied, extra):
    L = []
    proj, stack = ctx["project"], ctx["stack"]
    totals = ctx["class_totals"]
    n = ctx["n"]
    L.append(f"# Polish Report — {proj}")
    L.append(f"_Generated by `/polish` · {stack} · {ctx['ui_files']} files · {ctx['ui_loc']} LOC · "
             f"{n} findings ({totals['OBJECTIVE']} objective · {totals['CONVENTION']} convention · "
             f"{totals['TASTE']} taste) · 0 hidden_\n")
    L.append("> Polish, not redesign. Check a box and `/polish` will apply + verify it; re-running continues "
             "unchecked items.\n> Tiers (S/A/B) order the work; class shows defensibility. "
             "`[NEW CODE]`/`[REQUIRES DEP]`/`TASTE`/`CONFLICT` are **pick-only** (never bulk-applied).\n")
    if extra.get("coverage_unknown"):
        L.append("> ⚠ **COVERAGE UNKNOWN** — no scan surface map was supplied (`--scan`); the UNSWEPT assertion "
                 "was skipped. Run `scan.py --json` and re-aggregate before trusting completeness.\n")
    if extra.get("ns_missing"):
        L.append("> ⚠ **CITATION NUMBER GATE SKIPPED** — north-stars.md not found; [DOCUMENTED] numbers were NOT "
                 "verified this run.\n")

    # summary line (pipeline arrows + class split)
    seg = []
    for desk, items in by_desk:
        c = {"OBJECTIVE": 0, "CONVENTION": 0, "TASTE": 0}
        for f in items:
            c[f["class"]] = c.get(f["class"], 0) + 1
        seg.append(f"{desk.title()} {len(items)} ({c['OBJECTIVE']} obj · {c['CONVENTION']} conv · {c['TASTE']} taste)")
    L.append("## Summary")
    L.append(" → ".join(seg) + f"  =  {n} findings (0 cut)\n")
    wins = sorted([f for d, items in by_desk for f in items
                   if score(f) == "S" and f["class"] in ("OBJECTIVE", "CONVENTION")],
                  key=lambda x: x["file"])[:5]
    if wins:
        L.append("★ Signature wins: " + " · ".join(f"{w['id']} {slug(w['what'], 50)}" for w in wins) + "\n")

    for desk, items in by_desk:
        major = [f for f in items if not is_minor(f)]
        minor = [f for f in items if is_minor(f)]
        L.append(f"\n## {desk.title()}  ({len(items)})")
        for f in sorted(major, key=lambda x: ("SAB".index(score(x)), x["file"], int(x["line"]))):
            L.append(render_one(f, applied))
        if minor:
            L.append(f"\n<details><summary>Minor / low-confidence ({len(minor)})</summary>\n")
            for f in sorted(minor, key=lambda x: (x["file"], int(x["line"]))):
                L.append(render_one(f, applied))
            L.append("\n</details>")

    if conflicts:
        L.append(f"\n## Conflicts ({len(conflicts)}) — pick-only, both shown")
        for c in conflicts:
            losers = ", ".join(f"{i} ({d})" for i, d in c["losers"])
            L.append(f"- `{c['file']}:{c['line']}` target `{c['target']}` — "
                     f"**winner {c['winner']} ({c['winner_desk']})** vs {losers}")
    if oos:
        L.append(f"\n## OUT OF SCOPE (redesign) ({len(oos)}) — considered, deliberately excluded")
        for o in oos:
            L.append(f"- `{o.get('file', '?')}` — {o.get('what', '?')}  _(Axis {o.get('axis', '?')})_")
    if extra.get("downgrades"):
        dg = extra["downgrades"]
        L.append(f"\n## Citation downgrades ({len(dg)}) — [DOCUMENTED] number not in north-stars.md → [PRINCIPLE]")
        for d in dg[:30]:
            L.append(f"- **{d['id']}** `{d['file']}` — unblessed number(s): {', '.join(d['bad'])}")
    if rejected:
        L.append(f"\n## Rejected (phantom citation / no read-proof) ({len(rejected)})")
        for f in rejected[:30]:
            L.append(f"- ~~`{f['file']}:{f.get('line', '?')}`~~ ({f['desk']}) — {f.get('_reject', '?')}")
    if extra.get("declined"):
        di = extra["declined"]
        dmap = extra.get("declined_map", {})
        L.append(f"\n<details><summary>Previously declined — the graveyard ({len(di)}; not re-proposed)</summary>\n")
        for f in di:
            reason = dmap.get(f["id"]) or "declined in a prior run"
            L.append(f"- ~~**{f['id']}**~~ `{f['file']}:{f['line']}` — {f['what']}  _({reason})_")
        L.append("\n</details>")
    if unswept:
        L.append(f"\n## UNSWEPT ({len(unswept)}) — surface files with no receipt-verified coverage")
        for u in sorted(unswept)[:50]:
            L.append(f"- `{u}`")
    if extra.get("unreceipted"):
        ur = extra["unreceipted"]
        L.append(f"\n## No read receipt ({len(ur)}) — claimed covered, counted UNSWEPT until re-read")
        for path, why in ur[:30]:
            L.append(f"- `{path}` — {why}")
    if malformed:
        L.append(f"\n## Malformed (re-run desk) ({len(malformed)})")
        for m in malformed[:30]:
            L.append(f"- {m.get('file', '?')} ({m.get('desk', '?')}) — {m.get('reason', '?')}")
    return "\n".join(L) + "\n"


def render_one(f, applied) -> str:
    box = "x" if f["id"] in applied else " "
    flags = (" · " + " · ".join(f["flags"])) if f.get("flags") else ""
    desks = "+".join(f.get("desks", [f["desk"]]))
    head = (f"- [{box}] **[{f['id']} · {desks} · {score(f)} · {f['class']}{flags}]** "
            f"`{f['file']}:{f['line']}` — {f['what']}")
    body = [head,
            f"      - WHY:  {f['why']}",
            f"      - WHO:  {f['who']}",
            f"      - FIX:  {f['fix']}",
            f"      - ANCHOR: `{f.get('anchor', '')}`"]
    return "\n".join(body)


def main() -> int:
    ap = argparse.ArgumentParser(description="Aggregate, verify, score, render /polish findings.")
    ap.add_argument("--findings", required=True)
    ap.add_argument("--root", default=".")
    ap.add_argument("--scan", default=None, help="scan.py --json output (for surface map + ctx)")
    ap.add_argument("--state", default=None, help="state.json (applied ids + file hashes)")
    ap.add_argument("--out", default=".polish/POLISH.md")
    ap.add_argument("--north-stars", default=None,
                    help="override path to north-stars.md (default: this skill's references/)")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    scan = {}
    if args.scan and os.path.isfile(args.scan):
        try:
            scan = json.load(open(args.scan))
        except (OSError, json.JSONDecodeError):
            scan = {}
    prior = {}
    if args.state and os.path.isfile(args.state):
        try:
            prior = json.load(open(args.state))
        except (OSError, json.JSONDecodeError):
            prior = {}
    applied = set(prior.get("applied", []))

    findings, oos, malformed, claimed, receipts = load(args.findings)
    findings, rejected = verify(findings, root)
    findings = assign_ids(findings)
    findings = dedupe(findings)
    # truth gate runs AFTER dedupe so a downgrade lands (flagged) on the merged row —
    # never displaced or flag-stripped by the merge
    ns_path = args.north_stars or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "references", "north-stars.md")
    downgrades, ns_found = verify_citations(findings, ns_path)
    if not ns_found:
        print("  ! CITATION NUMBER GATE SKIPPED — north-stars.md not found", file=sys.stderr)

    # graveyard BEFORE conflict detection: buried findings can't win/lose conflicts
    declined_map = prior.get("declined", {})
    if isinstance(declined_map, list):
        declined_map = {i: "" for i in declined_map}
    declined_items = [f for f in findings if f["id"] in declined_map]
    findings = [f for f in findings if f["id"] not in declined_map]
    conflicts = find_conflicts(findings)

    # coverage assertion — receipt-verified, not self-attested
    covered, unreceipted = verify_receipts(receipts, claimed, root)
    surface = set(scan.get("surface_map", []))
    coverage_unknown = not surface
    if coverage_unknown:
        print("  ! COVERAGE UNKNOWN — no scan surface map (--scan); UNSWEPT assertion disabled", file=sys.stderr)
    unswept = sorted(surface - covered) if surface else []

    # group by desk (primary desk = first in merged list)
    desk_map = {}
    for f in findings:
        d = f.get("desks", [f["desk"]])[0]
        desk_map.setdefault(d, []).append(f)
    order = sorted(desk_map.keys(), key=lambda d: DESK_RANK.get(d, 99))
    by_desk = [(d, desk_map[d]) for d in order]

    class_totals = {"OBJECTIVE": 0, "CONVENTION": 0, "TASTE": 0}
    for f in findings:
        class_totals[f["class"]] = class_totals.get(f["class"], 0) + 1

    ctx = {"project": scan.get("project", os.path.basename(root)),
           "stack": scan.get("stack", "unknown"),
           "ui_files": scan.get("ui_files", len(surface)),
           "ui_loc": scan.get("ui_loc", "?"),
           "n": len(findings), "class_totals": class_totals}

    extra = {"downgrades": downgrades, "unreceipted": unreceipted, "declined": declined_items,
             "declined_map": declined_map, "coverage_unknown": coverage_unknown, "ns_missing": not ns_found}
    os.makedirs(os.path.dirname(os.path.join(root, args.out)) or ".", exist_ok=True)
    md = render(ctx, by_desk, conflicts, oos, rejected, malformed, unswept, applied, extra)
    open(os.path.join(root, args.out), "w").write(md)

    # machine sidecar for the apply phase
    index = {"apply_order": apply_order(findings),
             "findings": {f["id"]: {k: f.get(k) for k in
                          ("desk", "desks", "file", "line", "anchor", "what", "fix",
                           "class", "flags", "change_type", "fix_target")}
                          for f in findings},
             "pick_only": [f["id"] for f in findings if pick_only(f)],
             "conflicts": conflicts}
    side = os.path.join(root, os.path.dirname(args.out), "findings.index.json")
    json.dump(index, open(side, "w"), indent=2)

    # state ledger (file hashes for stateful delta) — preserve applied set + graveyard
    state = {"applied": sorted(applied),
             "declined": declined_map,
             "file_hashes": {p: file_hash(os.path.join(root, p)) for p in sorted(surface)}}
    reopened = [p for p, h in (prior.get("file_hashes") or {}).items()
                if file_hash(os.path.join(root, p)) != h]
    if args.state:
        json.dump(state, open(args.state, "w"), indent=2)

    if not args.quiet:
        print(f"findings: {len(findings)}  (obj {class_totals['OBJECTIVE']} · "
              f"conv {class_totals['CONVENTION']} · taste {class_totals['TASTE']})  "
              f"rejected: {len(rejected)}  downgraded: {len(downgrades)}  conflicts: {len(conflicts)}  "
              f"unswept: {len(unswept)}  no-receipt: {len(unreceipted)}  malformed: {len(malformed)}  "
              f"buried: {len(declined_items)}  reopened: {len(reopened)}  → {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
