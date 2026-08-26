---
name: polish
description: Ruthlessly scan an entire codebase statically and surface every UI/UX enhancement that would make the app shine — micro-interactions, motion, refined copy, empty/loading/error states, accessibility, typographic rhythm, consistency, layout/adaptivity, forms, performance/jank, and gestures — then apply the ones you approve. Polish, NOT redesign: never touches information architecture, navigation, data model, component APIs, or adds features/dependencies. Findings fan out across expert-lens desks over bounded slices; each cites file:line + a read-proof anchor, explains WHY it elevates the experience, names a billion-dollar company that does it (truthfully, never an invented spec), and is classed OBJECTIVE/CONVENTION/TASTE. Use when the user says "/polish", wants to make an app feel great / more premium / "Apple-quality", asks for UI/UX polish, micro-interactions, or wants every shippable refinement found across the codebase.
version: 1.2.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [linux, macos]
---

# `/polish` — Make It Shine

Turn "it works" into "it feels great." `/polish` reads the code **statically** (it never runs the app), fans out a
team of expert-lens desks across **every UI file** (in bounded slices so coverage is real, not aspirational), and
returns an exhaustive, evidence-cited punch-list of refinements — each small, surgical, classed by defensibility, and
grounded in how the best product companies in the world actually work. Then it applies the ones you approve, behind a
two-tier safety gate, with surgical per-finding revert.

This is **polish, not redesign.** If a finding would change what the app *is*, it's out of scope by construction.
And it polishes the app toward **its own** best self — not toward a generic clone of any north-star.

## Invocation
```
/polish                          # sweep the whole repo (default)
/polish src/screens/Dashboard    # narrow to a path (dir, screen, or component)
/polish DashboardScreen.tsx      # narrow to a single file
```
No other flags. Default is ruthless whole-codebase coverage.

## The Doctrine (read `references/doctrine.md` in full; paste it into every desk agent)
A finding qualifies as **polish** only if it passes all three axes — **Untouchables** (no IA/nav/data-model/props-API/
new-screen/feature changes) · **Blast radius** (edit ≤ ~2 files & ≤ ~40 LOC) · **Change type** (the allow-list:
states, motion, rhythm, color/elevation, empty/loading/error, microcopy, a11y, press/haptic, dark-mode, easing). Plus:
- **New code** → only a small presentational primitive, tagged `[NEW CODE]`, **pick-only** (never bulk-applied).
- **New deps** → **never auto-added**; tagged `[REQUIRES DEP]`, report-only.
- **Preserve identity** → north-stars are a *technique* library, not a skin; the **App Style Profile** (Phase 0.5) is
  the primary target. Erasing a deliberate brand choice to be "more like <north-star>" is OUT OF SCOPE.
- **Citation integrity** → every WHO is `[DOCUMENTED]` (number is in `north-stars.md`) or `[PRINCIPLE]` (no invented
  number). Every finding carries a read-proof `anchor` and a **class**: **OBJECTIVE** (measurable gap) · **CONVENTION**
  (breaks the app's own system) · **TASTE** (preference — offer-worded, pick-only).
- **Exhaustive, not flood** → find everything; trivial/low-confidence items go in a collapsed `Minor` group, not the cut.

Everything considered-but-excluded lands in `OUT OF SCOPE (redesign)` so the user sees it was weighed.

## The Desks (expert lenses — deep charters in `references/desks/`)
Run only the desks the detected stack + surface map warrant (e.g. skip **Forms** with no inputs, **Gestures** on a
keyboard-first desktop web app).

| Desk | Hunts for | Charter |
|------|-----------|---------|
| Motion | micro-interactions, easing/spring, transitions, press feedback, haptics, reduced-motion | `desks/motion.md` |
| Copy | button verbs, error/empty/loading text, tone & casing, Intl formatting, terminology | `desks/copy.md` |
| States | empty / loading / error / first-run / offline / optimistic / undo / skeletons | `desks/states.md` |
| A11y | contrast, focus, SR labels, 44pt targets, dynamic type, busy/value state, focus order | `desks/a11y.md` |
| Typography | type scale, line-height, tabular-nums, spacing grid, radius/shadow/elevation, density | `desks/typography.md` |
| Consistency | magic numbers vs tokens, value/icon/opacity drift, dark-mode parity & depth | `desks/consistency.md` |
| Layout | safe-area/insets, keyboard avoidance, truncation, splash-flash, large-screen, RTL | `desks/layout.md` |
| Forms | focus states, validation timing, autofill, show/hide, busy submit, inline affordance | `desks/forms.md` |
| Performance | list jank (`keyExtractor`/memo/`getItemLayout`), inline-prop churn, native-driver, lazy images | `desks/performance.md` |
| Gestures | swipe-to-delete, long-press, swipe-back, drag-dismiss, pull-to-refresh, gesture haptics | `desks/gestures.md` |

## Execution Protocol

### Phase 0 — Scan & inventory  (`scripts/scan.py`)
Run `python3 scripts/scan.py <path|.> --json > .polish/scan.json` (create `.polish/` first). It deterministically
detects the **stack**, flags **UI-surface files**, groups them into **bounded slices** (≤15 files / ≤2500 LOC each),
and classifies `package.json` scripts into the **verify gate**: Tier A (revert on fail), Tier B (snapshot/visual —
update, never revert), EXCLUDE (`start`/`dev`/`serve`/`ios`/`android` — never run, would launch the app). Print the
one-line plan + gate classification and let the user correct any unclassified script before proceeding.

### Phase 0.5 — Calibrate to the app's OWN design language  (run once, before any desk)
**`/ascend` handoff:** if `.ascend/handoff.json` exists, the app was just built up by `/ascend`. Seed the App Style
Profile from its `style_profile` path instead of re-deriving from scratch, **prioritize its `files_touched`** in the
slice ordering, and treat its `deferred_polish[]` as pre-identified candidates. Still verify against the real files.

Before judging the app against anyone, learn what it's trying to be. Read (don't skim): the theme/tokens source; the
2–3 most-developed / highest-traffic screens + the shared primitives (Button/Card/Header); and brand/voice signals
(app name, tagline, onboarding copy, casing convention, motion already present). Write a short **App Style Profile** —
*design language* (palette, type ramp, spacing/radius scale, elevation, density) · *voice & tone* (person, formality,
casing, signature phrasing) · *intentional signatures* (deliberate distinctive choices). **Paste this profile into
every desk prompt** alongside the doctrine. It — not the north-stars — is the primary target.

