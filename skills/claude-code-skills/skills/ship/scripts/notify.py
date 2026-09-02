#!/usr/bin/env python3
"""
notify.py — reach the human when /ship needs them.

Fired ONLY at: the launch gate, an escalation, or an abort. Silent while working.
Two channels, both best-effort and independent (one failing never blocks the other):

  1. Local push    — macOS notification via osascript (works out of the box on darwin)
  2. Telegram      — standard Bot API, if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set
                     (you already run Telegram bots; drop a token/chat-id in the env)
  3. Rupert hook   — optional: POST to RUPERT_WEBHOOK_URL if you prefer routing via the gateway

Usage:
    python3 notify.py --event gate     --title "hcc-quote" --message "CSV export ready to ship"
    python3 notify.py --event escalate --message "Need STRIPE_SECRET_KEY to continue"
    python3 notify.py --event abort    --message "3 rounds, 1 P0 left — handback"

Exit 0 if at least one channel delivered (or stdout fallback used). Stdlib only.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request

EVENTS = {
    "gate": "🚢 /ship — ready to launch",
    "escalate": "✋ /ship — needs you",
    "abort": "⛔ /ship — aborted (handback)",
    "info": "ℹ️ /ship",
}


def arg(name: str, default: str = "") -> str:
    a = sys.argv[1:]
    return a[a.index(name) + 1] if name in a and a.index(name) + 1 < len(a) else default


def local_push(title: str, message: str) -> bool:
    """macOS Notification Center. No-op on non-darwin."""
    if sys.platform != "darwin":
        return False
    try:
        safe_t = title.replace('"', "'")
        safe_m = message.replace('"', "'")
        subprocess.run(
            ["osascript", "-e", f'display notification "{safe_m}" with title "{safe_t}" sound name "Glass"'],
            check=True, capture_output=True, timeout=10,
        )
        return True
    except Exception:
        return False


def telegram(text: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        return False
    try:
        data = json.dumps({"chat_id": chat, "text": text, "parse_mode": "Markdown"}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=data, headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except Exception:
        return False


def rupert(payload: dict) -> bool:
    url = os.environ.get("RUPERT_WEBHOOK_URL")
    if not url:
        return False
    try:
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            return 200 <= r.status < 300
    except Exception:
        return False


def main() -> int:
    event = arg("--event", "info")
    heading = EVENTS.get(event, EVENTS["info"])
    title = arg("--title", "/ship")
    message = arg("--message", "")
    if not message and not sys.stdin.isatty():
        message = sys.stdin.read().strip()

    tg_text = f"*{heading}*\n*{title}*\n{message}".strip()

    delivered = []
    if local_push(heading, f"{title}: {message}"):
        delivered.append("push")
    if telegram(tg_text):
        delivered.append("telegram")
    if rupert({"event": event, "title": title, "message": message}):
        delivered.append("rupert")

    if delivered:
        print(f"notified via: {', '.join(delivered)}", file=sys.stderr)
        return 0
    # Fallback: never silently fail — surface it.
    print(f"[notify:{event}] {title} — {message}")
    print("notify.py: no channel configured (set TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID or RUPERT_WEBHOOK_URL)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
