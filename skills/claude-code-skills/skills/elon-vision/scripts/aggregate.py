#!/usr/bin/env python3
"""
elon-vision: all mechanical work. The model produces structured data; this
script verifies it, enforces every gate, ranks it, and renders deterministically.

  aggregate.py --run DIR [--out FILE]     verify + render a real run
  aggregate.py --selftest                 exercise all ten guards against fixtures

DIR is a .elon-vision/<run-id>/ directory containing scan.json, lock.json,
bom.json and findings/*.json.

Stdlib only. No install step.
"""
import argparse, hashlib, json, os, re, sys

VERDICTS = {"extract", "merge", "split", "rename", "relocate",
            "recast", "invert", "delete", "keep"}
ONE_WAY = {"recast", "invert"}            # plus anything touching data/public API
EVIDENCE = {"MEASURED", "COUNTED", "ABSENT"}
TRIPWIRE_FRACTION = 1.0 / 3.0

# Guard names, used by the report and the selftest so the two cannot drift.
GUARDS = ["churn_gate", "anchor", "coverage", "tripwire", "absent",
          "no_go", "collision", "citation", "declined", "conflict"]


# ---------------------------------------------------------------- utilities
def fid(f):
    key = f"{f.get('lens')}|{f.get('file')}|{f.get('verdict')}|{f.get('what','')[:60]}"
    return "EV-" + hashlib.sha1(key.encode()).hexdigest()[:6]


def line_at(root, rel, lineno):
    try:
        with open(os.path.join(root, rel), "r", errors="replace") as fh:
            for i, line in enumerate(fh, 1):
                if i == lineno:
                    return line.strip()
    except Exception:
        return None
    return None


def norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip()


def citable_heuristics(skill_dir):
    """The fixed list lives in persona.md. No file, no citations. Fail safe."""
    p = os.path.join(skill_dir, "references", "persona.md")
    if not os.path.exists(p):
        return set()
    out, inblock = set(), False
    for line in open(p, errors="replace"):
        if line.strip().startswith("## Citable"):
            inblock = True
            continue
        if inblock and line.startswith("## "):
            break
        m = re.match(r"\s*-\s+`([^`]+)`", line)
        if inblock and m:
            out.add(norm(m.group(1)).lower())
    return out


