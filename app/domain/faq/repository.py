"""FAQ repository contracts."""

from __future__ import annotations

from typing import Any, Protocol


class FaqSearchRepository(Protocol):
    """Abstraction for semantic FAQ data providers."""

    def search(
        self, query_embedding: list[float], limit: int | None = None
    ) -> list[dict[str, Any]]:
        """Return relevant FAQ chunks by embedding similarity."""
