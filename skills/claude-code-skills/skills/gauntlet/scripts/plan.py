#!/usr/bin/env python3
"""
gauntlet plan.py — Step 3 (FIX PLAN). Turns the verified punch-list from R7 into a
dependency-ordered, conflict-checked remediation plan that is safe to execute.

This is the leg gauntlet was missing (elon-audit had it, gauntlet didn't): not just
"here are the bugs," but "here is the exact order to fix them so you don't cause more
issues than you solve."

It reuses aggregate.py as the single source of truth for the finding set + scoring
(same load → verify-citations → dedupe → impact pipeline), then:
  1. ORDER     — tier P0→P1→P2, with PROMOTION (a fix that another fix depends on is
                 pulled up to its dependent's tier) and a topological sort by `deps`.
  2. CONFLICT  — any two fixes touching the same file (overlapping lines = louder) are
                 flagged so they are coordinated into ONE edit, never two blind patches.
  3. EMIT      — FIX_PLAN.md (human checklist, each step carries verify + rollback slots
                 for the R8.2 reasoning pass to fill) + .gauntlet/plan.json (for the
                 opt-in executor).

Deterministic, stdlib-only. The reasoning (why-safe / exact diff / verification recipe)
is filled by the Remediation pass; this script builds the skeleton and the ordering.

Usage:
    plan.py --findings .gauntlet/findings/<run> --root . \
            [--goal "payments live"] [--deadline 2026-05-29] \
            [--out FIX_PLAN.md] [--plan-json .gauntlet/plan.json]

Finding schema (see aggregate.py): {file, line, type, severity:P0|P1|P2, confidence,
    blast, critical_path, fix, gate_note, citation, evidence:{type,verdict}, status, id,
    deps:[id,...]}  — `id` and `deps` are optional; missing ids are auto-assigned.
"""
from __future__ import annotations
import argparse, json, os, sys

# Reuse the keystone's pipeline so plan + verdict never disagree about the finding set.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aggregate import (load_findings, verify_citations, dedupe, impact,  # noqa: E402
                       is_unproven, partition_predropped)

TIER_RANK = {"P0": 0, "P1": 1, "P2": 2}
RANK_TIER = {v: k for k, v in TIER_RANK.items()}
OVERLAP_WINDOW = 10  # lines: findings this close in the same file are treated as overlapping


def assign_ids(findings: list[dict]) -> dict[str, dict]:
    """Preserve desk-assigned ids (deps reference them); mint auto ids for the rest."""
    by_id: dict[str, dict] = {}
    auto = 0
    for f in findings:
        fid = str(f.get("id") or "").strip()
        if not fid or fid in by_id:
            auto += 1
            fid = f"auto-{auto:03d}"
        f["id"] = fid
        by_id[fid] = f
    return by_id


def build_edges(by_id: dict[str, dict]) -> tuple[dict[str, set], list[str]]:
    """edge dep -> dependent (dep must be fixed first). Unknown dep ids are warned, skipped."""
    deps_of: dict[str, set] = {fid: set() for fid in by_id}  # fid -> set of prerequisite ids
    warnings: list[str] = []
    for fid, f in by_id.items():
        for dep in f.get("deps", []) or []:
            dep = str(dep).strip()
            if dep == fid:
                continue
            if dep in by_id:
                deps_of[fid].add(dep)
            else:
                warnings.append(f"{fid}: unknown dep '{dep}' (ignored)")
    return deps_of, warnings


def promote(by_id: dict[str, dict], deps_of: dict[str, set]) -> dict[str, int]:
    """Effective tier = min(own tier, tiers of everything that depends on me).
    A prerequisite is never less urgent than the thing it unblocks."""
    eff = {fid: TIER_RANK.get(f.get("severity", "P1"), 1) for fid, f in by_id.items()}
    # propagate urgency backward along edges until fixpoint
    changed = True
    while changed:
        changed = False
        for fid, prereqs in deps_of.items():
            for dep in prereqs:
                if eff[dep] > eff[fid]:
                    eff[dep] = eff[fid]
                    changed = True
    return eff


def toposort(by_id: dict[str, dict], deps_of: dict[str, set], eff: dict[str, int]) -> tuple[list[str], list[str]]:
    """Kahn's algorithm. Ready nodes are ordered by (effective tier, -impact, file, line).
    A dependency cycle is broken (warned) and its members fall back to tier/impact order."""
    warnings: list[str] = []
    indeg = {fid: len(prereqs) for fid, prereqs in deps_of.items()}
    dependents: dict[str, list[str]] = {fid: [] for fid in by_id}
    for fid, prereqs in deps_of.items():
        for dep in prereqs:
            dependents[dep].append(fid)

    def sort_key(fid: str):
        f = by_id[fid]
        return (eff[fid], -impact(f), str(f.get("file", "")), int(f.get("line") or 0))

    order: list[str] = []
    ready = sorted([fid for fid, d in indeg.items() if d == 0], key=sort_key)
    while ready:
        fid = ready.pop(0)
        order.append(fid)
        for dep in dependents[fid]:
            indeg[dep] -= 1
            if indeg[dep] == 0:
                ready.append(dep)
        ready.sort(key=sort_key)

    if len(order) < len(by_id):  # cycle: append the stragglers deterministically
        leftover = sorted([fid for fid in by_id if fid not in order], key=sort_key)
        warnings.append(f"dependency cycle among {len(leftover)} finding(s): "
                        f"{', '.join(leftover)} — ordered by tier/impact instead")
        order.extend(leftover)
    return order, warnings


