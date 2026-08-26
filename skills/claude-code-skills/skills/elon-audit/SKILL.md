---
name: elon-audit
description: First-principles surgical audit of an entire codebase. Previews its own scope/cost before spending, threat-models the attack surface so the sweep hunts named targets instead of a generic checklist, scours 100% of files via parallel agents with receipt-verified coverage (UNMAPPED and UNHUNTED must both be empty), surfaces every bug/waste/risk ranked P0→P2 with exact fixes and proven-vs-suspected evidence, cross-examines its own findings with adversarial verifiers before anything executes, records every dropped finding in an audit trail, checkpoints so a long run can resume, and delivers a dependency-ordered executable plan. One command. Use when you want to ruthlessly debug, clean, and supercharge a project.
---

# Elon Audit — First-Principles Codebase Audit

Surgical, zero-mercy audit of the entire repo. Every file read. Every bug surfaced. Every fix specified to the line. Delivered as an executable plan ready to approve and run.

**Philosophy:** Delete what isn't proven. Fix what's broken. Supercharge what's verified. No vague recommendations. No nice-to-haves. Every finding ships with a specific fix or an honest `[NEEDS MANUAL CONFIRM]`.

---

## Invocation

```
/elon-audit
/elon-audit --build "xcodebuild -scheme KeepApp -destination 'platform=iOS Simulator,name=iPhone 16'"
/elon-audit --estimate      # scope + agent/token preview, spends nothing
/elon-audit --resume        # re-enter at the first incomplete phase
```

Runs against current working directory. `cd` to the project first.

**Checkpoints.** After each phase, write its output to `.elon-audit/<run-id>/phase-N.json` (`run-id` = `sha1(abspath)[:12]`). A whole-repo audit is a long, expensive run; one that dies in Phase 4 must not restart at Phase 1. `--resume` reloads completed phases and re-enters at the first incomplete one.

**Never resume across a changed tree.** Each checkpoint records `git rev-parse HEAD` plus a hash of the working tree. If either moved, the affected phases re-run rather than resume — findings against code that has since been edited are how a fix plan gets built on a bug that no longer exists.

---

## Phase 0 — Scope Estimate (spend nothing, decide first)

**Goal:** Know what this run costs before it starts. Silent cost is a defect.

Count files, LOC, and the slices they imply; derive the agent count; state it and pause.

