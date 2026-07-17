"""MCP order submission tools."""

from __future__ import annotations

from typing import Any
from uuid import uuid4


def submit_order(arguments: dict[str, Any]) -> dict[str, Any]:
    """Validate and accept a checkout order payload."""

    customer_name = _normalize_text(arguments.get("customer_name"))
    if not customer_name:
        raise ValueError("customer name is required")

    customer_phone = _normalize_text(arguments.get("customer_phone"))
    if len(_phone_digits(customer_phone)) < 6:
        raise ValueError("customer phone is required")

    delivery_method = _normalize_delivery_method(arguments.get("delivery_method"))
    city = _normalize_text(arguments.get("city")) or "Chisinau"
    address = _normalize_text(arguments.get("address"))
    if delivery_method == "courier" and not address:
        raise ValueError("delivery address is required for courier orders")

    items = _normalize_order_items(arguments.get("items"))
    if not items:
        raise ValueError("at least one order item is required")

    total = round(sum(item["price"] * item["quantity"] for item in items), 2)
    order_id = f"KOKIKO-{uuid4().hex[:8].upper()}"

    return {
        "status": "received",
        "order_id": order_id,
        "customer": {
            "name": customer_name,
            "phone": customer_phone,
        },
        "delivery": {
            "method": delivery_method,
            "city": city,
            "address": address,
        },
        "comment": _normalize_text(arguments.get("comment")),
        "items": items,
        "total": total,
    }


def _normalize_order_items(raw_items: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_items, list):
        return []

    items: list[dict[str, Any]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            continue
        item_id = _normalize_text(raw_item.get("id") or raw_item.get("product_id"))
        name = _normalize_text(raw_item.get("name"))
        if not item_id or not name:
            continue

        price = _normalize_price(raw_item.get("price"))
        quantity = _normalize_quantity(raw_item.get("quantity"))
        items.append(
            {
                "id": item_id,
                "name": name,
                "price": price,
                "quantity": quantity,
                "product_url": _normalize_text(
                    raw_item.get("product_url") or raw_item.get("productUrl")
                ),
            }
        )
    return items


def _normalize_price(value: Any) -> float:
    try:
        price = float(value)
    except (TypeError, ValueError):
        return 0.0
    if price < 0:
        return 0.0
    return round(price, 2)


def _normalize_quantity(value: Any) -> int:
    try:
        quantity = int(value)
    except (TypeError, ValueError):
        return 1
    return max(1, min(quantity, 99))


def _normalize_delivery_method(value: Any) -> str:
    normalized = _normalize_text(value).lower()
    if normalized == "courier":
        return "courier"
    return "pickup"


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()


def _phone_digits(value: str) -> str:
    return "".join(character for character in value if character.isdigit())
