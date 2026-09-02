#!/usr/bin/env python3
"""
elon-board: all mechanical work. The model produces structured data; this script
refuses to render a spec that fails any gate, then renders deterministically.

  board.py --spec FILE [--concepts FILE] [--out FILE]   validate + render
  board.py --check-shapes FILE                          divergence contract only
  board.py --scaffold FILE [--root DIR] [--write]       structure from the spec
  board.py --selftest                                   every guard, against fixtures

A guard that does not reject its input is decorative prose.
Stdlib only.
"""
import argparse, hashlib, json, os, sys

GUARDS = ["part_job", "concept_name", "flow_floor", "scale_target",
          "thin_slice", "riskiest_assumption", "shape_divergence", "scaffold_claim"]
EVIDENCE = {"COMPUTED", "DECLARED", "ABSENT"}
MIN_DIVERGENT_AXES = 3
AXES = ["seam", "state", "sync", "value_core", "data_shape", "build_order"]

CODE_WORDS = {
    "manager", "service", "handler", "provider", "controller", "helper", "util",
    "utils", "context", "factory", "builder", "adapter", "wrapper", "component",
    "screen", "store", "hook", "model", "view", "data", "item", "config",
}


def cid(name):
    return "CON-" + hashlib.sha1(name.encode()).hexdigest()[:6]


# --------------------------------------------------------------------- guards
def validate(spec, existing_concepts=None, scaffold=None):
    """Returns (errors, warnings). Any error blocks rendering."""
    errs, warns = [], []
    def err(guard, msg):
        errs.append({"guard": guard, "msg": msg})

    # 4. a system with no declared N cannot answer "will it scale"
    sc = spec.get("scale") or {}
    if not isinstance(sc.get("n"), (int, float)) or not sc.get("unit"):
        err("scale_target", "no declared scale target: scale.n and scale.unit are required")

    # 6. the assumption the whole plan rests on must be stated
    risk = (spec.get("riskiest_assumption") or "").strip()
    if not risk:
        err("riskiest_assumption", "riskiest_assumption is empty; the plan rests on something")

    # 5. the first slice must attack that assumption, and reach a person
    ts = spec.get("thin_slice") or {}
    if not (ts.get("what") or "").strip():
        err("thin_slice", "no thin_slice named")
    else:
        if ts.get("user_visible") is not True:
            err("thin_slice", f"thin_slice is not user-visible: {ts.get('what')!r}. "
                              "A phase is not a slice")
        if risk and (ts.get("kills") or "").strip() != risk:
            err("thin_slice", "thin_slice.kills does not match riskiest_assumption; "
                              "the first slice is sequenced by comfort, not risk")

    # 2. concepts: named from the domain, and never a synonym for an existing one
    existing = {c["canonical"].lower(): c for c in (existing_concepts or [])}
    for c in spec.get("concepts") or []:
        name = (c.get("canonical") or "").strip().lower()
        if not name:
            err("concept_name", "concept with no canonical name")
            continue
        if not (c.get("job") or "").strip():
            err("concept_name", f"concept {name!r} has no job; a noun is not a concept")
        if name in CODE_WORDS:
            err("concept_name", f"concept {name!r} is a code word, not a domain idea")
        if existing and not c.get("reused"):
            # Two checks, because harvest data and hand-written data differ in shape.
            #
            # (a) owned-field overlap catches a synonym when both sides list `owns`.
            for ex_name, ex in existing.items():
                shared = set(c.get("owns") or []) & set(ex.get("owns") or [])
                if ex_name != name and len(shared) >= 2:
                    err("concept_name",
                        f"concept {name!r} duplicates existing {ex_name!r} "
                        f"(shares {sorted(shared)}); reuse the repo's word")
            # (b) detect.py's harvest only yields NAMES, so the overlap check above
            # cannot fire on real harvest output. In an existing repo, a concept the
            # codebase does not already name has to be declared new ON PURPOSE.
            # Drifting into a synonym is the expensive mistake; saying "this is new
            # because ..." costs one line and makes it a decision.
            if name not in existing and not (c.get("new_because") or "").strip():
                err("concept_name",
                    f"concept {name!r} is not in this repo's vocabulary and has no "
                    f"new_because. Either reuse an existing word or declare why this "
                    f"idea is genuinely new")

    # 1. every part states the job it exists to do
    for p in spec.get("parts") or []:
        if not (p.get("job") or "").strip():
            err("part_job", f"part {p.get('name','?')!r} has no named job")

    # 3. every flow declares its floor
    for f in spec.get("flows") or []:
        if not isinstance(f.get("floor_steps"), int):
            err("flow_floor", f"flow {f.get('name','?')!r} has no floor_steps")
        elif isinstance(f.get("designed_steps"), int) and f["designed_steps"] > f["floor_steps"]:
            warns.append(f"flow {f.get('name')!r} designed at {f['designed_steps']} "
                         f"steps against a floor of {f['floor_steps']}; needs a reason")

    # floors carry an evidence label or they are bare numbers
    for vec, rows in (spec.get("floors") or {}).items():
        for r in rows or []:
            if r.get("evidence") not in EVIDENCE:
                err("flow_floor", f"{vec} floor has no evidence label "
                                  f"(one of {sorted(EVIDENCE)})")

    # 8. the scaffold may not contain a file no part claims
    if scaffold:
        claimed = {p.get("name") for p in (spec.get("parts") or [])}
        for path in scaffold:
            if path not in claimed:
                err("scaffold_claim", f"scaffold file {path!r} is claimed by no part")

    return errs, warns


