# Shapes

Phase 5. Produce 2-3 genuinely different decompositions of the same locked job, then stop and let the user pick.

Specs are cheap. No code exists, so exploring real alternatives costs tokens rather than weeks. This is the one moment in a project's life when changing your mind is free, and spending it on a single foregone conclusion wastes it.

---

## The divergence contract

Any two shapes must differ on **3 or more** axes, declared before anything is written. `board.py --check-shapes` refuses fewer.

| axis | positions |
|---|---|
| decomposition seam | by feature · by layer · by data lifecycle · by user role |
| state ownership | client-owned · server-owned · derived |
| sync model | realtime · poll · offline-first · none |
| value core | which flow is the product, and which are support |
| data shape | normalized · document · event log |
| build order | thin slice first · spine first |

Three shades of one idea is not a choice. If your shapes all put state on the server, sync in realtime, and decompose by layer, you have written one shape three times and the user's pick is meaningless.

---

## Each shape carries its floors

The pick is made on numbers, not on which paragraph reads better.

Per shape, compute and show:

- **shape floor** — files a likely future change touches. The likely change is named, and it is the same change across all shapes or the comparison is rigged.
- **intuitive floor** — steps to complete the primary flow.
- **scale** — where this shape breaks, against the locked N.
- **speed** — the budget for the primary surface, from the work it does.

A shape that wins on every axis is suspicious. Usually it means the others were built as strawmen, and a strawman disguises the real tradeoff instead of surfacing it.

---

## What a shape is not

Not a technology pick. "Postgres vs Mongo" is a data-shape consequence, not a shape. Lead with the decomposition and let the storage follow, because the reverse is how you end up with a schema deciding your product.

Not a scope tier. "Basic / Standard / Premium" is one shape at three sizes. Scope belongs to the subtract pass, which already ran.

---

## Presenting them

Side by side, same order of fields, so the differences are readable at a glance. Name each one for its thesis, not by number: "Log-first", "Map-first", "Prediction-first" tells the user what they are choosing between. "Option A" does not.

State the axes each pair differs on, explicitly. If the user cannot see the difference, the divergence was theoretical.

Say plainly what each shape is bad at. A shape with no stated weakness has not been thought about hard enough, and the user will find the weakness later at their own cost.

---

## Then stop

**The user picks or hybridizes. The skill never picks.**

A hybrid is a legitimate answer and usually a good one, because the axes are independent: taking Log-first's decomposition with Map-first's state ownership is a real shape, not a compromise. When the user hybridizes, restate the resulting axis positions and confirm before writing the spec.

---

## Schema

```json
{
  "id": "SHP-1",
  "name": "Log-first",
  "thesis": "the product is the record; the map is a view onto it",
  "axes": {
    "seam": "by feature", "state": "client-owned", "sync": "offline-first",
    "value_core": "log a hunt", "data_shape": "event log", "build_order": "thin slice first"
  },
  "floors": {
    "shape": {"change": "add a zone type", "files": 2},
    "intuitive": {"flow": "log a hunt", "steps": 2},
    "scale": {"holds_to": 5000, "breaks_at": "50k logs, client-side filter"},
    "speed": {"surface": "log entry", "budget_ms": 40}
  },
  "bad_at": "anything that needs a server-side aggregate across users"
}
```