```
SCOPE ESTIMATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
In scope:   N files · N LOC   (excluded: N vendored/generated/lockfile/binary)
Slices:     N  (≤15 files / ≤2,500 LOC each)
Agents:     N sweep + N verifiers ≈ N spawns
Est. input: ≈ N tokens  (in-scope LOC × ~1.3, read once per sweep + once per verify)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

`/elon-audit --estimate` prints this and **exits**. Otherwise: if the run implies more than ~40 agents, say so and offer to narrow (a subdirectory, `--since <ref>` for changed files only) before continuing. Never start a large run without the user seeing the number.

---

## Phase 1 — Inventory (Sense the Atoms)

**Goal:** Complete structural picture before touching anything.

1. Run `find . -type f | wc -l` and `git log --oneline -10`
2. Run pygount or cloc for LOC/language breakdown (install if missing)
3. Auto-detect build command (priority order):
   - `Package.swift` → `xcodebuild -scheme [detected] -destination 'platform=iOS Simulator,...'`
   - `package.json` with `build` script → `npm run build`
   - `package.json` without `build` → `npm ci`
   - `requirements.txt` / `pyproject.toml` → `pip install -e . && python -m pytest`
   - Multiple stacks → run all, report independently
   - None detected → emit `[NEEDS CONFIRM]`, pause for user input before continuing
4. Build the file manifest. **Stop here — do not spawn yet.**

### Phase 1.5 — Threat Model (before any agent reads code)

*Adapted from Visa's VVAH (Apache-2.0) stage S2. The sweep is only as good as what it's hunting.*

A generic P0/P1/P2 checklist finds checklist bugs. A slice agent pointed at a named threat finds the three
vulnerabilities that compose it. So model the attack surface first, from the manifest + manifests/docs/config
(structure, not source bodies):

> **A threat survives a patch.** "Force-unwrap at `Sync.swift:88`" is a **vulnerability**;
> "silent data loss when the sync token expires mid-write" is a **threat**. Produce threats.

1. **SYSTEM CONTEXT** — what this is, what it does, who runs it, where.
2. **ASSETS** — what it protects or produces (user data, credentials, money, process integrity, availability;
   for agent/LLM systems, the *tool-call capability itself*). Sensitivity `low|medium|high|critical`.
3. **TRUST BOUNDARIES** — every place untrusted input enters or privilege changes. Name the crossing
   (`"unauth network → route handler"`, `"inbound webhook → write path"`).
4. **THREATS** — per boundary, walk STRIDE and emit the plausible ones as `T1…Tn` with
   `{threat, actor, surface, asset, impact, likelihood, controls}`, sorted by (impact, likelihood).
5. **OPEN QUESTIONS** — what the snapshot can't answer. These are `[NEEDS MANUAL CONFIRM]`, never assumptions.

**Coverage rule (hard gate):** every trust boundary must be the surface of ≥1 threat. An unthreatened boundary
is where the real bug is hiding — this is the attack-surface twin of `UNMAPPED = ∅`.

Map each `T-id` to the slices it touches. Write to `.elon-audit/threats.json`.

### Phase 1.6 — Dispatch (sweep with a target)

5. Slice the manifest into bounded batches — ≤15 files or ≤2,500 LOC per agent, whichever binds first (split
   oversized directories, merge tiny ones). Spawn parallel Agent subagents, one per slice, 3 at a time,
   sequential between batches. **Each slice prompt carries the threats landing on it:**
   ```
   Threats on this slice: T3 (remote_unauth → webhook handler, critical/likely, controls: none)
   Find the vulnerabilities that compose these. Anything outside them is still reportable.
   Tag each finding threat:"T3" (or "none"). Disproving a threat's `controls` claim is itself a finding.
   ```
   Each agent reads 100% of its slice and returns structured findings `{file, line, type, severity, evidence,
   fix, threat}` PLUS `covered_files[]` — its coverage receipt.
6. Stitch the receipts: `UNMAPPED = manifest − ∪covered_files`. UNMAPPED ≠ ∅ → dispatch a sweeper agent for the
   remainder and re-assert. The audit does not proceed past Phase 1 until UNMAPPED = ∅ — **coverage is proven,
   never claimed.** Same gate on threats: a `critical`/`existential` threat that no slice agent hunted is
   reported `UNHUNTED` and treated as an open P0-equivalent risk, not as silence.
7. Collect all findings. Deduplicate — **recording every drop** (see The Dropped Appendix). Build dependency
   graph across all findings.

**Output:**
```
INVENTORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total files:     N
Total LOC:       N
Primary stack:   [detected]
Build command:   [detected or confirmed]
Threats:         N across N trust boundaries (N critical+) — coverage rule ✓
Agents spawned:  N across N slices
Coverage:        N/N files read — UNMAPPED: 0 ✓ (receipt-verified)
                 N/N threats hunted — UNHUNTED: 0 ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 2 — Physics Test (Prove It Works)

**Goal:** Verify current build state. Non-blocking.

1. Run detected build command. Timeout = 300s.
2. Capture: exit code, warnings, errors, build time.
3. Build success → note warning count. Continue.
4. Build failure → capture exact errors. Auto-promote to P0. Continue — do not abort.
5. If build succeeds: smoke-test core paths (auth, main feature, network layer). Log pass/fail.

**Output:**
```
PHYSICS TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build:    PASS / FAIL
Warnings: N
Errors:   N  (→ P0 auto-promoted)
Time:     Ns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## The Finding Contract (applies to every finding, wherever raised)

Every finding carries `evidence` — no naked findings:
- **[PROVEN]** — executed or traced this run: the failing command + output, the zero-caller grep transcript, the
  exact call path. Proven findings may auto-execute in their tier.
- **[SUSPECTED]** — pattern-matched, not yet demonstrated. A suspected P0 MUST be proven (execute or trace it) or
  downgraded to `[NEEDS MANUAL CONFIRM]` before the execution phase — no exceptions. Suspected P1/P2 execute only
  behind their tier's build gate.

Schema: `{file, line, type, severity, evidence: proven|suspected, fix, threat}`.

---

## The Dropped Appendix (every removal leaves a receipt)

Findings die in three places: dedupe (Phase 1.6), cross-examination (Phase 4.5), and scope calls. **A silent drop is indistinguishable from a miss.** Every finding that leaves the report is recorded with a reason:

| Reason | Raised where | Means |
|---|---|---|
| `DUPLICATE` | Phase 1.6 dedupe | collapsed into a canonical finding (record which) |
| `PHANTOM` | any | cited `file:line` doesn't exist — the agent hallucinated the location |
| `REFUTED` | Phase 4.5 | a verifier produced counter-evidence |
| `DOWNGRADED` | Phase 4.5 | survived as real but at a lower tier (record from → to) |
| `OUT_OF_SCOPE` | any | outside the audit's stated bounds |

**Dedupe rule:** when two findings collide on `(file, line, type)`, the survivor is the **strongest report** — highest severity, then highest confidence, then proven-over-suspected — so the surviving `fix` is the one worth executing. The survivor inherits the *worst case* of every field that feeds severity (blast radius, critical-path flag) from all collapsed rows: collapsing loses the duplicate row, never the signal.

Write the full trail to `.elon-audit/dropped.json` and summarize it in `AUDIT.md`. Read it before trusting a clean run — a P0 that vanished into a `DUPLICATE` of a P2 is the failure mode this appendix exists to catch.

---

## Phase 3 — Delete/Trim (Ruthless 80/20)

**Goal:** Surface everything that shouldn't exist. Every finding includes exact file path, exact line(s), exact removal command or diff.

- **Dead code**: functions/classes with zero callers (grep-verified), `_disabled_` prefixes, commented-out blocks >20 LOC
- **Unused dependencies**: zero imports in codebase — exact `npm uninstall X` or SPM removal
- **Duplicate logic**: identical blocks >10 LOC — exact unification diff
- **TODO/FIXME**: every instance, classified P0/P1/P2 by context
- **Deprecated APIs**: exact replacement for each call
- **Asset bloat**: unused image/media assets, uncompressed assets over 500KB — exact removal or compression command
- **Debug logs in production**: `print()`, `console.log()`, `NSLog()` not gated by debug flag — exact removal or `#if DEBUG` wrap

