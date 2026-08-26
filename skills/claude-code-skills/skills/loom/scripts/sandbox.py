#!/usr/bin/env python3
"""sandbox.py — run the objective gate with NO live credentials in the env.

stdlib only. The gate executes attacker-influenceable code (a malicious PR or
dependency can add a postinstall/pretest hook that reads tokens from the env).
This runner scrubs every credential-shaped env var before exec, so a secret
that isn't present can't be exfiltrated. The merge/push token is injected only
AFTER the gate passes, by a separate privileged step that does not run repo code.

For full network isolation, run the returned command inside a container or
`sandbox-exec` profile; this script enforces the credential boundary, which is
the part doable in pure stdlib, and reports what it scrubbed.

Usage:
  sandbox.py run --cwd <repo> -- <gate command...>
  sandbox.py run --cwd <repo> --timeout 1800 -- npm test
"""
from __future__ import annotations
import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

SECRET_PATTERNS = re.compile(
    r"(TOKEN|SECRET|KEY|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|SUPABASE|GITHUB_|GH_|"
    r"AWS_|STRIPE|OPENAI|ANTHROPIC|SLACK_|NPM_TOKEN|SSH|API_)", re.I)

# env vars the gate legitimately needs; never scrubbed
KEEP = {"PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "TMPDIR", "NODE_ENV",
        "CI", "TERM", "PWD"}


def scrub_env(base=None):
    base = dict(base or os.environ)
    scrubbed = {}
    removed = []
    for k, v in base.items():
        if k in KEEP:
            scrubbed[k] = v
        elif SECRET_PATTERNS.search(k):
            removed.append(k)
        else:
            scrubbed[k] = v
    # block outbound proxy hijack; mark sandbox
    scrubbed["LOOM_SANDBOX"] = "1"
    return scrubbed, removed


def extract_actionable(stdout, stderr):
    """Turn raw gate output into an agent-actionable next instruction:
    failing test id · first error line · changed-file hint. In a loop an error
    is the next prompt, not a dead end (tool-surface.md §3)."""
    blob = (stdout or "") + "\n" + (stderr or "")
    out = {}
    # failing test (jest/vitest/pytest)
    m = (re.search(r"(?:✕|FAIL|✗)\s+(.+)", blob)
         or re.search(r"(.+?)\s+(?:FAILED|failed)\b", blob)
         or re.search(r"●\s+(.+)", blob))
    if m:
        out["failing_test"] = m.group(1).strip()[:160]
    # first compiler/type error
    m = re.search(r"(.*error TS\d+:.*)", blob) or re.search(r"^(.*\bError:.*)$", blob, re.M)
    if m:
        out["first_error"] = m.group(1).strip()[:200]
    # first file:line reference (the likely culprit)
    m = re.search(r"([\w./-]+\.(?:ts|tsx|js|jsx|py)):(\d+)", blob)
    if m:
        out["likely_file"] = f"{m.group(1)}:{m.group(2)}"
    return out


def cmd_run(args):
    if not args.command:
        raise SystemExit("no gate command given (use -- <cmd>)")
    env, removed = scrub_env()
    print(f"[sandbox] scrubbed {len(removed)} credential-shaped env vars: {removed}",
          file=sys.stderr)
    print(f"[sandbox] running gate: {' '.join(args.command)}  (cwd={args.cwd})",
          file=sys.stderr)
    try:
        r = subprocess.run(args.command, cwd=args.cwd, env=env,
                           timeout=args.timeout, capture_output=True, text=True)
    except subprocess.TimeoutExpired:
        print(f"[sandbox] GATE TIMEOUT after {args.timeout}s → treated as FAIL", file=sys.stderr)
        raise SystemExit(124)
    verdict = "PASS" if r.returncode == 0 else "FAIL"
    if r.returncode == 0:
        print(f"[sandbox] gate verdict: PASS (exit 0)", file=sys.stderr)
    else:
        # offload the full log (context-hygiene: file is the bucket, context is the budget)
        scratch = Path(args.offload_dir).expanduser()
        scratch.mkdir(parents=True, exist_ok=True)
        log = scratch / "gate.log"
        log.write_text((r.stdout or "") + "\n----- stderr -----\n" + (r.stderr or ""))
        hint = extract_actionable(r.stdout, r.stderr)
        # hand the maker a structured NEXT-INSTRUCTION, not raw stderr
        print(f"[sandbox] gate verdict: FAIL (exit {r.returncode})", file=sys.stderr)
        print("NEXT (agent-actionable):", file=sys.stderr)
        for k in ("failing_test", "first_error", "likely_file"):
            if hint.get(k):
                print(f"  {k}: {hint[k]}", file=sys.stderr)
        if not hint:
            print("  (no signature matched — see full log)", file=sys.stderr)
        print(f"  full_log: {log}  (offloaded; read only the slice you need)", file=sys.stderr)
    print("[sandbox] credentials were NOT present during the gate; "
          "inject the merge token only now, in a step that does not run repo code.",
          file=sys.stderr)
    raise SystemExit(r.returncode)


def main():
    p = argparse.ArgumentParser(description="loom credential-isolated gate runner")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--cwd", default=".")
    r.add_argument("--timeout", type=int, default=1800)
    r.add_argument("--offload-dir", dest="offload_dir", default=".loom/scratch",
                   help="where to offload the full gate log on FAIL")
    r.add_argument("command", nargs=argparse.REMAINDER)
    r.set_defaults(func=cmd_run)
    args = p.parse_args()
    # strip a leading '--'
    if getattr(args, "command", None) and args.command and args.command[0] == "--":
        args.command = args.command[1:]
    args.func(args)


if __name__ == "__main__":
    main()
