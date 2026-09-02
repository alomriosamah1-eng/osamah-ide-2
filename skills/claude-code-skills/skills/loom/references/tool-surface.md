# Tool surface — the loop is only as good as the tools inside it

`/loom`'s Gate checks that the agent *has* senior-engineer tools (logs, repro, run-code). This is the other half: whether those tools are *usable by an agent in a loop*. Three rules.

## 1. Few, focused, non-overlapping tools
Pile on a hundred tools and the agent loses track of which to reach for. **Anthropic's rule of thumb:** if a human engineer can't say for certain which tool fits, the agent has no chance.
- Wire only the connectors a loop actually needs (already step 6 of the pipeline) — and check for **overlap**. Two tools with near-identical descriptions force the agent to guess.
- `detect_gates.py --tools <manifest.json>` lints a tool manifest for description overlap and flags ambiguous pairs.
- Acceptance test: the checker subagent, given the loop's tool list + a sample action, must name **exactly one** correct tool. If it can't, the surface is too broad — cut or rename.

## 2. Make writes safe to repeat (idempotent)
Loops retry. A retried `create_customer` that makes a *second* customer = duplicate records + double billing while you sleep. Anything that changes state must be safe to call twice.
- `/loom` already enforces this at the work-unit level: `loop_state.py idempotent <loop> --key <unit>` skips a unit already acted on, and the stale-branch reaper reuses an existing PR instead of opening a duplicate.
- Extend the discipline to **every** stateful connector call: use idempotency keys (the work-unit key) on broker/API/ticket writes, not just on PR creation. A loop at `auto-trivial` that can't prove its writes are idempotent stays at `pr-only`.

## 3. Errors are the next prompt — write them for the agent
In a hand-run session an error is a dead end you read. In a loop, **an error is the next instruction** the maker acts on. A raw stack trace tells the agent nothing actionable.
- **Before:** `sandbox.py` dumped raw stdout/stderr + `gate verdict: FAIL (exit N)` straight into the maker's next turn.
- **Now:** `sandbox.py` extracts a structured, agent-actionable hint — the **failing test id**, the **first error line**, and the **changed-file** most likely responsible — and hands *that* to the maker, with the raw log offloaded to scratch (context-hygiene).
- Doctrine tenet: **before a tool ships, ask whether an LLM reading its error would know the next move.** If not, rewrite the error, not the agent.

## Why this lives in `/loom`
A loop runs while you're not watching. A confused tool surface or a non-actionable error doesn't fail loudly — it makes the maker thrash, burn budget, and churn (`loop_health` degrades). Tool hygiene is reliability, not ergonomics.
