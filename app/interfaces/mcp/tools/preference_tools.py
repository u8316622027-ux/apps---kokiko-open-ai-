"""MCP tools for widget preferences and checkout navigation."""

from __future__ import annotations

from typing import Any

from app.interfaces.mcp.tools.cart_tools import get_active_cart_payload

SUPPORTED_LANGUAGES = ["ru", "ro"]
SUPPORTED_THEMES = ["light", "dark", "auto"]


def set_widget_theme(arguments: dict[str, Any]) -> dict[str, Any]:
    """Return a widget payload that switches the visible theme."""
    theme = _normalize_theme(arguments.get("theme"))
    language = _normalize_language(arguments.get("language"))
    if not theme:
        raise ValueError("theme must be light, dark, or auto")

    is_auto = theme == "auto"
    return {
        "status": "ok",
        "action": "set_widget_theme",
        "theme": theme,
        "theme_mode": "auto" if is_auto else "manual",
        "auto_disabled": not is_auto,
        "language": language,
        "supported_themes": SUPPORTED_THEMES,
        "widget_page": "default",
    }


def set_widget_language(arguments: dict[str, Any]) -> dict[str, Any]:
    """Return a widget payload that switches UI language."""
    language = _normalize_language(arguments.get("language"))
    if not language:
        raise ValueError("language must be ru or ro")

    theme = _normalize_theme(arguments.get("theme"))
    payload: dict[str, Any] = {
        "status": "ok",
        "action": "set_widget_language",
        "language": language,
        "supported_languages": SUPPORTED_LANGUAGES,
        "widget_page": "default",
    }
    if theme:
        payload["theme"] = theme
        payload["theme_mode"] = "auto" if theme == "auto" else "manual"
        payload["auto_disabled"] = theme != "auto"
    return payload


def open_checkout(arguments: dict[str, Any]) -> dict[str, Any]:
    """Open the checkout widget with an optional cart payload."""
    language = _normalize_language(arguments.get("language")) or "ru"
    theme = _normalize_theme(arguments.get("theme"))
    cart = _normalize_cart_payload(arguments.get("cart") or arguments)
    if not cart["items"]:
        cart = get_active_cart_payload()["cart"]

    payload: dict[str, Any] = {
        "status": "ok",
        "action": "open_checkout",
        "language": language,
        "cart": cart,
        "widget_page": "checkout",
    }
    if theme:
        payload["theme"] = theme
        payload["theme_mode"] = "auto" if theme == "auto" else "manual"
        payload["auto_disabled"] = theme != "auto"
    return payload


def _normalize_theme(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized.startswith("dark"):
        return "dark"
    if normalized.startswith("light"):
        return "light"
    if normalized.startswith("auto") or normalized == "system":
        return "auto"
    return ""


def _normalize_language(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized.startswith("ro"):
        return "ro"
    if normalized.startswith("ru"):
        return "ru"
    return ""


def _normalize_cart_payload(raw_cart: Any) -> dict[str, Any]:
    cart = raw_cart if isinstance(raw_cart, dict) else {}
    raw_items = cart.get("items") if isinstance(cart.get("items"), list) else []
    items = [_normalize_cart_item(item) for item in raw_items]
    return {"items": [item for item in items if item]}


def _normalize_cart_item(raw_item: Any) -> dict[str, Any] | None:
    if not isinstance(raw_item, dict):
        return None
    product_id = str(raw_item.get("id") or raw_item.get("product_id") or "").strip()
    name = str(raw_item.get("name") or "").strip()
    price = _normalize_float(raw_item.get("price"))
    if not product_id or not name or price <= 0:
        return None
    return {
        "id": product_id,
        "name": name,
        "manufacturer": str(raw_item.get("manufacturer") or "").strip(),
        "price": price,
        "quantity": _normalize_quantity(raw_item.get("quantity")),
        "image_url": str(raw_item.get("image_url") or raw_item.get("imageUrl") or "").strip(),
        "product_url": str(raw_item.get("product_url") or raw_item.get("productUrl") or "").strip(),
    }


def _normalize_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _normalize_quantity(value: Any) -> int:
    try:
        quantity = int(value)
    except (TypeError, ValueError):
        return 1
    return max(1, min(quantity, 99))