---

## Phase 4 — Risk/Edge Proof (Infinite Loop)

**Goal:** Surface everything that will bite you. Every finding includes exact fix.

**P0 — Kill Shots (fix first, no exceptions):**
- Force-unwraps on live execution paths
- Missing auth checks on API endpoints, Supabase RPC calls, or protected routes
- Data loss paths (unguarded deletes, missing CoreData/Realm migrations)
- Security: hardcoded secrets (`sk_live_`, `Bearer `, `password =`, `.env` values committed to git)
- Security: RLS not enabled on Supabase tables holding user data
- Security: `.gitignore` missing coverage for `.env`, `secrets/`, credential files
- Security: entitlements mismatched to build target, debug entitlements in release
- Dependency CVEs at critical/high severity — exact `npm audit fix` or package update command
- Race conditions / unprotected shared mutable state / `@MainActor` violations
- Build errors (promoted from Phase 2)

**P1 — Performance & Waste:**
- Memory leaks and retain cycles (ARC) — exact `[weak self]` or `unowned` fix
- Synchronous operations on main thread — exact `Task {}` or `DispatchQueue.global()` migration
- Redundant network calls — exact deduplication fix
- O(n²) loops with known-bounded inputs — exact algorithm replacement
- Missing error handling on critical paths (auth, payments, persistence)
- Broken or skipped tests (`XCTSkip`, `.skip`, `.only` left in) — exact fix or deletion
- Test coverage gaps on P0 paths (auth, payments, data persistence) — exact test stubs to add
- Dependency CVEs at medium severity
- Build warnings that will become errors — exact fix per warning

**P2 — Supercharge:**
- Half-implemented features with clear scaffolding and obvious intent — exact completion diff
- Verifiable performance improvements (O(n log n) replacements, caching opportunities) — exact diff
- Duplicate logic unification — exact refactor
- Localization gaps — hardcoded user-facing strings — exact `.strings` extraction
- CoreData/Realm schema changes without migration paths — exact migration stub
- iOS App Store compliance: privacy manifest gaps, deprecated API usage before deployment target — exact fixes
- Build config hygiene: debug flags in release, version/build number mismatches across targets — exact fixes
- Documentation gaps on public APIs — exact docstring additions
- New features ONLY if directly implied by existing scaffolding (half-built, intent obvious)

**Dependency rule:** If any fix depends on another fix in a lower tier, that dependency is promoted up. The dependency graph built in Phase 1 is enforced throughout execution. Nothing moves down until its tier is 100% complete and verified.

**Threat-anchored severity.** The tier lists above are the floor, not the ranking. Within a tier, order by the threat each finding serves: a bug on a `critical`/`almost_certain` path with `controls: none` outranks one on a `low`/`rare` path with a control in place. A finding on **no** threat path is capped at P1 unless it argues a trust boundary the Phase 1.5 model missed — and that argument is itself a finding worth raising, because it means the map was wrong.

---

## Phase 4.5 — Cross-Examination (The Maker Never Grades Itself)

Before anything executes: spawn adversarial verifier agents with fresh context — they see the findings and the code,
never the authoring reasoning. Their single job is to REFUTE.

