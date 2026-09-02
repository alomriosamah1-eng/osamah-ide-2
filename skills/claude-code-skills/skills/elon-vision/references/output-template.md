# Output

Two artifacts, strictly separated. **Agents emit JSON only. `aggregate.py` renders the Markdown.**

The model produces structured data; the script verifies it, enforces every gate, ranks it, and renders deterministically. An agent that writes prose into a findings file has written something the script cannot check.

---

## What each agent returns

One JSON blob per lens per batch, written to `.elon-vision/<run-id>/findings/<lens>-<slice>.json`:

```json
{
  "lens": "shape",
  "slice": "S014",
  "covered_files": ["src/a.ts", "src/b.ts"],
  "receipts": {
    "src/a.ts": "import { useMemo } from 'react';",
    "src/b.ts": "export type Zone = {"
  },
  "findings": [ ... ],
  "out_of_scope": [
    {"file": "src/c.tsx", "why": "micro-interaction", "route": "polish"}
  ]
}
```

`receipts` maps every file in `covered_files` to its **first non-empty line, verbatim**. The script checks each one against disk. A claimed file with no matching receipt counts as unread, not as covered. Coverage is proven, never claimed.

Do **not** set `id`. The script computes it from a content hash, which is what makes the declined ledger work across runs.

Do **not** write `VISION.md`. That is the script's job.

Finding schema is in `moves.md`.

---

## What the script computes

Everything mechanical, so it comes out the same on two runs:

- content-hash ids
- anchor verification against disk
- receipt verification against disk
- the three coverage sets
- all ten guards
- floor ratios and `ratio / churn_files` ranking
- conflict detection on shared targets
- the tripwire
- the rendered report

---

## Report structure

Fixed section order. The script emits it; nothing else writes to it.

```
# elon-vision
<root> · profile · files · lines

## The number          worst floor ratio, with its evidence label
## The move            one action, smallest first step, ranks 2 and 3 in one line
## Findings            ranked by payoff over churn, top N by default
## Kept                what was weighed and left alone, with reasons
## Choices             conflicting moves, surfaced as one decision each
## Held back           by guard, with the reason for each
## Coverage            the three sets, and whether the lock was inferred
## Dispatch            grouped by sibling skill, no diagnosis
## Spend               actual against estimate
```

Two sections replace everything else when they fire:

- **COVERAGE NOT PROVEN** renders alone. No findings at all. A report over unproven coverage is worse than no report, because it reads as a clean bill of health.
- **REWRITE CASE** leads when churn passes a third of the tree, because the honest output there is an argument, not two hundred tickets.

---

## Held back is part of the deliverable

Every guard that fires records what it caught and why, grouped by guard. Four things pull a correct finding out of the report: no-go surfaces, live work in another worktree, a previous decline, and conflicts.

**A silent drop is indistinguishable from a miss.** If the reader cannot see what was weighed and set aside, they cannot tell a thorough pass from a shallow one.

---

## Dispatch

```
## Dispatch
  -> /polish        4 surfaces: SpotDetail, Logs, Settings, Onboarding
  -> /ascend        1 feature: Season Zone has no comparison view
  -> /elon-audit    2 modules: sync/, keychain/
```

A dispatch line names the **part** and the **skill**. It carries no diagnosis. Diagnosing is the sibling's job, and without that rule this skill quietly grows into a mega-pass that reimplements all six.

Nothing auto-runs. Ever.

---

## Rendering rules

- **No em dashes.** Commas, periods, parentheses.
- Every runtime number labeled `MEASURED`, `COUNTED` or `ABSENT`. `ABSENT` never appears in a column beside measured values in a way that implies comparison.
- Ratios to one decimal.
- Findings default to the top by ratio; the full set is one flag away. Total analysis, ranked presentation.
- The voice appears in `## The number`, `## The move` and the ambition slate. Everywhere else is plain.
- Footer states that the voice is an in-character lens and not the real person.

---

## Carrying across runs

| file | holds |
|---|---|
| `floors.json` | ratios by BOM id, so a later run renders the delta |
| `declined.json` | ids the user rejected, never proposed again |
| `bom.json`, `lock.json` | reused on re-run when the tree hash matches |

A second pass that only restates where the project stands is worth much less than one that shows whether it got better or worse.
