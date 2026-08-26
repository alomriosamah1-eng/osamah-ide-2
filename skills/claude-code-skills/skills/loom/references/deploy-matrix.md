# Deployment matrix — picking the heartbeat

Choose the mechanism from `cadence × laptop-state × trigger`. Every mechanism still requires the objective gate + hard stop + (for headless) connector survivability.

| Want | Mechanism | How | Caveats |
|---|---|---|---|
| **Nightly, laptop-off** | `/schedule` cloud routine | the `schedule` skill creates a cron routine (`CronCreate` under the hood) that runs in the cloud | **primary.** Headless: only connectors that survive non-interactive auth work (PAT / service key — **not** interactively-authed MCPs like claude.ai). Sandbox the gate. |
| **Always-running, laptop-off** | `/schedule` tight cadence | e.g. `*/30 * * * *` | guard with hard stop + review backpressure + budget pool, or it burns the pool |
| **Always-running, this session** | `/loop <interval>` | the `loop` skill re-runs a prompt/skill on an interval while the session is open | laptop on, session open; good for "while I work" |
| **Grind-until-done, this session** | `ralph-loop` plugin | `/ralph-loop "<prompt>" --completion-promise "DONE" --max-iterations 50` — a Stop hook re-feeds the prompt until the promise or the cap | the objective gate is still mandatory (the completion promise alone is the Ralph Wiggum trap); always set `--max-iterations` |
| **Event-triggered** (PR-open, CI-fail) | GitHub Action | cron/webhook in `.github/workflows/` invokes Claude | reuses the existing pattern (hercules already runs scheduled Actions) |

## `/loop` vs `/goal` (cadence vs condition)
- **`/loop`** re-runs on a cadence regardless of state. Use for regular checks.
- **`/goal`** keeps going until a condition *you wrote* is actually true, verified by a **separate small model** (the independent checker) — so the agent that wrote the code isn't the one grading it. This is the maker-vs-checker split applied to the stop condition itself.

Example (session-scoped):
```
> /loop 30m /goal All tests in test/auth pass and lint is clean.
  Scan src/auth for new failures, propose fixes in claude/auth-fixes,
  open draft PR when goal condition holds.
```

## The inner maker↔checker refinement loop
Inside a single run, don't treat the checker as a one-shot pass/fail. Let it drive iteration:
1. Maker produces work.
2. Checker emits a **structured findings list** (not "looks clean" — specific defects).
3. The findings return to the maker as its **next instruction** (errors are the next prompt).
4. Repeat until the checker is clean **OR** a hard stop fires **OR** per-iteration diff-churn > 0.9 (spinning).

Critical: **the objective gate exit code stays the true pass condition** — the checker being satisfied is necessary but not sufficient. This keeps the inner loop from becoming a Ralph Wiggum loop (two optimists agreeing). Extend the `/goal` scaffold; the independent checker (`--checker local`, or `cloud-strong` for high-stakes) is the grader, the gate is the judge.

## Headless survivability check (step 6)
Before scheduling a laptop-off loop, confirm every connector it needs survives non-interactive auth:
- ✅ GitHub via fine-grained PAT, Supabase via service key, Slack via bot token.
- ⚠️ Interactively-authenticated MCP servers may be absent in cron/headless runs — if the loop needs one, it must run as a **local** scheduled task (laptop-on), not a cloud routine. (This is why `/ship`'s Full lane runs as a local background task, not a remote cron.)
