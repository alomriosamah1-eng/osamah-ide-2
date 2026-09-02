---
name: gauntlet
description: "Ruthless, goal-anchored readiness audit + fix plan run by a publishing-house of role-defined agents. Three steps: (1) GRILL — a project-adaptive interview that locks goal/deadline/demo with zero guessing; (2) AUDIT — bounded-slice multi-desk rounds (sweep → cross-desk → red-team → cross-exam → live field-test → subtraction) returning ONE punch-list + a quantitative GO/NO-GO gated on 'does this block <goal> by <deadline>?'; (3) FIX PLAN — a dependency-ordered, conflict-checked, verifiable remediation plan with opt-in tier-by-tier execution. Use for ship/handoff readiness, 'are we ready to launch', 'run it through the gauntlet', 'make me a fix plan', or to make a codebase razor-sharp against a concrete goal + date. Stateful across runs (per-project bar). Borrows grill-me's interview + elon-audit's fix-plan; replaces neither."
version: 2.0.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [linux, macos]
---

# Gauntlet — The Newsroom

A multi-agent readiness audit **and fix plan** that leaves whatever it touches **razor-sharp**. A publishing house: a **Publisher** (you, the main thread) casts a bench of **role-defined desks**, runs them through deliberation rounds, synthesizes one blunt verdict — then hands you an ordered, safe plan to clear it. **Three steps**, all gated on a single question (*does this block the goal by the deadline?*):

