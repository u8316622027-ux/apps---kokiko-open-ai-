"""MCP order submission tools."""

from __future__ import annotations

import json
from typing import Any, Callable, Protocol
from urllib.error import HTTPError
from urllib.request import Request
from urllib.request import urlopen as default_urlopen

from app.interfaces.mcp.tools.apteka_urls import build_front_url

KOKIKO_MARKET_HEADER_VALUE = "kokikomd"
KOKIKO_DEFAULT_LANGUAGE = "ru"
KOKIKO_DEFAULT_PLATFORM = "web"
KOKIKO_DEFAULT_PICKUP_SHOP_ID = 36
KOKIKO_DEFAULT_REGION_ID = 2
KOKIKO_DEFAULT_SECTOR_ID = 1550
KOKIKO_DEFAULT_CITY = "Chisinau"
KOKIKO_ORDER_CONFIRM_PATH = "/order/confirm-order-by-using-mobile"


class KokikoOrderClientProtocol(Protocol):
    def create_cart(self, *, language: str) -> str: ...

    def update_cart(
        self, token: str, items: list[dict[str, int]], *, language: str
    ) -> dict[str, Any]: ...

    def fetch_default_pickup_shop_id(self, *, language: str) -> int: ...

    def send_order(
        self,
        token: str,
        payload: dict[str, Any],
        *,
        language: str,
        platform: str,
    ) -> dict[str, Any]: ...


class KokikoOrderClient:
    """HTTP client for the same cart and order endpoints used by kokiko.md."""

    def __init__(
        self,
        *,
        timeout: float = 15.0,
        urlopen: Callable[..., Any] = default_urlopen,
    ) -> None:
        self._timeout = timeout
        self._urlopen = urlopen

    def create_cart(self, *, language: str) -> str:
        payload = self._request_json("GET", "/cart", language=language)
        token = _normalize_text(payload.get("accessToken") if isinstance(payload, dict) else "")
        if not token:
            raise ValueError("Kokiko cart token was not returned")
        return token

    def update_cart(
        self, token: str, items: list[dict[str, int]], *, language: str
    ) -> dict[str, Any]:
        return self._request_json(
            "POST",
            "/cart/update",
            payload={"items": items},
            token=token,
            language=language,
        )

    def fetch_default_pickup_shop_id(self, *, language: str) -> int:
        payload = self._request_json("GET", "/pharmacies/list", language=language)
        if not isinstance(payload, list):
            return KOKIKO_DEFAULT_PICKUP_SHOP_ID

        for shop in payload:
            if not isinstance(shop, dict):
                continue
            shop_id = _normalize_int(shop.get("id"))
            if shop_id == KOKIKO_DEFAULT_PICKUP_SHOP_ID:
                return shop_id

        for shop in payload:
            if not isinstance(shop, dict):
                continue
            shop_id = _normalize_int(shop.get("id"))
            if not shop_id:
                continue
            haystack = json.dumps(shop.get("translations", {}), ensure_ascii=False).lower()
            if "kokiko" in haystack or "кокико" in haystack or "alecu russo" in haystack:
                return shop_id

        for shop in payload:
            if isinstance(shop, dict):
                shop_id = _normalize_int(shop.get("id"))
                if shop_id:
                    return shop_id
        return KOKIKO_DEFAULT_PICKUP_SHOP_ID

    def send_order(
        self,
        token: str,
        payload: dict[str, Any],
        *,
        language: str,
        platform: str,
    ) -> dict[str, Any]:
        return self._request_json(
            "POST",
            KOKIKO_ORDER_CONFIRM_PATH,
            payload=payload,
            token=token,
            language=language,
            platform=platform,
        )

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
        token: str | None = None,
        language: str = KOKIKO_DEFAULT_LANGUAGE,
        platform: str | None = None,
    ) -> Any:
        data = None
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        request = Request(
            url=build_front_url(path),
            data=data,
            method=method,
            headers=_build_kokiko_headers(language=language, token=token, platform=platform),
        )
        try:
            with self._urlopen(request, timeout=self._timeout) as response:
                raw_payload = response.read().decode("utf-8")
        except HTTPError as error:
            raw_error = error.read().decode("utf-8", errors="replace")
            raise ValueError(_format_upstream_error(error.code, raw_error)) from error

        if not raw_payload.strip():
            return {}
        try:
            return json.loads(raw_payload)
        except json.JSONDecodeError as error:
            raise ValueError("Kokiko API returned invalid JSON") from error


def submit_order(
    arguments: dict[str, Any],
    *,
    client: KokikoOrderClientProtocol | None = None,
) -> dict[str, Any]:
    """Validate, sync cart with Kokiko API, and submit a checkout order."""

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
    language = _normalize_language(arguments.get("language"))
    platform = _normalize_text(arguments.get("platform")) or KOKIKO_DEFAULT_PLATFORM
    effective_client = client or KokikoOrderClient()

    cart_token = effective_client.create_cart(language=language)
    effective_client.update_cart(
        cart_token,
        [{"product_id": int(item["id"]), "quantity": int(item["quantity"])} for item in items],
        language=language,
    )

    order_payload = _build_send_order_payload(
        arguments,
        customer_name=customer_name,
        customer_phone=customer_phone,
        delivery_method=delivery_method,
        city=city,
        address=address,
        client=effective_client,
        language=language,
    )
    upstream_order = effective_client.send_order(
        cart_token,
        order_payload,
        language=language,
        platform=platform,
    )
    upstream_order_id = _normalize_text(
        upstream_order.get("id") if isinstance(upstream_order, dict) else ""
    )
    upstream_order_number = (
        upstream_order.get("number") if isinstance(upstream_order, dict) else None
    )

    return {
        "status": "submitted",
        "order_id": upstream_order_id,
        "order_number": upstream_order_number,
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
        "upstream_order": upstream_order,
    }


