"""loomlib — shared stdlib-only helpers for the /loom scripts.

No third-party deps. No LLM calls. Pure mechanics: paths, atomic JSON I/O
with checksum + schema-version validation, UTC time, and the registry/config
schemas every other script reads.
"""
from __future__ import annotations
import datetime as _dt
import hashlib
import json
import os
import tempfile
from pathlib import Path

SCHEMA_VERSION = 1

LOOM_HOME = Path(os.environ.get("LOOM_HOME", Path.home() / ".claude" / "loom"))
REGISTRY = LOOM_HOME / "registry.json"
CONFIG = LOOM_HOME / "config.json"
SNAPSHOTS = LOOM_HOME / "snapshots"
AUDIT_LOG = LOOM_HOME / "audit.log"
INBOX = LOOM_HOME / "inbox"

RUN_HISTORY_CAP = 200  # keep the last N runs per loop


def utcnow() -> str:
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()


def days_from_now(days: int) -> str:
    return (_dt.datetime.now(_dt.timezone.utc) + _dt.timedelta(days=days)).replace(
        microsecond=0
    ).isoformat()


def parse_iso(s):
    if not s:
        return None
    try:
        return _dt.datetime.fromisoformat(s)
    except ValueError:
        return None


def ensure_home():
    LOOM_HOME.mkdir(parents=True, exist_ok=True)
    SNAPSHOTS.mkdir(parents=True, exist_ok=True)
    INBOX.mkdir(parents=True, exist_ok=True)


def _checksum(obj) -> str:
    payload = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest()


def atomic_write_json(path: Path, data: dict):
    """write-temp + fsync + rename. Never an in-place write (state DR)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)  # atomic on POSIX
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def load_json(path: Path, default=None):
    if not path.exists():
        return default
    with open(path) as f:
        return json.load(f)


# ---- registry ----------------------------------------------------------------

def default_registry() -> dict:
    body = {"schema_version": SCHEMA_VERSION, "loops": {}}
    body["checksum"] = _checksum(body["loops"])
    return body


def load_registry(strict=True) -> dict:
    ensure_home()
    reg = load_json(REGISTRY, default=None)
    if reg is None:
        reg = default_registry()
        atomic_write_json(REGISTRY, reg)
        return reg
    if reg.get("schema_version") != SCHEMA_VERSION:
        raise SystemExit(
            f"registry schema_version {reg.get('schema_version')} != {SCHEMA_VERSION}; migrate first"
        )
    expected = _checksum(reg.get("loops", {}))
    if strict and reg.get("checksum") != expected:
        raise SystemExit("registry checksum mismatch — state_corrupt; refusing to run on garbage")
    return reg


def save_registry(reg: dict, snapshot=True):
    reg["schema_version"] = SCHEMA_VERSION
    reg["checksum"] = _checksum(reg.get("loops", {}))
    atomic_write_json(REGISTRY, reg)
    if snapshot:
        date = utcnow()[:10]
        snap = SNAPSHOTS / f"registry-{date}.json"
        atomic_write_json(snap, reg)
        _prune_snapshots(retain_days=30)


def _prune_snapshots(retain_days=30):
    cutoff = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=retain_days)
    for p in SNAPSHOTS.glob("registry-*.json"):
        try:
            d = _dt.datetime.strptime(p.stem.split("registry-")[1], "%Y-%m-%d").replace(
                tzinfo=_dt.timezone.utc
            )
            if d < cutoff:
                p.unlink()
        except (ValueError, IndexError):
            continue


def new_loop_record(name, owner, repos, body, cadence, mechanism,
                    budget_cap=5.0, priority=5, max_open_prs=3) -> dict:
    return {
        "name": name,
        "owner": owner,
        "repos": repos if isinstance(repos, list) else [repos],
        "body": body,
        "cadence": cadence,
        "mechanism": mechanism,
        "maturity": "shadow",
        "status": "active",
        "accept_rate": None,
        "value_score": None,
        "budget_cap": budget_cap,
        "priority": priority,
        "last_run": None,
        "next_run": None,
        "renewal_date": days_from_now(90),
        "triggers": [],
        "max_open_prs": max_open_prs,
        "blackout": [],
        "consecutive_failures": 0,
        "consecutive_empty_runs": 0,
        "unread_loc_debt": 0,
        "runs": [],
    }


# ---- config ------------------------------------------------------------------

def default_config() -> dict:
    return {
        "monthly_budget_usd": None,
        "spent": 0.0,
        "kill_all": False,
        "freeze": False,
        "fleet_timezone": "America/Chicago",
        "per_loop_caps": {},
        "notify": {"telegram": False, "push": False},
        "model_routing": {
            "triage": "mlx-qwen-14b",
            "checker": "mlx-qwen-14b",
            "checker_fallback": "cloud-haiku",
            "maker": "cloud-opus",
            "review": "cloud-opus",
        },
        "egress_allowlist": ["github.com", "api.supabase.co", "slack.com"],
        "max_open_prs_fleet": 10,
    }


def load_config() -> dict:
    ensure_home()
    cfg = load_json(CONFIG, default=None)
    if cfg is None:
        cfg = default_config()
        atomic_write_json(CONFIG, cfg)
    return cfg


def save_config(cfg: dict):
    atomic_write_json(CONFIG, cfg)
