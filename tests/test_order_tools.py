"""Tests for checkout order submission tools."""

from __future__ import annotations

import pytest

from app.interfaces.mcp.tools.order_tools import submit_order


def test_submit_order_returns_received_payload() -> None:
    payload = submit_order(
        {
            "customer_name": "Ana Popescu",
            "customer_phone": "079 802 000",
            "delivery_method": "courier",
            "city": "Chisinau",
            "address": "str. Alecu Russo, 1",
            "comment": "Call before delivery",
            "items": [
                {
                    "id": "cream-1",
                    "name": "Face cream",
                    "price": 99,
                    "quantity": 2,
                    "product_url": "https://www.kokiko.md/ru/product/face-cream",
                }
            ],
        }
    )

    assert payload["status"] == "received"
    assert payload["order_id"].startswith("KOKIKO-")
    assert payload["total"] == 198.0
    assert payload["customer"]["name"] == "Ana Popescu"
    assert payload["delivery"]["method"] == "courier"
    assert payload["items"][0]["quantity"] == 2


@pytest.mark.parametrize(
    ("arguments", "message"),
    [
        ({"customer_phone": "079802000", "items": [{"id": "1", "name": "A"}]}, "name"),
        ({"customer_name": "Ana", "items": [{"id": "1", "name": "A"}]}, "phone"),
        ({"customer_name": "Ana", "customer_phone": "079802000", "items": []}, "item"),
        (
            {
                "customer_name": "Ana",
                "customer_phone": "079802000",
                "delivery_method": "courier",
                "items": [{"id": "1", "name": "A", "price": 10, "quantity": 1}],
            },
            "address",
        ),
    ],
)
def test_submit_order_validates_required_data(arguments: dict[str, object], message: str) -> None:
    with pytest.raises(ValueError, match=message):
        submit_order(arguments)
