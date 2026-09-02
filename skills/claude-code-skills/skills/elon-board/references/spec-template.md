# Spec

Phase 6. The build spec for the picked shape.

**The model produces structured JSON. `board.py` validates it and renders the markdown.** A spec written straight to prose is a spec nothing can check, which is the difference between this and a document generator.

Write `.elon-board/spec.json`, then `board.py --render`.

---

## Schema

```json
{
  "job": "lets a hunter decide which blind to sit tomorrow morning",
  "user": "a hunter with 20-200 saved spots",
  "shape": "SHP-1 Log-first",
  "mode": "greenfield | existing",
  "target_repo": "/path (existing only)",

  "riskiest_assumption": "hunters will log consistently enough for the record to be worth reading",

  "thin_slice": {
    "what": "log a hunt from the spot detail screen and see it in a list",
    "user_visible": true,
    "kills": "hunters will log consistently enough for the record to be worth reading",
    "ships_in": "one sitting"
  },

  "scale": {"n": 500, "unit": "spots per user", "by": "12 months"},

  "concepts": [
    {"canonical": "spot", "job": "a place a hunter can sit, chose, and returns to",
     "owns": ["name", "coords", "facing"], "relates_to": ["hunt"],
     "source": "existing:spot (50 files)", "reused": true}
  ],

  "parts": [
    {"name": "zone/rules.ts", "job": "decides which zone a date falls in",
     "concept": "zone", "kind": "module"}
  ],

  "flows": [
    {"name": "log a hunt", "irreducible_facts": ["spot", "time", "result"],
     "floor_steps": 2, "designed_steps": 2}
  ],

  "floors": {
    "speed": [{"surface": "spot detail", "budget_ms": 35, "basis": "4KB + 40 nodes + 1 read", "evidence": "COMPUTED"}],
    "shape": [{"change": "add a zone type", "max_files": 2, "evidence": "DECLARED"}],
    "scale": [{"op": "spotsInZone", "complexity": "O(1)", "breaks_at": "50k spots", "evidence": "COMPUTED"}]
  },

  "ambition": [
    {"idea": "predict tomorrow's best spot", "reachable_from": "wind + zone + time already on every log",
     "replaces": "the manual sort", "probe": "one query over existing logs, under an hour"}
  ],

  "not_building": [
    {"what": "the alert", "why": "no threshold configured and nothing to compare against yet"}
  ]
}
```

---

## What each field is load-bearing for

**`riskiest_assumption`** and **`thin_slice.kills`** must match. If the first slice does not attack the thing you are least sure of, you have sequenced by comfort rather than by risk.

**`thin_slice.user_visible`** must be true. "Set up the data layer" is not a slice, it is a phase, and phases are how six weeks get spent before learning the idea was wrong.

**`parts[].job`** is the Algorithm-step-1 gate. Not what the part does, what it exists FOR, in one sentence. A part whose job you cannot write is a part you should not build, and `board.py` rejects it.

**`concepts[].owns`** is what makes structure fall out of the concept list. A field listed under exactly one concept has exactly one home. That is the shape floor being paid up front.

**`not_building`** is the subtract pass's receipt. It carries forward what was cut and why, so the same idea does not quietly return in three weeks as a new request.

---

## Rendered order

```
# <job>
<user> · <shape> · <mode>

## The riskiest assumption
## The thin slice           what ships first, and what it kills
## Concepts                 with jobs, reuse flagged
## Floors                   targets with their basis and evidence label
## Parts                    each with its named job
## Flows                    irreducible facts, floor steps vs designed steps
## Ambition                 reachable from data this design will have
## Not building             the subtract receipt
## Scaffold                 what will be generated
```

The riskiest assumption leads. Everything else is downstream of whether that holds.

---

## Rendering rules

- No em dashes.
- Every floor carries `COMPUTED`, `DECLARED` or `ABSENT`. Never a bare number.
- A `designed_steps` above `floor_steps` prints the delta and needs a reason in the text.
- Reused concepts show their source, so the reader can see nothing was invented.
