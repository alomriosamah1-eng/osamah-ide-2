---
name: elon-board
description: "Design what does not exist yet with the discipline /elon-vision applies to what does. Greenfield, or pointed at an existing repo where it learns the concept map first and reuses its names instead of inventing synonyms. Runs a subtraction pass that can honestly end in 'build 10% of this', locks the job and a scale target through a reversibility-triaged interview, names concepts in domain language, offers 2-3 provably divergent shapes to pick from, then emits a build spec with floors as TARGETS (speed budget, scale breaking point, steps-to-floor, max files a change may touch) plus the empty scaffold it implies. Every spec names the thinnest end-to-end slice that kills the riskiest assumption. Eight mechanical guards refuse to render a spec with an unnamed part, an undeclared N, or shapes that are not actually different. Use when the user says '/elon-board', wants a build spec, is planning a feature or app before code exists, or asks what something should be."
version: 1.0.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [linux, macos]
---

# /elon-board

`/elon-vision` applies The Algorithm to code that exists. It can only question a requirement **retroactively**, once the part is built, referenced, and expensive to remove.

`/elon-board` applies step 1 at the only moment it is free: **before the part exists.**

**The question this skill answers: what should this be.**

## The inversion

Every mechanic flips, and every flip is an improvement.

| | `/elon-vision` | `/elon-board` |
|---|---|---|
| floor test | verdict, "you are 26x off" | target, so 26x never gets built |
| concept map | reverse-engineered from code that may never have had one | the first artifact; structure falls out of it, so scatter is zero by construction |
| the gate | does this refactor earn its churn | does this part have a named job at all |
| ambition | what the system holds and is not using | what the system will **know** once built that nothing else does |

Both skills speak the same BOM and concept schema, so after you build it `/elon-vision` measures how far the code drifted from this spec. **The spec becomes the floor you get graded against.**

## Where this sits

| skill | question |
|---|---|
| `/elon-board` | **what should this be** (nothing written yet) |
| `/triptych` | which of these real running screens do I pick |
| `/grill-me` | is my plan sound (interview, no artifact) |
| `/ship` | build and launch this |
| `/elon-vision` | what should this have been (already written) |

`/grill-me` interrogates and hands back understanding. This interrogates and hands back a spec and a scaffold.

## Modes

| invocation | does |
|---|---|
| `/elon-board "<idea>"` | full pass: subtract, interrogate, concepts, shapes, spec, scaffold |
| `/elon-board "<idea>" --in <path>` | existing-aware: learn that repo's concepts first, design to fit |
| `/elon-board --subtract "<idea>"` | the say-no pass alone. Cheapest, and sometimes the whole answer |
| `/elon-board --shapes "<idea>"` | stop after the shapes. No spec until you pick |
| `/elon-board --spec` | resume from a picked shape and write the spec |
| `/elon-board --scaffold` | emit the structure from an approved spec |
| `/elon-board --estimate` | scope and cost, then exit |

## Hard rules

1. **It must be able to say no.** A skill that always produces a spec always says yes. A run ending in "this is three features and one earns its place" is a **successful** run.
2. **No part without a named job.** Not a description of what it does. The job it exists to do, in one sentence, in the user's language.
3. **Floors are declared as targets, never omitted.** A flow with no floor step count and a system with no scale target N do not render.
4. **Concepts come from the domain, and in an existing repo they come from that repo.** Inventing a second word for an idea the codebase already names is the single most expensive mistake available here.
5. **Every spec names the thinnest end-to-end, user-visible slice that kills the riskiest assumption.** Never "phase 1: foundation."
6. **Shapes must actually differ**, on 3+ declared axes, checked mechanically before they are shown.
7. **The scaffold contains no logic.** Directories, stubs, type and schema declarations, test skeletons. Nothing that runs.
8. **No em dashes in rendered output.** Commas, periods, parens.

## Pipeline

```
0 INTAKE       the idea in the user's words. detect greenfield vs existing repo
1 GROUND       existing only: teardown that repo -> concept map + BOM to reuse
2 SUBTRACT     what in this ask should not exist. CAN END THE RUN HERE
3 INTERROGATE  depth by reversibility. lock job, user, irreducible facts,
               scale target N, no-go, ambition ceiling
4 CONCEPTS     the ideas this is made of, in domain language
5 SHAPES       2-3 divergent decompositions, floors computed for each
--- user picks, hard stop ---
6 SPEC         full build spec for the winner
7 SCAFFOLD     the empty structure it implies
--- later ---
8 GRADE        /elon-vision measures the built thing against this spec
```

Read `references/doctrine.md` before phase 0 and paste it in full into every agent.

## Phase 0 - Intake

Take the idea verbatim. Do not improve it yet.

