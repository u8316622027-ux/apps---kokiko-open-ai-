"""Tests for checkout order submission tools."""

from __future__ import annotations

import pytest

from app.interfaces.mcp.tools.order_tools import KokikoOrderClient, submit_order


class FakeResponse:
    def __init__(self, payload: str) -> None:
        self.payload = payload

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return self.payload.encode("utf-8")


class FakeKokikoOrderClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, object]] = []

    def create_cart(self, *, language: str) -> str:
        self.calls.append(("create_cart", language))
        return "cart-token-123"

    def update_cart(
        self, token: str, items: list[dict[str, int]], *, language: str
    ) -> dict[str, object]:
        self.calls.append(("update_cart", {"token": token, "items": items, "language": language}))
        return {}

    def fetch_default_pickup_shop_id(self, *, language: str) -> int:
        self.calls.append(("fetch_default_pickup_shop_id", language))
        return 36

    def send_order(
        self,
        token: str,
        payload: dict[str, object],
        *,
        language: str,
        platform: str,
    ) -> dict[str, object]:
        self.calls.append(
            (
                "send_order",
                {
                    "token": token,
                    "payload": payload,
                    "language": language,
                    "platform": platform,
                },
            )
        )
        return {"id": 770001, "number": 9001, "amount": 198.0}


def test_submit_order_returns_received_payload() -> None:
    client = FakeKokikoOrderClient()

    payload = submit_order(
        {
            "customer_name": "Ana Popescu",
            "customer_phone": "079 802 000",
            "delivery_method": "courier",
            "city": "Chisinau",
            "address": "str. Alecu Russo, 1",
            "region_id": 2,
            "sector_id": 1550,
            "comment": "Call before delivery",
            "items": [
                {
                    "id": 123,
                    "name": "Face cream",
                    "price": 99,
                    "quantity": 2,
                    "product_url": "https://www.kokiko.md/ru/product/face-cream",
                }
            ],
        },
        client=client,
    )

    assert payload["status"] == "submitted"
    assert payload["order_id"] == "770001"
    assert payload["order_number"] == 9001
    assert payload["total"] == 198.0
    assert payload["customer"]["name"] == "Ana Popescu"
    assert payload["delivery"]["method"] == "courier"
    assert payload["items"][0]["quantity"] == 2

    assert client.calls[0] == ("create_cart", "ru")
    assert client.calls[1] == (
        "update_cart",
        {
            "token": "cart-token-123",
            "items": [{"product_id": 123, "quantity": 2}],
            "language": "ru",
        },
    )
    assert client.calls[2][0] == "send_order"
    sent_order = client.calls[2][1]
    assert isinstance(sent_order, dict)
    assert sent_order["token"] == "cart-token-123"
    assert sent_order["platform"] == "web"
    order_payload = sent_order["payload"]
    assert isinstance(order_payload, dict)
    assert order_payload["orderType"] == "online"
    assert order_payload["note"] == "Call before delivery"
    assert order_payload["payment"] == {"type": "cash", "useBonuses": False}
    assert order_payload["delivery"] == {
        "address_id": None,
        "address": {
            "building": "1",
            "city": "Chisinau",
            "region_id": 2,
            "sector_id": 1550,
            "street": "str. Alecu Russo",
            "apartment": "",
            "entrance": "",
            "floor": "",
            "intercomCode": "",
        },
        "deliveryWindow": None,
        "type": "target",
        "phone": "079 802 000",
        "firstName": "Ana",
        "lastName": "Popescu",
        "email": None,
    }


def test_submit_order_uses_kokiko_pickup_shop_by_default() -> None:
    client = FakeKokikoOrderClient()

    payload = submit_order(
        {
            "customer_name": "Ana Popescu",
            "customer_phone": "079 802 000",
            "delivery_method": "pickup",
            "items": [{"id": 123, "name": "Face cream", "price": 99, "quantity": 1}],
        },
        client=client,
    )

    assert payload["status"] == "submitted"
    assert client.calls[2] == ("fetch_default_pickup_shop_id", "ru")
    sent_order = client.calls[3][1]
    assert isinstance(sent_order, dict)
    order_payload = sent_order["payload"]
    assert isinstance(order_payload, dict)
    assert order_payload["delivery"] == {
        "pharmacy_id": 36,
        "type": "pick-up",
        "phone": "079 802 000",
        "firstName": "Ana",
        "lastName": "Popescu",
        "email": None,
    }


def test_submit_order_reuses_existing_kokiko_cart_token() -> None:
    client = FakeKokikoOrderClient()

    payload = submit_order(
        {
            "cart_token": "existing-token",
            "customer_name": "Ana Popescu",
            "customer_phone": "+37379802000",
            "delivery_method": "pickup",
            "items": [{"id": "123", "name": "Face cream", "price": 99, "quantity": 1}],
        },
        client=client,
    )

    assert payload["status"] == "submitted"
    assert client.calls[0] == (
        "update_cart",
        {
            "token": "existing-token",
            "items": [{"product_id": 123, "quantity": 1}],
            "language": "ru",
        },
    )
    assert client.calls[-1][0] == "send_order"
    assert client.calls[-1][1]["token"] == "existing-token"


def test_kokiko_order_client_uses_site_cart_and_order_endpoints(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APTEKA_BASE_URL", "https://api.example")
    requests = []
    responses = [
        '{"accessToken":"cart-token-123","tokenType":"Bearer"}',
        "{}",
        '{"id":770001}',
    ]

    def fake_urlopen(request: object, timeout: float) -> FakeResponse:
        requests.append((request, timeout))
        return FakeResponse(responses.pop(0))

    client = KokikoOrderClient(urlopen=fake_urlopen, timeout=3.0)

    token = client.create_cart(language="ru")
    client.update_cart(token, [{"product_id": 123, "quantity": 2}], language="ru")
    client.send_order(
        token,
        {"orderType": "online"},
        language="ru",
        platform="web",
    )

    assert token == "cart-token-123"
    assert [request.full_url for request, _timeout in requests] == [
        "https://api.example/api/v1/front/cart",
        "https://api.example/api/v1/front/cart/update",
        "https://api.example/api/v1/front/order/confirm-order-by-using-mobile",
    ]
    assert requests[0][1] == 3.0
    assert requests[1][0].get_header("Authorization") == "Bearer cart-token-123"
    assert requests[2][0].get_header("Authorization") == "Bearer cart-token-123"
    assert requests[2][0].get_header("Platform") == "web"
    assert requests[2][0].get_header("Market") == "kokikomd"


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