# ------------------------------------------------------------------- guards
def verify(bundle, root, skill_dir):
    """Returns (kept, dropped, report_meta). Every rejection carries a reason."""
    findings = bundle["findings"]
    lock = bundle.get("lock") or {}
    scan = bundle.get("scan") or {}
    bom = bundle.get("bom") or {}
    declined = set(bundle.get("declined") or [])

    kept, dropped = [], []
    counts = {g: 0 for g in GUARDS}

    def drop(f, guard, why):
        counts[guard] += 1
        dropped.append({"id": f.get("id"), "guard": guard, "reason": why,
                        "file": f.get("file"), "what": f.get("what")})

    # --- coverage: computed first; a failure here blocks rendering entirely
    manifest = {x["path"] for x in scan.get("files", [])}
    covered, receipts = set(), {}
    for slice_out in bundle.get("slice_outputs", []):
        covered |= set(slice_out.get("covered_files", []))
        receipts.update(slice_out.get("receipts", {}))

    unproven = set()
    for rel, claimed in receipts.items():
        real = line_at(root, rel, 1)
        if real is None or norm(real) != norm(claimed):
            unproven.add(rel)                 # claimed but the receipt does not match disk

    claimed_by_bom = set()
    for l in bom.get("lines", []):
        claimed_by_bom |= set(l.get("files", []))

    coverage = {
        "UNSWEPT": sorted((manifest - covered) | (unproven & manifest)),
        "UNCLAIMED": sorted(manifest - claimed_by_bom) if bom.get("lines") else [],
        "UNLOCATED": sorted(c.get("canonical", "?") for c in bom.get("concepts", [])
                            if not c.get("files")),
    }

    no_go = [re.compile(_glob(p["path"])) for p in lock.get("no_go", [])]
    hi_conflict = set((scan.get("collisions") or {}).get("files", {}).keys())
    citable = citable_heuristics(skill_dir)

    for f in findings:
        f.setdefault("id", fid(f))

        if f.get("verdict") not in VERDICTS:
            drop(f, "churn_gate", f"unknown verdict {f.get('verdict')!r}")
            continue

        # 9. declined ledger: a rejected move never comes back
        if f["id"] in declined:
            drop(f, "declined", "declined on a previous run")
            continue

        # 2. anchor: cite only lines you actually opened
        if f.get("verdict") != "keep":
            real = line_at(root, f.get("file", ""), f.get("line", -1))
            if real is None:
                drop(f, "anchor", f"{f.get('file')}:{f.get('line')} does not exist")
                continue
            if norm(f.get("anchor")) not in norm(real):
                drop(f, "anchor", f"anchor does not match {f.get('file')}:{f.get('line')}")
                continue

        # 5. ABSENT: never let an unmeasurable number print as a value
        fl = f.get("floor") or {}
        if fl:
            ev = fl.get("evidence")
            if ev not in EVIDENCE:
                drop(f, "absent", f"evidence must be one of {sorted(EVIDENCE)}, got {ev!r}")
                continue
            if ev == "ABSENT" and fl.get("ratio") is not None:
                drop(f, "absent", "ABSENT floor carried a ratio; a value was inferred")
                continue

        # 1. churn gate: nothing ships for being cleaner
        if f.get("verdict") != "keep":
            p = f.get("payoff") or {}
            has_change = bool(p.get("change"))
            has_counts = isinstance(p.get("before"), (int, float)) and \
                         isinstance(p.get("after"), (int, float))
            closes_floor = bool(fl.get("ratio")) and fl.get("evidence") in ("MEASURED", "COUNTED")
            if not ((has_change and has_counts) or closes_floor):
                drop(f, "churn_gate",
                     "no named future change with counted before/after, and no floor ratio closed")
                continue
            if has_counts and p["after"] >= p["before"]:
                drop(f, "churn_gate",
                     f"payoff does not improve: {p['before']} -> {p['after']}")
                continue

        # migration story for one-way doors
        risky = f.get("verdict") in ONE_WAY or f.get("touches_data") or f.get("user_visible")
        if risky and not f.get("migration"):
            drop(f, "churn_gate", "one-way door with no migration story")
            continue

        targets = f.get("targets") or ([f.get("file")] if f.get("file") else [])

        # 6. no-go: sacred surfaces win over any ratio
        hit = next((t for t in targets for rx in no_go if rx.match(t)), None)
        if hit:
            drop(f, "no_go", f"{hit} is on the no-go list")
            continue

        # 7. collision: live work elsewhere
        hit = next((t for t in targets if t in hi_conflict), None)
        if hit:
            drop(f, "collision", f"{hit} carries live work in another worktree or branch")
            continue

        # 8. citation: only heuristics on the fixed list
        h = norm(f.get("heuristic")).lower()
        if h and h not in citable:
            counts["citation"] += 1
            f["heuristic_dropped"] = f.get("heuristic")
            f["heuristic"] = None

        kept.append(f)

    # 10. conflict: incompatible moves on a shared target become one choice
    by_target = {}
    for f in kept:
        for t in (f.get("targets") or [f.get("file")]):
            by_target.setdefault(t, []).append(f)
    conflicts = []
    for t, group in by_target.items():
        verdicts = {g["verdict"] for g in group if g["verdict"] != "keep"}
        if len(group) > 1 and len(verdicts) > 1:
            ids = sorted(g["id"] for g in group)
            if not any(c["ids"] == ids for c in conflicts):
                conflicts.append({"target": t, "ids": ids,
                                  "verdicts": sorted(verdicts)})
                counts["conflict"] += 1
    conflicted = {i for c in conflicts for i in c["ids"]}
    for f in kept:
        if f["id"] in conflicted:
            f["conflicted"] = True

    # 4. tripwire: past a third of the tree, the honest output is a rewrite case
    total_files = max(1, len(manifest))
    churn_files = set()
    for f in kept:
        churn_files |= set(f.get("targets") or [f.get("file")])
    churn_fraction = len(churn_files) / total_files
    tripwire = churn_fraction > TRIPWIRE_FRACTION
    if tripwire:
        counts["tripwire"] = 1

    return kept, dropped, {
        "coverage": coverage,
        "coverage_clean": not any(coverage.values()),
        "conflicts": conflicts,
        "tripwire": tripwire,
        "churn_fraction": round(churn_fraction, 3),
        "churn_files": len(churn_files),
        "total_files": total_files,
        "guard_counts": counts,
    }