1. Every P0 gets a verifier; P1/P2 get a ≥20% sample (the whole tier if it's small).
2. A verifier re-derives the finding from the code: reproduce the proof, or produce the counter-evidence. A verifier
   that independently demonstrates a [SUSPECTED] finding upgrades it to [PROVEN].
3. Refuted → cut or downgraded, and recorded in the Dropped Appendix as `REFUTED` / `DOWNGRADED` with the
   counter-evidence — never deleted silently; a refuted finding's dependents are re-checked before the plan is
   presented. Survived → confirmed.
4. Report the kill rate honestly: `P0: 12 raised → 9 confirmed · 3 refuted`. A 0% refute rate on a large audit is a
   smell, not a flex.

Only **confirmed** findings enter the executable plan as P0s. Unexamined P1/P2 findings enter the plan **as raised**
— their tier's build gate is their check; "confirmed" means *not refuted*. If the sample's refute rate exceeds ~20%,
widen the sample before presenting the plan.

---

## Phase 5 — Handoff (Holy Shit Done)

1. Write `AUDIT.md` to repo root — full findings (with evidence + cross-exam stats), the threat model table,
   fix list, tier breakdown, the dropped appendix summary, before/after stats
2. Leave the machine-readable trail in `.elon-audit/`: `threats.json`, `dropped.json`, and the phase checkpoints.
   Add `.elon-audit/` to `.gitignore` if it isn't already — it's run state, not source.
3. If `~/clawd/wiki/` exists: write the audit note to `~/clawd/wiki/systems/[appname]-audit-YYYY-MM-DD.md` (format
   below) and update `~/clawd/wiki/projects/[appname].md` with `Last audited: YYYY-MM-DD → [[systems/...]]`.
   If it doesn't exist: skip both and say so — never invent the tree.
4. Update Claude auto-memory: project name, audit date, P-tiers completed, top 3 findings, health status

---

## Execution Flow

After the audit report is presented inline, enter plan mode with the full fix list.

On approval:
1. Execute all **confirmed** P0 fixes (proven + cross-examined; anything else is `[NEEDS MANUAL CONFIRM]`) → run
   build → confirm passes → `git commit -m "[elon-audit] P0: kill shots — N fixes"`
2. Execute all P1 fixes → run build → confirm passes → `git commit -m "[elon-audit] P1: performance & waste — N fixes"`
3. Execute all P2 fixes → run build → confirm passes → `git commit -m "[elon-audit] P2: supercharge — N fixes"`
4. Run Phase 5 Handoff

If build fails after any tier: stop, surface the regression, fix before moving to next tier.

After all tiers committed:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Audit complete. Run /elon-audit again to verify zero new findings.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Audit Report Format (Inline)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ELON AUDIT — [PROJECT NAME]
[DATE] | [N] LOC | [N] files | [STACK]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INVENTORY        [summary] — Coverage: N/N files, UNMAPPED: 0 ✓
PHYSICS TEST     PASS/FAIL — N warnings, N errors
CROSS-EXAM       P0: N raised → N confirmed · N refuted | P1/P2 sample: N checked → N confirmed

THREAT MODEL     N threats / N boundaries — UNHUNTED: 0 ✓
──────────────────────────────────────────────────
[T-id]  [actor] → [surface]  [impact]/[likelihood]  controls: [...]   → N findings

P0 KILL SHOTS    N confirmed
──────────────────────────────────────────────────
[ID]  [file:line]  [PROVEN|SUSPECTED]  [T-id]  [issue]
      FIX: [exact command or diff]

P1 PERF/WASTE    N confirmed
──────────────────────────────────────────────────
[ID]  [file:line]  [PROVEN|SUSPECTED]  [T-id]  [issue]
      FIX: [exact command or diff]

P2 SUPERCHARGE   N confirmed
──────────────────────────────────────────────────
[ID]  [file:line]  [PROVEN|SUSPECTED]  [T-id]  [issue]
      FIX: [exact command or diff]

DEPENDENCY ORDER
──────────────────────────────────────────────────
[Any promotions or reorderings]

DROPPED          N (N duplicate · N phantom · N refuted · N downgraded)
──────────────────────────────────────────────────
[file:line]  [reason]  [detail / canonical id]        → .elon-audit/dropped.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: N fixes | 3 commits | Build gate per tier
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Obsidian Wiki Note Format

`~/clawd/wiki/systems/[appname]-audit-YYYY-MM-DD.md`:

```markdown
---
title: [AppName] Elon Audit
type: audit
project: [appname]
date: YYYY-MM-DD
status: complete
p0: N
p1: N
p2: N
---

# [AppName] Audit — YYYY-MM-DD

## Summary
[1-3 sentence executive summary]

## Top Findings
- P0: [top finding]
- P1: [top finding]
- P2: [top finding]

## Health
LOC before/after: N → N
Warnings before/after: N → N
Build time before/after: Ns → Ns

## Full Report
→ AUDIT.md in repo root
```