def check_shapes(shapes):
    """7. any two shapes differ on >= MIN_DIVERGENT_AXES declared axes."""
    errs = []
    for i in range(len(shapes)):
        for j in range(i + 1, len(shapes)):
            a, b = shapes[i], shapes[j]
            aa, ba = a.get("axes") or {}, b.get("axes") or {}
            diff = [ax for ax in AXES if aa.get(ax) != ba.get(ax)]
            if len(diff) < MIN_DIVERGENT_AXES:
                errs.append({"guard": "shape_divergence",
                             "msg": f"{a.get('name','?')} and {b.get('name','?')} differ on "
                                    f"{len(diff)} axes ({diff or 'none'}); "
                                    f"{MIN_DIVERGENT_AXES} required. Shades of one idea "
                                    f"are not a choice"})
    return errs


# --------------------------------------------------------------------- render
def render(spec, warns):
    L = []
    a = L.append
    a(f"# {spec.get('job','(no job)')}")
    a("")
    a(f"{spec.get('user','?')}  ·  {spec.get('shape','?')}  ·  {spec.get('mode','?')}")
    a("")
    a("## The riskiest assumption")
    a("")
    a(spec.get("riskiest_assumption", ""))
    a("")
    ts = spec.get("thin_slice") or {}
    a("## The thin slice")
    a("")
    a(f"**{ts.get('what','')}**")
    a("")
    a(f"Kills: {ts.get('kills','')}")
    a(f"Ships in: {ts.get('ships_in','?')}")
    a("")
    a("## Concepts")
    a("")
    for c in spec.get("concepts") or []:
        tag = f"  `reused from {c.get('source')}`" if c.get("reused") else ""
        a(f"- **{c.get('canonical')}** {c.get('job','')}{tag}")
        if c.get("owns"):
            a(f"  owns: {', '.join(c['owns'])}")
    a("")
    a("## Floors")
    a("")
    sc = spec.get("scale") or {}
    a(f"Scale target: **{sc.get('n')} {sc.get('unit')}** by {sc.get('by','?')}")
    a("")
    for vec, rows in (spec.get("floors") or {}).items():
        for r in rows or []:
            bits = [f"`{k}={v}`" for k, v in r.items() if k != "evidence"]
            a(f"- **{vec}** {' '.join(bits)}  `{r.get('evidence')}`")
    a("")
    a("## Parts")
    a("")
    for p in spec.get("parts") or []:
        a(f"- `{p.get('name')}` ({p.get('kind','?')}) {p.get('job','')}")
    a("")
    a("## Flows")
    a("")
    for f in spec.get("flows") or []:
        d = f.get("designed_steps")
        delta = f"  (designed {d}, floor {f.get('floor_steps')})" if d is not None else ""
        a(f"- **{f.get('name')}** facts: {', '.join(f.get('irreducible_facts') or [])}{delta}")
    a("")
    if spec.get("ambition"):
        a("## Ambition")
        a("")
        for x in spec["ambition"]:
            a(f"- {x.get('idea')}")
            a(f"  reachable from: {x.get('reachable_from')}")
            a(f"  replaces: {x.get('replaces')}  ·  probe: {x.get('probe')}")
        a("")
    if spec.get("not_building"):
        a("## Not building")
        a("")
        for x in spec["not_building"]:
            a(f"- **{x.get('what')}**: {x.get('why')}")
        a("")
    if warns:
        a("## Flagged")
        a("")
        for w in warns:
            a(f"- {w}")
    return "\n".join(L)


def scaffold_paths(spec):
    return [p["name"] for p in (spec.get("parts") or []) if p.get("name")]


