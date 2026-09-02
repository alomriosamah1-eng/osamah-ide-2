# Cost governance

The tweet's #1 condition is token budget. Loops re-read context, retry, and explore — the technique scales with budget, which is why it reads as obvious to people with free tokens and reckless to people on a metered plan. This layer makes the cost visible *before* you spend and bounded *while* you spend.

## Forward projection (step 7, before deploy)
From the backtest's measured token usage:
```
projected_cost ≈ tokens_per_run × runs_per_period × $_per_token
```
Show it before `--deploy`. If a nightly loop projects to $40/mo for a low-value task, that's a no-build — surfaced as a number, not a hunch. `scripts/budget.py project` computes it.

## Global budget pool
`~/.claude/loom/config.json`:
```json
{ "monthly_budget_usd": 50, "spent": 0, "per_loop_caps": { "dep-bump": 5, "nightly-polish": 10 } }
```
- Each run checks `remaining = monthly_budget_usd − spent` before starting.
- At **90%** pool spend → auto-pause the lowest-`priority` loops first.
- At **100%** → hard stop; no loop runs until the pool resets or you raise it.

## Local-first model routing
The cheapest token is the one you don't buy from the cloud. Reuse the local LLM tier system (`project_local_llm_tiers`: Gemma fast / MLX Qwen-14B primary / llama.cpp 35B heavy).

| Stage | Route to | Why |
|---|---|---|
| triage / classify (CI cause, dep risk) | **MLX Qwen-14B** (local, free) | high volume, low stakes |
| the independent **checker** / completion turn | **MLX Qwen-14B** (`--checker local`) | the tweet's "separate small model"; different model from the maker is a feature |
| fix authoring / adversarial review | **cloud Opus** | needs the strongest reasoning |

Map in `config.json.model_routing`. When MLX is unreachable, fall back to cloud Haiku for the checker (logged).

### Opt-in: `--checker cloud-strong` for high-stakes, low-frequency gates
The default above is right for the metered-plan operator: the checker is the **volume** turn (it runs every iteration), so making it the cheapest model is what keeps the bill bounded. But for a loop where the cadence is **low** and a **false-accept is expensive** — one missed defect costs far more than the token delta — invert it: put the *stronger* model on the checker. (This is the one defensible idea from Roan's quant piece — Opus verifies, Sonnet generates — and the ensemble logic is real: different architectures catch different errors.)

Rules for `--checker cloud-strong`:
- **Opt-in, never default.** The default stays local-first MLX (this protects the under-capitalized operator the tweet warns about).
- **Gated behind the budget pool + cost projection.** Because it makes the volume turn the priciest model, it must pass `budget.py project` and the pool check before deploy — so it can't silently blow up a metered plan. High-frequency loops will fail that projection, which is the point.
- **Use it for:** low-frequency loops where a wrong GREEN is costly (a release-readiness gate, a security check, a money-adjacent verification). **Not for:** nightly-polish or lint-fix, where volume × strong model = runaway cost with little marginal safety.

## The metric that matters
**Cost-per-accepted-change**, not tokens spent / tasks attempted / loops scheduled. If accept-rate < 50%, you're doing review work the loop was supposed to save — the loop is losing. Pair with `realized_value` (see `value-and-human-factors.md`): a cheap, high-accept loop that ships churn still loses.

## Failure mode this prevents
Without a cap, ambitious loops burn 5–10× the tokens you expected (re-reading context, retrying). The hard stop (doctrine 4) + the pool are the difference between a tool and a money pit.
