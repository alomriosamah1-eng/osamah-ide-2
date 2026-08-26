---
name: loop-lint-fix
description: "Lint-and-fix loop. On every PR-open event, apply style/lint autofixes automatically, gated by tsc + tests staying green. Event-triggered, not scheduled — the smallest safe loop."
owner: REQUIRED — set to you
maturity: shadow
cadence: on-event
gate: "npm run lint --fix produces no errors AND npx tsc --noEmit AND npm test stay green"
---

# Loop · lint-fix

The smallest viable loop — narrow, mechanical, high accept-rate. Good for earning trust quickly.

## What it does (per event = PR opened)
1. **Trigger** — GitHub Action on `pull_request: opened` (event-triggered, reuses the existing Actions pattern).
2. **Body** — run the formatter/linter autofix (`npm run lint -- --fix`, prettier) on the PR's changed files only.
3. **Gate** — `npx tsc --noEmit && npm test` must stay green after the autofix (a "fix" that breaks types/tests is reverted).
4. **Action** — push the autofix as a commit to the PR branch (not a new PR); comment what was fixed.
5. **Record** — track that the autofix didn't change behavior (diff is formatting-only).

## Never-do
- Never apply a lint rule that changes behavior (e.g. an auto-`await` insert) — only style/format autofixes.
- Never push to a deny-list path or a protected branch directly.
- Never silence a lint error with an inline-disable to make it pass — fix or leave it.

## Why this is auto-trivial-eligible early
Formatting-only diffs with a green gate are the canonical "pre-blessed trivia" — once it has earned pr-only and proven the diffs are behavior-neutral, this is the safest candidate for the auto-trivial lane.

## Deploy
```
/loom "lint-and-fix on PR open" --cadence on-event --dry-run
/loom --deploy lint-fix      # wires a GitHub Action
```
