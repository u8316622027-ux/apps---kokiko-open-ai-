"""Product entities."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ProductSummary:
    """Simplified product model used by search flows."""

    id: str
    name_ro: str | None
    name_ru: str | None
    manufacturer: str | None
    international_name: str | None
    country: str | None
    price: float | None
    discount_price: float | None
    description_ro: str | None
    description_ru: str | None
    image_url: str | None
    product_url: str | None
    slug_ro: str | None
    slug_ru: str | None
