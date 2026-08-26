# The Gate — should this task be a loop at all?

The strategic decision (4-condition test) and the tactical one (30-second checklist). Run both in step 1. **Miss one box → keep it a manual prompt.** Output a verdict table and, on any FAIL, STOP and name the failed condition.

## The 4-condition test (strategic)

| # | Condition | Plain English | If missed |
|---|---|---|---|
| 1 | **Repeats** | The task recurs at least weekly, so setup cost amortizes. | One-off → a good prompt is faster and cheaper. You don't have a loop, you have a script you ran once. |
| 2 | **Automated verification** | A test / type check / linter / build can fail the work without you in the room. | No gate → you're back in the chair reading every diff — the exact job the loop was supposed to remove. |
| 3 | **Budget absorbs waste** | Loops re-read context, retry, explore — burning tokens whether or not a run ships. | Metered plan + heavy verification → the token bill arrives before the productivity gain. Mitigate with local-model routing. |
| 4 | **Senior-engineer tools** | The agent has logs, a reproduction environment, and can run the code it writes. | Without them the loop iterates blind. |

## The 30-second checklist (tactical)

1. The task happens **at least weekly**.
2. A test / type check / build / linter can **reject bad output**.
3. The agent can **run the code it changes** (repro env).
4. The loop has a **hard stop** — token budget, iteration count, or time limit.
5. A **human reviews** before merge, deploy, or dependency changes.

## Good first loops (machine-checkable, low-judgment)

- **CI failure triage** — nightly: scan failures, classify cause, draft fix PRs for the easy ones.
- **Dependency bump PRs** — weekly: scan updates, test compatibility, open PRs. (Highest accept-rate, the harden-first pick.)
- **Lint-and-fix passes** — on every PR-open event: apply style fixes automatically.
- **Flaky test reproduction** — loop until a theory survives the test.
- **Issue-to-PR drafts** — on a codebase with strong tests, where bad output gets rejected by the suite.
- **Coverage ratchet** — nightly: lowest-coverage module → write tests → PR if green.

## Bad first loops (need a human in the chair — REFUSE)

- Architecture rewrites
- Auth or payments code
- Production deploys
- Vague product work
- Anything where "done" is a judgment call

## Who wins, who loses

**Build it if:** repetitive machine-checkable work + budget to run it; a strong existing test suite (if a junior could do it from a checklist and the suite would catch mistakes, a loop fits); async multi-agent patterns already in use.

**Skip it if:** solo on a consumer plan running heavy verification (the bill or the rate limit gets you); code with no automated verification; the real constraint is **review capacity**, not typing speed (a loop just makes the review queue longer).

The honest version: **loop engineering is real, and most tasks don't need it yet.**
