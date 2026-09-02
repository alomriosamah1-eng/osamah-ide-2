# Floors

Phase 3. Price every part against what the work genuinely requires.

First principles does not mean thinking hard. It means reasoning from physical limits. Compute what a thing **could** cost if you only paid for the work actually required, then measure how far off it is. The ratio is the finding, and the ratio ranks everything in the report.

---

## The four floors

### Speed

Floor comes from physics: bytes actually transferred, nodes actually rendered, operations actually required.

```
floor_ms = network(bytes / realistic_throughput)
         + parse(bytes)
         + render(nodes * per_node_cost)
         + unavoidable_io
```

Do not tune these constants to be flattering or brutal. Use the profile defaults in section 4 and **state them in the finding**, so the ratio is reproducible and arguable.

> `SpotDetail` fetches 4.2KB, renders 41 nodes, does 1 disk read.
> floor 34ms. measured 811ms. **ratio 23.9x** `MEASURED`

### Scale

Floor is the algorithmic complexity the problem actually demands. Name the **breaking point**, do not gesture at it.

> `spotsInZone` is a keyed lookup, so the floor is O(1). It filters the full array: O(n).
> Fine at 200 spots, 40ms at 5,000, unusable at 20,000. **ratio O(n)/O(1)** `COUNTED`

A scale finding without a named breaking point is not a finding, it is a worry.

### Intuitive

Floor is the minimum user actions to accomplish the job, derived from the irreducible facts the job needs.

> Logging a hunt requires 3 facts: spot, time, result.
> floor: 1 screen, 1 confirm = 2 actions. actual: 7 taps across 3 screens. **ratio 3.5x** `COUNTED`

Count actions from the navigation graph and the actual components, never from memory of using the app.

### Shape

Floor is the minimum files a likely change should have to touch.

> Adding a zone type today touches 14 files. The concept `zone` has scatter 14.
> With `zone` extracted to one module: 2. **ratio 7x** `COUNTED`

Shape floors come straight from the concept map. `scatter` is how many files a concept lives in; `conflation` is how many distinct concepts a module holds. High scatter means you cannot find it. High conflation means you cannot change it safely.

---

## MEASURED, COUNTED, ABSENT

Every floor row carries exactly one label.

- `MEASURED` - this run executed something and read a number. Include the command.
- `COUNTED` - derived from static analysis of real files. Include the files.
- `ABSENT` - could not be obtained.

**There is no fourth label, and there is no estimate.**

Static floors (scale, shape, bundle size, dependency direction, step counts) come from analysis and the navigation graph. They are almost always obtainable, so they are `COUNTED`.

Runtime floors (cold start, frame time, query latency) need the thing running. Where the project has no harness, `measure.sh` returns nothing and the row is `ABSENT`.

### The rule that matters

> Where a runtime number cannot be obtained, do not infer it. Print `ABSENT` and raise the missing measurement as a finding ranked at the top.

A product with no way to measure its own cold start does not have unknown performance. It has decided not to know. That is the single highest-leverage finding this skill produces and no other skill in the library produces it at all.

When that is the verdict, **the deliverable is the harness**. Propose the benchmark or instrumentation as a move like any other, gated the same way. The next run then has real numbers instead of the same apology.

Never place an `ABSENT` beside `MEASURED` values in a way that implies a comparison. The report renders them in separate blocks.

---

## Profile adaptation

Fast and intuitive mean different things per stack. `scan.py` emits the profile; use its row.

| profile | speed floor anchors | intuitive unit | runtime source |
|---|---|---|---|
| `react-native` | JS bundle parse, bridge crossings, 16.7ms frame budget | taps and screens | jest perf, Flipper, a `--profile` build |
| `nextjs` | TTFB, hydration cost, RSC payload bytes | clicks and routes | lighthouse, `next build` output |
| `react-web` | bundle parse, layout, paint | clicks and routes | lighthouse |
| `swift` | launch phases, main-thread work, 16.7ms frame budget | taps and screens | XCTest metrics, Instruments |
| `python` / `go` / `rust` | syscalls, allocations, algorithmic cost | CLI invocations and flags | the test suite's own timing |
| `unknown` | fall back to `COUNTED` floors only | steps in the documented flow | none, expect `ABSENT` |

Default constants, stated in every speed finding so the ratio is reproducible:

```
network throughput   1.5 MB/s   (conservative 4G)
parse                1 ms per 40 KB
render               0.4 ms per node
local disk read      2 ms
```

These are conventions, not laws. State them, and a reader who disagrees can recompute in one line.

---

## Determinism

**Two runs over an unchanged tree must produce identical floor numbers.**

That is the property the whole ranking rests on. If a floor moves between runs on unchanged code, the metric is broken, not the codebase. Anything derived from a model's judgment rather than a count will drift, which is exactly why there is no `estimated` label.

`COUNTED` floors are deterministic by construction. `MEASURED` floors are not perfectly stable across runs, so record the raw measurement alongside the ratio and compare ratios with a tolerance band rather than exact equality.

---

## Carry across runs

Write floor ratios to `.elon-vision/floors.json`, keyed by BOM id. On a later run, render the delta.

A second pass that only restates where the project stands is worth much less than one that shows whether it got better or worse.