def conflict_clusters(by_id: dict[str, dict]) -> dict[str, dict]:
    """Group open findings by file. A file with >=2 fixes is a conflict cluster: those edits
    must be coordinated. Mark the louder OVERLAP when two sit within OVERLAP_WINDOW lines."""
    by_file: dict[str, list[str]] = {}
    for fid, f in by_id.items():
        by_file.setdefault(str(f.get("file", "")), []).append(fid)
    clusters: dict[str, dict] = {}
    for path, ids in by_file.items():
        if len(ids) < 2:
            continue
        ids_sorted = sorted(ids, key=lambda i: int(by_id[i].get("line") or 0))
        overlaps = []
        for a in range(len(ids_sorted)):
            for b in range(a + 1, len(ids_sorted)):
                la = int(by_id[ids_sorted[a]].get("line") or 0)
                lb = int(by_id[ids_sorted[b]].get("line") or 0)
                if abs(la - lb) <= OVERLAP_WINDOW:
                    overlaps.append((ids_sorted[a], ids_sorted[b]))
        clusters[path] = {"ids": ids_sorted, "overlaps": overlaps}
    return clusters


def must_run(f: dict) -> bool:
    blob = f"{f.get('fix','')} {f.get('gate_note','')}".upper()
    return "[USER MUST RUN]" in blob or "USER MUST RUN" in blob


def default_verify(f: dict) -> str:
    if f.get("gate_note"):
        return f["gate_note"]
    if f.get("critical_path"):
        return "build + targeted test on this critical path + re-run the Field-Test recipe"
    return "build + test suite passes"


