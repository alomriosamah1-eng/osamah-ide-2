---
name: triptych
description: Mock up N (default 3) genuinely divergent, WORKING design concepts of one target surface (a screen, flow, or component) inside the app's real codebase, run them live, capture a screenshot + short video of each, and present a side-by-side Pick Sheet so the owner chooses a direction (or a hybrid) before any real investment. Each concept is a named thesis with declared positions on the divergence axes (layout archetype, hierarchy, density, motion character, visual temperature, navigation emphasis) — never three shades of the same idea, and never static image fakes: concepts render in the real app with real data. After the pick, the winner is implemented for real and the losing variants are deleted (no dead code). Use when the user says "/triptych", asks to "mock up a few versions/options/concepts", wants "3 designs to pick from", says "show me some directions for this screen", wants a redesign explored before committing, or references the three-version screenshot/video workflow. Unlike /polish (refine what exists), /feel (conform to the fixed UX-DNA standard), and /ascend (escalating single-direction enhancement), /triptych is for the moment BEFORE those: the direction itself is undecided and the owner should pick from real, running alternatives. One surface per round — not whole-app redesigns, and not component-library syncing (that's /design-sync). Running it on an already-built screen is the PRIMARY case, not an edge case: the current design is captured with the same recipe and competes on the Pick Sheet as Concept 0 (the control), variants are built beside it under a presentation-only contract (view layer only, services/data untouched), and "keep current" is a legitimate pick.
version: 1.1.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [macos, linux]
---

# `/triptych` — Three Real Ways, One Pick

Build **N meaningfully different design concepts of the same surface as working code**, run each one in the
real app, capture **screenshot + video** proof, lay them side by side, and let the **owner pick** — a winner,
a hybrid ("A's layout, C's motion"), or another round. Then converge: implement the pick, delete the losers.

**Origin:** the BlindBuddy Tools redesign (2026-07) — three complete concepts (*Command Center*, *Field Data*,
*Intel Hub*) built live, screenshotted from the simulator, and picked from. This skill is that workflow made
repeatable, with the failure modes fenced off.

## The contract (what separates this from "make some mockups")

1. **Real pixels or nothing.** Concepts are working code in the app's own codebase, rendering the app's real
   data. Never HTML fakes, never AI-drawn images passed off as screens. If the app can't run, say so and use
   the explicitly-labeled prototype lane (`references/capture.md`) — a labeled prototype is honest; a fake
   screenshot is not.
2. **Divergence is enforced, not hoped for.** Left alone, N concepts converge into three shades of the same
   generic idea. Every concept declares a named thesis and positions on the six axes *before code is written*,
   and any two concepts must differ on **≥3 of 6 axes** (`references/divergence.md`).
3. **The owner picks. The skill never does.** The Pick Sheet is a hard stop. Present, recommend at most, wait.
4. **Losers die.** After the pick, the losing variants and the switcher are removed the same session. The
   capture folder is the permanent record; the codebase carries exactly one direction.
5. **The incumbent competes.** When the target already exists (the primary case), the current design is
   captured with the exact same recipe, data, and walkthrough, and sits on the Pick Sheet as **Concept 0 —
   the control**. "Keep what we have" is a legitimate outcome, every thesis must say what it changes about
   the incumbent and why, and challengers that can't visibly beat the control get called out as such.

## Invocation

```
/triptych <target>                      # e.g. /triptych the Insights screen
/triptych <target> --n 4                # more concepts (2–5; 3 is the sweet spot)
/triptych <target> --brief "..."        # adjectives / audience / non-negotiables inline
/triptych --continue                    # resume after a pick or "push further on B"
```

`<target>` is ONE surface: a screen, a flow of 2–3 screens, or a signature component. If the user asks for a
whole-app triptych, negotiate down to the surface that sets the app's design language (usually the home/primary
screen) — the winning direction then travels via `/feel` or a follow-up round.

`--n` counts **challengers**; the incumbent (Concept 0) rides along for free whenever the target already
exists. A cheap round is `--n 2`: incumbent + two challengers is still a three-panel sheet.

