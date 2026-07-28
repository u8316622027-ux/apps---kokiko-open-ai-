"""MCP cart manipulation tools."""

from __future__ import annotations

import re
import threading
from typing import Any, Protocol

from app.interfaces.mcp.tools.order_tools import (
    KOKIKO_DEFAULT_LANGUAGE,
    KokikoOrderClient,
)

_ACTIVE_CART_LOCK = threading.Lock()
_ACTIVE_CART: dict[str, Any] = {
    "items": [],
    "token": "",
    "synced": False,
}


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

    cart_items, cart_token = _resolve_cart(arguments)
    raw_product = arguments.get("product") or arguments
    product = _normalize_product(raw_product)
    if product is None:
        raise ValueError("product is required")
    if float(product["price"]) <= 0:
        raise ValueError("product price is required")
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
    _write_active_cart(cart_items, token=sync["token"], synced=sync["synced"])
    return _build_cart_response(
        cart_items,
        status="updated",
        action="add",
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
    current_items, cart_token = _resolve_cart(arguments)
    cart_items = [item for item in current_items if item["id"] != product_id]
    sync = _sync_live_cart(
        cart_items,
        cart_token=cart_token,
        language=_normalize_language(arguments.get("language")),
        client=client,
    )
    _write_active_cart(cart_items, token=sync["token"], synced=sync["synced"])
    return _build_cart_response(
        cart_items,
        status="updated",
        action="remove",
        synced=sync["synced"],
    )


def clear_cart(
    arguments: dict[str, Any],
    *,
    client: KokikoCartClientProtocol | None = None,
) -> dict[str, Any]:
    """Clear the current cart payload and the active backend cart session."""

    _cart_items, cart_token = _resolve_cart(arguments)
    sync = _sync_live_cart(
        [],
        cart_token=cart_token,
        language=_normalize_language(arguments.get("language")),
        client=client,
        always_create_token=False,
    )
    _write_active_cart([], token=sync["token"], synced=sync["synced"])
    return _build_cart_response(
        [],
        status="updated",
        action="clear",
        synced=sync["synced"],
    )


def update_cart_item(
    arguments: dict[str, Any],
    *,
    client: KokikoCartClientProtocol | None = None,
) -> dict[str, Any]:
    """Set a product quantity in a cart payload."""

    cart_items, cart_token = _resolve_cart(arguments)
    product_id = _resolve_cart_product_id(arguments, cart_items)
    if not product_id:
        raise ValueError("product_id or matching product_name is required")
    quantity = _normalize_quantity(arguments.get("quantity"), minimum=0)
    action = "update"
    if quantity == 0:
        cart_items = [item for item in cart_items if item["id"] != product_id]
        action = "remove"
    else:
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
    _write_active_cart(cart_items, token=sync["token"], synced=sync["synced"])
    return _build_cart_response(
        cart_items,
        status="updated",
        action=action,
        synced=sync["synced"],
    )


def check_cart(arguments: dict[str, Any]) -> dict[str, Any]:
    """Return a normalized cart summary."""

    cart_items, _cart_token = _resolve_cart(arguments)
    active_cart = _read_active_cart()
    return _build_cart_response(
        cart_items,
        status="ok",
        action="check",
        synced=bool(active_cart["synced"]),
    )


def sync_cart(
    arguments: dict[str, Any],
    *,
    client: KokikoCartClientProtocol | None = None,
) -> dict[str, Any]:
    """Ensure a backend cart token exists and push the current cart to it."""

    cart_items, cart_token = _resolve_cart(arguments)
    sync = _sync_live_cart(
        cart_items,
        cart_token=cart_token,
        language=_normalize_language(arguments.get("language")),
        client=client,
        always_create_token=True,
    )
    _write_active_cart(cart_items, token=sync["token"], synced=sync["synced"])
    return _build_cart_response(
        cart_items,
        status="ok",
        action="sync",
        synced=sync["synced"],
    )


def get_active_cart_payload() -> dict[str, Any]:
    """Return the current process-wide cart snapshot without the live token."""

    active_cart = _read_active_cart()
    return _build_cart_response(
        active_cart["items"],
        status="ok",
        action="check",
        synced=bool(active_cart["synced"]),
    )


def clear_active_cart() -> None:
    """Clear the process-wide cart snapshot after a successful checkout."""

    _write_active_cart([], token="", synced=False)


def reset_active_cart_for_tests() -> None:
    clear_active_cart()


def _build_cart_response(
    items: list[dict[str, Any]],
    *,
    status: str,
    action: str,
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
            "synced": synced,
        },
        "widget_page": "cart",
    }


