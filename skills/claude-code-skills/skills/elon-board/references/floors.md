# Floors, forward

Same four vectors `/elon-vision` measures, declared here as targets instead of discovered later as failures.

The difference matters. Measuring that a screen is 26x off its floor is useful and late. Declaring the budget and building to it means 26x never exists.

---

## speed

Compute the budget from the work the surface actually does.

```
budget_ms = network(bytes / throughput) + parse(bytes) + render(nodes * per_node) + io
```

State the constants used, so the number is reproducible and arguable:

```
network throughput   1.5 MB/s   (conservative 4G)
parse                1 ms per 40 KB
render               0.4 ms per node
local disk read      2 ms
```

> `SpotDetail` moves ~4 KB and renders ~40 nodes with one disk read.
> **budget: 35ms.** `COMPUTED`

These are conventions, not laws. A reader who disagrees can recompute in one line, which is the whole point of showing them.

## scale

Two numbers: the declared **N** from the lock, and where this design **breaks**.

> `spotsInZone` is a keyed lookup: O(1). Holds to 50k spots.
> A client-side filter would be O(n) and unusable past ~5k. **DECLARED N: 500.**

"It should scale" is not a target. A breaking point you chose on purpose is.

## intuitive

The irreducible facts set the floor.

> Logging a hunt needs 3 facts: spot, time, result.
> **floor: 1 screen, 1 confirm = 2 actions.** Design to it.

Every step past the floor needs a reason that is about the user, not the implementation. "The API needs a separate call" is not a reason to add a screen.

## shape

The maximum files a likely future change may touch.

> Adding a zone type: **2 files** (`zone/rules.ts`, `zone/types.ts`).

Name the likely change specifically. "Adding a field" is too vague to design against; "adding a zone type" is a thing that will genuinely happen again and can be built for.

This is the floor that compounds. Every other floor is paid once at build time; this one is paid on every future change forever.

---

## Per-stack notes

`detect.py` reports the stack. Frame budget is 16.7ms on native and web. Server work is priced in round trips and bytes, not frames. A CLI's intuitive floor is invocations and flags, not taps.

Greenfield with no stack chosen yet: compute the `COMPUTED` floors anyway. They are properties of the work, not of the framework, which is exactly why they are worth setting before the framework is picked.

---

## Labels

- `COMPUTED` — derived from the work. Show the arithmetic.
- `DECLARED` — the user chose it. Name who.
- `ABSENT` — cannot be determined yet, and why.

No `estimated`. A number you cannot source is an `ABSENT`, and the missing input is the finding.
