# CLAUDE.md generation template

`/ship --init` fills this from the Project Profile + a quick read of the codebase, then writes it to `<project>/CLAUDE.md`. Replace every `{{...}}`. Keep it tight — a rulebook, not an essay. Infer conventions by reading 5–10 representative files (lint/prettier/tsconfig + a couple of components), don't guess.

```markdown
# {{project name}} — house rules

> Working memory for Claude. Read before editing. Keep current.

## What this is
{{1–2 sentences: what the project does, who uses it, stack in one line}}

## Commands (verified from Project Profile)
- **Dev:** {{dev command or "—"}}
- **Build:** {{profile.build or "—"}}
- **Test:** {{profile.test or "⚠ NONE — write tests with the change; do not claim a passing test gate"}}
- **Lint:** {{profile.lint or "—"}}
- **Typecheck:** {{profile.typecheck or "—"}}
- **Deploy:** {{launch_adapter playbook in one line, e.g. "Vercel — push=preview, merge to main=prod (gated)"}}
- **DB:** {{db_adapter + migrate command, or "none / local-first"}}

## Conventions (inferred — correct me if wrong)
- {{language + framework idioms actually used here}}
- {{file/folder layout + naming pattern}}
- {{state/data patterns, styling approach, key libraries to reuse not replace}}
- {{anything load-bearing: auth flow, env vars, generated files not to edit by hand}}

## Review bar — what blocks a merge here
- {{P0/P1 specifics for THIS project: e.g. "RLS on every Supabase table", "no force-unwraps on live paths", "no console.log in prod"}}
- Tests + lint + typecheck green, or the gap is named explicitly.

## Idiot Index (first-principles house-rule)
Before adding or keeping a component, weigh its complexity/cost against its essential value
(the "raw material"). **High ratio = redesign target: strip the ceremony, keep the metal.**
Don't gold-plate; build the smallest thing that meets the goal. (Per-decision lens. For a
whole-repo first-principles pass, run `/elon-audit`.)

## /ship notes
- Launch adapter: **{{launch_adapter}}**. {{one-line gate reminder, e.g. "push=deploy — only ever ship via the gated merge"}}
- {{any project-specific escalation, e.g. "real-money paths require explicit confirm", "migrations are destructive-sensitive"}}
```

## Notes for the generator
- If `profile.test` is empty, write the ⚠ line verbatim — never paper over a missing test suite.
- If `profile.type == unknown` or `launch_adapter == static-pr`, ask the user once for the deploy story and bake the answer in.
- Don't restate what the code/README already says; capture the *non-obvious* (why, gotchas, what-not-to-touch).
- Re-running `--init` updates the Commands block from a fresh profile but preserves human-edited Conventions/Review-bar (diff, don't clobber).
