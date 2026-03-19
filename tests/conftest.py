"""Test configuration helpers."""

from __future__ import annotations

import os
from pathlib import Path


def pytest_configure() -> None:
    base_temp = Path(__file__).resolve().parent / ".tmp"
    base_temp.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("TMPDIR", str(base_temp))
    os.environ.setdefault("TEMP", str(base_temp))
    os.environ.setdefault("TMP", str(base_temp))
