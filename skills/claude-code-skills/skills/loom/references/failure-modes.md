# Failure modes — the named ways loops die

Each has a documented mitigation that is wired into the platform. When a loop misbehaves, find it here first.

## Ralph Wiggum loop (quiet failure)
*Geoffrey Huntley named it:* an agent meant to emit a completion token only when finished emits it early, and the loop exits on a half-done job. Without a hard gate, loops fail quietly and keep spending. Happens when:
- **No real verifier** — just a second agent asked to "review," no objective signal. Two optimists agreeing.
- **Soft completion conditions** — "done" defined by the agent's judgment, not a test/build/type check.
- **No hard stops** — runs until something external kills it.

**Mitigation:** the objective gate (exit code) + the four hard stops (doctrine 4). Not a verifier with an opinion.

## Goal drift
Each summarization step is lossy; "don't do X" constraints disappear at turn 47.
**Mitigation:** a standing `VISION.md` / `AGENTS.md` reread each run. State tells the loop where it is; the spec tells it where to go.

## Self-preferential bias
The agent that wrote the code is too nice grading its own homework.
**Mitigation:** a separate verifier subagent, different prompt + model, with no exposure to the maker's reasoning. (This is Anthropic's Dec-2024 evaluator-optimizer pattern.)

## Agentic laziness
The loop declares "done enough" at partial completion.
**Mitigation:** `/goal` with an objective stop condition checked by a **fresh** model.

## Gate rot
A gate that used to catch the failure stops catching it.
**Mitigation:** weekly mutation testing (`--verify-gates` / `scripts/mutate_gate.py`) — inject known-bad code, expect RED, demote on GREEN.

## Comprehension debt
The faster the loop ships code you didn't write, the larger the gap between what the repo contains and what you understand. The bill that hurts isn't tokens — it's the day you debug a system no one read.
**Mitigation:** comprehension-debt **hard gate** + per-action rationale blocks + the monthly blind-spot quiz (`value-and-human-factors.md`).

## Cognitive surrender
The pull to stop forming an opinion and accept whatever the loop returns.
**Mitigation:** the anti-atrophy reserve (human-only domains) + reading the diffs. Designing the loop is the cure when done with judgment, the accelerant when done to avoid thinking.

## The security tax
A loop running unattended is an attack surface running unattended: generated code shipping unreviewed, skills as injection vectors, credentials in logs, permission scope creep.
**Mitigation:** the full `security-model.md` — untrusted-input boundary, egress allowlist, sandboxed gate, scoped tokens, config integrity, audit, 30-day re-audit.

## Review-bandwidth starvation
A loop generates more code; if review was already the bottleneck, it just makes the queue longer.
**Mitigation:** review-bandwidth backpressure — `max_open_prs` cap, skip-and-don't-spend when full (`fleet-reliability.md`).

## Silent fleet death
The loops stop running and nobody notices.
**Mitigation:** dead-man's-switch + external watchdog + always-send digest (`fleet-reliability.md`).

## Context rot / the doom loop
A long run rots from the inside — old tool outputs, dead ends, stale reasoning pile into the live context; the model gets *dumber the longer it runs*, and a loop makes it spiral. Invisible to the gate (exit codes don't measure context fill).
**Mitigation:** treat context as a budget — compaction, offloading to scratch, sub-agent delegation; instrument `context_fill`/`compactions` per run (`context-hygiene.md`).

## Harness drift
The checker catches failures *inside* a run; it can't catch the harness (prompts, tools, gates) decaying over time, especially after a model swap. A green checkmark on today's model says nothing about tomorrow's.
**Mitigation:** per-run tracing + failing-trace→regression fixtures (`regress.py`, the backward complement to `mutate_gate.py`) + a model-change canary that re-runs backtest/mutation/regression before the next live run (`observability.md`).