1. **GRILL** — lock the bar: what does *done* mean for THIS project, by when? *(the best of grill-me, adaptive per project type)*
2. **AUDIT** — ruthless, bounded, live: surface every blocker with evidence. *(bounded slices — surpasses elon-audit's whole-repo scan)*
3. **FIX PLAN** — a dependency-ordered, conflict-checked, verifiable remediation plan, with opt-in execution. *(the best of elon-audit's executable plan)*

**What makes it sharp, not just thorough:** every desk inherits `references/doctrine.md` — guilty until proven, evidence or it fails, attack the strong parts, delete what isn't earned, fix without causing more issues, and a GO bar that defaults to NO. And it fixes elon-audit's core flaw: **no agent ever reads the whole repo** (see the Bounded-Slice Guarantee below).

---

## Invocation

```
/gauntlet                                  # fast triage, foreground
/gauntlet "hand off to the team, live by 2026-05-29"
/gauntlet --deep --goal "payments live" --deadline 2026-05-29
/gauntlet --deep --budget-files 25 --budget-loc 3000 --desk concurrency
/gauntlet --estimate                       # scope + agent/token preview, spends nothing
/gauntlet --deep --resume                  # reuse completed rounds from the last run
```

- **`/gauntlet`** (Fast) — quick foreground triage: compressed grill, CORE desks, P0-only, top-risk sections, a short ordered P0 fix list. Minutes. Never auto-executes.
- **`/gauntlet --deep`** (Deep) — the full **3 steps**: GRILL → AUDIT (full bench, rounds R1–R7) → FIX PLAN (R8 + opt-in execute). STEP 2 runs as a **background Agent task**; STEP 1 and STEP 3 are interactive in the main conversation. ~10 min. Mirrors `/council --deep`.

Runs against the current working directory. `cd` to the project first. STEP 1 extracts goal/deadline if not supplied, and loads a saved bar from `.gauntlet/bar.json` on re-runs.

---

## The Bounded-Slice Guarantee (read `references/doctrine.md` §0)

**No reasoning agent ever sees the whole codebase.** Every audit agent gets a slice **≤ 25 files / 3,000 LOC** (tunable). Over-budget slices sub-split until they fit. "Global" concerns fan out (one bounded pass per section) or candidate-focus (a script greps → an agent reviews only the hits). Inventory scanning (`split.py`) is mechanical and may read the whole tree — the rule binds *reasoning agents* only. The Publisher **refuses to spawn an over-budget agent.**

---

## The Bench

Full charters in `references/roles/{desk}.md`. Cast per project + goal (see `references/casting-rubric.md`).

| Desk | Beat | Deploy when | Scope | Tier | Model |
|---|---|---|---|---|---|
| Security | secrets, authz/authn, RLS, injection, CVEs | always | fan-out | P0 | opus |
| Reliability | crashes, races, error handling, perf | always | scoped | P1 | sonnet |
| Field-Test | runs the attacks; live proof via MCP | always | scoped | LegB | opus |
| Transferability | env/secret setup, runbook, bus-factor, dead code | always | fan-out | P1 | sonnet |
| Razor | ruthless subtraction → supercharge | always | fan-out | trim | sonnet |
| Money | billing: idempotency, webhook, double-charge | `billing` | scoped | P0 | opus |
| Data | persistence, migrations, data-loss, integrity | `db` | scoped | P0 | opus |
| API-Contract | endpoint/SDK contracts, breaking changes | `public_api` | scoped | P1 | sonnet |
| Concurrency | threads/async, deadlock, ordering | `async_heavy` | scoped | P1 | opus |
| Mobile | iOS + React Native: lifecycle, permissions, ARC/bridge, entitlements | `mobile` | scoped | P1 | sonnet |
| ML-Inference | model load, quant, tokenizer, OOM, determinism | `ml` | scoped | P1 | opus |
| Build-Release | CI, release, version/flag hygiene, rollback | `ci` | scoped | P1 | sonnet |
| Dependency | lockfile health, CVEs, supply-chain, license | `has_lockfile` | fan-out | P1 | sonnet |
| Performance | hot paths, N+1, O(n²), bundle size | `perf` | scoped | P1/P2 | sonnet |
| Copy-UX | UI correctness, content, a11y | `has_ui` | scoped | P2 | haiku |
| AI/LLM-App | prompt injection, RAG correctness, context overflow, cost/tool-loop, eval gaps | `llm_app` | scoped | P0 | opus |
| Embedded | BLE state machine, reconnection, firmware OTA/rollback, protocol framing | `embedded` | scoped | P0 | opus |
| Privacy | PII collection/retention/deletion, on-device vs cloud, consent | `pii` | fan-out | P1 | sonnet |
| Remediation | STEP 3: orders + makes each fix safe (verify + rollback) | STEP 3 | scoped | LegC | opus |

**Beat Pairs (cross-exam pairings):** Money↔Data (idempotency vs the write) · Security↔Reliability (is the unguarded path reachable?) · Security↔Transferability (secret vs documented config) · Reliability↔Money/Data (retry/timeout → corruption) · Field-Test↔every P0 desk (does the claim survive a live run?).

---

## Execution Protocol — Deep Mode (`--deep`): the 3 steps

**STEP 1 runs interactively — you cannot grill the user from a detached task. Once the mandate is locked + cast, STEP 2 (R1–R7) runs as a background Agent task. STEP 3 returns to the main conversation.** Open with: *"Gauntlet — deep mode. Let's lock the bar (STEP 1), then I'll run the audit (STEP 2) in the background and come back with the verdict + fix plan (STEP 3)."*

---

### STEP 1 — GRILL (lock the mandate) `[CHECKPOINT]`
*The best of grill-me, adaptive per project type. Goal: advance to STEP 2 with **zero guesses**.*

1. **Inventory first.** Run `scripts/split.py . --json` → signals + suggested sections + over-budget flags. Risk-rank sections worst-first (money > data > auth > core > infra > UI). Sub-split any over-budget section. **The signals drive the questions** — this is what makes the grill project-specific instead of boilerplate.
2. **Load any saved bar.** If `.gauntlet/bar.json` exists, load it and **confirm deltas** ("goal still X? deadline still Y? new signals since last run?") instead of re-interrogating from scratch.
3. **Grill from `references/intake-templates.md`.** Ask the **Core Bar** (GOAL · DEADLINE · DEMO that must pass · who operates it UNAIDED · NON-GOALS · CRITICAL PATHS), then **only the signal blocks that fired** (billing → real-money-by-date; mobile → App Store review window; embedded → OTA/rollback; llm_app → eval/cost/latency; db → migration/backup; …). Use the **AskUserQuestion** tool for the structured bar; drop to freeform follow-ups to resolve ambiguity. Discipline: **recommend an answer first, never accept vague, read the code before asking** if the code can answer it.
4. **Stop condition = zero guessing.** Keep a running ledger of open unknowns. Do **not** advance to STEP 2 until GOAL, DEADLINE, DEMO, each owner's unaided task, NON-GOALS, and **every fired-signal blocker** are facts you did not guess. *If you'd have to assume it to run the audit, you must ask it.* Not capped at a question count.
5. **Lock + persist.** Write the resolved mandate to `.gauntlet/bar.json` (goal, deadline, demo, owners, non-goals, signals, critical paths). It seeds every desk prompt's `Goal under audit / Critical paths here` line.
6. **Threat-model the mapped surface** (read `references/threat-model.md`). Using the split map + manifests + docs + the locked bar, produce `.gauntlet/threats.json`: assets, trust boundaries, and STRIDE-walked threats `T1…Tn` scored by (impact, likelihood), each tagged with the sections it touches. **Hard gate — coverage rule:** every trust boundary must be the surface of ≥1 threat; an unthreatened boundary means you stopped thinking, not that it is safe. *Signals tell you what technology is present; the threat model tells you what an attacker wants and where they get in. Casting on signals alone points opus desks at whatever has the most files.*
7. **Cast.** Run `scripts/cast.py --goal "<goal>" --mode deep` (piped from split) → deployed desks, scope, model, sections. Assign depth D1/D2/D3 by section risk, then **re-rank by threat**: a section carrying a `critical`/`existential` threat with a `remote_unauth` actor takes D3 + an opus desk whatever its extensions suggested; a section on no threat path drops a tier.
8. **`[CHECKPOINT]` Emit the casting table** (see `casting-rubric.md`) **and the threat table** (`T-id · actor · surface · impact/likelihood · sections`). Confirm every planned agent's slice ≤ budget. → hand STEP 2 to the background task.

---

### STEP 2 — AUDIT (rounds R1–R7)
*Bounded-slice, guilty-until-proven, live-proven — the engine that surpasses elon-audit. Every desk prompt is anchored to the STEP 1 mandate (the real per-project bar, not a guess).*

#### R1 — Sweep (guilty-until-proven) `[CHECKPOINT]`
Spawn deployed desks via the Agent tool, **batch 3, sequential between batches**, `model:` per casting table. Fan-out desks run one bounded pass per section (or candidate-focus via a pre-pass script). Prompt each:
```
You are the {DESK} Desk auditing ONE bounded slice. Your operating standard and charter:
[PASTE references/doctrine.md + references/roles/{desk}.md IN FULL]

Slice: §{section} — files (≤25 / ≤3k LOC): {file list}
Goal under audit: {GOAL} by {DEADLINE}.   Critical paths here: {list}.
Threats landing on this slice (from .gauntlet/threats.json):
  {T-id}: {threat} — actor:{actor} · surface:{entry_point} · impact:{impact}/{likelihood} · controls:{controls}
Find the vulnerabilities that COMPOSE these threats — that is what you are here for. Anything
outside them is still reportable. A threat whose `controls` claim you can DISPROVE is a finding
in itself. Tag each finding with the threat it serves: threat:"{T-id}" (or "none").

Audit guilty-until-proven. Every finding: cite file:line, give an EXACT fix, attach an
evidence-ledger entry {claim, evidence-type, verdict}, a stable id {desk}-{section}-{n},
and — if this fix requires another finding fixed first — deps:[<that id>]. Anything you
cannot prove → UNPROVEN, never softened to a pass. Banned words: probably/should/appears/seems.
Hand executable attacks to Field-Test. Stay inside your beat (see Out of Scope).
Output: your R1 JSON findings array, ranked by impact. Write to
.gauntlet/findings/{run}/{desk}-{section}.json
```
`[CHECKPOINT]` Confirm all desk×section outputs collected. Log `[R1] {desk}/{section}: {n} findings`.

#### R2 — Cross-Desk (interaction + false-positive) `[CHECKPOINT]`
For every file flagged by ≥2 desks, give the paired desks (Beat Pairs) each other's co-located findings:
```
You are the {DESK} Desk, Round 2. Findings other desks filed on YOUR files:
[paste co-located findings]
1. INTERACTION — what bug does the combination create that none of us filed alone? Cite it.
2. FALSE-POSITIVE — is any of their P0 actually guarded/handled upstream? Cite the guard, then
   DEFEND (mine stands because…) or DOWNGRADE.
Output: your R2 Cross-Desk format. New interaction bugs become new findings.
```
**Enforcement — interaction-coverage:** no file flagged by ≥2 desks may go un-cross-checked.

#### R3 — Red-Team `[CHECKPOINT]`
Each P0 desk attacks what looks SOLID (not weak code):
```
You are the {DESK} Desk. Red-team §{section}'s STRONG parts. Assume hostile user, flaky network,
10× load, replay, race, clock skew, mid-failure. Author ≥1 concrete attack on a claim currently
believed safe; predict the break + blast; hand executable steps to Field-Test.
Output: your R3 Attack format.
```

#### R4 — Cross-Exam (contested P0s only)
For each P0 still disputed after R2, Publisher moderates:
```
CONTESTED P0: {finding}. {Desk A: blocker} vs {Desk B: guarded at file:line}.
Desk A defend ≤80 words w/ evidence. Desk B rebut ≤80 words w/ evidence.
Publisher ruling: STANDS | DOWNGRADED | →FIELD-TEST. Record the rationale.
```

#### R5 — Field-Test (prove the survivors) `[CHECKPOINT]`
The Field-Test desk consumes every Hand-to-Field-Test block + `references/field-test-playbook.md`, runs each recipe (test-mode / controlled clock / **MCP-live if a relevant MCP is connected**), and stamps PROVEN / DISPROVEN / UNPROVEN. Irreversible real-money/destructive steps → `[USER MUST RUN]` with a predicted result. **Enforcement — live-coverage:** every critical-path P0 must have a Field-Test verdict or be `UNPROVEN` (= P0-equivalent risk).

#### R6 — Sharpen (subtraction → supercharge)
Razor desk leads: a **delete-list** (exact removals — dead code, unreached branches, speculative abstractions, unused deps) per section, then **supercharge** diffs only on code now proven correct + lean. A section with no Razor coverage cannot be certified GREEN.

#### R7 — Verdict
Run `scripts/aggregate.py --findings .gauntlet/findings/{run} --root . --goal "<goal>" --deadline <date> --history .gauntlet/history.json` → citation-verify (phantoms rejected) → dedupe → score → delta → `READINESS.md` + GO/NO-GO. *R7's verified, deduped, scored punch-list is the input to STEP 3.*

---

### STEP 3 — FIX PLAN (R8 + opt-in execute)
*The best of elon-audit: not just what's broken, but the exact order to fix it **without causing more issues**. Embodies doctrine principle 8. Returns to the main conversation.*

#### R8.1 — Order (mechanical)
Run `scripts/plan.py --findings .gauntlet/findings/{run} --root . --goal "<goal>" --deadline <date>`. It reuses `aggregate.py`'s finding set + scoring, then: tiers P0→P1→P2; applies the **promotion rule** (a fix another fix depends on is pulled up to its dependent's tier); topologically sorts by `deps` (cycle-guarded); and **flags conflicts** (≥2 fixes touching one file / overlapping lines → coordinate as ONE edit). Writes `FIX_PLAN.md` (skeleton) + `.gauntlet/plan.json`.

#### R8.2 — Safety pass (bounded reasoning)
Spawn the **Remediation** desk (paste `references/doctrine.md` + `references/roles/remediation.md`) on `.gauntlet/plan.json`. For each step it fills **what · why-safe · exact change/diff · blast radius · verification · rollback** — reusing the Field-Test recipe where the finding carried one, else a build/test gate. It **merges conflict-clustered fixes into one coordinated patch**, honors dependency order, and marks anything irreversible/unverifiable `[USER MUST RUN]` / `[NEEDS MANUAL CONFIRM]` — never applied blind. Bounded: it reads only each fix's files, never the whole repo.

#### R8.3 — Present + offer execution
Present `FIX_PLAN.md` in the main conversation alongside the verdict. Then **offer** (do not auto-run) tier-by-tier execution:
- Execute P0 → run the build/test gate → re-run the relevant Field-Test recipe (confirm `UNPROVEN → PROVEN` — the fix actually closed the finding, not just compiled) → `git commit -m "[gauntlet] P0: {n} fixes"`. Then P1, then P2.
- **Stop on any failure**; surface the regression; do not proceed to the next tier.
- **Never auto-run a `[USER MUST RUN]` step** (real money / destructive prod) — hand it to the user with a predicted result.
- Execution requires explicit approval; if invoked in plan mode, it waits for ExitPlanMode.

---

## Execution Protocol — Fast Mode (default)

Foreground, no background task. **STEP 1 compressed** — load `.gauntlet/bar.json` if present and confirm goal + deadline + any fired-signal blocker; ask only what's missing (≤3 Q). → `cast.py --mode fast` (CORE desks: Security, Reliability, Field-Test + Money/Data if signals fire) → R1 **P0-only** on the top-3 risk sections → R3 quick attack on the P0s → R7 aggregate → **plan stub** (`plan.py` produces a short ordered P0 fix list; the full dep/conflict/verify treatment + execution are deep-only). Skips R2/R4/R6/R8.2. Emits the same blunt GO/NO-GO. **Never auto-executes.** For the full 3-step pass, tell the user to run `--deep`.

---

## Model-Tier Routing

Assign `model:` per the casting table: **opus** for P0 desks (Security, Money, Data, Concurrency, ML-Inference), Field-Test, and Remediation; **sonnet** for P1 desks; **haiku** for Copy-UX. Emit the routing inside the casting table `[CHECKPOINT]` before R1. Specify `model: "opus"` in those Agent calls.

## Scoring + GO/NO-GO

Authority: `references/scoring-rubric.md` (implemented by `aggregate.py`). Per-finding `impact = severity × confidence × blast`; **UNPROVEN critical path = P0-equivalent**; section 0–100 (any open P0 or UNPROVEN-crit → RED; no subtraction → capped YELLOW); overall ship-confidence %. **GO** only on zero P0 + zero UNPROVEN-crit + all critical-path live tests PASS + confidence ≥ 80. Else **NO-GO** + exact blocker count. Never hedge.

## Scope Estimate (`--estimate`, and always before R1)

A deep run spawns a bench of opus desks. **Preview the spend before committing it, never after.** After casting, emit and pause:

```
SCOPE ESTIMATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sections:   N   (M over budget → sub-split to K)
In scope:   N files · N LOC   (excluded: N files — vendored/generated/lockfiles)
Agents:     N desks × N sections = N spawns   (opus: N · sonnet: N · haiku: N)
Rounds:     R1-R7   est. input ≈ N tokens (slice LOC × desks-per-section × 1.3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

`--estimate` prints this and **exits** — no agents, no spend. In a normal deep run it is the last thing before R1; if the spawn count exceeds ~40, say so plainly and offer to narrow (`--desk`, fewer sections, fast mode) before proceeding. Silent cost is a defect: a run that quietly burns an afternoon of budget is worse than one that asks.

## Resume (`--resume`)

Rounds are expensive and R5 field-tests are slow — a run that dies at R6 must not restart at R1. Each round writes its output under `.gauntlet/findings/{run}/` already; `--resume` reuses every completed round's artifacts and re-enters at the first incomplete one.

- Run id is stable per repo (`sha1(abspath)[:12]` + date), so a resume finds its own prior run.
- A round counts as complete only when **every** planned desk×section output for it exists — a partial round re-runs the missing slices only.
- **Never resume across a changed tree.** If `git rev-parse HEAD` or the working-tree hash differs from what the checkpoint recorded, resume is refused for the affected sections and they re-run; stale findings against edited code are how a fix plan gets built on a bug that no longer exists.
- `.gauntlet/history.json` already re-opens proven-green items whose files changed. Resume honors the same rule.

## Stateful Delta (`.gauntlet/`)

`history.json` rolls prior runs. Every run reports deltas (`P0: 6 ▼ from 11`), resurfaces parked items past their revisit date, and **re-opens any proven-green item whose source file changed** (git hash) — green is never inherited blindly. `READINESS.md` + `FIX_PLAN.md` → repo root; the locked mandate (`bar.json`), the threat model (`threats.json`), findings, the drop trail (`dropped.json`), `plan.json`, and history → `.gauntlet/` (gitignore-friendly). On re-run, STEP 1 loads `bar.json` and confirms deltas rather than re-grilling, and diffs the new threat model against the old one — **a newly-appeared trust boundary is a headline, not a footnote.**

## Enforcement Scans (run before the verdict)
- **Scope gate** — refuse any agent slice over budget; sub-split first.
- **Threat-coverage** — every trust boundary in `threats.json` is the surface of ≥1 threat, and every `critical`/`existential` threat has ≥1 desk that audited its sections. A threat nobody hunted is reported as `UNHUNTED` and scored as UNPROVEN-critical.
- **Interaction-coverage** — every ≥2-desk file cross-checked in R2.
- **Live-coverage** — every critical-path P0 has a Field-Test verdict or is UNPROVEN.
- **False-positive** — any P0 challenged in R2 and undefended is downgraded with rationale.
- **Citation-verification** — `aggregate.py` rejects any finding whose file:line doesn't exist.
- **Drop-accounting** — every finding that leaves the punch-list leaves a receipt in the dropped appendix (`DUPLICATE`, `PHANTOM_CITATION`, `DOWNGRADED`, `DISPROVEN`, `OUT_OF_SCOPE`). A silent drop is indistinguishable from a miss. Read the appendix before trusting a clean run.
- **Evidence gate** — no GREEN without a logged evidence ledger.
- **Gate-integrity** — never GO with an open P0 or UNPROVEN critical path.
- **Plan-safety** (STEP 3) — no two un-merged fixes target the same region; every P0 fix step ships a verification + a rollback.

---

## Output Formats

**Per-section block (inline, during synthesis):**
```
──────────────────────────────────────────────
§{section}  risk:{rank}  depth:{D1/D2/D3}  readiness:{n}/100  {GREEN/YELLOW/RED}
desks: {[SEC][$][DATA][REL][LIVE][CUT]…}
P0  {id} [desk] file:line  {issue}            → FIX {…}   evidence:{verdict}
LIVE {recipe} → {PROVEN/UNPROVEN}  [USER MUST RUN]: {…}
CUT  {exact removals}
BLOCKS: {the items failing the bar, or "none"}
──────────────────────────────────────────────
```

**Final report (also written to `READINESS.md`, template in `references/examples/sample-readiness.md`):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GAUNTLET — {PROJECT}
GOAL: {…}   DEADLINE: {date}   MODE: deep   ship-confidence: {%}  ({Δ})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERDICT: {GO / NO-GO} — {N} P0 + {K} UNPROVEN-crit between you and ship.

THREATS (by impact)      {T-id} {actor} → {surface} {impact}/{likelihood} — {n} findings | UNHUNTED
SECTIONS (worst-first)   §{name} {🟢🟡🔴} {n}/100 — {why}
P0 — BLOCKS              {id} [desk] file:line {issue} → FIX | [USER MUST RUN]   threat:{T-id}
P1 — SHOULD FIX
P2 — PARKED (post-goal)
CUT — {delete-list, LOC removed}
DROPPED — {n} ({k} duplicate · {k} phantom · {k} downgraded · {k} disproven)  → .gauntlet/dropped.json
LIVE TESTS               {n} run, {k} [USER MUST RUN]
DELTA                    P0 {Δ} · ship-confidence {Δ} · re-opened {files}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Fix plan (STEP 3 — written to `FIX_PLAN.md` by `plan.py` + the Remediation pass):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GAUNTLET — FIX PLAN   GOAL: {…}   DEADLINE: {date}
{N} ordered fix(es) · {K} conflict cluster(s) · {M} [USER MUST RUN]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P0 — BLOCKS         [n] {id} [desk] file:line {⬆ promoted?}
                        what / why-safe / change / verify / rollback
                        [CONFLICT: merge with {ids}]   [USER MUST RUN: {…}]
P1 — SHOULD FIX
P2 — SUPERCHARGE
CONFLICT CLUSTERS   {file → ids that must be edited together}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Execute top→bottom, tier by tier; build/test gate + commit after each tier; stop on the first failure.

---

## Claude Code Notes
- **Agent tool for all parallelism**: batch 3, sequential between batches (3 concurrent max — context saturation).
- **Embed the full charter**: paste `doctrine.md` + the desk's `references/roles/{desk}.md` into every Agent prompt — they are not auto-injected. Don't summarize.
- **`model:` per the casting table** — opus for P0 desks + Field-Test + Remediation.
- **MCP-opportunistic**: if a relevant MCP (e.g. Supabase) is connected, the Field-Test desk uses it for live RLS/data/config proof; otherwise mark UNPROVEN. Never require an MCP.
- **Scripts are deterministic helpers** (`split.py`, `cast.py`, `aggregate.py`, `plan.py`, `field_test_scaffold.py`) — they build the map, cast, score, and order the fix plan; the desks do the reasoning.
- **STEP 1 (grill) + STEP 3 (plan + execution) are interactive in the main conversation; only STEP 2 (R1–R7) of `--deep` runs in the background.**

## Pitfalls
- **Never spawn a whole-repo agent.** If a slice is over budget, sub-split — the entire point vs elon-audit.
- **Never guess past the grill.** STEP 1 doesn't end on a question count; it ends when nothing the audit/fix-plan needs is left to assumption.
- **Never upgrade a prediction to a pass.** Only the Field-Test desk, having run it, moves UNPROVEN → PROVEN.
- **Don't force consensus.** A contested P0 goes to R4; the tension is the finding, not a thing to paper over.
- **Don't fake-run real money or destructive prod actions** — `[USER MUST RUN]` with a predicted result, always.
- **Never apply two conflicting patches blind.** If `plan.py` flagged a file cluster, the Remediation desk merges them into one coordinated edit.
- **Execution is opt-in and gated.** Per-tier build/test gate + commit, stop on the first failure, explicit approval required. Never auto-run a `[USER MUST RUN]` step.
- **Default to NO.** "Almost ready" is NO-GO.
