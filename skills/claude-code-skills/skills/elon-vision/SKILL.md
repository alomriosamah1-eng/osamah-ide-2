---
name: elon-vision
description: "Elon's team takes over your project mid-flight: tear the whole codebase down to a bill of materials plus an evidence-derived concept map, price every part against its physics floor (speed, scale, intuitiveness, change cost), find the one binding constraint, and propose the arrangement this should have been. Nine verdicts (extract, merge, split, rename, relocate, recast, invert, delete, keep), each gated on a counted payoff so nothing ships for being 'cleaner'. Independent defenders argue the current shape is correct before any move survives. Use when the user says '/elon-vision', wants a whole-project teardown, asks what an app should have been, wants it faster or more scalable or more intuitive, or wants the architecture questioned rather than the code fixed. Unlike /elon-audit (fixes defects in place) and /polish (never touches information architecture), this one changes the shape."
version: 1.0.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [linux, macos]
---

# /elon-vision

The best of Elon's team takes over your project mid-flight and drives it toward one outcome: the most ambitious thing it could be, that also scales, runs fast, and feels obvious. They tear it down to parts first, because you cannot rebuild what you have not inventoried, but the teardown is setup and not the point.

**The question this skill answers: what should this have been.**

## Where this sits

Every other quality skill works *inside* the current arrangement and treats it as given. `/polish` states outright that it never touches information architecture, navigation, data model or component APIs. `/ascend` is enhancement and never tears down IA wholesale. `/elon-audit` fixes defects in place.

| skill | question |
|---|---|
| `/triptych` | which direction, before we build |
| `/ascend` | what capability is missing, against competitors |
| `/polish` | how do we refine what is here |
| `/feel` | does it match our interaction standard |
| `/elon-audit` | what is broken or risky |
| `/gauntlet` | do we ship by the date |
| `/elon-vision` | **what should this have been** |

Borrows `/gauntlet`'s Razor stance and `/elon-audit`'s fix-plan spine. Replaces neither.

## Modes

| invocation | does |
|---|---|
| `/elon-vision` | full pass: teardown, lock, floors, constraint, lenses, report |
| `/elon-vision <path>` | same, scoped to a subtree |
| `/elon-vision --estimate` | print the scope box and exit without spending |
| `/elon-vision --teardown` | phase 1 only: BOM + concept map. Useful alone as a project map |
| `/elon-vision --floors` | phases 1-3: price everything, propose nothing |
| `/elon-vision --deep` | force uniform full depth instead of aiming at the constraint |
| `/elon-vision --probe` | build the picked move for real, on a throwaway branch |
| `/elon-vision --apply` | gated apply, one move at a time |

## Hard rules

1. **Finding is read-only.** Nothing in phases 0-6 writes to the target tree. `--probe` and `--apply` are separate, gated, and never run in the same turn as a find pass.
2. **Coverage is proven, never claimed.** Three sets must be empty before a report renders: files no mapper read, files belonging to no feature, concepts with no located home.
3. **Every number is measured or counted.** Nothing is estimated. A runtime figure that could not be obtained prints as `ABSENT`, never as a value, and never sits in a column beside measured ones.
4. **Nothing is admitted for being cleaner.** Every proposal names a specific future change it makes cheaper or a floor ratio it closes, with counted before and after.
5. **The voice never touches the receipts.** Evidence stays plain. The persona owns the headline, the ranking rationale, the ambition slate and the close.
6. **No em dashes in rendered output.** Commas, periods, parens.
7. **Two runs over an unchanged tree produce identical numbers.** If they do not, the metric is broken, not the codebase.

## Pipeline

```
0 SCOPE      cost preview, --estimate exits here
1 TEARDOWN   BOM (7 axes) + evidence-derived concept map + coverage assertions
2 LOCK       one confirmation batch: vector order, concept shortlist, no-go list
3 FLOORS     price every part, coarse, across everything. --floors exits here
4 CONSTRAINT identify the one binding limit on the top-ranked vector
5 LENSES     deep spend at the constraint. Re-derive the constraint once after
6 DEFEND     independent agents argue the current arrangement is correct
7 REPORT     one number, one move, smallest first step, proposed shape, dispatch
--- gate ---
8 PROBE      build the picked move for real and measure it        (separate turn)
9 APPLY      one move at a time, one commit each                  (separate turn)
```