## Phase 0 — Scope lock

Read enough of the codebase to know the app's purpose, users, stack, design tokens, and how to run it. Then
lock, asking only what evidence can't answer (3–4 questions max, grill-me style; if running unattended, lock
from evidence and state assumptions in the Pick Sheet):

- **Target + key states.** Which screen/flow, and the 2–4 states that must be shown (empty, loaded, active).
- **Brief.** Three adjectives the owner wants users to feel; the audience; the ONE job the surface must nail.
- **Sacred elements.** What no concept may touch (brand voice, a signature interaction, nav placement, data).
- **N** (default 3 challengers).
- **Incumbent inventory** (existing targets): the components, services, hooks, and data the current screen
  touches — this map is both the reuse menu and the boundary of the presentation-only contract
  (`references/built-screens.md`).
- **Walkthrough script.** The exact 4–6 step interaction sequence every capture video will follow — written
  once here so all concepts (incumbent included) are filmed identically.
- **Data state.** One representative data snapshot every capture renders (see `references/built-screens.md`
  for fixture options). Comparing a full incumbent against an empty challenger rigs the vote.

## Phase 1 — Theses (the divergence contract)

Before any UI code: write N theses using the template in `references/divergence.md`. Each thesis gets:

- A **name** that states a philosophy (*Command Center*, *Field Data*, *Intel Hub* — not "Option A/B/C").
- A one-sentence **bet**: "this surface works best when ___".
- Declared positions on the **six axes** — layout archetype, information hierarchy, density, motion character,
  visual temperature, navigation emphasis.
- **Who wins / who loses** if this concept ships (every real direction has a tradeoff; a thesis with no loser
  is a platitude).
- **Vs. incumbent** (existing targets): the one change to the current design this thesis is really arguing
  for. If a thesis can't name its argument with the incumbent, it isn't a challenger.

If `design/triptych/TASTE.md` exists from earlier rounds, read it first — it records which axis positions the
owner has already picked for and against. Aim this round's spread at the axes still genuinely uncertain;
re-testing an axis the owner has picked the same way twice wastes a panel (`references/divergence.md`).

Check the pairwise axis-difference rule (≥3 of 6) and the anti-generic banlist. Fix on paper — it's 100× 
cheaper than fixing in code. Show the theses to the user if they're present; otherwise proceed and put the
theses on the Pick Sheet.

## Phase 2 — Build

- **Isolate:** dedicated branch (worktree if a parallel session may touch the repo). Never on main.
- **Built screens — the presentation-only contract:** variants re-present, they don't re-plumb. The current
  screen is never edited: rename it (`InsightsScreen` → `InsightsScreenClassic`), drop variant screens in
  beside it, and switch at the navigator/route level. Variants consume the incumbent's inventory (same
  services, hooks, data) and change only view code. Shared components get **copied into the variant's folder
  before being mutated** — never edit a shared component to serve one concept. If a thesis genuinely needs a
  data/service change, flag it in the thesis and on the Pick Sheet; it's a cost the owner votes on
  knowingly. Per-stack rename-and-wrap recipes: `references/built-screens.md`.
- **Switcher:** all N variants live in the same build behind a cheap runtime switcher — a debug env var, a
  hidden gesture, a route param, or a dev-menu row. Same data, same navigation shell, so the comparison is
  honest. Keep the switcher dumb; it dies in Phase 5.
- **Share what the thesis doesn't contest.** Reuse the app's real components, tokens, and services wherever a
  concept's bet doesn't override them. The deliverable is a *direction*, not three finished products — each
  concept should be roughly a day-of-work fidelity, fully interactive on its key states, honest about what's
  stubbed.
- **Budget guard:** if one concept balloons past ~2× the effort of the others, cut its scope, not the others'
  quality. Uneven fidelity rigs the vote.

## Phase 3 — Capture

Per concept, using the platform recipe in `references/capture.md` (iOS simulator / React Native / web):

- **The incumbent first** (existing targets): capture the current screen with the exact same recipe, states,
  data snapshot, and walkthrough script as the challengers — it is `00-incumbent`. A control filmed under
  friendlier or harsher conditions than the challengers is a rigged vote in either direction.
