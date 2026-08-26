# Fleet reliability

The per-loop pipeline defends against *bad work*. This layer defends against a sick or starving fleet running in a hostile world. Every mechanism below is enforced by the orchestrator before/after a run and surfaced in `--status` / `--digest`.

## 1. Review-bandwidth backpressure (the silent fleet-killer)
The tweet's own central warning: when review capacity is the real bottleneck, a loop just makes the queue longer.
- Per-loop `max_open_prs` (default 3) + fleet `max_open_prs_fleet` (default 10) in the registry.
- Before find-work, count open PRs carrying this loop's provenance tag. At cap → **skip the run entirely**, spend no budget, set `state: blocked_on_review`.
- Digest surfaces `review_backlog_age_p50`; oldest unreviewed > 7d → auto-downshift cadence.

## 2. Loop-health vs work-health
Accept-rate measures the *work*. It says nothing about whether the *machinery* is healthy — a loop can pass its gate nightly while editing the same lines back and forth or "fixing" a flaky test by deleting it.
- `work_health` = gate + accept-rate.
- `loop_health` = distinct-files-touched/run · diff-similarity-to-prior-run (flag > 0.9 = churning the same lines) · net-LOC trend.
- A green gate with degraded `loop_health` = no-op productivity → alert (independent of the gate).

## 3. Crash-loop circuit breaker
Hard stops cap a run that won't converge; they don't catch a loop that **dies in 10 seconds every invocation** (bad env, expired token, moved file, dead MCP). Cron re-launches it nightly; launch-overhead budget leaks.
- Track `consecutive_failures` + `run_duration`.
- `consecutive_failures ≥ 3` OR last 3 runs all `< 30s` (fast-fail signature) → `circuit_open`, **stop scheduling**, page with the captured error, exponential-backoff re-arm (1d → 2d → 4d).

## 4. Dead-man's-switch / liveness
The scariest failure is the fleet **stops running and nobody notices** (cron deleted, account suspended, billing lapsed). A push-based digest makes *no digest* ambiguous.
- The orchestrator writes `last_successful_orchestrator_run`.
- A **separate external watchdog** (`scripts/watchdog.py` → healthchecks.io or a second cron on different infra) expects a ping every 24h; missing → alerts you **out-of-band**.
- Every loop has a required `owner`; orphans auto-retire.
- The digest **always sends daily, even if empty** — silence becomes an alarm.

## 5. Change-freeze / blackout windows
"Always-running, laptop-off" means a loop will happily open or auto-merge a PR during a prod incident, release freeze, or holiday. An agent has zero situational awareness of your calendar.
- `--freeze on` writes a `FREEZE` sentinel; `blackout[]` holds cron windows.
- During freeze: **shadow-only**, work is **queued not discarded**.
- Auto-detect a repo `freeze` label / branch-protection lock and propagate it.

## 6. Dependency outage breaker
GitHub / Supabase / MLX will have outages, and every loop hits the same one the same night → fleet-wide budget burn from retry storms.
- Wrap external calls in bounded retry (3 attempts, exponential backoff + jitter), **outside** the token-spending agent loop.
- If N loops fail the same dependency within an hour → `dependency_down`, pause dependents until a probe succeeds.
- **Distinguish "dependency down" (no budget charge, no accept-rate penalty) from "work failed"** — otherwise an outage falsely demotes healthy loops down the trust ladder.

## 7. Convergence → hibernate
A quality loop eventually finishes (nothing left to fix). Cron keeps invoking it; it spends find-work tokens to discover "nothing" and may invent busywork.
- Track `consecutive_empty_runs`.
- `≥ 3` → downshift cadence (nightly → weekly → monthly).
- `≥ 7` → `dormant` (near-zero cost), woken by a relevant file change / webhook.

## 8. Stale-branch reaper
Each run creates a branch; `main` moves; the branch conflicts; an unattended loop has no human to resolve it; the next run re-does the work on a fresh branch.
- Before opening a PR, reuse an existing **mergeable** PR with this loop's tag; if **conflicted**, attempt one auto-rebase, then label `loom:needs-human` and do **not** spawn a duplicate.
- Reaper: tagged branches idle 14d → auto-delete. Digest `stale_branch_count`.

## 9. State DR
The registry + `STATE.md` are the fleet's brain (trust levels, budget counters, run-locks). A half-written file can double-execute, silently re-promote a demoted loop, or zero a budget counter.
- **Atomic writes only** (write-temp + rename, never in-place).
- `schema_version` + checksum on every record; on read, validate — corrupt → refuse to run, flag `state_corrupt`, never run on garbage.
- Daily registry snapshot (append-only, 30d retention) for point-in-time restore.
- Orchestrator validates the whole registry against schema before launching any loop.

## 10. Clock + observability
- Store/compute everything in **UTC**; render to one declared `fleet_timezone` only for display. Hard-stops use the **monotonic clock**, not wall-clock (DST-safe).
- Digest adds per loop: `run_latency_p50/p95`, `MTTR`, `gate_pass_rate trend` (early gate-rot signal before mutation testing catches it), `tokens_per_accepted_pr` (efficiency drift), `time_to_first_human_touch` (the real review-bandwidth metric).
