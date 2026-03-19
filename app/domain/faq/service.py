"""FAQ business rules."""

from __future__ import annotations

from typing import Any

from app.domain.faq.repository import FaqSearchRepository


class FaqSearchService:
    """Use-case service for semantic FAQ retrieval."""

    def __init__(self, repository: FaqSearchRepository) -> None:
        self._repository = repository

    def search(
        self, query: str, query_embedding: list[float], limit: int | None = None
    ) -> tuple[str, list[dict[str, Any]]]:
        normalized_query = query.strip()
        if not normalized_query:
            raise ValueError("query must not be empty")
        if limit is not None and limit < 1:
            raise ValueError("limit must be greater than zero")
        if not query_embedding:
            raise ValueError("query embedding must not be empty")
        return normalized_query, self._repository.search(query_embedding, limit=limit)