Read `references/doctrine.md` before phase 0. It carries the Algorithm, the gates, constraint targeting, and the honesty vocabulary, and it is pasted in full into every agent.

## Phase 0 - Scope

Run `scripts/scan.py --estimate`. It prints files, LOC, slices, planned agents, and estimated input tokens in a box.

If the run implies more than ~40 agents, say so and offer to narrow before spending. Never start a large run without the user seeing the number. `--estimate` prints and exits.

`scan.py` also emits the **collision map**: active worktrees, unmerged branches, and which files carry live work elsewhere. Those files are marked `high-conflict` and any move touching them is held back later. This is not optional. A pass that relocates files across a tree with a dozen live worktrees is a merge-conflict bomb.

## Phase 1 - Teardown

Full protocol in `references/teardown.md`. Summary:

Slice the tree into bounded batches (15 files or 2,500 LOC, whichever binds first). Spawn mapper agents, 3 concurrent, sequential between batches. Each returns BOM lines plus `covered_files[]` plus `receipts{}`, the first non-empty line of every file it read, verbatim. `aggregate.py` checks receipts against disk; a claimed file with no matching receipt counts as unread.

Seven axes: `surface`, `feature`, `component`, `data` (down to the field, with readers and writers), `flow`, `dependency`, `process`.

Then the **concept map**. Candidates come from evidence only: type names, table names, route segments, directory names, recurring identifiers, counted by frequency and clustered. Never invented. A concept the codebase does not name is not a concept, it is a guess.

Coverage gate: `UNSWEPT`, `UNCLAIMED` and `UNLOCATED` must all be empty. Dispatch a sweeper for any remainder and re-assert. Do not proceed until all three are empty.

Checkpoint to `.elon-vision/<run-id>/phase-1.json`.

## Phase 2 - Lock

Full protocol in `references/lock.md`. One `AskUserQuestion` batch, three things at once:

- **Vector order.** Rank fast, scalable, intuitive, ambitious for this product. Every later conflict resolves against this order, and the losing side is recorded so the cost of the ranking is visible.
- **Concept shortlist.** Confirm or correct the derived concepts. The user knows their domain in five seconds; everything downstream depends on this being right.
- **No-go list.** Inferred from public exports, route handlers, migration files, store metadata, do-not-touch comments, and everything changed since the last release tag. Presented for correction, never asked cold. A proposal landing on a sacred surface is not a bad suggestion, it is an outage.

**One push-back, then obey.** If the code disagrees with the declared priority (speed ranked first on an app with no measurable performance problem and a change cost of 14), say so in one line, then build what was asked.

Absent a user, lock the best inference and mark every field `inferred: true`.

A corrected lock re-runs the work ahead of it and never re-litigates what is already approved.

## Phase 3 - Floors

Full protocol in `references/floors.md`.

The floor test: compute what a thing *could* cost if you only paid for what the work genuinely requires, then measure how far off you are. The ratio ranks everything.

| vector | floor | ratio |
|---|---|---|
| speed | physics: bytes fetched, nodes rendered, ops required | measured ms over floor ms |
| scale | the complexity the problem actually requires | actual O over required O, with the breaking point |
| intuitive | minimum actions to accomplish the job | actual steps over floor steps |
| shape | minimum files a likely change should touch | actual files over floor files |

Run `scripts/measure.sh`. Static floors (scale, shape, bundle, dependency direction, step counts) come from analysis and the navigation graph. Runtime floors (cold start, frame time, query latency) need the thing running.

**Where a runtime number cannot be obtained, do not infer it.** Print `ABSENT` and raise the missing measurement as a finding ranked at the top. A product with no way to measure its own cold start does not have unknown performance, it has decided not to know. When that is the verdict, the deliverable is the harness.

`--floors` exits here with the priced map.

## Phase 4 - Constraint

Running every lens over every slice is a carpet sweep, and sweeping uniformly decides in advance that nothing dominates, which is never true. The method is to find the binding constraint and attack it.

Phases 1 and 3 are cheap, mechanical, and cover everything, so nothing goes unseen. From the priced map, name the single thing most limiting the top-ranked vector in the lock. Deep spend goes there and to its blast radius. Everything else keeps its coarse result, and the report states plainly which parts got only the shallow look.

`--deep` skips this and forces uniform full depth.