def _resolve_cart(arguments: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    active_cart = _read_active_cart()
    cart_items = _normalize_cart(arguments.get("cart"))
    if not cart_items:
        cart_items = _normalize_cart(arguments)
    if not cart_items:
        cart_items = active_cart["items"]

    cart_token = (
        _extract_cart_token(arguments.get("cart"))
        or _normalize_text(arguments.get("cart_token"))
        or active_cart["token"]
    )
    return _clone_cart_items(cart_items), cart_token


def _read_active_cart() -> dict[str, Any]:
    with _ACTIVE_CART_LOCK:
        return {
            "items": _clone_cart_items(_ACTIVE_CART["items"]),
            "token": str(_ACTIVE_CART["token"]),
            "synced": bool(_ACTIVE_CART["synced"]),
        }


def _write_active_cart(
    items: list[dict[str, Any]],
    *,
    token: str,
    synced: bool,
) -> None:
    with _ACTIVE_CART_LOCK:
        _ACTIVE_CART["items"] = _clone_cart_items(items)
        _ACTIVE_CART["token"] = _normalize_text(token)
        _ACTIVE_CART["synced"] = bool(synced)


def _clone_cart_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [dict(item) for item in items]


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
    always_create_token: bool = False,
) -> dict[str, Any]:
    live_items = _to_live_cart_items(items)
    if not live_items and items:
        return {"token": cart_token, "synced": False}
    if not live_items and not cart_token and not always_create_token:
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


def _resolve_cart_product_id(arguments: dict[str, Any], items: list[dict[str, Any]]) -> str:
    product_id = _normalize_text(arguments.get("product_id") or arguments.get("id"))
    if product_id:
        return product_id

    product_name = _normalize_text(
        arguments.get("product_name")
        or arguments.get("name")
        or arguments.get("query")
        or arguments.get("title")
    )
    if not product_name:
        return ""

    normalized_query = _normalize_match_text(product_name)
    for item in items:
        item_name = _normalize_match_text(item.get("name"))
        if normalized_query and (normalized_query in item_name or item_name in normalized_query):
            return str(item["id"])

    query_tokens = _match_tokens(product_name)
    if not query_tokens:
        return ""
    for item in items:
        item_tokens = _match_tokens(item.get("name"))
        if query_tokens.issubset(item_tokens):
            return str(item["id"])
    return ""


def _match_tokens(value: Any) -> set[str]:
    return {
        _stem_match_token(token)
        for token in re.findall(r"[\w']+", _normalize_match_text(value))
        if len(_stem_match_token(token)) >= 3
    }


def _stem_match_token(token: str) -> str:
    normalized = token.strip("'")
    for suffix in (
        "ями",
        "ами",
        "ого",
        "ему",
        "ыми",
        "ими",
        "ой",
        "ую",
        "ая",
        "ое",
        "ые",
        "ий",
        "ый",
        "ой",
        "ам",
        "ах",
        "ом",
        "ем",
        "у",
        "а",
        "я",
        "и",
        "ы",
        "е",
    ):
        if len(normalized) > len(suffix) + 3 and normalized.endswith(suffix):
            return normalized[: -len(suffix)]
    return normalized


def _normalize_match_text(value: Any) -> str:
    return _normalize_text(value).casefold()


def _normalize_price(value: Any) -> float:
    try:
        price = float(value)
    except (TypeError, ValueError):
        return 0.0
    if price < 0:
        return 0.0
    return round(price, 2)


def _normalize_quantity(value: Any, *, minimum: int = 1) -> int:
    try:
        quantity = int(value)
    except (TypeError, ValueError):
        return 1
    return max(minimum, min(quantity, 99))


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
