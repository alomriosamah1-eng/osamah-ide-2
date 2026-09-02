---
name: ship
description: "Autonomous build-and-ship pipeline — 'The Shipyard.' Hand it an idea and a crew of role-defined agents research → architect → build → test → review → fix → polish → and stage a human-gated launch, all on a throwaway branch in an isolated worktree. Two lanes: FAST (/ship) reviews+tests+gates the current diff in minutes; FULL (/ship \"<idea>\") runs the whole pipeline unattended and pings you only at the launch gate, an escalation, or an abort. Project-adaptive via a detected Project Profile (works for an app OR a webpage OR a CLI). Deploy is ALWAYS human-gated. Use for 'ship this', 'build and deploy X', 'take this idea and ship it', 'review before I merge', or to set up a project's CLAUDE.md (/ship --init)."
version: 1.0.0
author: Bobby Hansen Jr. (bobbyhansenjr)
license: CC0
platforms: [linux, macos]
---

# /ship — The Shipyard

A crew takes an idea from the dock to the water. **You own taste, strategy, and the one tap that ships; the crew owns execution.** It is safe to be aggressive because every build happens on a throwaway `ship/<slug>` branch in an isolated worktree — a wrong build costs you nothing to discard.

**Doctrine (read `references/doctrine.md` in full before any Full-lane run):** autonomy-first; the reviewer is adversarial and independent of the writer; the launch is human-gated, always; tests-or-it's-theater; apply the Idiot Index; never claim a gate passed that you did not run.

---

## Invocation

```
/ship                          # FAST: review + test + launch-gate the current working-tree diff
/ship "<idea>"                 # FULL: idea → research → build → test → review → fix → polish → launch-gate
/ship --init                   # author/refresh this project's CLAUDE.md (no build)
/ship --resume                 # resume the last run from its journaled state
```