## Phase 5 - Lenses

Five charters in `references/lenses/`. One per vector plus vestiges. Paste the charter plus `doctrine.md` in full into each agent; they are not auto-injected and they are not summarized.

| lens | hunts |
|---|---|
| `speed` | floor violations in runtime, render, bundle |
| `scale` | algorithmic shape and the named breaking point |
| `shape` | scatter, conflation, wrong seams, dependency direction, duplication, forwarding layers |
| `intuitive` | model mismatch, vocabulary drift, flow friction, steps against floor |
| `vestige` | the genuinely dead and expired |

Ambition runs separately, see `references/doctrine.md`. It looks inward at latent capability, not outward at competitors; that is `/ascend`'s job.

Model routing: cheap models for mapping and mechanical detection, reasoning models for the concept map, recasts, ambition and defenders.

After the deep pass, re-derive the constraint once. If depth reframed what is binding, aim again. Capped at two rounds.

Every finding takes one of nine verdicts and must clear the churn gate. Both in `references/moves.md`.

## Phase 6 - Defend

The maker never grades itself, inverted. Where `/elon-audit`'s verifiers try to refute a finding, these argue the **current arrangement is correct**. Fresh context, one job, never sees the authoring reasoning.

Reorganization proposals fail on hidden intent far more often than hidden references, so the defender hunts intent in commit messages, comments and tests: those files look scattered because three are platform-specific, that boundary exists because two people own opposite sides, that duplication is deliberate because the copies diverge on purpose.

A move survives only if the defender comes back empty. Refuted moves are recorded with the counter-evidence, never dropped silently. Report the kill rate honestly. A 0% refute rate on a large pass is a smell, not a flex.

## Phase 7 - Report

Rendered by `aggregate.py`. Schema and format in `references/output-template.md`.

Total analysis, ranked presentation. Everything gets covered, but a 200-finding report is one nobody reads, so the default is the top findings by floor ratio with the full set one flag away.

Opens with **one number and one move**. The number is the worst floor ratio, carried across runs so a second pass shows whether the thing got better or worse. The move is a single named action with ranks two and three in one line each so the headline is falsifiable, and it always carries its **smallest first step**, the piece that ships on its own and makes the rest cheaper. A recommendation that can only be done in one heroic sitting gets admired, not executed.

Then evidence (plain), the proposed shape, the ambition slate, and **dispatch**: whatever is not shape, speed, scale or ambition work grouped with the sibling command that owns it. A dispatch line names the part and the skill and carries **no diagnosis**. Diagnosing is the sibling's job. Without that rule this becomes a mega-pass that reimplements all six.

Close with actual spend against the estimate.

## Phases 8 and 9 - Probe and Apply

**Separate turns. Never in the same turn as a find pass.**

`--probe` builds the picked move for real on a throwaway branch in an isolated worktree, never in the user's tree, runs the tests, and measures the ratio before and after. Elon's team does not circulate a memo about the casting, they cast the part.

Not every move has a number. A recast makes a measurable claim and the probe either closes the ratio or it does not. A rename makes a structural claim whose evidence is diff size, call sites touched, and tests still passing. Report those as `structural`, never dressed with a fabricated metric.

`--apply` applies one move at a time, one commit each, so a regression is attributable. Before any move: measure coverage on the affected files. Green tests over uncovered code prove nothing and reorganization breaks things silently, so uncovered files drop the move to proposal-only or require a characterization test pinning current behavior first. The test comes before the refactor or the refactor does not happen.

Declined moves are recorded and never return.

## Claude Code notes

- Paste `doctrine.md` plus the relevant charter into every agent **in full**. They are not auto-injected. Do not summarize them.
- Batch 3 agents concurrent, sequential between batches.
- All scripts are stdlib-only Python 3 or POSIX shell. No install step.
- Run artifacts go to `.elon-vision/` **in the target repo**, gitignored on init, never inside this skill directory.
- Checkpoint after every phase. Record `git rev-parse HEAD` plus a working-tree hash; if either moved, re-run the affected phases rather than resuming. A plan built on code that has since changed is how you fix a bug that no longer exists.
- A lens that dies degrades the run. Name what did not complete rather than shipping partial coverage as full.
- A pass is done when the constraint is named, every part carries a verdict, and all three coverage sets are empty. Not when the findings run out.