def _glob(pat):
    """Minimal glob to regex. * within a segment, ** across segments."""
    out, i = "", 0
    while i < len(pat):
        if pat.startswith("**", i):
            out += ".*"; i += 2
        elif pat[i] == "*":
            out += "[^/]*"; i += 1
        elif pat[i] in ".+()[]{}^$|\\":
            out += "\\" + pat[i]; i += 1
        else:
            out += pat[i]; i += 1
    return "^" + out + "$"


# ------------------------------------------------------------------- render
def rank(f):
    fl = f.get("floor") or {}
    r = fl.get("ratio") or 0
    churn = max(1, (f.get("churn") or {}).get("files", 1))
    p = f.get("payoff") or {}
    if not r and isinstance(p.get("before"), (int, float)) and p.get("after") is not None:
        r = p["before"] / max(1, p["after"])
    return -(r / churn), -r


def render(kept, dropped, meta, bundle):
    L = []
    add = L.append
    scan = bundle.get("scan") or {}
    lock = bundle.get("lock") or {}

    add("# elon-vision")
    add("")
    add(f"`{scan.get('root','?')}`  ·  profile `{scan.get('profile','?')}`  ·  "
        f"{scan.get('total_files',0):,} files  ·  {scan.get('total_loc',0):,} lines")
    add("")

    if not meta["coverage_clean"]:
        add("## COVERAGE NOT PROVEN")
        add("")
        add("This report does not render findings. Coverage is proven, never claimed, "
            "and a silent gap is indistinguishable from a clean bill of health.")
        add("")
        for k, v in meta["coverage"].items():
            if v:
                add(f"- `{k}`: {len(v)} entries, first few: {', '.join(v[:5])}")
        add("")
        add("Dispatch a sweeper for the remainder and re-assert before proceeding.")
        return "\n".join(L)

    if meta["tripwire"]:
        add("## REWRITE CASE")
        add("")
        add(f"Proposed churn touches {meta['churn_files']} of {meta['total_files']} files "
            f"({meta['churn_fraction']:.0%}), past the one-third tripwire.")
        add("")
        add("The honest output here is an argument about rebuilding, not a list of "
            "refactor tickets. A pile of moves that each pay for themselves is a "
            "different animal from one restructure that only pays in aggregate.")
        add("")

    ordered = sorted(kept, key=rank)
    headline = next((f for f in ordered if f.get("verdict") != "keep"), None)

    if headline:
        fl = headline.get("floor") or {}
        add("## The number")
        add("")
        if fl.get("ratio"):
            add(f"**{fl['ratio']:.1f}x off the floor** on `{fl.get('vector','?')}`: "
                f"{fl.get('actual','?')} against a floor of {fl.get('floor','?')}. "
                f"`{fl.get('evidence')}`")
        else:
            p = headline.get("payoff") or {}
            add(f"**{p.get('before','?')} files today, {p.get('after','?')} after** "
                f"for: {p.get('change','?')}")
        add("")
        add("## The move")
        add("")
        add(f"**{headline['verdict'].upper()}**  {headline.get('what','')}")
        add("")
        if headline.get("first_step"):
            add(f"Smallest first step: {headline['first_step']}")
            add("")
        alts = [f for f in ordered if f is not headline and f.get("verdict") != "keep"][:2]
        for i, a in enumerate(alts, 2):
            add(f"{i}. {a['verdict'].upper()} {a.get('what','')}")
        if alts:
            add("")

    add("## Findings")
    add("")
    shown = [f for f in ordered if f.get("verdict") != "keep"]
    for f in shown:
        fl = f.get("floor") or {}
        ratio = f" · {fl['ratio']:.1f}x" if fl.get("ratio") else ""
        ev = f" `{fl.get('evidence')}`" if fl.get("evidence") else ""
        flag = " **CONFLICTED**" if f.get("conflicted") else ""
        add(f"- `[{f['id']}]` **{f['verdict']}** `{f.get('file')}:{f.get('line')}`"
            f"{ratio}{ev}{flag}")
        add(f"  {f.get('what','')}")
        p = f.get("payoff") or {}
        if p.get("change"):
            add(f"  payoff: {p['change']}, {p.get('before')} to {p.get('after')}")
    if not shown:
        add("Nothing survived the gates.")
    add("")

    keeps = [f for f in ordered if f.get("verdict") == "keep"]
    if keeps:
        add(f"## Kept ({len(keeps)})")
        add("")
        for f in keeps:
            add(f"- `{f.get('file')}`: {f.get('what','')}")
        add("")

    if meta["conflicts"]:
        add("## Choices")
        add("")
        for c in meta["conflicts"]:
            add(f"- `{c['target']}`: {' or '.join(c['verdicts'])}  ({', '.join(c['ids'])})")
        add("")

    if dropped:
        add(f"## Held back ({len(dropped)})")
        add("")
        add("A silent drop is indistinguishable from a miss.")
        add("")
        for g in GUARDS:
            rows = [d for d in dropped if d["guard"] == g]
            if rows:
                add(f"**{g}** ({len(rows)})")
                for d in rows[:8]:
                    add(f"- `{d.get('file')}`: {d['reason']}")
                add("")

    add("## Coverage")
    add("")
    add(f"UNSWEPT 0 · UNCLAIMED 0 · UNLOCATED 0. Proven against disk by receipt.")
    if lock.get("inferred"):
        add("")
        add(f"Lock was inferred, not confirmed: {lock['inferred']}")
    return "\n".join(L)