def _normalize_order_items(raw_items: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_items, list):
        return []

    items: list[dict[str, Any]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            continue
        item_id = _normalize_int(raw_item.get("id") or raw_item.get("product_id"))
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


def _build_send_order_payload(
    arguments: dict[str, Any],
    *,
    customer_name: str,
    customer_phone: str,
    delivery_method: str,
    city: str,
    address: str,
    client: KokikoOrderClientProtocol,
    language: str,
) -> dict[str, Any]:
    first_name, last_name = _split_customer_name(customer_name)
    delivery_payload: dict[str, Any]
    if delivery_method == "courier":
        street, building = _resolve_street_and_building(arguments, address)
        delivery_payload = {
            "address_id": _normalize_int(arguments.get("address_id")),
            "address": {
                "building": building,
                "city": city,
                "region_id": _normalize_int(arguments.get("region_id")) or KOKIKO_DEFAULT_REGION_ID,
                "sector_id": _normalize_int(arguments.get("sector_id")) or KOKIKO_DEFAULT_SECTOR_ID,
                "street": street,
                "apartment": _normalize_text(arguments.get("apartment")),
                "entrance": _normalize_text(arguments.get("entrance")),
                "floor": _normalize_text(arguments.get("floor")),
                "intercomCode": _normalize_text(arguments.get("intercom_code")),
            },
            "deliveryWindow": arguments.get("delivery_window"),
        }
    else:
        delivery_payload = {
            "pharmacy_id": _normalize_int(arguments.get("pharmacy_id") or arguments.get("shop_id"))
            or client.fetch_default_pickup_shop_id(language=language)
        }

    delivery_payload.update(
        {
            "type": "target" if delivery_method == "courier" else "pick-up",
            "phone": customer_phone,
            "firstName": first_name,
            "lastName": last_name,
            "email": _normalize_text(arguments.get("email")) or None,
        }
    )
    return {
        "note": _normalize_text(arguments.get("comment")),
        "payment": _build_payment_payload(arguments),
        "dontCallMe": bool(arguments.get("dont_call_me", False)),
        "delivery": delivery_payload,
        "orderType": "online",
    }


def _build_payment_payload(arguments: dict[str, Any]) -> dict[str, Any]:
    payment: dict[str, Any] = {
        "type": _normalize_payment_type(arguments.get("payment_method")),
        "useBonuses": bool(arguments.get("use_bonuses", False)),
    }
    promo_code = _normalize_text(arguments.get("promo_code"))
    if promo_code:
        payment["promo_code"] = promo_code
    return payment


def _build_kokiko_headers(
    *,
    language: str,
    token: str | None = None,
    platform: str | None = None,
) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
        "market": KOKIKO_MARKET_HEADER_VALUE,
        "Cache-Control": "no-cache, no-store, must-revalidate, post-check=0, pre-check=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "Accept-Language": language,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if platform:
        headers["platform"] = platform
    return headers


def _format_upstream_error(status_code: int, raw_payload: str) -> str:
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError:
        payload = raw_payload.strip()
    message = ""
    if isinstance(payload, dict):
        if isinstance(payload.get("message"), str):
            message = payload["message"]
        elif isinstance(payload.get("errors"), dict):
            first_errors = next(iter(payload["errors"].values()), [])
            if isinstance(first_errors, list) and first_errors:
                message = str(first_errors[0])
    elif isinstance(payload, str):
        message = payload
    suffix = f": {message}" if message else ""
    return f"Kokiko API error {status_code}{suffix}"


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


def _normalize_payment_type(value: Any) -> str:
    normalized = _normalize_text(value).lower()
    if normalized in {"card", "cash", "mia", "maib", "cashless_individual", "cashless_legal"}:
        return normalized
    if normalized in {"card-online", "card_online", "online-card", "online_card"}:
        return "maib"
    if normalized in {"iban", "transfer", "bank-transfer", "bank_transfer"}:
        return "cashless_individual"
    return "cash"


def _normalize_language(value: Any) -> str:
    normalized = _normalize_text(value).lower()
    if normalized.startswith("ro"):
        return "ro"
    return KOKIKO_DEFAULT_LANGUAGE


def _normalize_int(value: Any) -> int | None:
    try:
        result = int(value)
    except (TypeError, ValueError):
        return None
    if result <= 0:
        return None
    return result


def _split_customer_name(value: str) -> tuple[str, str]:
    first_name, _, last_name = value.partition(" ")
    return first_name.strip(), last_name.strip()


def _resolve_street_and_building(arguments: dict[str, Any], address: str) -> tuple[str, str]:
    street = _normalize_text(arguments.get("street"))
    building = _normalize_text(arguments.get("building"))
    if street and building:
        return street, building

    parts = [part.strip() for part in address.split(",") if part.strip()]
    if not street and len(parts) > 1:
        street = ", ".join(parts[:-1])
    if not building and len(parts) > 1:
        building = parts[-1]
    if not street:
        street = address
    if not building:
        building = "1"
    return street, building


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()


def _phone_digits(value: str) -> str:
    return "".join(character for character in value if character.isdigit())