**Flags:** `--spec` (force an intake grill instead of auto-deriving) · `--yolo` (auto-merge changes you've pre-blessed as trivially safe) · `--no-deploy` (build to the gate, never offer launch) · `--ultra` (heavyweight review tier — adds lenses + invokes `/gauntlet --fast`) · `--depth fast|full` (override lane autodetect).

Runs against the current working directory. `cd` to the project first. Lane autodetects: an idea string ⇒ Full; bare ⇒ Fast on the diff.

---

## Step 0 — Project Profile (the reusability backbone)

Run `scripts/detect.py . --json` first, every time. It emits the profile every station reads:

```json
{ "type": "app|webpage|cli|lib|backend",
  "test": "...", "lint": "...", "typecheck": "...", "build": "...",
  "launch_adapter": "vercel|fastlane|eas|static-pr",
  "db_adapter": "supabase|none", "migrate": "..." }
```

The same skill behaves correctly on a React-Native app, a Next.js site, or a one-file webpage **because the profile — not the SKILL — carries what's project-specific.** If `type`/`launch_adapter` is `unknown`, ask once and persist the answer to the project's `CLAUDE.md` so the next run is silent. Profiles + launch playbooks: `references/profile-adapters.md`.

---

## The Stations

```
FAST  /ship          (diff) ────────────────→ Review ⇄ Fix → Test → Launch
FULL  /ship "idea"   Intake → Research → Architect → Build → Test ⇄ Review ⇄ Fix → Polish → Launch
```

| Station | Does | Runs as | Model |
|---|---|---|---|
| **Intake** | auto-derive spec + **acceptance criteria** + non-goals from the idea + codebase (`--spec` ⇒ grill instead) | main loop | opus |
| **Research** | how does this codebase already do it; prior art; gotchas | `Explore` ×N + `/deep-research` if external | sonnet |
| **Architect** | smallest design that meets the criteria; **Idiot-Index it** | `Plan` agent | opus |
| **Build** | write app code **and tests** (scaffold runner if none); migrations → Supabase preview branch | writer subagent (worktree) | opus |
| **Test** | run profile.test + profile.lint + profile.typecheck; `/verify` against acceptance criteria | inline + `/verify` | sonnet |
| **Review** | adversarial fan-out; block on P0/P1 | Agent ×3–5 (pr-toolkit) | opus |
| **Fix** | order → make-safe → apply (gauntlet STEP-3) | writer subagent | opus |
| **Polish** | UI/UX shine (apps/webpages only) | `/polish` inline | sonnet |
| **Launch** | assemble summary, **wait for one human tap**, deploy, smoke-test, auto-rollback on fail | main loop | opus |

---

## Autonomy & escalation

**Default = high autonomy.** The crew derives the spec, proceeds immediately, and **self-verifies against its own acceptance criteria** (via `/verify`) rather than asking you. It runs Build→Test→Review→Fix→Polish unattended.

It stops mid-flight **only** for the escalation class:
- destructive / irreversible operations (data deletion, schema drops, prod writes)
- real money
- a secret/credential/env var it cannot obtain
- a genuine product fork where both paths are plausible and expensive to reverse

Everything else: pick the sensible default, **log the decision in `SHIP.md`**, continue. On escalation → notify (Telegram + push), park state, wait.

---

## The Test ⇄ Review ⇄ Fix loop

1. **Test** — run `profile.test`, `profile.lint`, `profile.typecheck`. If `profile.test` is empty: in Full lane the Build station must have authored tests; in Fast lane **fail loud** (`tests: NONE — gate is theater`), do not claim pass. Run `/verify` to confirm acceptance criteria hold in the running app.
2. **Review** — fan out **3–5 pr-toolkit agents in parallel** (`code-reviewer`, `silent-failure-hunter`, `security-auditor`, `pr-test-analyzer`, `type-design-analyzer`; `--ultra` adds `/gauntlet --fast`). Each gets the diff + acceptance criteria + `references/reviewer-lenses.md`, framed adversarially: *default to REJECT if a claim is unproven.* Aggregate + dedupe.
3. **Gate** — **block on any P0/P1.** P2 → log, don't block.
4. **Fix** — order by deps, make each change safe (verify + rollback), apply (gauntlet STEP-3 pattern). Re-enter Test.
5. **Cap = 3 rounds.** Still P0 after 3 → **handback**: stop, mark `SHIP.md` `BLOCKED on: [ids]`, notify, never launch. Resume later with `/ship --resume`.

---

## Launch (human-gated, frictionless)

Never deploy without an explicit human tap. Launch:
1. `scripts/summarize.py` assembles the deploy summary: what changed · acceptance criteria met · review verdict · tests run/passed · the **exact** deploy command · rollback steps. Append to `SHIP.md`.
2. Push the `ship/<slug>` branch → produce a preview (Vercel preview URL / TestFlight / PR).
3. **Notify + wait.** Present the summary + preview link; ask for the one tap. `--yolo` skips this *only* for changes you pre-blessed as trivial (docs/copy); `--no-deploy` never offers it.
4. On approval, run the `profile.launch_adapter` playbook (`references/profile-adapters.md`): merge → main (Vercel = prod) / tag `v*` (fastlane staged rollout) / `eas submit` / open PR.
5. **Post-deploy smoke test.** Hit the deployed surface; if it fails → **auto-rollback** (Vercel revert / halt rollout) + notify. Never leave prod broken silently.

---

## `--init` (CLAUDE.md generator — the foundation)

No build. Detect the Project Profile, infer conventions (lint/prettier/tsconfig, file & naming patterns), and write `<project>/CLAUDE.md` from `references/claude-md-template.md`: discovered build/test/deploy commands, conventions, the review bar, and the **Idiot Index** house-rule (*flag any component whose complexity/cost vastly exceeds its essential value — strip ceremony, keep the metal*). Complements, never duplicates, `/elon-audit`. Auto-runs on a project's first `/ship` if no CLAUDE.md exists.

---

## State, report, notifications

- **State:** journal every station to `.ship/<run>/` (`spec.md`, `research.md`, `design.md`, `build.json`, `review.json`, `fix.log`, `run.json`). The Full lane runs on the **Workflow engine** → native resume; `/ship --resume` replays the unchanged prefix and continues from the first incomplete station.
- **Report:** `SHIP.md` at repo root — the human-readable record (spec, criteria, decisions log, review verdict, tests, deploy command, rollback). Gitignore-friendly sibling state in `.ship/`.
- **Notify** (`scripts/notify.py`): Rupert→Telegram + local push, fired **only** at launch-gate / escalation / abort. Silent while working.
- **Cost:** before a Full run, print an estimate (≈ agents, ≈ tokens/$). Enforce a budget ceiling via the Workflow budget; on overrun, abort gracefully and save state.

---

## Claude Code mechanics (how stations actually execute)

- **Review fan-out & Build/Fix** = the **Agent tool** (subagents). Use `agentType` for the pr-toolkit reviewers; `isolation:"worktree"` for the Build/Fix writer so it never touches your live tree. Batch 3 concurrent, sequential between batches.
- **Polish / Verify** = invoke the **`/polish` and `/verify` skills inline** from the main loop (skills run in the main conversation; subagents can't call slash-skills).
- **Full-lane orchestration** = the **Workflow tool** (`pipeline`/`parallel`/`phase`, schema-validated, resumable). Fast lane stays low-ceremony — no Workflow needed.
- **Migrations/DB** = the **Supabase MCP** (`create_branch` for an isolated preview DB, `apply_migration` against it — never prod until Launch).
- **Full lane runs as a LOCAL background task, not a headless remote cron** — it needs the Supabase/gh MCPs, which may be absent in detached runs.
- **Model routing:** opus for Intake/Architect/Review/Fix/Launch; sonnet for Research/Test/Polish. Set `model:` per the station table.

## Lane separation (no overlap)
`/ship` = build & ship **one** change/idea (forward motion). `/gauntlet` = pre-deadline **readiness audit** of the whole project. `/elon-audit` = whole-repo **cleanup** pass. `/ship --ultra` may call `/gauntlet --fast` as a review tier; it does not replace it.

## Output — Launch summary (also written to SHIP.md)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIP — {project}  ·  ship/{slug}  ·  {FAST|FULL}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDEA        {one line}
CRITERIA    ☑ {a}  ☑ {b}  ☑ {c}      (self-verified)
CHANGED     {n files, +x/-y}
REVIEW      {P0:0 P1:0 P2:k}  verdict: PASS
TESTS       {cmd} → PASS ({n})   LINT → PASS   /verify → PASS
DECISIONS   {auto-picked forks, 1 line each}
LAUNCH →    {exact command}        [awaiting your tap]
ROLLBACK    {exact command}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Pitfalls
- **Never deploy without the human tap.** The gate is the product, not a formality.
- **Never claim a gate you didn't run.** No tests ⇒ say so; don't fake-pass.
- **Never let the writer review its own work** — Review is independent agents with a different objective.
- **Never build in the live tree.** Full lane = worktree; a wrong build is a discarded branch.
- **Never auto-apply a migration to prod.** Preview branch until Launch.
- **Don't over-build.** Architect to the acceptance criteria; Idiot-Index the design.
- **Handback over hero.** 3 rounds and still P0 → stop and ping, don't thrash.
