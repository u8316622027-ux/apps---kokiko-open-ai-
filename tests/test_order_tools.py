"""Tests for checkout order submission tools."""

from __future__ import annotations

import json

import pytest

from app.interfaces.mcp.tools.order_tools import (
    DEFAULT_N8N_ORDER_WEBHOOK_URL,
    KokikoOrderClient,
    N8nOrderWebhookClient,
    submit_order,
)


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


class FakeOrderWebhookClient:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def send(self, payload: dict[str, object]) -> dict[str, object]:
        self.calls.append(payload)
        return {"status": "sent", "response": {"ok": True}}


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


@pytest.mark.parametrize(
    ("requested_payment", "expected_payment"),
    [
        ("cash", "cash"),
        ("card", "card"),
        ("maib", "cash"),
        ("mia", "cash"),
        ("cashless_individual", "cash"),
    ],
)
def test_submit_order_limits_payment_methods_to_cash_and_card(
    requested_payment: str,
    expected_payment: str,
) -> None:
    client = FakeKokikoOrderClient()

    submit_order(
        {
            "customer_name": "Ana Popescu",
            "customer_phone": "+37379802000",
            "delivery_method": "pickup",
            "payment_method": requested_payment,
            "items": [{"id": 123, "name": "Face cream", "price": 99, "quantity": 1}],
        },
        client=client,
    )

    sent_order = client.calls[-1][1]
    assert isinstance(sent_order, dict)
    order_payload = sent_order["payload"]
    assert isinstance(order_payload, dict)
    assert order_payload["payment"]["type"] == expected_payment


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


def test_submit_order_sends_official_delivery_window_fields_only() -> None:
    client = FakeKokikoOrderClient()

    submit_order(
        {
            "customer_name": "Ana Popescu",
            "customer_phone": "+37379802000",
            "delivery_method": "courier",
            "street": "str. Alecu Russo",
            "building": "1",
            "address": "str. Alecu Russo, 1",
            "delivery_window": {
                "deliveryDate": "21.07.2026",
                "from": "13:00",
                "to": "15:00",
                "date": "21.07.2026",
                "time": "13:00 - 15:00",
            },
            "items": [{"id": "123", "name": "Face cream", "price": 99, "quantity": 1}],
        },
        client=client,
    )

    sent_order = client.calls[-1][1]
    assert isinstance(sent_order, dict)
    order_payload = sent_order["payload"]
    assert isinstance(order_payload, dict)
    assert order_payload["delivery"]["deliveryWindow"] == {
        "deliveryDate": "21.07.2026",
        "from": "13:00",
        "to": "15:00",
    }


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


def test_order_submission_client_uses_stage_order_base(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APTEKA_BASE_URL", "https://api.example")
    monkeypatch.setenv("APTEKA_ORDER_BASE_URL", "https://stage.example")
    requests = []
    responses = [
        '{"accessToken":"stage-cart-token","tokenType":"Bearer"}',
        "{}",
        '{"id":880001}',
    ]

    def fake_urlopen(request: object, timeout: float) -> FakeResponse:
        requests.append((request, timeout))
        return FakeResponse(responses.pop(0))

    client = KokikoOrderClient.for_order_submission(urlopen=fake_urlopen, timeout=3.0)

    token = client.create_cart(language="ru")
    client.update_cart(token, [{"product_id": 123, "quantity": 2}], language="ru")
    client.send_order(
        token,
        {"orderType": "online"},
        language="ru",
        platform="web",
    )

    assert token == "stage-cart-token"
    assert [request.full_url for request, _timeout in requests] == [
        "https://stage.example/api/v1/front/cart",
        "https://stage.example/api/v1/front/cart/update",
        "https://stage.example/api/v1/front/order/confirm-order-by-using-mobile",
    ]


def test_n8n_order_webhook_client_posts_order_payload() -> None:
    captured: dict[str, object] = {}

    def fake_urlopen(request: object, timeout: float) -> FakeResponse:
        captured["request"] = request
        captured["timeout"] = timeout
        return FakeResponse('{"ok":true}')

    client = N8nOrderWebhookClient(urlopen=fake_urlopen, timeout=4.0)
    result = client.send({"order": {"id": 770001}})

    request = captured["request"]
    assert result == {"status": "sent", "response": {"ok": True}}
    assert request.full_url == DEFAULT_N8N_ORDER_WEBHOOK_URL
    assert request.get_method() == "POST"
    assert request.get_header("Accept") == "application/json"
    assert request.get_header("Content-type") == "application/json; charset=utf-8"
    assert json.loads(request.data.decode("utf-8")) == {"order": {"id": 770001}}
    assert captured["timeout"] == 4.0


def test_submit_order_sends_n8n_webhook_with_order_data() -> None:
    client = FakeKokikoOrderClient()
    webhook = FakeOrderWebhookClient()

    payload = submit_order(
        {
            "customer_name": "Ana Popescu",
            "customer_phone": "079 802 000",
            "delivery_method": "pickup",
            "payment_method": "cash",
            "items": [{"id": 123, "name": "Face cream", "price": 99, "quantity": 1}],
        },
        client=client,
        webhook_client=webhook,
    )

    assert payload["webhook"] == {"status": "sent", "response": {"ok": True}}
    assert len(webhook.calls) == 1
    webhook_payload = webhook.calls[0]
    assert webhook_payload["event"] == "kokiko_order_submitted"
    assert webhook_payload["source"] == "openai_mcp"
    assert webhook_payload["cart_token"] == "cart-token-123"
    assert webhook_payload["request"]["customer_name"] == "Ana Popescu"
    assert webhook_payload["order_payload"]["delivery"]["type"] == "pick-up"
    assert webhook_payload["result"]["order_id"] == "770001"
    assert webhook_payload["result"]["items"][0]["name"] == "Face cream"


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