### Phase 1 — Fan-out over the (desk × slice) work-list
For each active desk × each slice from `scan.json`, spawn an Agent (`general-purpose`). **Batch 3 concurrent;
sequential between batches.** Into each agent paste **in full**: `references/doctrine.md` + `references/north-stars.md`
+ that desk's `references/desks/<desk>.md` + the **App Style Profile** + the slice's file list. Instruct it to:
- read **every file in its slice** and return `covered_files[]` PLUS `receipts{}` — each covered file's first
  non-empty line, verbatim; `aggregate.py` verifies receipts against disk and a claimed file with no matching
  receipt counts as UNSWEPT (coverage is proven, never claimed);
- emit findings to `.polish/findings/<desk>-<slice>.json` in the `output-template.md` schema — each with `file`,
  `line`, **`anchor`** (verbatim snippet at that line), `what`, `why`, **`who`** (`[DOCUMENTED]`/`[PRINCIPLE]`/none),
  `fix` (stack-idiomatic, paste-ready), **`class`**, `change_type`, optional `fix_target`, `flags`, `confidence`;
- route anything failing an axis to `out_of_scope[]`; obey the doctrine; never invent a company spec.
Use `opus` for Copy and Motion desks (taste depth); `sonnet` for the rest.

### Phase 2 — Aggregate & report  (`scripts/aggregate.py`)
Run `python3 scripts/aggregate.py --findings .polish/findings --root <path> --scan .polish/scan.json
--state .polish/state.json --out .polish/POLISH.md`. The script mechanically: **verifies every citation** (phantom
`file:line` AND mismatched `anchor` → `Rejected`), **verifies citation numbers** (every `[DOCUMENTED]` number is
checked against `north-stars.md`; an unblessed number auto-downgrades to `[PRINCIPLE]`, flagged
`CITATION-DOWNGRADED` — qualitative citation truth remains the desks' and reviewer's duty), **verifies read
receipts** (a covered-file claim only counts when its receipt matches disk),
**dedupes** by `(file,line,change_type)` merging desks, **detects conflicts** (same target, different fix →
precedence ladder, pick-only), assigns **stable content-hash IDs**, scores **tier S/A/B**, asserts **coverage**
(`UNSWEPT` = surface files without receipt-verified coverage; a missing `--scan` map is announced loudly, never
silently skipped), **buries the graveyard** (previously-declined IDs render collapsed, never re-proposed), computes
**apply order**, and renders `.polish/POLISH.md` + a `findings.index.json` sidecar + the `state.json` ledger.
**Phase 2b (citation audit) is now mechanical** — including truthfulness, not just existence. Then print the
**inline summary** (pipeline-arrow counts with the class split + ★ signature wins + pick-only counts), per
`output-template.md`.

