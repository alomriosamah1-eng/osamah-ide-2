# The Lock

Phase 2. One confirmation batch, three things at once, before any judgment happens.

Modeled on `/ascend`'s goal lock and `/gauntlet`'s GRILL: **infer a draft from the code, then have the user confirm or correct it. Never guess silently, and never ask cold.**

---

## Why this exists

The four vectors fight each other:

- **Ambition** adds capability, which costs speed and intuitiveness.
- **Scalable** usually means more abstraction, which raises change cost.
- **Fast** means caching and denormalizing, which is exactly what the shape hunt wants to remove.
- **Intuitive** means fewer steps, which often means more code doing more work per step.

A pass that runs all four without arbitration emits contradictory findings and makes the user referee them. That is not a report, that is homework.

---

## The three fields

### 1. Vector order

Rank `fast`, `scalable`, `intuitive`, `ambitious` for **this** product.

Every later conflict resolves against this order. When a finding on a lower vector is dropped because it fought a higher one, **record it** in `lock.conflicts_resolved[]` with both sides. The user should be able to see what the ranking cost them.

Draft it from evidence before asking:
- a product with paying users and slow screens tends to rank fast first
- a product early in its life with a moving domain tends to rank intuitive or ambitious first
- a product with a growing dataset and a flat feature set tends to rank scalable first

### 2. Concept shortlist

Present the derived concepts from `teardown.md` section 5, with their scatter counts and evidence. Ask for confirm, correct, merge or drop.

This takes the user five seconds and it de-risks the softest step in the entire pass. Do not skip it to save a turn.

### 3. No-go list

**Never ask for this cold.** Nobody enumerates their own sacred surfaces accurately, and a user typing an eighty-character prompt will not write the list from scratch. Infer candidates, then present for correction.

Infer from:
- **public exports** and anything in a published package entry point
- **API route handlers** and anything answering an external caller
- **migration files** and any schema already applied
- **store or deployment metadata**: app store listings, deep link registrations, published URLs
- **do-not-touch comments**: any comment containing DO NOT, DON'T, HACK with a reason, or a linked incident
- **everything changed since the last release tag**, because it is the least settled code in the tree
- **anything under active review**, which the user has to tell you, so ask this one directly

Write the result to `lock.no_go[]` with the reason each entry was inferred.

> A proposal landing on a sacred surface is not a bad suggestion. It is an outage.

A move touching a no-go surface is held back regardless of how good its floor ratio is. `aggregate.py` enforces this and it is one of the ten guards.

---

## The one push-back

If the code disagrees with the declared priority, say so **once**, in one line, then obey.

> "You ranked speed first. Nothing here is measurably slow and your change cost is 14 files for a routine addition, so shape looks like the real constraint. Proceeding on speed as ranked."

That is it. One line, no pitch, no relitigating. Flag the better path, then build what was asked.

---

## Lock schema

```json
{
  "vector_order": ["intuitive", "fast", "scalable", "ambitious"],
  "concepts_confirmed": ["CON-a1b2c3", "CON-d4e5f6"],
  "no_go": [
    {"path": "src/api/routes/*.ts", "reason": "external callers"},
    {"path": "db/migrations/*", "reason": "already applied to production"}
  ],
  "push_back": "shape looks like the real constraint, proceeding on speed as ranked",
  "inferred": {"vector_order": false, "no_go": true},
  "conflicts_resolved": []
}
```

Written to `.elon-vision/<run-id>/lock.json`.

---

## Absent a user

Lock the best inference and mark **every** field `inferred: true`. Say so in the report header. An inferred lock is a working assumption, not a decision, and the report should not pretend otherwise.

---

## Corrections mid-run

A corrected lock **re-runs the work ahead of it** and never re-litigates what is already approved. Corrected priorities govern forward.

If the vector order changes, the constraint is re-derived and any lens work not yet started is re-cast. Work already gated and approved stands.