# ------------------------------------------------------------------- selftest
def selftest():
    def base():
        return {
            "job": "j", "user": "u", "shape": "SHP-1", "mode": "greenfield",
            "riskiest_assumption": "people will log consistently",
            "thin_slice": {"what": "log and see it", "user_visible": True,
                           "kills": "people will log consistently", "ships_in": "one sitting"},
            "scale": {"n": 500, "unit": "spots per user", "by": "12mo"},
            "concepts": [{"canonical": "spot", "job": "a place a hunter returns to",
                          "owns": ["name", "coords"]}],
            "parts": [{"name": "spot/rules.ts", "job": "decides zone from date", "kind": "module"}],
            "flows": [{"name": "log", "irreducible_facts": ["a", "b"], "floor_steps": 2,
                       "designed_steps": 2}],
            "floors": {"shape": [{"change": "add a zone type", "max_files": 2,
                                  "evidence": "DECLARED"}]},
        }
    res = {}

    s = base(); s["parts"][0]["job"] = ""
    res["part_job"] = any(e["guard"] == "part_job" for e in validate(s)[0])

    s = base(); s["concepts"][0]["job"] = ""
    res["concept_name"] = any(e["guard"] == "concept_name" for e in validate(s)[0])
    # and the synonym case
    s = base(); s["concepts"] = [{"canonical": "location", "job": "a place",
                                  "owns": ["name", "coords"]}]
    syn = any("duplicates existing" in e["msg"] for e in
              validate(s, existing_concepts=[{"canonical": "spot",
                                              "owns": ["name", "coords"]}])[0])
    res["concept_name"] = res["concept_name"] and syn

    s = base(); del s["flows"][0]["floor_steps"]
    res["flow_floor"] = any(e["guard"] == "flow_floor" for e in validate(s)[0])

    s = base(); s["scale"] = {}
    res["scale_target"] = any(e["guard"] == "scale_target" for e in validate(s)[0])

    s = base(); s["thin_slice"]["user_visible"] = False
    a = any(e["guard"] == "thin_slice" for e in validate(s)[0])
    s = base(); s["thin_slice"]["kills"] = "something else entirely"
    b = any("sequenced by comfort" in e["msg"] for e in validate(s)[0])
    res["thin_slice"] = a and b

    s = base(); s["riskiest_assumption"] = "  "
    res["riskiest_assumption"] = any(e["guard"] == "riskiest_assumption"
                                     for e in validate(s)[0])

    same = {"seam": "by feature", "state": "client", "sync": "none",
            "value_core": "log", "data_shape": "normalized", "build_order": "thin"}
    near = dict(same); near["sync"] = "poll"
    res["shape_divergence"] = bool(check_shapes([{"name": "A", "axes": same},
                                                 {"name": "B", "axes": near}]))
    far = {"seam": "by layer", "state": "server", "sync": "realtime",
           "value_core": "map", "data_shape": "event log", "build_order": "spine"}
    res["shape_divergence"] = res["shape_divergence"] and not check_shapes(
        [{"name": "A", "axes": same}, {"name": "C", "axes": far}])

    s = base()
    res["scaffold_claim"] = any(e["guard"] == "scaffold_claim" for e in
                                validate(s, scaffold=["spot/rules.ts", "orphan/thing.ts"])[0])

    # a clean spec must pass, or the guards are just noise
    clean_errs, _ = validate(base())
    res["clean_spec_passes"] = not clean_errs

    w = max(len(k) for k in res)
    print("elon-board guard selftest\n")
    for k in GUARDS + ["clean_spec_passes"]:
        print(f"  {k.ljust(w)}  {'PASS' if res.get(k) else 'FAIL'}")
    bad = [k for k, v in res.items() if not v]
    print()
    if bad:
        print(f"FAILED: {', '.join(bad)}")
        return 1
    print(f"all {len(res)} guards reject their input, and a clean spec renders.")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec")
    ap.add_argument("--concepts", help="detect.py --concepts output, for reuse checking")
    ap.add_argument("--check-shapes")
    ap.add_argument("--scaffold")
    ap.add_argument("--root", default=".")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--out")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        return selftest()

    if a.check_shapes:
        shapes = json.load(open(a.check_shapes))
        errs = check_shapes(shapes if isinstance(shapes, list) else shapes.get("shapes", []))
        if errs:
            for e in errs:
                print(f"REJECTED [{e['guard']}] {e['msg']}", file=sys.stderr)
            return 1
        print(f"{len(shapes)} shapes clear the divergence contract "
              f"({MIN_DIVERGENT_AXES}+ axes apart).")
        return 0

    if a.scaffold:
        spec = json.load(open(a.scaffold))
        paths = scaffold_paths(spec)
        errs, _ = validate(spec, scaffold=paths)
        if errs:
            for e in errs:
                print(f"REJECTED [{e['guard']}] {e['msg']}", file=sys.stderr)
            return 1
        for rel in paths:
            full = os.path.join(a.root, rel)
            print(("write " if a.write else "would write ") + full)
            if a.write:
                os.makedirs(os.path.dirname(full), exist_ok=True)
                if not os.path.exists(full):
                    open(full, "w").write("")
        return 0

    if not a.spec:
        ap.error("--spec, --check-shapes, --scaffold or --selftest")

    spec = json.load(open(a.spec))
    existing = None
    if a.concepts:
        existing = json.load(open(a.concepts)).get("concepts")
    errs, warns = validate(spec, existing_concepts=existing)
    if errs:
        print("SPEC REJECTED. A spec that fails a gate is not a spec.\n", file=sys.stderr)
        for e in errs:
            print(f"  [{e['guard']}] {e['msg']}", file=sys.stderr)
        return 1
    out = render(spec, warns)
    target = a.out or ".elon-board/SPEC.md"
    os.makedirs(os.path.dirname(os.path.abspath(target)), exist_ok=True)
    open(target, "w").write(out)
    print(f"wrote {target}  ({len(spec.get('parts') or [])} parts, "
          f"{len(spec.get('concepts') or [])} concepts, {len(warns)} flagged)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
