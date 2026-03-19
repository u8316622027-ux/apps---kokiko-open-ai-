"""Products repository contracts."""

from __future__ import annotations

from typing import Protocol

from app.domain.products.entities import ProductSummary


class ProductSearchRepository(Protocol):
    """Abstraction for product search data providers."""

    def search(self, query: str, limit: int | None = None) -> list[ProductSummary]:
        """Return product matches for a query."""
