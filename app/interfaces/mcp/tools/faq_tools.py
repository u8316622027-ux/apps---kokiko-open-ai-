"""MCP FAQ tools."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable
from urllib.request import Request
from urllib.request import urlopen as default_urlopen

from app.core.env import read_env_file_value
from app.domain.faq.repository import FaqSearchRepository
from app.domain.faq.service import FaqSearchService

OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"
OPENAI_EMBEDDINGS_MODEL = "text-embedding-3-small"
OPENAI_EMBEDDINGS_DIMENSIONS = 1536
SUPABASE_FAQ_RPC_FUNCTION = "match_faq_chunks"
FAQ_MATCH_COUNT_DEFAULT = 5
ENV_FILE_PATH = Path(__file__).resolve().parents[4] / ".env"


class OpenAIEmbeddingClient:
    """HTTP client for OpenAI embeddings API."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        dimensions: int | None = None,
        timeout: float = 10.0,
        urlopen: Callable[..., Any] = default_urlopen,
    ) -> None:
        self._api_key = (api_key or _read_env("OPENAI_API_KEY")).strip()
        self._dimensions = dimensions or _read_positive_int_env(
            "FAQ_EMBEDDING_DIMENSIONS",
            OPENAI_EMBEDDINGS_DIMENSIONS,
        )
        self._timeout = timeout
        self._urlopen = urlopen

    def create_embedding(self, text: str) -> list[float]:
        if not self._api_key:
            raise ValueError("OPENAI_API_KEY is not configured")

        payload = json.dumps(
            {
                "model": OPENAI_EMBEDDINGS_MODEL,
                "input": text,
                "dimensions": self._dimensions,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        request = Request(
            url=OPENAI_EMBEDDINGS_URL,
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}",
            },
        )
        with self._urlopen(request, timeout=self._timeout) as response:
            response_payload = json.loads(response.read().decode("utf-8"))

        data = response_payload.get("data")
        if not isinstance(data, list) or not data:
            raise ValueError("OpenAI embeddings response is missing data")
        first_item = data[0] if isinstance(data[0], dict) else {}
        embedding = first_item.get("embedding") if isinstance(first_item, dict) else None
        if not isinstance(embedding, list) or not embedding:
            raise ValueError("OpenAI embeddings response is missing embedding")
        return [float(value) for value in embedding]


class SupabaseFaqSearchRepository(FaqSearchRepository):
    """Supabase RPC-backed FAQ semantic search repository."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        default_match_count: int | None = None,
        match_threshold: float | None = None,
        timeout: float = 10.0,
        urlopen: Callable[..., Any] = default_urlopen,
    ) -> None:
        self._base_url = (base_url or _read_env("SUPABASE_URL")).strip().rstrip("/")
        self._api_key = (
            api_key
            or _read_os_env("SUPABASE_KEY")
            or _read_os_env("SUPABASE_SERVICE_ROLE_KEY")
            or read_env_file_value("SUPABASE_KEY", env_path=ENV_FILE_PATH)
            or read_env_file_value("SUPABASE_SERVICE_ROLE_KEY", env_path=ENV_FILE_PATH)
        ).strip()
        self._default_match_count = default_match_count or _read_positive_int_env(
            "FAQ_MATCH_COUNT_DEFAULT",
            FAQ_MATCH_COUNT_DEFAULT,
        )
        self._match_threshold = (
            match_threshold
            if match_threshold is not None
            else _read_float_env("FAQ_MATCH_THRESHOLD")
        )
        self._timeout = timeout
        self._urlopen = urlopen

    def search(
        self, query_embedding: list[float], limit: int | None = None
    ) -> list[dict[str, Any]]:
        if not self._base_url:
            raise ValueError("SUPABASE_URL is not configured")
        if not self._api_key:
            raise ValueError("SUPABASE_KEY is not configured")
        effective_limit = limit if limit is not None else self._default_match_count
        payload_dict: dict[str, Any] = {
            "query_embedding": query_embedding,
            "match_count": effective_limit,
        }
        if self._match_threshold is not None:
            payload_dict["match_threshold"] = self._match_threshold
        payload = json.dumps(payload_dict, ensure_ascii=False, separators=(",", ":")).encode(
            "utf-8"
        )
        request = Request(
            url=f"{self._base_url}/rest/v1/rpc/{SUPABASE_FAQ_RPC_FUNCTION}",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0",
                "apikey": self._api_key,
                "Authorization": f"Bearer {self._api_key}",
            },
        )
        with self._urlopen(request, timeout=self._timeout) as response:
            response_payload = json.loads(response.read().decode("utf-8"))

        if not isinstance(response_payload, list):
            return []
        return [chunk for chunk in response_payload if isinstance(chunk, dict)]


def faq_search(
    query: str,
    *,
    limit: int | None = None,
    embedding_client: OpenAIEmbeddingClient | None = None,
    repository: FaqSearchRepository | None = None,
) -> dict[str, Any]:
    """Tool entrypoint for semantic FAQ search."""

    normalized_query = query.strip()
    if not normalized_query:
        raise ValueError("query must not be empty")

    effective_embedding_client = embedding_client or OpenAIEmbeddingClient()
    query_embedding = effective_embedding_client.create_embedding(normalized_query)

    effective_repository = repository or SupabaseFaqSearchRepository()
    service = FaqSearchService(effective_repository)
    normalized_query, chunks = service.search(normalized_query, query_embedding, limit=limit)
    return {
        "query": normalized_query,
        "count": len(chunks),
        "chunks": chunks,
    }


def _read_env(key: str) -> str:
    value = _read_os_env(key).strip()
    if value:
        return value
    return read_env_file_value(key, env_path=ENV_FILE_PATH).strip()


def _read_os_env(key: str) -> str:
    import os

    return str(os.getenv(key, "")).strip()


def _read_positive_int_env(key: str, default: int) -> int:
    raw_value = _read_env(key)
    if not raw_value:
        return default
    try:
        parsed = int(raw_value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def _read_float_env(key: str) -> float | None:
    raw_value = _read_env(key)
    if not raw_value:
        return None
    try:
        return float(raw_value)
    except ValueError:
        return None
