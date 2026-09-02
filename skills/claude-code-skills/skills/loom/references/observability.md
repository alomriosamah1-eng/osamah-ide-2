# Observability — watching the harness drift

The checker catches failures *inside a run*. It cannot catch the **harness** drifting — the prompts, tools, and gates wrapped around the model decay over time, especially when the model changes underneath you. A green checkmark on today's run says nothing about whether the harness still works after a model swap. Catching that needs observability on every run, not a verdict.

`/loom` already has the observability *spine* in `fleet-reliability.md` (`gate_pass_rate` trend, `tokens_per_accepted_pr`, `run_latency`, MTTR, `time_to_first_human_touch`). This adds the two things that spine was missing: a **backward** gate defense and a **model-change canary**.

## 1. Failing-trace → regression-test (the backward complement to gate-rot)
`mutate_gate.py` is *forward* defense: it injects synthetic bugs and checks the gate goes RED. It cannot catch a **real** failure the gate let through — a run that went GREEN but a human rejected (or that shipped a regression). That's a false-GREEN escape class mutation testing structurally can't reach.

The fix is to **freeze real failures as permanent fixtures**:
- `trace_store.py` persists the full trace (prompt → tool calls → gate verdict → checker verdict → human decision) for any run that went **RED** or **human-rejected**.
- `regress.py freeze <loop> <run_id>` promotes that captured failure into a permanent gate fixture under `.loom/<loop>/fixtures/`.
- `regress.py run <loop>` replays every fixture and asserts the current harness still catches it. A fixture that now passes = the harness drifted and a known break can recur → alert + block promotion.

**Keep fixtures inside the gate boundary** — they assert objective outcomes (exit codes / verdicts), NOT advisory lessons. This preserves the security-model §7 firewall: a regression fixture is a *gate*, not a self-written *rule*.

## 2. Model-change canary
The most common harness-drift trigger is a model swap. So make `config.json.model_routing` changes a tracked event:
- `loop_state.py` now stamps the **model id** on every run record (it didn't before — you couldn't even attribute drift to a model).
- When `model_routing` changes, record a **changepoint marker** in the registry, and **before the next live run**: re-run the backtest corpus + force a one-cycle `mutate_gate.py` + `regress.py run`. If accept-rate or gate behavior moved across the changepoint, hold the loop at its current trust stage and alert.
- Annotate the `gate_pass_rate` / `tokens_per_accepted_pr` drift charts with a vertical line at each changepoint, so "the loop got worse" is immediately attributable to "the model changed on date X."

## The principle
A loop you can't trace is a loop you can't trust unattended. The gate proves *this* run; observability proves the *harness* still works run-over-run. You need both to walk away.
