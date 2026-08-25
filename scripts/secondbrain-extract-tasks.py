#!/usr/bin/env python3
"""Osamah-owned process adapter for the unmodified Second Brain extractor."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SECOND_BRAIN_SRC = PROJECT_ROOT / "third_party" / "second-brain" / "src"
sys.path.insert(0, str(SECOND_BRAIN_SRC))

from secondbrain.tasks import extract_candidates_from_text  # noqa: E402


def main() -> int:
    payload = json.load(sys.stdin)
    content = payload.get("content")
    include_voice_patterns = payload.get("includeVoicePatterns", False)
    if not isinstance(content, str):
        raise ValueError("content must be a string")
    if not isinstance(include_voice_patterns, bool):
        raise ValueError("includeVoicePatterns must be a boolean")

    candidates = list(extract_candidates_from_text(content, include_voice_patterns=include_voice_patterns))
    json.dump({"candidates": candidates}, sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
