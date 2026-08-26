#!/usr/bin/env python3
"""
gauntlet field_test_scaffold.py — detect integrations in a repo and emit run-it
test stubs from field-test-playbook.md, each marked with its [USER MUST RUN] boundary.

Usage:
    field_test_scaffold.py [path] [--out .gauntlet/field-tests]
"""
from __future__ import annotations
import argparse, os, re, sys

SKIP = {".git", "node_modules", "dist", "build", ".next", ".gauntlet", "Pods", ".venv", "venv"}

# integration -> (detect regex, stub script, [USER MUST RUN] note)
INTEGRATIONS = {
    "stripe": (r"stripe", """#!/usr/bin/env bash
# PROVE: payment flow is exactly-once and webhook-verified (TEST MODE)
set -euo pipefail
stripe listen --forward-to localhost:3000/api/webhooks/stripe &  # adjust path
sleep 2
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.succeeded   # replay → must NOT double-apply
echo "ASSERT: exactly ONE order row + ONE entitlement; webhook returned 2xx; signature verified."
# [USER MUST RUN] a real card in LIVE mode — not executable here.
"""),
    "resend": (r"resend|@react-email|postmark|ses", """#!/usr/bin/env bash
# PROVE: email deliverability (DKIM/SPF/DMARC) — fill <domain>
set -euo pipefail
DOMAIN="<domain>"
echo "DKIM:"; dig +short TXT resend._domainkey.$DOMAIN
echo "SPF:";  dig +short TXT $DOMAIN | grep -i spf || echo "NO SPF"
echo "DMARC:";dig +short TXT _dmarc.$DOMAIN || echo "NO DMARC"
echo "ASSERT: DKIM present, SPF pass, DMARC present."
# [USER MUST RUN] confirm INBOX (not spam) placement in a real mailbox.
"""),
    "magic-link": (r"magiclink|magic_link|signInWithOtp|passwordless|verifyOtp", """#!/usr/bin/env bash
# PROVE: magic-link is single-use + expiring + rotates session
echo "1) request link  2) redeem token → session created"
echo "3) redeem SAME token again → MUST fail (single-use)"
echo "4) redeem after TTL → MUST fail (expiry)"
echo "ASSERT: replay rejected, expiry enforced, session id rotated."
# [USER MUST RUN] full path through the REAL email (depends on deliverability).
"""),
    "cron": (r"cron|schedule|node-cron|vercel\.json.*crons|EventBridge", """#!/usr/bin/env bash
# PROVE: scheduled job fires AND is idempotent AND is actually registered
echo "1) invoke handler directly with a fixed clock → assert side effect once"
echo "2) invoke twice (double-fire) → assert idempotent"
echo "3) confirm the schedule is REGISTERED (cron entry / vercel.json crons / scheduler)"
# [USER MUST RUN] confirm it fired in PRODUCTION at the real time (needs prod logs).
"""),
    "dns": (r"vercel|netlify|cloudflare|route53|\.well-known", """#!/usr/bin/env bash
# PROVE: domain/TLS — fill <domain>
set -euo pipefail
DOMAIN="<domain>"
dig +short $DOMAIN; dig +short www.$DOMAIN
curl -sI https://$DOMAIN | head -1
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates
echo "ASSERT: resolves correctly, TLS valid + not near expiry, www↔apex both work."
# [USER MUST RUN] the production cutover itself.
"""),
    "oauth": (r"oauth|passport|next-auth|authlib|openid", """#!/usr/bin/env bash
# PROVE: OAuth flow validates state (CSRF) + server-side token exchange + safe linking
echo "Run the redirect flow; ASSERT: 'state' validated, token never in URL/client,"
echo "email-collision does NOT silently merge accounts (account-takeover)."
# [USER MUST RUN] flow against the REAL provider app with real credentials.
"""),
    "supabase-rls": (r"supabase|createClient.*SUPABASE|pg_policies|row level security", """#!/usr/bin/env bash
# PROVE: RLS on every user-data table (DECISIVE via Supabase MCP if connected)
echo "If Supabase MCP connected: list tables; for each user-data table assert"
echo "  relrowsecurity=true, read policies, probe with ANON key → expect zero rows."
echo "Without MCP: read policy SQL and mark UNPROVEN until a live probe runs."
"""),
}


MANIFESTS = {"package.json", "requirements.txt", "pyproject.toml", "Cargo.toml",
             "Podfile", "vercel.json", "go.mod", "Gemfile"}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".py", ".swift", ".rb", ".go", ".rs"}
# hot-named source files worth reading for code-pattern integrations (magic-link, cron, oauth)
HOT = re.compile(r"(auth|login|signin|webhook|cron|schedul|payment|checkout|email|send|oauth|magic)", re.I)


def scan(root: str) -> set[str]:
    blob = []
    for dp, dn, fns in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP and not d.startswith(".")]
        for fn in fns:
            blob.append(fn)
            full = os.path.join(dp, fn)
            if fn in MANIFESTS or (os.path.splitext(fn)[1] in CODE_EXT and HOT.search(full)):
                try:
                    blob.append(open(full, encoding="utf-8", errors="ignore").read())
                except OSError:
                    pass
    text = "\n".join(blob)
    return {name for name, (rx, _, ) in ((n, (v[0], v[1])) for n, v in INTEGRATIONS.items())
            if re.search(rx, text, re.I)}


def main() -> int:
    ap = argparse.ArgumentParser(description="Scaffold gauntlet field-tests from detected integrations.")
    ap.add_argument("path", nargs="?", default=".")
    ap.add_argument("--out", default=".gauntlet/field-tests")
    args = ap.parse_args()
    root = os.path.abspath(args.path)
    found = scan(root)
    if not found:
        print("No known integrations detected.")
        return 0
    os.makedirs(args.out, exist_ok=True)
    for name in sorted(found):
        stub = INTEGRATIONS[name][1]
        path = os.path.join(args.out, f"test-{name}.sh")
        open(path, "w").write(stub)
        os.chmod(path, 0o755)
        print(f"  scaffolded {path}")
    print(f"\n{len(found)} field-test stub(s) → {args.out}. Each marks its [USER MUST RUN] boundary.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
