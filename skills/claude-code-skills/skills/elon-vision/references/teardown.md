# Teardown

Phase 1. Build the bill of materials and the concept map. Nothing is judged here; this is inventory.

You cannot rebuild what you have not inventoried, and you cannot ask whether a feature should exist when your unit of analysis is an arbitrary fifteen-file batch.

---

## 1. Slicing

`scripts/scan.py` emits slices of 15 files or 2,500 LOC, whichever binds first. Split oversized directories, merge tiny ones.

Spawn one mapper agent per slice. **3 concurrent, sequential between batches.** Each mapper reads 100% of its slice.

---

## 2. The seven axes

Every part of the product lands on exactly one axis. A file can contribute to several BOM lines.

| axis | what goes here |
|---|---|
| `surface` | pages, screens, routes, modals, with their entry paths |
| `feature` | a user-facing capability, traced surface down to data |
| `component` | a reusable UI or logic unit, with its real use count |
| `data` | entities, **individual fields**, tables, persisted keys, cache entries, API response shapes, each with its readers and writers |
| `flow` | an end-to-end path a user can actually take |
| `dependency` | a package, and what actually uses it |
| `process` | a script, build step, CI job, or manual gate |

The `data` axis goes to **field** granularity. That is where the findings nobody else produces live: fields nothing reads, shapes fighting their access patterns, values persisted for a feature that shipped differently.

---

## 3. BOM line schema

```json
{
  "id": "BOM-<sha1(axis|key)[:6]>",
  "axis": "surface|feature|component|data|flow|dependency|process",
  "name": "Season Zone Picker",
  "files": ["src/screens/SeasonZone.tsx"],
  "anchor": "verbatim first non-empty line of the primary file",
  "loc": 340,
  "deps": ["date-fns"],
  "claimed_function": "one sentence: what this part is FOR",
  "used_by": ["BOM-a1b2c3"],
  "use_count": 3,
  "entry_paths": ["Tab > Spots > Detail"],
  "concepts": ["zone", "season"],
  "source": {"commit": "abc1234", "author": "...", "date": "2026-03-11", "issue": null},
  "recent": false
}
```

`claimed_function` is one sentence and must describe the job, not the implementation. "Fetches, caches and renders zone rows" is an implementation. "Lets a hunter pick which zone a spot belongs to" is a job. The whole downstream analysis depends on knowing the job.

`recent` is true if any file was touched in the last 30 days. Set from git, not from vibes.

---

## 4. Orphans fall out for free

Before any lens runs, the inventory alone produces findings. Emit these directly:

- a `component` with `use_count: 0`
- a `surface` with no `entry_paths`
- a `data` field with no reader
- a `dependency` nothing imports
- a `feature` with no `surface`
- any BOM line whose `source.issue` is null **and** whose commit is a bulk import

These are the cheapest true findings in the whole pass. They cost one pass over the inventory.

---

## 5. The concept map

**This is the softest step in the pass and everything downstream depends on it. Derive it, never invent it.**

A concept is an idea the product is made of, in the language a user of the domain would use. A hunt. A spot. A zone. A wind reading. Most projects have 8 to 20.

### Derivation, in order

1. **Harvest names from the code.** Type and interface names, class names, table and collection names, route segments, directory names, enum members, and identifiers appearing in 3 or more files.
2. **Count frequency.** How many distinct files does each name appear in.
3. **Cluster synonyms.** `Blind`, `BlindSpot`, `spot`, `hunting_spot` are candidates for one concept. Record every surface form; the drift itself is a finding for the `intuitive` lens.
4. **Drop the infrastructure.** `Provider`, `Manager`, `Helper`, `Utils`, `Context`, `Service`, `Handler` are not concepts, they are code words. A concept survives translation to a non-programmer.
5. **Locate each.** Which files does it live in. That count is **scatter**.
6. **Invert.** For each file or module, how many distinct concepts does it hold. That is **conflation**.

### The rule that keeps this honest

> A concept the codebase does not name is not a concept, it is a guess.

If you believe a concept exists but no identifier, type, table, route or directory names it, that is not a concept for the map. It is an `extract` candidate for the `shape` lens, and it gets reported as one. That distinction is the difference between reading a domain and inventing one.

### Concept schema

```json
{
  "id": "CON-<sha1(canonical)[:6]>",
  "canonical": "spot",
  "surface_forms": ["Blind", "BlindSpot", "spot", "hunting_spot"],
  "files": ["...", "..."],
  "scatter": 14,
  "evidence": ["type BlindSpot at src/types/spot.ts:12", "table hunting_spot at db/schema.sql:88"],
  "confirmed": false
}
```

`evidence` is required. Every concept cites at least two real places its name appears, with file:line. A concept with no evidence does not enter the map.

The shortlist goes to the user in phase 2 for confirmation. `confirmed` flips true there. Everything downstream uses confirmed concepts.

---

## 6. Coverage assertions

Three sets, all must be empty before phase 3.

| set | definition | fix |
|---|---|---|
| `UNSWEPT` | manifest minus the union of all `covered_files[]`, plus any file whose `receipts{}` entry does not match disk | dispatch a sweeper for the remainder, re-assert |
| `UNCLAIMED` | files belonging to no BOM line | dispatch a mapper for those files specifically |
| `UNLOCATED` | confirmed concepts with no `files[]` | re-run harvest scoped to that concept's surface forms |

**Coverage is proven, never claimed.** Each mapper returns `covered_files[]` **and** `receipts{}`, mapping every covered file to its first non-empty line verbatim. `aggregate.py` checks each receipt against disk. A claimed file with no matching receipt counts as unread, not as covered.

A silent gap is indistinguishable from a clean bill of health.

---

## 7. Checkpoint

Write `.elon-vision/<run-id>/phase-1.json` where `run-id` is `sha1(abspath)[:12]`. Record `git rev-parse HEAD` and a working-tree hash alongside it.

Never resume across a changed tree. If either moved, re-run the affected phases. An analysis built on code that has since changed is how you propose restructuring something that no longer looks like that.
