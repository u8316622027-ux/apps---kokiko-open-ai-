"""Tests for FAQ tools environment handling."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest

from app.interfaces.mcp.tools import faq_tools


class _FakeResponse:
    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: D401, ANN001
        return None


def test_read_env_prefers_os_env_over_file(monkeypatch: pytest.MonkeyPatch) -> None:
    base_temp = Path(__file__).resolve().parent / ".tmp"
    base_temp.mkdir(parents=True, exist_ok=True)
    env_path = base_temp / f".env-{uuid4().hex}"
    env_path.write_text("OPENAI_API_KEY=file-value\n", encoding="utf-8")

    monkeypatch.setattr(faq_tools, "ENV_FILE_PATH", env_path)
    monkeypatch.setenv("OPENAI_API_KEY", "env-value")

    assert faq_tools._read_env("OPENAI_API_KEY") == "env-value"


def test_read_positive_int_env_uses_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAQ_MATCH_COUNT_DEFAULT", "7")

    assert faq_tools._read_positive_int_env("FAQ_MATCH_COUNT_DEFAULT", 5) == 7


def test_supabase_repository_uses_env_base_url_and_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_KEY", "supabase-key")

    captured: dict[str, Any] = {}

    def _fake_urlopen(request, timeout=0):  # type: ignore[no-untyped-def]
        captured["url"] = request.full_url
        captured["headers"] = dict(request.headers)
        return _FakeResponse([])

    repository = faq_tools.SupabaseFaqSearchRepository(urlopen=_fake_urlopen)
    repository.search([0.1, 0.2], limit=1)

    normalized_headers = {key.lower(): value for key, value in captured["headers"].items()}
    assert captured["url"].startswith("https://supabase.example")
    assert normalized_headers["apikey"] == "supabase-key"
