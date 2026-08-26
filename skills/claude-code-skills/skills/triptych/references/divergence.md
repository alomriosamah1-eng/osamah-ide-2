# Divergence — the six axes, the thesis template, and the banlist

Read this in Phase 1, before writing any thesis. The whole value of /triptych is that the N concepts occupy
genuinely different points in design space. This file is how that's enforced.

## Why enforcement is needed

Asked for "three versions," a model (or a rushed designer) produces one idea wearing three accent colors.
The propose-then-pick pattern only pays off when the options are far enough apart that the pick teaches you
something about what the owner actually values. Distance is created deliberately, on paper, before code.

## The six axes

Each thesis declares a position on all six. Any PAIR of concepts must differ on **at least 3**.

1. **Layout archetype** — the structural skeleton. Examples: single hero + supporting stack · uniform card
   grid · dense list/table · dashboard of tiles · full-bleed canvas with overlays · split master/detail ·
   feed/timeline · map/visual-first with drawer.
2. **Information hierarchy** — what a user sees in the first second, and in what order. Examples: one number
   above everything · status-first · action-first (the CTA is the hero) · content-first (chrome disappears) ·
   equal-weight browse.
3. **Density** — how much per viewport. Calm/airy (few items, generous whitespace) ↔ editorial middle ↔
   dense/operator-grade (everything visible, minimal scrolling).
4. **Motion character** — how the surface behaves, not just looks. Calm/near-static · responsive (motion only
   answers touch) · alive (ambient state motion: breathing, counting, live-updating) · cinematic (staged
   entrances, celebratory moments).
5. **Visual temperature** — the emotional register of color/type/surface. Utility-neutral · warm/human ·
   technical/cool · premium-dark · brutalist/loud · playful.
6. **Navigation emphasis** — how the surface relates to the rest of the app. Self-contained hub (everything
   reachable here) · springboard (fast exits to siblings) · funnel (one path forward) · ambient (nav recedes,
   content owns the screen).

## Thesis template

```
## <Name — a philosophy, not a letter>
Bet: This surface works best when <one sentence>.
Axes: layout=<…> · hierarchy=<…> · density=<…> · motion=<…> · temperature=<…> · nav=<…>
Wins for: <the user/moment this serves brilliantly>
Loses for: <the user/moment this genuinely underserves — required; no loser means no thesis>
Signature moment: <the ONE interaction or visual beat someone would screenshot>
```

Naming: names carry the argument. *Command Center* (operator density), *Field Data* (utility-neutral,
glanceable), *Intel Hub* (browse-and-drill) each tell you the bet before you see a pixel. "Option A" tells
you nothing and invites lazy convergence.

## Useful spreads (starting points, not a menu)

- **The classic spread:** one concept close to the current app's instincts (the safe evolution) · one at the
  dense/operator extreme · one at the calm/editorial extreme. Efficient because the pick locates the owner's
  taste on the density axis immediately.
- **The hierarchy spread:** same density, three different answers to "what's the ONE thing" — number-first vs
  action-first vs content-first. Use when the owner knows the vibe but not the priority.
- **The motion spread:** same layout family, calm vs responsive vs alive. Use when the fork is about how much
  the app should *perform*.

## Anti-generic banlist

No concept may lean on these as its identity (they can appear as details, never as the bet):

- Purple-to-blue gradient hero + glassmorphism everywhere (the default AI aesthetic).
- Three identical card grids distinguished only by accent color or corner radius.
- Emoji as iconography in a production surface.
- Dark mode as the entire concept ("same screen but dark" is a theme toggle, not a thesis).
- Skeuomorphic gimmicks unrelated to the brief.
- A concept that is just the current design with more spacing.

## The taste ledger — `design/triptych/TASTE.md`

Every pick reveals where the owner's taste actually sits on the axes — that information is worth more than
the winning code, and it compounds only if written down. One line per revelation, appended in Phase 5:

```
# TASTE — <app>
2026-07-25 · insights-screen · picked: Field Data (hybrid: + Intel Hub's drill-in)
  density: dense beat calm (2nd time — treat as settled)
  motion: alive lost to responsive (1st signal)
  hierarchy: number-first beat action-first
```

Phase 1 reads this before writing theses: settled axes (same pick twice) stop being tested and become the
default position for all concepts; contested or untested axes are where the new spread should put its
distance. The ledger is app-scoped taste, not law — note it when the brief for a new surface argues against
a settled position, and say so in the thesis.

## Self-check before Phase 2

- [ ] Every pair of theses differs on ≥3 of 6 axes (write the pairwise counts down).
- [ ] Every thesis names a real loser.
- [ ] No thesis violates a Phase-0 sacred element.
- [ ] Names are philosophies, not letters.
- [ ] You can say, for each concept, what the pick would TEACH you about the owner's taste if it wins.