### Phase 3 — Apply menu  (safe, surgical, VCS-agnostic)
Ask: **Apply? [ ALL · by desk · pick &lt;ids&gt; · none ]**. `[NEW CODE]`, `[REQUIRES DEP]`, **TASTE**, and **CONFLICT**
items are **pick-only** — excluded from ALL / by-desk bulk; they apply only when named explicitly by ID.
Read `findings.index.json` for the per-id fix + `apply_order` (NEW CODE primitives first). For each finding, in order:
1. **Back up** the target file(s) to `.polish/backup/<id>/` before editing (this snapshot includes all prior
   successful edits to that file — so restoring it undoes only this finding, preserving siblings).
2. Apply the edit (Edit tool).
3. After a batch (or per-finding for high-risk), run the **Verify Gate** (3b). On Tier-A failure, restore the batch's
   backups most-recent-first, re-running Tier-A until green; each restored finding → `- [!]` with `↳ REVERTED: <err>`.
4. On success, flip the checkbox to `- [x]` (keyed by **ID**) and append the id to `state.json` `applied[]`.
5. When the user **declines** findings (`none`, skip, or an explicit no), record each id in `state.json`
   `declined{id: reason}` (capture the stated reason when given) — the graveyard. Declined findings are never
   re-proposed; they render collapsed on future runs.
*(If the tree is clean and the user prefers a git trail, additionally `git commit` per surviving finding
`polish: <id> <what>` on the current branch — opt-in, never on a dirty tree, never auto-pushed.)*

### Phase 3b — Verify Gate (two-tier; static; no app run)
- **Tier A — correctness (revert on fail):** the `scan.json` Tier-A scripts (`tsc --noEmit`, `eslint` on changed
  files, compile/`build`). A failure = real breakage → revert the offending finding.
- **Tier B — snapshot/visual (update, never revert):** if Tier-B scripts (or `*.snap` files) exist, a failure is
  *expected* (appearance changed). Re-run with the updater (`jest -u` / `playwright --update-snapshots`) scoped to
  changed files, re-run Tier A to confirm nothing else regressed, and surface as `⟳ N snapshots updated — review`.
- EXCLUDE scripts are never run.

### Phase 4 — Visual handoff
`/polish` can't see pixels. End by listing the TASTE findings + any motion/contrast/layout finding (even after a green
gate) as "compiles, needs eyeballing," and suggest **"run `/verify` or `/run` to eyeball these N visual changes."**

### Re-run = Stateful Delta
On a later `/polish`, pass the existing `.polish/state.json`: `aggregate.py` skips files whose hash is unchanged,
**re-opens** files the user hand-edited, and the report ticks already-`applied[]` IDs. Offer to continue the
unfinished remainder before scanning for anything new. The `state.json` `applied[]` list (not the checkbox) is the
source of truth → crash-resumable.

## Claude Code Notes
- Parallelism via the **Agent tool**, max 3 concurrent, sequential between batches (avoid context saturation).
- **Paste charters in full** into each desk agent — never summarize `doctrine.md`, `north-stars.md`, the desk file, or
  the App Style Profile. The desk agent's whole job is its slice through its one lens.
- Run scripts with the **Bash tool** (`python3`, stdlib-only — no install). All artifacts live under `.polish/`
  (suggest the user gitignore it). Write `.polish/POLISH.md` there, not repo root; if a foreign root `POLISH.md`
  exists, don't clobber it.
- Evidence standard: every finding cites `file:line` + a real `anchor`; WHO is `[DOCUMENTED]`/`[PRINCIPLE]`/none —
  **never an invented company number**; a fix you can't ground in real code doesn't ship.

## Pitfalls
1. **Scope creep** — a "polish" finding that quietly crosses an Untouchable. Route it to `OUT OF SCOPE`.
2. **Fabricated specs** — citing "Linear uses 140ms" when it's not in `north-stars.md`. Use `[DOCUMENTED]`/`[PRINCIPLE]`.
3. **Homogenizing** — sanding the app into a Linear/Vercel clone. Calibrate first; the App Style Profile wins ties.
4. **Pathologizing a decision** — flagging a uniform absence (motion-free, sentence-case) N times. Run the
   intentional-vs-oversight test: uniformity = intentional, inconsistency = the finding.
5. **Stack mismatch** — `:focus-visible` on React Native, `hitSlop` on the web. Detect first, adapt always.
6. **Snapshot-as-breakage** — reverting legit polish because a snapshot test changed. That's Tier B → update, not revert.
7. **Auto-applying the wrong tier** — `[NEW CODE]`/`[REQUIRES DEP]`/TASTE/CONFLICT are pick-only. Never bulk.
8. **Dirty-tree damage** — never `git stash`/commit a user's unrelated uncommitted work; the default revert is the
   `.polish/backup/` file snapshot, not git.
