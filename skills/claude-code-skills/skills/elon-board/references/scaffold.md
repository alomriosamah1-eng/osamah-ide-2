# Scaffold

Phase 7. Emit the empty structure the spec implies.

The spec is a claim about what the thing will be. The scaffold is what makes that claim binding, because structure is the part that drifts. A spec saying "adding a zone type touches 2 files" and a repo where zone logic is already scattered across six are two different projects, and the gap opens in week one.

---

## What may be generated

- **directories**, named from the concepts
- **module stubs**, one per part, empty
- **type and schema declarations**, from `concepts[].owns`
- **test file skeletons**, one per flow, with the flow name and nothing else

That is the whole list.

## What may never be generated

**No logic. Ever.** Not a default implementation, not a "reasonable starting point", not a helper that seemed obvious.

A scaffold with a working function in it is a spec that has started lying about what is built. The next person reads a repo where some things work and cannot tell which, and the honest signal that nothing is done yet is gone.

No dependencies installed, no package manifests written, no config with real values. Those are decisions, and decisions belong in the spec where they can be argued.

---

## Structure comes from concepts

This is the mechanism that makes the shape floor real rather than aspirational.

Each concept owns a directory. Each field in `concepts[].owns` has exactly one home, in exactly one type declaration, under exactly one concept.

```
spot/            concept: a place a hunter returns to
  types.ts       from owns: name, coords, facing
  rules.ts       part: decides zone from date
hunt/            concept: one sitting at a spot
  types.ts       from owns: spot, time, result
```

When "adding a zone type touches 2 files" is the declared floor, the structure has to make that true. If it does not, the shape is wrong and this is where you find out, at zero cost.

---

## Every file is claimed

`board.py --scaffold` refuses to write a file that no part in the spec claims. A directory nobody asked for is where the first unowned code lands.

Dry run by default, prints what it would write. `--write` actually writes, and never overwrites an existing file.

```
python3 scripts/board.py --scaffold .elon-board/spec.json --root . 
python3 scripts/board.py --scaffold .elon-board/spec.json --root . --write
```

---

## Existing repos

Same rules, plus one: **generate into the structure that is already there.** If the repo puts modules under `src/` and tests under `__tests__/`, the scaffold does too. Reading the existing layout is part of the ground phase, and a scaffold that fights the repo's conventions is a second convention.

Never scaffold over an existing file. If a part's path already exists, report it as already built and leave it alone. That is a real and common outcome in existing-aware mode, and it is good news rather than an error.
