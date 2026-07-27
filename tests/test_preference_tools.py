"""Tests for widget preference MCP tools."""

from __future__ import annotations

import pytest

from app.interfaces.mcp.tools.cart_tools import add_to_cart, reset_active_cart_for_tests
from app.interfaces.mcp.tools.preference_tools import (
    open_checkout,
    set_widget_language,
    set_widget_theme,
)


def setup_function() -> None:
    reset_active_cart_for_tests()


def test_set_widget_theme_returns_widget_payload() -> None:
    payload = set_widget_theme({"theme": "dark", "language": "ro"})

    assert payload["status"] == "ok"
    assert payload["theme"] == "dark"
    assert payload["theme_mode"] == "manual"
    assert payload["language"] == "ro"
    assert payload["widget_page"] == "default"


def test_set_widget_theme_supports_auto_mode() -> None:
    payload = set_widget_theme({"theme": "auto"})

    assert payload["theme"] == "auto"
    assert payload["theme_mode"] == "auto"
    assert payload["auto_disabled"] is False


def test_set_widget_language_returns_two_supported_languages() -> None:
    payload = set_widget_language({"language": "ro", "theme": "dark"})

    assert payload["status"] == "ok"
    assert payload["language"] == "ro"
    assert payload["theme"] == "dark"
    assert payload["supported_languages"] == ["ru", "ro"]


@pytest.mark.parametrize(
    "arguments",
    [{"theme": "blue"}, {"language": "en"}],
)
def test_preference_tools_reject_unknown_values(arguments: dict[str, object]) -> None:
    with pytest.raises(ValueError):
        if "theme" in arguments:
            set_widget_theme(arguments)
        else:
            set_widget_language(arguments)


def test_open_checkout_returns_checkout_widget_page() -> None:
    payload = open_checkout(
        {
            "cart": {
                "token": "cart-123",
                "items": [
                    {
                        "id": "cream-1",
                        "name": "Face cream",
                        "price": 99,
                        "quantity": 2,
                    }
                ],
            },
            "language": "ru",
        }
    )

    assert payload["status"] == "ok"
    assert payload["widget_page"] == "checkout"
    assert "token" not in payload["cart"]
    assert payload["cart"]["items"][0]["quantity"] == 2


def test_open_checkout_uses_active_cart_when_cart_omitted() -> None:
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

    payload = open_checkout({"language": "ru"})

    assert payload["cart"]["items"][0]["id"] == "cream-1"
    assert payload["cart"]["items"][0]["quantity"] == 2
    assert "token" not in payload["cart"]
