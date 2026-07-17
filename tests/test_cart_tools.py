"""Tests for text-driven cart tools."""

from __future__ import annotations

from app.interfaces.mcp.tools.cart_tools import (
    add_to_cart,
    check_cart,
    remove_from_cart,
    update_cart_item,
)


def test_add_to_cart_adds_new_item_and_increments_existing() -> None:
    first = add_to_cart(
        {
            "product": {
                "id": "cream-1",
                "name": "Face cream",
                "price": 99,
                "quantity": 2,
                "product_url": "https://www.kokiko.md/ru/product/face-cream",
            }
        }
    )
    second = add_to_cart(
        {
            "cart": first["cart"],
            "product": {
                "id": "cream-1",
                "name": "Face cream",
                "price": 99,
                "quantity": 1,
            },
        }
    )

    assert second["status"] == "updated"
    assert second["cart"]["count"] == 3
    assert second["cart"]["total"] == 297.0
    assert second["cart"]["items"][0]["quantity"] == 3


def test_update_cart_item_sets_quantity() -> None:
    payload = update_cart_item(
        {
            "cart": {
                "items": [{"id": "cream-1", "name": "Face cream", "price": 99, "quantity": 1}]
            },
            "product_id": "cream-1",
            "quantity": 4,
        }
    )

    assert payload["cart"]["count"] == 4
    assert payload["cart"]["items"][0]["quantity"] == 4


def test_remove_from_cart_removes_item() -> None:
    payload = remove_from_cart(
        {
            "cart": {
                "items": [{"id": "cream-1", "name": "Face cream", "price": 99, "quantity": 1}]
            },
            "product_id": "cream-1",
        }
    )

    assert payload["cart"]["count"] == 0
    assert payload["cart"]["items"] == []


def test_check_cart_returns_summary() -> None:
    payload = check_cart(
        {"cart": {"items": [{"id": "cream-1", "name": "Face cream", "price": 99, "quantity": 2}]}}
    )

    assert payload["status"] == "ok"
    assert payload["cart"]["count"] == 2
    assert payload["cart"]["total"] == 198.0
