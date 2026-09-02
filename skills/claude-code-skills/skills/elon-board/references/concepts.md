# Concepts

Phase 4. Name the ideas the thing is made of, before deciding where any file goes.

**Structure falls out of this list.** That ordering is the whole point: it is what makes scatter zero by construction instead of a thing a teardown finds two years later.

---

## What a concept is

An idea a person in the domain would name. A hunt. A spot. A zone. A wind reading. An invoice. A shift.

A concept survives translation to a non-programmer. If you cannot say it to the user and have them nod, it is not a concept.

**These are not concepts:** Manager, Service, Handler, Provider, Controller, Helper, Context, Factory, Adapter, Wrapper, Store, Hook, Component, Screen. Those are words for "some code lives here." A design whose concept list is mostly these has described a folder layout, not a product.

Most things have 5 to 15. Fewer than 5 usually means the idea is not decomposed yet; more than 15 usually means several products are wearing one name.

---

## Greenfield: concepts come from the job

Derive them from the locked job and its flows, not from an architecture you have in mind.

Work through each flow's irreducible facts. "Logging a hunt needs spot, time, result" surfaces three candidates immediately. Ask what each fact belongs to and what it is measured against, and the surrounding concepts appear.

Then check each candidate against the domain:
- would the user say this word unprompted
- does it have a lifecycle, or is it just a field on something else
- is it one idea, or two that share a name

A candidate that is really a field belongs to its owner, not on the list.

---

## Existing repos: reuse is mandatory

Run `detect.py --in PATH --concepts` first. It harvests the vocabulary the codebase already uses, from type names, table names, directory names and recurring identifiers, with file counts and evidence.

**Every concept in your spec is checked against that list.** A new word for an existing idea is rejected by `board.py`, not merely discouraged.

If the codebase has said `spot` in 50 files for two years and your spec says `location`, you have created scatter before writing a line, and the person who has to reconcile it is the user in eighteen months.

Three legitimate outcomes when your candidate collides:

1. **It is the same idea.** Use their word. Yours is not better; it is second.
2. **It is genuinely a different idea** that happens to sound similar. Say so explicitly, in one line, and pick a word that does not invite the confusion.
3. **The existing word is wrong** and you can argue it. Then the finding is a `rename` for `/elon-vision`, not a synonym for you to introduce quietly.

The harvest is evidence, not gospel: it surfaces code words that slipped through, and sometimes two words for one idea already in the codebase. Both are worth telling the user, and neither means you should add a third.

---

## Schema

Shared with `/elon-vision` so the grade step works.

```json
{
  "id": "CON-<sha1(canonical)[:6]>",
  "canonical": "spot",
  "job": "a place a hunter can sit, that they chose and can return to",
  "lifecycle": ["created when a user drops a pin", "edited", "archived, never deleted"],
  "owns": ["name", "coords", "facing"],
  "relates_to": ["hunt", "zone"],
  "source": "domain interview | existing:spot (50 files)",
  "reused": true
}
```

`job` is required and is the gate. A concept with no job is a noun somebody liked, and `board.py` will not render a spec containing one.

`owns` is what makes structure fall out: a field listed under exactly one concept has exactly one home, and that is the shape floor being paid for up front rather than later.
