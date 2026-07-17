"""MCP cart manipulation tools."""

from __future__ import annotations

from typing import Any, Protocol

from app.interfaces.mcp.tools.order_tools import (
    KOKIKO_DEFAULT_LANGUAGE,
    KokikoOrderClient,
)


class KokikoCartClientProtocol(Protocol):
    def create_cart(self, *, language: str) -> str: ...

    def update_cart(
        self, token: str, items: list[dict[str, int]], *, language: str
    ) -> dict[str, Any]: ...

    def clear_cart(self, token: str, *, language: str) -> dict[str, Any]: ...


def add_to_cart(
    arguments: dict[str, Any],
    *,
    client: KokikoCartClientProtocol | None = None,
) -> dict[str, Any]:
    """Add a product to a cart payload and return the updated cart."""

    cart_items = _normalize_cart(arguments.get("cart"))
    cart_token = _extract_cart_token(arguments.get("cart")) or _normalize_text(
        arguments.get("cart_token")
    )
    raw_product = arguments.get("product") or arguments
    product = _normalize_product(raw_product)
    if product is None:
        raise ValueError("product is required")
    if (
        isinstance(raw_product, dict)
        and "quantity" not in raw_product
        and arguments.get("quantity") is not None
    ):
        product["quantity"] = _normalize_quantity(arguments.get("quantity"))

    existing = _find_item(cart_items, product["id"])
    if existing is None:
        cart_items.append(product)
    else:
        existing["quantity"] = _normalize_quantity(
            int(existing["quantity"]) + int(product["quantity"])
        )

    sync = _sync_live_cart(
        cart_items,
        cart_token=cart_token,
        language=_normalize_language(arguments.get("language")),
        client=client,
    )
    return _build_cart_response(
        cart_items,
        status="updated",
        action="add",
        cart_token=sync["token"],
        synced=sync["synced"],
    )


def remove_from_cart(
    arguments: dict[str, Any],
    *,
    client: KokikoCartClientProtocol | None = None,
) -> dict[str, Any]:
    """Remove a product from a cart payload."""

    product_id = _normalize_text(arguments.get("product_id") or arguments.get("id"))
    if not product_id:
        raise ValueError("product_id is required")
    cart_token = _extract_cart_token(arguments.get("cart")) or _normalize_text(
        arguments.get("cart_token")
    )
    cart_items = [
        item for item in _normalize_cart(arguments.get("cart")) if item["id"] != product_id
    ]
    sync = _sync_live_cart(
        cart_items,
        cart_token=cart_token,
        language=_normalize_language(arguments.get("language")),
        client=client,
    )
    return _build_cart_response(
        cart_items,
        status="updated",
        action="remove",
        cart_token=sync["token"],
        synced=sync["synced"],
    )


def update_cart_item(
    arguments: dict[str, Any],
    *,
    client: KokikoCartClientProtocol | None = None,
) -> dict[str, Any]:
    """Set a product quantity in a cart payload."""

    product_id = _normalize_text(arguments.get("product_id") or arguments.get("id"))
    if not product_id:
        raise ValueError("product_id is required")
    cart_token = _extract_cart_token(arguments.get("cart")) or _normalize_text(
        arguments.get("cart_token")
    )
    quantity = _normalize_quantity(arguments.get("quantity"))
    cart_items = _normalize_cart(arguments.get("cart"))
    for item in cart_items:
        if item["id"] == product_id:
            item["quantity"] = quantity
            break
    sync = _sync_live_cart(
        cart_items,
        cart_token=cart_token,
        language=_normalize_language(arguments.get("language")),
        client=client,
    )
    return _build_cart_response(
        cart_items,
        status="updated",
        action="update",
        cart_token=sync["token"],
        synced=sync["synced"],
    )


def check_cart(arguments: dict[str, Any]) -> dict[str, Any]:
    """Return a normalized cart summary."""

    return _build_cart_response(_normalize_cart(arguments.get("cart")), status="ok", action="check")


def _build_cart_response(
    items: list[dict[str, Any]],
    *,
    status: str,
    action: str,
    cart_token: str = "",
    synced: bool = False,
) -> dict[str, Any]:
    count = sum(int(item["quantity"]) for item in items)
    total = round(sum(float(item["price"]) * int(item["quantity"]) for item in items), 2)
    return {
        "status": status,
        "action": action,
        "cart": {
            "items": items,
            "count": count,
            "total": total,
            "token": cart_token,
            "synced": synced,
        },
        "widget_page": "cart",
    }


def _normalize_cart(raw_cart: Any) -> list[dict[str, Any]]:
    if isinstance(raw_cart, dict):
        raw_items = raw_cart.get("items")
    else:
        raw_items = raw_cart
    if not isinstance(raw_items, list):
        return []

    items: list[dict[str, Any]] = []
    for raw_item in raw_items:
        product = _normalize_product(raw_item)
        if product is not None:
            items.append(product)
    return items


def _sync_live_cart(
    items: list[dict[str, Any]],
    *,
    cart_token: str,
    language: str,
    client: KokikoCartClientProtocol | None,
) -> dict[str, Any]:
    live_items = _to_live_cart_items(items)
    if not live_items and items:
        return {"token": cart_token, "synced": False}
    if not live_items and not cart_token:
        return {"token": "", "synced": False}

    effective_client = client or KokikoOrderClient()
    token = cart_token or effective_client.create_cart(language=language)
    if live_items:
        effective_client.update_cart(token, live_items, language=language)
    else:
        effective_client.clear_cart(token, language=language)
    return {"token": token, "synced": True}


def _to_live_cart_items(items: list[dict[str, Any]]) -> list[dict[str, int]]:
    live_items: list[dict[str, int]] = []
    for item in items:
        product_id = _normalize_int(item.get("id") or item.get("product_id"))
        if product_id is None:
            return []
        live_items.append(
            {"product_id": product_id, "quantity": _normalize_quantity(item.get("quantity"))}
        )
    return live_items


def _extract_cart_token(raw_cart: Any) -> str:
    if not isinstance(raw_cart, dict):
        return ""
    return _normalize_text(
        raw_cart.get("token")
        or raw_cart.get("cart_token")
        or raw_cart.get("cartToken")
        or raw_cart.get("access_token")
        or raw_cart.get("accessToken")
    )


def _normalize_product(raw_product: Any) -> dict[str, Any] | None:
    if not isinstance(raw_product, dict):
        return None
    product_id = _normalize_text(raw_product.get("id") or raw_product.get("product_id"))
    name = _normalize_text(raw_product.get("name"))
    if not product_id or not name:
        return None
    return {
        "id": product_id,
        "name": name,
        "manufacturer": _normalize_text(raw_product.get("manufacturer")),
        "price": _normalize_price(raw_product.get("price")),
        "quantity": _normalize_quantity(raw_product.get("quantity")),
        "image_url": _normalize_text(raw_product.get("image_url") or raw_product.get("imageUrl")),
        "product_url": _normalize_text(
            raw_product.get("product_url") or raw_product.get("productUrl")
        ),
    }


def _find_item(items: list[dict[str, Any]], product_id: str) -> dict[str, Any] | None:
    for item in items:
        if item["id"] == product_id:
            return item
    return None


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


def _normalize_int(value: Any) -> int | None:
    try:
        result = int(str(value).strip())
    except (TypeError, ValueError):
        return None
    if result <= 0:
        return None
    return result


def _normalize_language(value: Any) -> str:
    normalized = _normalize_text(value).lower()
    if normalized.startswith("ro"):
        return "ro"
    return KOKIKO_DEFAULT_LANGUAGE


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()
