# Field-Test Playbook

The Field-Test desk turns surviving claims into **proof**. Code-reading predicts; running proves. Each integration below gives: the **run-it recipe**, the **proof** (what PASS looks like), the **predicted failure signature**, the **MCP-live variant** (used when a relevant MCP is connected), and the **`[USER MUST RUN]` boundary** (what only the user can execute).

**Rule:** if a critical-path claim cannot be proven by any path below, it stays `UNPROVEN` and scores as a P0-equivalent risk. Never upgrade a prediction to a pass.

---

## Stripe / payments

- **Recipe (test mode):** trigger a checkout with a Stripe **test card** (`4242…`) → confirm the webhook is received → assert the DB row + entitlement. Use `stripe listen --forward-to localhost/...` + `stripe trigger payment_intent.succeeded`.
- **Proof:** exactly one charge, one DB row, entitlement granted, idempotent on replay (`stripe trigger` twice → still one row).
- **Predicted failure:** webhook 500 (signature/parse), duplicate row on replay, entitlement granted before payment confirmed.
- **MCP-live (Supabase):** after the trigger, query the orders/entitlements table via MCP to confirm exactly-once.
- **[USER MUST RUN]:** a **real card in live mode**. I can run the full test-mode flow and predict live pass/fail, but I will not execute a real charge.

## Email (Resend / SES / Postmark) + deliverability

- **Recipe:** send via the app's send path to a real inbox you control → confirm provider `delivered` (not just `sent`) → confirm DKIM/SPF/DMARC align.
- **DNS check (scriptable):** `dig +short TXT resend._domainkey.<domain>`, `dig +short TXT <domain>` (SPF), `dig +short TXT _dmarc.<domain>`.
- **Proof:** message lands in **inbox** (not spam), DKIM `pass`, SPF `pass`, return-path aligned.
- **Predicted failure:** DKIM record missing/typo → spam-foldered or DKIM `fail`; magic-link email is the worst case (lands in spam → user never authenticates).
- **[USER MUST RUN]:** confirming **inbox vs spam** placement in a real mailbox. I can verify DNS records and provider status; I can't see your inbox.

## Magic-link / passwordless auth

- **Recipe:** request link → extract token → redeem → assert session created → **redeem again** (must fail) → wait past TTL and redeem (must fail).
- **Proof:** single-use enforced, TTL enforced, session rotated.
- **Predicted failure:** token reusable, no expiry, session id not rotated (fixation).
- **MCP-live (Supabase):** inspect the auth tokens table for single-use/expiry columns and confirm consumption.
- **[USER MUST RUN]:** end-to-end through the **real email** (depends on deliverability above).

## Cron / scheduled jobs / queues

- **Recipe:** invoke the job handler directly with a controlled clock → assert the side effect. Then confirm the **schedule is actually registered** (cron entry, platform scheduler config, `vercel.json` crons, etc.) — a correct handler that's never scheduled is a silent P0.
- **Proof:** side effect occurs exactly once per scheduled tick; idempotent if the tick double-fires.
- **Predicted failure:** handler correct but unscheduled; double-fire not idempotent; timezone/DST drift.
- **[USER MUST RUN]:** confirming it **fired in production** at the real scheduled time (needs prod logs).

## DNS / domain / TLS cutover

- **Recipe (scriptable):** `dig +short <domain>`, `dig +short www.<domain>`, `curl -sI https://<domain>` (status + cert), check cert expiry via `openssl s_client`.
- **Proof:** resolves to the right target, TLS valid and not near expiry, www↔apex both work, redirects correct.
- **[USER MUST RUN]:** the **production cutover** itself.

## OAuth / third-party login

- **Recipe:** run the full redirect flow in a test app → assert callback validates `state` (CSRF) and the token exchange happens server-side → assert account linking is correct (no account-takeover via email collision).
- **Predicted failure:** `state` not checked; token in the URL/client; email-collision account merge.
- **[USER MUST RUN]:** flows against the **real provider app** with real credentials.

## Supabase RLS / data access (MCP-live is decisive here)

- **MCP-live:** with the Supabase MCP connected — list tables, for each user-data table confirm `relrowsecurity = true`, read its policies, and **probe with the anon key** to confirm an unauthorized select returns nothing.
- **Without MCP:** read the migrations/policy SQL and predict; mark `UNPROVEN` until a live probe confirms — RLS is the single most common "looks fine in code, wide open in prod" failure.
- **Proof:** anon/other-user cannot read or write rows they shouldn't; service-role paths are server-only.

---

## How the Field-Test desk reports

```
FIELD-TEST  §payments / double-charge
  recipe:   stripe trigger payment_intent.succeeded ×2 (test mode)
  predict:  FAIL — handler lacks idempotency key (charges.ts:88), expect 2 rows
  ran:      yes (test mode) → 2 rows confirmed   →  PROVEN P0
  live gap: real-card live-mode test  [USER MUST RUN]
```

If `ran: no` and no MCP path exists → `verdict: UNPROVEN` → scored as P0-equivalent risk.
