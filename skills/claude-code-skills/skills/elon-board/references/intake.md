# Intake

Phase 3. Lock what the thing is before deciding what shape it takes.

Modeled on `/elon-vision`'s lock and `/gauntlet`'s GRILL: **infer a draft from what you were given, then have the user confirm or correct it.** Never guess silently, never ask cold.

---

## Depth is set by reversibility, not size

A one-screen feature that writes a new field to every user's device is a one-way door. A four-week internal refactor is not. Size is the wrong dial.

| the decision touches | depth |
|---|---|
| data a user will hold on their device, a public API, a schema others read, pricing, anything shipped to a store | **full interview.** One-way door. Ask until the facts are pinned |
| internal structure, a screen, an internal flow, a new module | **one confirmation batch.** Infer, present, correct in one pass |
| a script, a spike, a throwaway, something you would delete without ceremony | **no questions.** Infer, state the assumptions out loud, proceed |

State which tier you picked and why, in one line, before you ask anything. If the user disagrees with the tier, that is a cheaper correction than the interview.

---

## The lock

Six fields. Written to `.elon-board/lock.json`.

**job** — one sentence, in the user's language, describing what this is FOR. Not what it does. "Lets a hunter decide which blind to sit tomorrow morning" is a job. "Displays a ranked list of spots" is an implementation.

**user** — the primary one, singular. A design for two primary users is two designs, and noticing that here is cheap.

**irreducible facts** — per flow, the minimum information the job genuinely requires. This is what sets the intuitive floor. "Logging a hunt needs spot, time, result" gives you a floor of one screen and one confirm. Get this wrong and every step count downstream is wrong.

**scale target N** — the number it must hold at, and roughly when. "500 spots per user within a year" is a design input. Without it, "will it scale" has no answer and `board.py` will not render the spec.

**no-go** — what must not change or must not be touched. In existing-aware mode, infer candidates from the repo (public exports, migrations, anything in a release) and present them for correction rather than asking cold.

**ambition ceiling** — how far this is allowed to reach. Some things are meant to be a script forever. Asking prevents a spec that quietly proposes a platform.

---

## The one push-back

If what you were told conflicts with what you can see, say it once, in a line, then obey.

> "You asked for offline-first, but the job as stated needs live prices and the scale target is 20 users. Offline-first buys you nothing here and costs a sync model. Proceeding as asked."

One line. No pitch, no second attempt. Flag the better path, then build what was asked.

---

## Absent a user

Lock the best inference, mark every field `inferred: true`, and say so in the spec header. An inferred lock is a working assumption, not a decision, and the document should not read as though someone chose these things.

---

## Schema

```json
{
  "job": "lets a hunter decide which blind to sit tomorrow morning",
  "user": "a hunter with 20-200 saved spots",
  "flows": [
    {"name": "log a hunt", "irreducible_facts": ["spot", "time", "result"], "floor_steps": 2}
  ],
  "scale": {"n": 500, "unit": "spots per user", "by": "12 months"},
  "no_go": [{"path": "db/migrations/*", "reason": "already on devices"}],
  "ambition_ceiling": "a feature inside the existing app, not a platform",
  "reversibility_tier": "one-way | confirmation | none",
  "inferred": {"job": false, "scale": true}
}
```
