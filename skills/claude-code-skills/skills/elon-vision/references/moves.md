# Moves

Every finding takes exactly one verdict. Nine exist. Anything that does not fit one of them is not a finding for this skill, it is dispatch.

---

## The nine

| verdict | when | evidence it needs |
|---|---|---|
| `extract` | a concept exists in the product but has no name or home in the code | the scattered sites, and the name the codebase almost uses |
| `merge` | several parts are one thing | their claimed functions, and why they are the same job |
| `split` | one part is several things | the distinct jobs, and who calls each |
| `rename` | the name teaches the wrong mental model | the current name, the surface forms it collides with, the right one |
| `relocate` | the part is correct and lives in the wrong place | current home, proposed home, why the seam is there |
| `recast` | N parts want to be one **different** part | the N, and what the replacement is (it is none of the originals) |
| `invert` | a dependency points the wrong way | the cycle or the layer violation, with both files |
| `delete` | it should not exist | blast radius, and that nothing dynamic reaches it |
| `keep` | already correctly shaped | one sentence on why, so the reader sees what was weighed |

**`extract` is the one people forget.** It runs opposite to a subtraction pass: the fix is to *add* a concept, give the smeared thing a name and a home, and the codebase gets simpler by gaining a part. A pass that can only remove things cannot see this move at all.

**`recast` is the gigacasting move.** Tesla did not delete seventy stamped parts from the rear underbody, they recognized seventy parts was the wrong decomposition and cast one piece. The replacement is not one of the seventy. If your proposed replacement is just the biggest of the existing parts, that is a `merge`, not a `recast`.

**`keep` is a real verdict, not filler.** A report that only condemns is a report nobody trusts. Every part that survives says so in one line.

---

## The churn gate

Reorganization pays nothing visible on the day it lands. It costs merge conflicts, review burden, destroyed git blame, and regression risk.

**Nothing is admitted for being cleaner, better practice, or more correct.**

A finding is admitted only if it carries at least one of:

**A named payoff with counted before and after.**
```json
"payoff": {"change": "adding a zone type", "before": 14, "after": 2}
```
The change must be a thing that will actually happen again, not a hypothetical. `before` and `after` come from the same counting code, never from an assertion. `after` must be less than `before`.

**Or a floor ratio it closes**, labeled `MEASURED` or `COUNTED`. Never `ABSENT`.

> "Zone logic is scattered" is not a finding.
> "You will add zone types again. Fourteen files today, two after." is a finding.

`aggregate.py` rejects anything with neither, and reports the rejection under `churn_gate` so the drop is visible rather than silent.

### Rank by payoff over churn, never payoff alone

A 7x improvement costing 3 files beats a 9x costing 40. The script computes `ratio / churn_files` and orders by it. State `churn` on every finding:

```json
"churn": {"files": 14, "lines": 320}
```

---

## Reversibility

| class | verdicts | apply rule |
|---|---|---|
| mechanical | `rename`, `relocate` | reverts cleanly, one commit each |
| API-changing | `merge`, `split`, `invert` | call sites verified before commit |
| one-way | `recast`, `delete`, anything touching persisted data or user-visible structure | **never auto-applied**, proposal only |

### One-way doors need a migration story

Any finding where `verdict` is `recast` or `invert`, or where `touches_data` or `user_visible` is true, must carry:

```json
"migration": "existing rows keep working because ... ; a one-time backfill does ..."
```

A recast that changes a persisted shape without saying how existing user data gets there is a wish, not a plan. `aggregate.py` holds it back.

---

## Held back, not dropped

Four things pull a finding out of the report even when it is correct:

- it lands on a **no-go** surface from the lock
- it touches a file carrying **live work** in another worktree or unmerged branch
- it was **declined** on a previous run
- it **conflicts** with another move on the same target, in which case both surface as one choice

None of these are deletions. They all appear in the held-back section with their reason, because a silent drop is indistinguishable from a miss.

---

## The smallest first step

The headline move carries one extra field:

```json
"first_step": "pull the four zone predicates into src/zone/rules.ts and leave callers alone"
```

It must ship on its own, be independently valuable, and make the rest cheaper. A recommendation that can only be done in one heroic sitting gets admired, not executed.

---

## Finding schema

```json
{
  "lens": "shape",
  "verdict": "extract",
  "bom": "BOM-a1b2c3",
  "concept": "CON-d4e5f6",
  "file": "src/screens/SeasonZone.tsx",
  "line": 88,
  "anchor": "const zoneForDate = (d: Date)",
  "what": "zone rules live in 14 files with no home",
  "payoff": {"change": "adding a zone type", "before": 14, "after": 2},
  "floor": {"vector": "shape", "actual": 14, "floor": 2, "ratio": 7.0, "evidence": "COUNTED"},
  "churn": {"files": 14, "lines": 320},
  "targets": ["src/screens/SeasonZone.tsx", "src/lib/zones.ts"],
  "touches_data": false,
  "user_visible": false,
  "migration": null,
  "first_step": "...",
  "heuristic": "best part is no part"
}
```

Do not set `id`. The script computes it from a content hash so the same finding keeps the same id across runs, which is what makes the declined ledger work.

`heuristic` is optional and must appear in the fixed list in `persona.md`. Anything else gets dropped from the finding rather than dropping the finding, and the drop is counted.
