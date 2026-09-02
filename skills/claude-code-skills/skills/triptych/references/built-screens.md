# Built screens — running a round on a surface that already exists

Read this in Phase 0/2 whenever the target screen is live code (the primary case). The whole trick is
letting challengers borrow everything the incumbent already earned — data, services, navigation — while
guaranteeing the incumbent itself cannot be damaged by the round.

## The presentation-only contract

Variants **re-present, they don't re-plumb.** They consume the incumbent's exact inventory (services, hooks,
stores, navigation params) and change only view code. Why: it keeps a round cheap (a day per concept, not a
week), keeps the comparison honest (same data, same behavior underneath), and makes Phase 5 deletion truly
free — removing a losing variant can't break anything because nothing outside its folder knows it exists.

**Escape hatch, gated:** some theses genuinely need a plumbing change (e.g. a concept whose bet is "show the
trend, not the number" may need a history query that doesn't exist). Don't secretly build it and don't
silently water the thesis down — flag it in the thesis and as a `Contract flag` on the Pick Sheet, and stub
it honestly in the variant (fixture-fed) so the owner votes knowing the real cost.

## Rename-and-wrap — the switcher recipe

The incumbent is never edited in place:

1. Rename the current screen file/component with a `Classic` suffix (`InsightsScreen` → `InsightsScreenClassic`).
   It keeps working untouched — it's Concept 0, and it must still be pixel-identical at capture time.
2. Add sibling variant files: `triptych/InsightsScreenFieldData.tsx`, `triptych/InsightsScreenIntelHub.tsx`, …
   one folder per round so deletion in Phase 5 is `rm -rf` + unwire.
3. Switch at the **navigation/route layer**, the one place all stacks have a seam:
   - **React Native:** the navigator's `component:` for the route resolves via the switcher.
   - **SwiftUI:** the parent's `body` switches on the variant flag; variants live in one folder.
   - **Web:** the route component resolves via the flag; or mount variants at `/triptych/<slug>` dev routes.
4. The switcher reads one dumb flag — env var (`TRIPTYCH_VARIANT=field-data`), a dev-menu row, or a route
   param. No persistence, no analytics, no cleverness: it dies in Phase 5.

**Shared components:** the moment a concept wants to restyle a shared component (`Card`, `Header`, a chart),
**copy it into the variant's folder first** and mutate the copy. Editing the shared one to serve one concept
silently restyles the incumbent and every other screen — the classic way a round contaminates its own control.

## Same-data snapshot

All panels render one representative data state, or the vote is about data luck, not design. In preference
order:

1. **Seeded fixture** — a dev-only fixture the data layer can serve behind the same triptych flag (best:
   deterministic, replayable next round).
2. **Frozen real state** — one account/database state used for every capture, incumbent first, captures
   taken back-to-back so live data can't drift between panels.
3. **Recorded responses** — replay captured API responses (web: service worker / mock adapter).

Pick the state deliberately: representative-full for the money shot (not a lucky maximal one), plus the
empty state — weak concepts hide behind rich data.

## Incumbent inventory template (Phase 0)

```
## Inventory — <Screen>
Entry: <route/navigator + params>
Data: <hooks/services/stores it reads, with the shape of each>
Mutations: <what it writes, if anything — variants trigger these through the same calls>
Shared components used: <list — these are the copy-before-mutate set>
Design tokens: <the token families it draws from>
Known debts: <anything currently broken/ugly — challengers shouldn't get credit for fixing a bug the
  incumbent could fix in an afternoon; note it so the Pick Sheet can discount it>
```

That last line matters: a challenger that "wins" because it fixed a typo and a broken empty state didn't win
on direction. Cheap fixes the incumbent could adopt regardless of the pick get listed on the Pick Sheet as
"free moves — apply to any winner."
