"""Tests for text-driven cart tools."""

from __future__ import annotations

from app.interfaces.mcp.tools.cart_tools import (
    add_to_cart,
    check_cart,
    clear_cart,
    remove_from_cart,
    reset_active_cart_for_tests,
    sync_cart,
    update_cart_item,
)


class FakeCartClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, object]] = []

    def create_cart(self, *, language: str) -> str:
        self.calls.append(("create_cart", language))
        return "cart-token-123"

    def update_cart(
        self, token: str, items: list[dict[str, int]], *, language: str
    ) -> dict[str, object]:
        self.calls.append(("update_cart", {"token": token, "items": items, "language": language}))
        return {"items": items}

    def clear_cart(self, token: str, *, language: str) -> dict[str, object]:
        self.calls.append(("clear_cart", {"token": token, "language": language}))
        return {}


def setup_function() -> None:
    reset_active_cart_for_tests()


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


def test_add_to_cart_uses_top_level_quantity() -> None:
    payload = add_to_cart(
        {
            "product": {
                "id": "cream-1",
                "name": "Face cream",
                "price": 99,
            },
            "quantity": 2,
        }
    )

    assert payload["cart"]["count"] == 2
    assert payload["cart"]["total"] == 198.0
    assert payload["cart"]["items"][0]["quantity"] == 2


def test_add_to_cart_syncs_numeric_products_with_kokiko_cart() -> None:
    client = FakeCartClient()

    payload = add_to_cart(
        {
            "product": {
                "id": "26078",
                "name": "Shampoo",
                "price": 57.27,
                "quantity": 2,
            },
            "language": "ru",
        },
        client=client,
    )

    assert payload["cart"]["synced"] is True
    assert "token" not in payload["cart"]
    assert client.calls == [
        ("create_cart", "ru"),
        (
            "update_cart",
            {
                "token": "cart-token-123",
                "items": [{"product_id": 26078, "quantity": 2}],
                "language": "ru",
            },
        ),
    ]


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


def test_update_cart_item_zero_quantity_removes_item_and_clears_live_cart() -> None:
    client = FakeCartClient()

    payload = update_cart_item(
        {
            "cart": {
                "token": "existing-token",
                "items": [{"id": "26078", "name": "Shampoo", "price": 57.27, "quantity": 3}],
            },
            "product_id": "26078",
            "quantity": 0,
            "language": "ru",
        },
        client=client,
    )

    assert payload["cart"]["items"] == []
    assert payload["cart"]["count"] == 0
    assert payload["cart"]["synced"] is True
    assert client.calls == [("clear_cart", {"token": "existing-token", "language": "ru"})]


def test_update_cart_item_reuses_existing_kokiko_cart_token() -> None:
    client = FakeCartClient()

    payload = update_cart_item(
        {
            "cart": {
                "token": "existing-token",
                "items": [{"id": "26078", "name": "Shampoo", "price": 57.27, "quantity": 1}],
            },
            "product_id": "26078",
            "quantity": 4,
            "language": "ru",
        },
        client=client,
    )

    assert payload["cart"]["synced"] is True
    assert "token" not in payload["cart"]
    assert client.calls == [
        (
            "update_cart",
            {
                "token": "existing-token",
                "items": [{"product_id": 26078, "quantity": 4}],
                "language": "ru",
            },
        )
    ]


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


def test_remove_from_cart_clears_live_kokiko_cart_when_empty() -> None:
    client = FakeCartClient()

    payload = remove_from_cart(
        {
            "cart": {
                "token": "existing-token",
                "items": [{"id": "26078", "name": "Shampoo", "price": 57.27, "quantity": 1}],
            },
            "product_id": "26078",
            "language": "ru",
        },
        client=client,
    )

    assert payload["cart"]["count"] == 0
    assert payload["cart"]["synced"] is True
    assert "token" not in payload["cart"]
    assert client.calls == [("clear_cart", {"token": "existing-token", "language": "ru"})]


def test_check_cart_returns_summary() -> None:
    payload = check_cart(
        {"cart": {"items": [{"id": "cream-1", "name": "Face cream", "price": 99, "quantity": 2}]}}
    )

    assert payload["status"] == "ok"
    assert payload["cart"]["count"] == 2
    assert payload["cart"]["total"] == 198.0


