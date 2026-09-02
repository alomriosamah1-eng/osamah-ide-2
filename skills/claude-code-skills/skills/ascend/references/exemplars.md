# Exemplars — the capability → best-in-class map

> **Read in full before any BENCHMARK/BUILD step.** The **starting** reference for which billion-dollar SaaS company
> owns a given capability, and the *principle* you borrow from them. It is a **pattern library, not a skin** — you
> build the capability in the app's **own** design language (App Style Profile), never as a clone of the exemplar's UI.
> `.ascend/goal.md`'s `exemplars` line **overrides** these generic picks: benchmark what's relevant to THIS app's job
> (a BLE device app's job is monitoring/control/safety → Apple HIG, Things, telemetry dashboards — **not** Asana boards).

## How to use this file (read with doctrine § Citation Integrity)
1. **Find the capability** the app is weak on (from Phase 0's gap search) in the index below.
2. **Pick the 1-2 exemplars** that genuinely own it **for the locked job** in `goal.md` (then prefer the one whose
   platform matches the detected stack).
3. **Web-verify the specific mechanism** you're about to build (`WebSearch`/`WebFetch`) — get the *current* behavior and
   the detail that makes it good. Tag confirmed specifics `[VERIFIED: source]`.
4. **Build to the principle, in the app's visuals.** Cite `[PRINCIPLE]` for the approach; never invent a number.

**Citation discipline (full law in doctrine § Citation Integrity):**
- Everything below is `[PRINCIPLE]` — a documented *approach*, no figures. Never quote a number from here as if sourced.
- **Source hierarchy for `[VERIFIED]`:** vendor docs / help / changelog / engineering blog = strong (may authorize a
  build); forum / marketing / third-party blog = weak (corroborate or treat as `[PRINCIPLE]`; never sole authority).
- **Live SaaS UIs are usually auth/JS-walled** — verify from docs/help/changelog, **not** `app.<vendor>.com`.
- **Can't source a specific?** Keep the gap **qualitative**; never attach a number to a company you didn't verify.

## Capability index — who to benchmark for what
| Capability the app needs | Owns it | Borrow this principle |
|---|---|---|
| Organization & movement (boards, columns, drag, grouping, swimlanes) | **Asana, Trello, Linear, Notion** | status-as-column; drag to move; rich cards |
| Speed, triage, keyboard-first flow | **Linear, Superhuman, Raycast** | instant feel; every action has a shortcut; optimistic UI |
| Data display, dashboards, analytics | **Stripe, Linear, Vercel, Datadog, Notion** | meaningful metrics; clear viz; drill-down |
| Multiple views over one dataset | **Notion, Airtable** | same data as list / board / calendar / gallery |
| Forms, validation, checkout, money | **Stripe, Typeform** | inline validate-on-blur; human errors; impeccable formatting |
| Search & command palette | **Linear, Raycast, Notion, Superhuman** | ⌘K to everything; fuzzy; act from results |
| Onboarding, empty states, activation | **Linear, Notion, Slack, Duolingo** | empty states teach + offer the first action |
| Collaboration, presence, comments | **Figma, Notion, Linear** | live presence; inline threads; @-mentions |
| Notifications & inbox | **Linear, Slack, Superhuman** | grouped, actionable, triage-from-inbox |
| Settings & account management | **Stripe, Linear, Vercel** | grouped, searchable, safe destructive actions |
| Mobile-native feel | **Apple HIG, Things, Superhuman iOS** | spring physics; touch-down feedback; meaningful haptics |

---

## Asana / Trello — *organization & movement; the board masterclass*
- **Status is a column.** Work lives in columns (To Do / Doing / Done or custom); moving a card between columns *is*
  the state change. Boards make pipeline and progress legible at a glance. `[PRINCIPLE]`
- **Cards are rich but scannable.** A card surfaces assignee avatar, due date, tags/labels, and subtask/attachment
  counts without opening it. `[PRINCIPLE]`
- **Drag is the primary verb.** Drag to reorder, to move across columns, to reprioritize — with a clear drag affordance
  and a satisfying drop. `[PRINCIPLE]`
- **One dataset, many lenses.** The same tasks appear as Board, List, Calendar, and Timeline — the user picks the lens
  that fits the moment. `[PRINCIPLE]`
- Use for: boards/Kanban, drag-to-move, grouping/swimlanes, card design.

## Linear — *speed as a feeling; triage & keyboard-first*
- **Everything feels instant.** Optimistic UI — actions reflect immediately, the network catches up silently; no
  spinner for what should be instant. `[PRINCIPLE]`
- **Keyboard-first.** Every meaningful action has a shortcut, hints shown inline; ⌘K command palette reaches anything.
  `[PRINCIPLE]`
- **Triage as a flow.** Incoming work has a dedicated triage surface to accept / assign / prioritize fast. `[PRINCIPLE]`
- **Cycles & focus.** Time-boxed cycles + a clean "what's mine now" view keep attention on the next action. `[PRINCIPLE]`
- **Empty states do work** — they explain the feature, show a sample, and offer the primary action. `[PRINCIPLE]`
- Use for: speed/optimistic UI, command palette, triage/inbox, focus views, empty states.

## Stripe — *trust through forms, microcopy & data*
- **Forms are the masterclass.** Inline validation on blur (not every keystroke); errors sit under the field in plain,
  fixable language ("Your card number is incomplete"), never codes. `[PRINCIPLE]`
- **Microcopy states the outcome.** Buttons say "Pay $20", not "Submit"; helper text preempts confusion. `[PRINCIPLE]`
- **Numbers & money are formatted impeccably** — locale, currency, alignment, tabular figures. `[PRINCIPLE]`
- **Dashboards drill down.** Top-line metric → trend → the underlying rows, without a context switch. `[PRINCIPLE]`
- Use for: forms/validation, CTA & error copy, money/number formatting, metric dashboards.

## Notion / Airtable — *one dataset, many views; flexible structure*
- **Same data, multiple views.** A collection renders as table, board, calendar, gallery, or list — switching the lens,
  not the data. `[PRINCIPLE]`
- **Composable surfaces.** Blocks/properties let a surface be assembled from parts rather than hard-coded. `[PRINCIPLE]`
- **Slash / inline menus** put creation and structure inline where the cursor is. `[PRINCIPLE]`
- Use for: multi-view over one dataset, filtering/grouping/sorting, inline create.

## Figma — *real-time collaboration & presence*
- **Presence is live.** Multiplayer cursors, avatars of who's here, and changes appearing in real time. `[PRINCIPLE]`
- **Comments live on the artifact.** Threaded, anchored to the exact spot, resolvable. `[PRINCIPLE]`
- Use for: presence/avatars, inline/anchored comments, real-time updates.

## Superhuman / Raycast — *velocity, command, and delight*
- **Speed is the product.** Keyboard-driven, sub-100ms-feel interactions, no wasted motion. `[PRINCIPLE]`
- **Command palette is the home base** — fuzzy search to any action or destination. `[PRINCIPLE]`
- **Split / smart inboxes** separate what matters now from the rest. `[PRINCIPLE]`
- Use for: command palette, keyboard velocity, smart grouping, micro-delight.

## Apple HIG / Things — *the native gold standard; physics & restraint*
- **Motion is physical.** Spring-based, interruptible animations; nothing moves linearly. `[PRINCIPLE]`
- **Feedback is instant.** Controls respond on touch-*down* (subtle scale/highlight), not touch-up. `[PRINCIPLE]`
- **Haptics are meaningful** — selection ticks, light impact on toggles, success/error notifications. `[PRINCIPLE]`
- **Accessibility is first-class** — labels on every control, Dynamic Type, Reduce Motion, ≥44pt targets. `[PRINCIPLE]`
- Use for: native motion/haptics, touch feedback, accessibility, the DETAIL pass on any RN target.

## Slack / Duolingo — *activation, habit & humane notifications*
- **Onboarding teaches by doing** — the first real action happens fast, guided, with a payoff. `[PRINCIPLE]`
- **Notifications are grouped and actionable**, not a firehose; you can act without opening the app. `[PRINCIPLE]`
- **Progress is visible** — streaks, completion, "you're set up" moments reward the user. `[PRINCIPLE]`
- Use for: onboarding/first-run, activation moments, notification grouping, progress/reward.

---

## Adding exemplars
This list is a starting point, not a ceiling. If the app's capability isn't well-covered above, find the company that
genuinely owns it, verify the mechanism with `WebSearch`/`WebFetch`, cite it `[PRINCIPLE]`/`[VERIFIED]`, and (if it'll
recur) append it here with the same discipline: documented approach only, no invented numbers, one company per claim.