# ----------------------------------------------------------------- selftest
def selftest():
    """Every guard gets an input that must fail. A guard that passes clean is decorative."""
    import tempfile, shutil
    tmp = tempfile.mkdtemp(prefix="ev-selftest-")
    skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        open(os.path.join(tmp, "real.ts"), "w").write("const answer = 42;\nexport {};\n")
        open(os.path.join(tmp, "other.ts"), "w").write("export const x = 1;\n")
        scan = {"root": tmp, "profile": "node", "total_files": 2, "total_loc": 3,
                "files": [{"path": "real.ts", "loc": 2}, {"path": "other.ts", "loc": 1}],
                "collisions": {"files": {"other.ts": ["uncommitted in worktree wt2"]}}}
        lock = {"no_go": [{"path": "db/**", "reason": "applied"}]}
        bom = {"lines": [{"files": ["real.ts", "other.ts"]}],
               "concepts": [{"canonical": "answer", "files": ["real.ts"]}]}
        slice_outputs = [{"covered_files": ["real.ts", "other.ts"],
                          "receipts": {"real.ts": "const answer = 42;",
                                       "other.ts": "export const x = 1;"}}]

        def base(**kw):
            f = {"lens": "shape", "verdict": "relocate", "file": "real.ts", "line": 1,
                 "anchor": "const answer = 42", "what": "move it",
                 "payoff": {"change": "adding a field", "before": 8, "after": 2},
                 "floor": {"vector": "shape", "actual": 8, "floor": 2,
                           "ratio": 4.0, "evidence": "COUNTED"},
                 "churn": {"files": 3}, "targets": ["real.ts"]}
            f.update(kw)
            return f

        cases = [
            ("churn_gate", base(payoff={}, floor={})),
            ("anchor",     base(anchor="this text is not on that line")),
            ("absent",     base(floor={"vector": "speed", "ratio": 9.0, "evidence": "ABSENT"})),
            ("no_go",      base(file="db/x.ts", targets=["db/migrations/001.sql"])),
            ("collision",  base(targets=["other.ts"])),
            ("declined",   base(what="previously declined move")),
            ("citation",   base(heuristic="a quote nobody ever said")),
        ]

        results = {}
        for guard, bad in cases:
            f = dict(bad)
            f["id"] = fid(f)
            declined = [f["id"]] if guard == "declined" else []
            if guard == "no_go":
                f["file"] = "real.ts"           # anchor must still resolve
            kept, dropped, meta = verify(
                {"findings": [f], "lock": lock, "scan": scan, "bom": bom,
                 "slice_outputs": slice_outputs, "declined": declined},
                tmp, skill_dir)
            if guard == "citation":
                # Both directions. A guard that strips everything is not a guard,
                # it is a broken parser, and with no persona.md it would pass here
                # trivially while silently discarding every legitimate citation.
                stripped = bool(kept) and kept[0].get("heuristic") is None \
                           and meta["guard_counts"]["citation"] == 1
                good = base(heuristic="the best part is no part")
                good["id"] = fid(good)
                k2, _, m2 = verify(
                    {"findings": [good], "lock": lock, "scan": scan, "bom": bom,
                     "slice_outputs": slice_outputs, "declined": []},
                    tmp, skill_dir)
                survived = bool(k2) and k2[0].get("heuristic") == "the best part is no part" \
                           and m2["guard_counts"]["citation"] == 0
                ok = stripped and survived
            else:
                ok = any(d["guard"] == guard for d in dropped)
            results[guard] = ok

        # conflict: two incompatible moves on one target become one choice
        a = base(verdict="merge", what="merge it");   a["id"] = fid(a)
        b = base(verdict="split", what="split it");   b["id"] = fid(b)
        _, _, meta = verify({"findings": [a, b], "lock": lock, "scan": scan, "bom": bom,
                             "slice_outputs": slice_outputs}, tmp, skill_dir)
        results["conflict"] = len(meta["conflicts"]) == 1

        # coverage: one unread file must block the whole report
        _, _, meta = verify({"findings": [], "lock": lock, "scan": scan, "bom": bom,
                             "slice_outputs": [{"covered_files": ["real.ts"],
                                                "receipts": {"real.ts": "const answer = 42;"}}]},
                            tmp, skill_dir)
        out = render([], [], meta, {"scan": scan, "lock": lock})
        results["coverage"] = (not meta["coverage_clean"]) and "COVERAGE NOT PROVEN" in out

        # tripwire: churn past a third forces the rewrite verdict.
        # Uses a collision-free scan so the collision guard cannot eat the fixture
        # before the tripwire has anything to measure.
        scan_clean = dict(scan, collisions={"files": {}})
        wide = base(targets=["real.ts", "other.ts"]); wide["id"] = fid(wide)
        kept, _, meta = verify({"findings": [wide], "lock": {}, "scan": scan_clean,
                                "bom": bom, "slice_outputs": slice_outputs},
                               tmp, skill_dir)
        out = render(kept, [], meta, {"scan": scan_clean, "lock": {}})
        results["tripwire"] = meta["tripwire"] and "REWRITE CASE" in out

        # determinism: two runs over unchanged input must be byte-identical
        args = ({"findings": [base(**{})], "lock": lock, "scan": scan, "bom": bom,
                 "slice_outputs": slice_outputs}, tmp, skill_dir)
        r1 = render(*verify(*args)[:2] + (verify(*args)[2],), {"scan": scan, "lock": lock})
        r2 = render(*verify(*args)[:2] + (verify(*args)[2],), {"scan": scan, "lock": lock})
        results["determinism"] = r1 == r2

        width = max(len(k) for k in results)
        print("elon-vision guard selftest\n")
        for k in GUARDS + ["determinism"]:
            v = results.get(k)
            print(f"  {k.ljust(width)}  {'PASS' if v else 'FAIL'}")
        bad = [k for k, v in results.items() if not v]
        print()
        if bad:
            print(f"FAILED: {', '.join(bad)}")
            print("A guard that does not reject its input is decorative.")
            return 1
        print(f"all {len(results)} guards reject their input. Mechanisms are live.")
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", help=".elon-vision/<run-id>/ directory")
    ap.add_argument("--out")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        return selftest()
    if not a.run:
        ap.error("--run DIR or --selftest")

    d = a.run
    def load(name, default):
        p = os.path.join(d, name)
        return json.load(open(p)) if os.path.exists(p) else default

    bundle = {"scan": load("scan.json", {}), "lock": load("lock.json", {}),
              "bom": load("bom.json", {}), "declined": load("declined.json", []),
              "findings": [], "slice_outputs": []}
    fdir = os.path.join(d, "findings")
    if os.path.isdir(fdir):
        for fn in sorted(os.listdir(fdir)):
            if fn.endswith(".json"):
                blob = json.load(open(os.path.join(fdir, fn)))
                bundle["findings"] += blob.get("findings", [])
                bundle["slice_outputs"].append(blob)

    root = bundle["scan"].get("root", ".")
    skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kept, dropped, meta = verify(bundle, root, skill_dir)
    out = render(kept, dropped, meta, bundle)

    target = a.out or os.path.join(d, "VISION.md")
    open(target, "w").write(out)
    print(f"wrote {target}")
    print(f"kept {len(kept)} · held back {len(dropped)} · "
          f"coverage {'clean' if meta['coverage_clean'] else 'NOT PROVEN'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