def render_md(order, by_id, eff, clusters, rejected, cycles, dep_warns, goal, deadline) -> str:
    file_of = {fid: str(by_id[fid].get("file", "")) for fid in by_id}
    cluster_of: dict[str, str] = {}
    for path, c in clusters.items():
        for fid in c["ids"]:
            cluster_of[fid] = path

    L: list[str] = []
    L.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    L.append("GAUNTLET — FIX PLAN")
    L.append(f"GOAL: {goal or '—'}   DEADLINE: {deadline or '—'}")
    n_must = sum(1 for fid in order if must_run(by_id[fid]))
    L.append(f"{len(order)} ordered fix(es) · {len(clusters)} conflict cluster(s) · "
             f"{n_must} [USER MUST RUN] · {len(rejected)} finding(s) dropped")
    L.append("Dependency-ordered. Execute top→bottom, tier by tier. Build/test gate after "
             "each tier; commit per tier; stop on any failure.")
    L.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    if not order:
        L.append("No open findings to plan — nothing to fix. (Clean, or run the audit first.)\n")
        return "\n".join(L)

    step = 0
    for rank in (0, 1, 2):
        tier_ids = [fid for fid in order if eff[fid] == rank]
        if not tier_ids:
            continue
        tier = RANK_TIER[rank]
        header = {"P0": "P0 — BLOCKS (fix first, no exceptions)",
                  "P1": "P1 — SHOULD FIX",
                  "P2": "P2 — SUPERCHARGE / PARKED"}[tier]
        L.append(f"\n### {header}")
        for fid in tier_ids:
            f = by_id[fid]
            step += 1
            promoted = "" if TIER_RANK.get(f.get("severity"), 1) == rank else \
                f"  ⬆ promoted from {f.get('severity')} (a {tier} fix depends on it)"
            L.append(f"\n[{step}] {fid}  [{f.get('desk','?')}]  "
                     f"{f.get('file','?')}:{f.get('line','?')}{promoted}")
            L.append(f"     issue:   {f.get('type','?')} — {f.get('fix','(no fix text)')[:300]}")
            prereqs = sorted(by_id[fid].get("deps", []) or [])
            prereqs = [d for d in prereqs if d in by_id]
            if prereqs:
                L.append(f"     after:   {', '.join(prereqs)}  (must be done first)")
            if fid in cluster_of:
                others = [i for i in clusters[cluster_of[fid]]["ids"] if i != fid]
                ov = any(fid in pair for pair in clusters[cluster_of[fid]]["overlaps"])
                tag = "OVERLAP — coordinate as ONE edit" if ov else "shared file — coordinate"
                L.append(f"     ⚠ CONFLICT ({tag}) with: {', '.join(others)}")
            ev = f.get("evidence", {})
            L.append(f"     evidence:{ev.get('verdict','UNPROVEN')} ({ev.get('type','NONE')})"
                     f"{'  ·  critical-path' if f.get('critical_path') else ''}")
            if must_run(f):
                L.append("     ⛔ [USER MUST RUN] — irreversible/real-money/destructive; "
                         "do NOT auto-execute. Predict the result, hand to the user.")
            L.append(f"     verify:  {default_verify(f)}")
            L.append(f"     rollback:revert this tier's commit / restore {f.get('file','?')} from git")

    if clusters:
        L.append("\n\n### CONFLICT CLUSTERS (apply each file's edits together, never blind)")
        for path, c in sorted(clusters.items()):
            ov = "  ⚠ has overlapping lines" if c["overlaps"] else ""
            L.append(f"- {path}: {', '.join(c['ids'])}{ov}")

    notes = []
    if rejected:
        counts: dict[str, int] = {}
        for f in rejected:
            counts[f.get("drop_reason", "?")] = counts.get(f.get("drop_reason", "?"), 0) + 1
        breakdown = ", ".join(f"{n} {r.lower().replace('_', ' ')}"
                              for r, n in sorted(counts.items(), key=lambda kv: -kv[1]))
        notes.append(f"{len(rejected)} finding(s) dropped before planning ({breakdown}) — "
                     f"full trail in .gauntlet/dropped.json.")
    notes += cycles + dep_warns
    if notes:
        L.append("\n\n### NOTES")
        for n in notes:
            L.append(f"- {n}")

    L.append("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    L.append("Each step's why-safe / exact diff / verification recipe is filled by the "
             "Remediation pass (R8.2). [USER MUST RUN] steps are never auto-executed.")
    L.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    return "\n".join(L) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="Build a dependency-ordered, conflict-checked fix plan.")
    ap.add_argument("--findings", required=True, help="dir of desk findings JSON (same as aggregate.py)")
    ap.add_argument("--root", default=".")
    ap.add_argument("--out", default="FIX_PLAN.md")
    ap.add_argument("--plan-json", default=".gauntlet/plan.json")
    ap.add_argument("--goal", default="")
    ap.add_argument("--deadline", default="")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    findings = load_findings(args.findings)
    # A finding a round already killed (R2 downgrade, R4 ruling, R5 DISPROVEN) must never
    # reach the plan — otherwise the fix list schedules work for a bug that isn't there.
    kept, dropped = partition_predropped(findings)
    kept, phantoms = verify_citations(kept, root)
    kept, dupes = dedupe(kept)
    rejected = dropped + phantoms + dupes
    kept = [f for f in kept if f.get("status", "open") == "open"]

    by_id = assign_ids(kept)
    deps_of, dep_warns = build_edges(by_id)
    eff = promote(by_id, deps_of)
    order, cycles = toposort(by_id, deps_of, eff)
    clusters = conflict_clusters(by_id)

    md = render_md(order, by_id, eff, clusters, rejected, cycles, dep_warns,
                   args.goal, args.deadline)
    with open(args.out, "w") as fh:
        fh.write(md)

    plan = {
        "goal": args.goal, "deadline": args.deadline,
        "steps": [
            {
                "step": i + 1, "id": fid, "desk": by_id[fid].get("desk"),
                "file": by_id[fid].get("file"), "line": by_id[fid].get("line"),
                "type": by_id[fid].get("type"), "severity": by_id[fid].get("severity"),
                "effective_tier": RANK_TIER[eff[fid]],
                "promoted": TIER_RANK.get(by_id[fid].get("severity"), 1) != eff[fid],
                "deps": [d for d in (by_id[fid].get("deps") or []) if d in by_id],
                "conflict_with": sorted(
                    i2 for path, c in clusters.items() if fid in c["ids"]
                    for i2 in c["ids"] if i2 != fid),
                "critical_path": bool(by_id[fid].get("critical_path")),
                "user_must_run": must_run(by_id[fid]),
                "fix": by_id[fid].get("fix"),
                "verify": default_verify(by_id[fid]),
                "evidence": by_id[fid].get("evidence", {}),
            }
            for i, fid in enumerate(order)
        ],
        "conflict_clusters": {p: c["ids"] for p, c in clusters.items()},
        "dropped": {"total": len(rejected),
                    "by_reason": {r: sum(1 for f in rejected if f.get("drop_reason") == r)
                                  for r in {f.get("drop_reason", "?") for f in rejected}}},
        "warnings": cycles + dep_warns,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.plan_json)), exist_ok=True)
    with open(args.plan_json, "w") as fh:
        json.dump(plan, fh, indent=2)

    if not args.quiet:
        n_p0 = sum(1 for fid in order if eff[fid] == 0)
        print(f"fix-plan: {len(order)} step(s)  P0:{n_p0}  "
              f"conflicts:{len(clusters)}  must-run:{sum(1 for f in by_id.values() if must_run(f))}  "
              f"dropped:{len(rejected)}  → {args.out}, {args.plan_json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
