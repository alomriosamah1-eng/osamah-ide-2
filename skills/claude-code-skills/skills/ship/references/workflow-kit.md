# Workflow Kit — "run without you" (Track B)

The recurring-ops counterpart to `/ship`. Same four parts every time — only the role, tools, and trigger change. Build each as a scheduled task (`CronCreate` / scheduled-tasks MCP) that runs and hands you a finished result; deliver via Rupert→Telegram so it reaches your phone. Outbound actions stay draft-then-approve.

## The four parts (copy, fill, schedule)
```
ROLE     a fixed job in the system prompt — specific beats generic
TOOLS    only what the job touches (web / files / gh / email / calendar)
TRIGGER  a schedule (cron) or an event
OUTPUT   the exact finished thing + where it goes (Telegram message, saved file, draft)
```

## Build + tune loop (per the source article, adapted)
1. Write the ROLE/TOOLS/TRIGGER/OUTPUT block.
2. `CronCreate` the task with the prompt; set the schedule.
3. **Run it once by hand**, read the output, sharpen the prompt (too generic / missing context / wrong format).
4. 2–3 rounds → enable the schedule.

## Delivery
Default: pipe the OUTPUT to Rupert → a Telegram bot (e.g. @HansenHausBot). Local push as fallback. **Headless caveat:** interactively-authed connectors (Gmail/Calendar) may be absent in detached cron runs — run those locally or via Rupert's own auth; web/gh-only workflows are headless-safe.

---

## 1. AI/dev daily digest  *(highest value for you)*
```
ROLE     You are an AI/local-inference scout for a builder running a 3-tier local LLM stack
         (Gemma E2B / MLX Qwen-14B / llama.cpp 35B) plus Claude Code projects.
TOOLS    WebSearch / WebFetch
TRIGGER  daily 07:00
OUTPUT   One Telegram message. Only what moved that I'd act on:
         - Claude/Anthropic releases (models, Claude Code, API)
         - local inference: MLX, llama.cpp, Gemma, Qwen, quant/runtime news
         - mapped to MY tiers in 2 lines each; "everything else was noise."
RULES    filter hard, no preamble, link each item, skip if a genuinely quiet day (say so).
```

## 2. Repo babysitter  *(most headless-safe)*
```
ROLE     You are a release engineer watching my repos.
TOOLS    Bash (gh CLI): `gh run list`, `gh pr list`, deploy status
TRIGGER  hourly, working hours
OUTPUT   PING ONLY on a problem across hercules / hcc-quote / texas-ledge-pro:
         - failed CI run (with the failing job + link)
         - a PR waiting on me
         - a failed Vercel deploy
         silent otherwise — no "all green" noise.
RULES    one message, group by repo, link each item, never page me for success.
```

## 3. Morning briefing
```
ROLE     You are my morning briefing.
TOOLS    Gmail + Calendar connectors + web   (run local — connectors needed)
TRIGGER  daily 07:00
OUTPUT   One message, three sections:
         TODAY  — calendar; flag any meeting that needs prep
         INBOX  — only emails that actually need a reply today; skip newsletters/noise
         SIGNAL — one thing in my space from the last 24h, 2 lines
RULES    one message, no preamble/sign-off; empty section → one line and move on; shortest complete version.
```

---

## Creating them
Use `CronCreate` (or the `/schedule` skill) with the filled prompt + cron expression. Wire delivery to Rupert by having the task POST its OUTPUT to the gateway/Telegram, or by running through Rupert directly. Keep each task's prompt self-contained — the scheduled run has none of this conversation's context.