def test_sync_cart_creates_token_for_empty_cart() -> None:
    client = FakeCartClient()

    payload = sync_cart({"language": "ru"}, client=client)

    assert payload["cart"]["synced"] is True
    assert "token" not in payload["cart"]
    assert payload["cart"]["items"] == []
    assert client.calls == [
        ("create_cart", "ru"),
        ("clear_cart", {"token": "cart-token-123", "language": "ru"}),
    ]


def test_sync_cart_reuses_existing_token_and_pushes_items() -> None:
    client = FakeCartClient()

    payload = sync_cart(
        {
            "cart": {
                "token": "existing-token",
                "items": [{"id": "26078", "name": "Shampoo", "price": 57.27, "quantity": 2}],
            },
            "language": "ru",
        },
        client=client,
    )

    assert payload["cart"]["synced"] is True
    assert "token" not in payload["cart"]
    assert client.calls == [
        (
            "update_cart",
            {
                "token": "existing-token",
                "items": [{"product_id": 26078, "quantity": 2}],
                "language": "ru",
            },
        )
    ]


def test_sync_cart_does_not_force_token_for_non_numeric_items() -> None:
    client = FakeCartClient()

    payload = sync_cart(
        {
            "cart": {
                "items": [{"id": "cream-1", "name": "Face cream", "price": 99, "quantity": 1}]
            },
            "language": "ru",
        },
        client=client,
    )

    assert payload["cart"]["synced"] is False
    assert "token" not in payload["cart"]
    assert client.calls == []


def test_text_cart_tools_share_active_cart_when_payload_is_omitted() -> None:
    add_to_cart(
        {
            "product": {
                "id": "cream-1",
                "name": "Face cream",
                "price": 99,
                "quantity": 2,
            }
        }
    )

    payload = add_to_cart(
        {
            "product": {
                "id": "serum-1",
                "name": "Face serum",
                "price": 120,
                "quantity": 1,
            }
        }
    )
    checked = check_cart({})

    assert payload["cart"]["count"] == 3
    assert checked["cart"]["count"] == 3
    assert [item["id"] for item in checked["cart"]["items"]] == ["cream-1", "serum-1"]
    assert "token" not in checked["cart"]


def test_sync_cart_hydrates_new_widget_from_active_cart() -> None:
    client = FakeCartClient()
    add_to_cart(
        {
            "product": {
                "id": "26078",
                "name": "Shampoo",
                "price": 57.27,
                "quantity": 2,
            },
            "language": "ru",
        },
        client=client,
    )
    client.calls.clear()

    payload = sync_cart({"language": "ru"}, client=client)

    assert payload["cart"]["items"] == [
        {
            "id": "26078",
            "name": "Shampoo",
            "manufacturer": "",
            "price": 57.27,
            "quantity": 2,
            "image_url": "",
            "product_url": "",
        }
    ]
    assert payload["cart"]["count"] == 2
    assert payload["cart"]["synced"] is True
    assert "token" not in payload["cart"]
    assert client.calls == [
        (
            "update_cart",
            {
                "token": "cart-token-123",
                "items": [{"product_id": 26078, "quantity": 2}],
                "language": "ru",
            },
        )
    ]


def test_remove_from_cart_uses_active_cart_when_payload_is_omitted() -> None:
    add_to_cart(
        {
            "product": {
                "id": "cream-1",
                "name": "Face cream",
                "price": 99,
                "quantity": 1,
            }
        }
    )

    payload = remove_from_cart({"product_id": "cream-1"})

    assert payload["cart"]["count"] == 0
    assert check_cart({})["cart"]["items"] == []


def test_clear_cart_empties_active_cart_and_live_cart() -> None:
    client = FakeCartClient()
    add_to_cart(
        {
            "product": {
                "id": "26078",
                "name": "Shampoo",
                "price": 57.27,
                "quantity": 2,
            },
            "language": "ru",
        },
        client=client,
    )
    client.calls.clear()

    payload = clear_cart({"language": "ru"}, client=client)

    assert payload["status"] == "updated"
    assert payload["action"] == "clear"
    assert payload["cart"]["items"] == []
    assert payload["cart"]["count"] == 0
    assert payload["cart"]["total"] == 0
    assert payload["cart"]["synced"] is True
    assert "token" not in payload["cart"]
    assert check_cart({})["cart"]["items"] == []
    assert client.calls == [("clear_cart", {"token": "cart-token-123", "language": "ru"})]