- **Screenshots** of each key state, full-screen, real device frame, consistent device/viewport across all N.
- **One short video** (10–30s) per concept following the Phase-0 walkthrough script — scroll, tap-through,
  the signature moment. Motion is half of UX; stills alone under-sell the concept whose bet is motion.
- Save to the design record: `<project>/design/triptych/<yyyy-mm-dd>-<target-slug>/` as
  `00-incumbent.png`, `01-<thesis-slug>.png` (money shots), `01-<thesis-slug>--<state>.png` (extra states,
  double hyphen), `01-<thesis-slug>.mp4`, numbered in thesis order.

**Truth-in-capture rule:** every image presented as a screenshot must come from the running app. Verify before
presenting: the build succeeded, each variant renders, and the N screenshots are not near-identical (if two
look the same, divergence failed — go back to Phase 1, don't present).

## Phase 4 — The Pick Sheet (hard stop)

Present side-by-side, in chat, with the images displayed inline (not just paths):

```
# PICK SHEET — <target> · <date>
Concept 0 — Incumbent (control, existing targets only):
  <screenshot displayed inline>  ·  video: <path>
  No thesis, no advocacy — it's the bar the challengers must clear.
For each challenger (in thesis order):
  <screenshot(s) displayed inline>  ·  video: <path>
  **<Name>** — <the bet, one sentence>
  Vs. incumbent: <the one change this concept argues for>
  Optimizes for: …   Costs you: …   [Contract flags: any data/service change a thesis needed]
  Axes: layout / hierarchy / density / motion / temperature / nav
Fit-to-brief: score every panel INCLUDING the incumbent against the Phase-0 adjectives + the ONE job
(be honest, not diplomatic — if no challenger beats the control, say so plainly).
Recommendation: at most one sentence, clearly labeled as yours.
Ask: "Pick one, keep the incumbent, name a hybrid (e.g. B's layout + C's motion), or say 'push further
on <X>' for another round."
```

If ImageMagick is installed, also run `scripts/montage.sh <capture-dir>` — it composes the money shots into
a single side-by-side `pick-sheet.png` for one-glance comparison (it no-ops gracefully without ImageMagick).

Write the same content to `PICK-SHEET.md` in the capture folder — it doubles as the decision ledger. Then
**stop**. Do not implement, do not merge, do not tidy. The turn ends with the question.

## Phase 5 — Converge (after the pick)

- Implement the pick for real — winner as-is, or the named hybrid — to shipping quality on the branch. For a
  hybrid, restate the recipe before building ("B's layout + C's motion + incumbent's header") and get a nod
  if the owner is present; a misremembered hybrid wastes the whole round.
- **Delete** the losing variants and the switcher, and restore the winner to the incumbent's original name
  (`InsightsScreenClassic` dies; the winner becomes `InsightsScreen`). No dead code, no "keeping B around
  just in case"; B lives on in the capture folder and git history.
- Append the decision + date to `PICK-SHEET.md` (what was picked, what was hybridized, why — one paragraph).
- Append one line per revealed preference to `design/triptych/TASTE.md` (format in
  `references/divergence.md`) — this is what makes the next round smarter than this one.
- Verify: build green, tests/lint/typecheck pass, the surface works end-to-end on real data.
- Offer the natural follow-ups: `/feel` to conform the new surface to the house standard, `/polish` for the
  signature touches, another `/triptych` round on the next surface using the winner as the new baseline.

## Sibling skills — know which you want

| You want… | Use |
|---|---|
| Real alternatives to CHOOSE between (direction undecided) | **/triptych** |
| Refinements to the app's own current self | /polish |
| Conformance to the fixed house UX-DNA | /feel |
| Compounding enhancement passes in ONE locked direction | /ascend |
| Decision stress-testing with no code | /grill-me |
| Component library synced to claude.ai/design | /design-sync |

/triptych front-runs the others: it exists for the fork in the road. Once the road is picked, the rest take over.