Run `scripts/detect.py`. It reports greenfield vs existing, the stack profile, and for an existing target the file and concept counts it would have to learn. `--estimate` prints and exits.

## Phase 1 - Ground (existing targets only)

Run `/elon-vision --teardown` against the target repo, or `detect.py --concepts` for the cheap version. You need two things: the **concept map** (what ideas the codebase already names) and the **BOM** (what parts already exist and could be reused).

This is the whole reason existing-aware mode is worth building. A spec that names `Location` when the codebase has said `Spot` for two years has created scatter before a line is written.

## Phase 2 - Subtract

Full protocol in `references/subtract.md`. Runs **before** any shape is drawn, because shaping a thing you should not build is wasted work and it also makes you attached to it.

Three questions, in order:

1. **Is this several things?** Most feature asks are. Name each one and rank by whether it earns its place independently.
2. **What is the 10% version?** The smallest thing that delivers the actual value. State it even when the answer is "the full ask is the 10% version."
3. **Is this a proxy?** People ask for the solution they imagined, not the outcome they want. Name the outcome and check whether a cheaper thing reaches it.

Output is a verdict: `BUILD AS ASKED` / `BUILD LESS` / `BUILD SOMETHING ELSE` / `DO NOT BUILD`, with the reasoning. On anything but the first, present it and **stop** for confirmation before continuing.

## Phase 3 - Interrogate

Full protocol in `references/intake.md`. Depth is set by **reversibility triage**, not by size:

| the decision touches | depth |
|---|---|
| anything a user will have on their device, a public API, a data shape, pricing | full interview, one-way door |
| internal structure, a screen, an internal flow | one confirmation batch |
| a script, a throwaway, a spike | infer and state assumptions, no questions |

The lock records: the **job** (one sentence, user's language), the **primary user**, the **irreducible facts** each flow needs, the **scale target N**, the **no-go** list, and the **ambition ceiling**.

Absent a user, lock the best inference and mark every field `inferred: true`.

## Phase 4 - Concepts

Full protocol in `references/concepts.md`. Name the 5 to 15 ideas the thing is made of, in the language a person in the domain would use.

**In existing-aware mode, reuse is mandatory.** Every concept is checked against the ground-phase concept map. A new word for an existing idea is rejected by `board.py`, not merely discouraged.

The file structure comes out of this list. That is what makes scatter zero by construction rather than something a later teardown has to find.

## Phase 5 - Shapes

Full protocol in `references/shapes.md`. Produce 2-3 genuinely different decompositions. Specs are cheap: no code exists, so exploring real alternatives costs tokens rather than weeks.

Any two shapes must differ on **3 or more** of these, declared before anything is written:

decomposition seam (feature / layer / data lifecycle / role) · state ownership (client / server / derived) · sync model (realtime / poll / offline-first / none) · the value core · data shape (normalized / document / event log) · build order (thin slice first / spine first)

`board.py --check-shapes` refuses fewer than 3. Three shades of one idea is not a choice.

Each shape carries its computed floors, so the pick is made on numbers and not vibes.

**Then stop.** The user picks or hybridizes. The skill never picks.

## Phase 6 - Spec

Format and schema in `references/spec-template.md`. Floors as targets, per `references/floors.md`:

| vector | the target |
|---|---|
| speed | a budget per surface, computed from the work it does (bytes moved, nodes rendered) |
| scale | the declared N and the breaking point that must hold |
| intuitive | irreducible facts set the floor step count; the flow is designed to it |
| shape | the maximum files a likely future change may touch |

The shape floor is the one that pays forever. Declaring "adding a zone type touches 2 files" and building to it is how you never arrive at 14.

Every spec names **the thinnest end-to-end, user-visible slice that kills the riskiest assumption**, and states that assumption out loud. Foundation-first is how six weeks get spent before learning the idea was wrong.

## Phase 7 - Scaffold

Rules in `references/scaffold.md`. Emit only: directories, module stubs, type and schema declarations, test file skeletons, all named from the concepts.

**No logic. Ever.** A scaffold with a working function in it is a spec that has started lying about what is built.

`board.py` rejects a scaffold containing a file no part in the spec claims.

## Phase 8 - Grade (later, separate turn)

Once a slice is built, `/elon-vision` measures the real code against this spec: did the concepts survive, did the shape floor hold, is the thin slice actually what shipped.

## Claude Code notes

- Paste `doctrine.md` plus the relevant reference in full into every agent. They are not auto-injected, and do not summarize them.
- `board.py --selftest` runs all eight guards against fixtures that must fail. Run it after any change to the guards.
- Scripts are stdlib-only Python 3. No install step.
- Artifacts go to `.elon-board/` in the target repo (or the cwd for greenfield), gitignored on init.
- The user picks the shape. The skill never picks, and never proceeds past phase 5 on its own.
