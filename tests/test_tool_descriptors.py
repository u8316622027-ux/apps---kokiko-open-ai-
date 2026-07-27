"""Tests for tool descriptor metadata."""

from __future__ import annotations

import pytest

from app.interfaces.mcp import server as mcp_server
from app.interfaces.mcp import tool_registry
from app.interfaces.mcp.tools.apteka_urls import get_apteka_base_url

WIDGET_TEMPLATE_URI = "ui://widget/products.html"


def test_tool_descriptor_includes_ui_meta_for_widget() -> None:
    registry = tool_registry.create_tool_registry()
    payload = tool_registry.serialize_tool_definition(registry["search_products"])

    assert payload["outputTemplate"] == WIDGET_TEMPLATE_URI
    assert payload["_meta"]["openai/outputTemplate"] == WIDGET_TEMPLATE_URI
    assert payload["_meta"]["openai/widgetDomain"]
    assert payload["_meta"]["openai/widgetCSP"]["connect_domains"]
    assert payload["_meta"]["openai/widgetCSP"]["resource_domains"]


def test_tool_descriptor_includes_invocation_messages() -> None:
    registry = tool_registry.create_tool_registry()
    payload = tool_registry.serialize_tool_definition(registry["search_products"])

    assert payload["_meta"]["openai/toolInvocation/invoking"]
    assert payload["_meta"]["openai/toolInvocation/invoked"]


def test_tool_descriptor_annotations() -> None:
    registry = tool_registry.create_tool_registry()
    payload = tool_registry.serialize_tool_definition(registry["search_products"])
    assert payload["annotations"]["readOnlyHint"] is True
    assert payload["annotations"]["openWorldHint"] is True
    assert payload["annotations"]["destructiveHint"] is False


def test_submit_order_tool_descriptor_allows_checkout_submission() -> None:
    registry = tool_registry.create_tool_registry()
    payload = tool_registry.serialize_tool_definition(registry["submit_order"])

    assert "outputTemplate" not in payload
    assert payload["annotations"]["readOnlyHint"] is False
    assert payload["annotations"]["destructiveHint"] is False
    assert payload["_meta"]["openai/toolInvocation/invoking"]
    assert payload["inputSchema"]["required"] == ["customer_name", "customer_phone", "items"]
    assert "live Kokiko" in payload["description"]
    assert payload["inputSchema"]["properties"]["payment_method"]["type"] == "string"
    assert payload["inputSchema"]["properties"]["payment_method"]["enum"] == [
        "cash",
        "card",
    ]
    assert payload["inputSchema"]["properties"]["pharmacy_id"]["type"] == "integer"
    assert payload["inputSchema"]["properties"]["region_id"]["type"] == "integer"
    assert payload["inputSchema"]["properties"]["sector_id"]["type"] == "integer"
    assert "cart_token" not in payload["inputSchema"]["properties"]


def test_cart_tools_are_registered_for_text_control() -> None:
    registry = tool_registry.create_tool_registry()

    for name in ("add_to_cart", "update_cart_item", "check_cart", "clear_cart"):
        payload = tool_registry.serialize_tool_definition(registry[name])
        assert payload["outputTemplate"] == WIDGET_TEMPLATE_URI
        assert payload["_meta"]["openai/outputTemplate"] == WIDGET_TEMPLATE_URI
        assert payload["annotations"]["destructiveHint"] is False

    assert registry["check_cart"].annotations["readOnlyHint"] is True
    assert registry["add_to_cart"].annotations["readOnlyHint"] is False
    assert registry["remove_from_cart"].visibility == "internal"
    remove_payload = tool_registry.serialize_tool_definition(registry["remove_from_cart"])
    assert remove_payload["_meta"]["ui"]["visibility"] == ["app"]
    assert remove_payload["_meta"]["openai/visibility"] == "private"
    assert remove_payload["_meta"]["openai/widgetAccessible"] is True
    assert registry["update_cart_item"].input_schema["properties"]["quantity"]["minimum"] == 0
    for name in (
        "add_to_cart",
        "remove_from_cart",
        "update_cart_item",
        "check_cart",
        "clear_cart",
        "sync_cart",
    ):
        assert "cart_token" not in registry[name].input_schema["properties"]


def test_sync_cart_tool_is_registered_for_widget_bootstrap() -> None:
    registry = tool_registry.create_tool_registry()
    payload = tool_registry.serialize_tool_definition(registry["sync_cart"])

    assert registry["sync_cart"].visibility == "internal"
    assert payload["_meta"]["ui"]["visibility"] == ["app"]
    assert payload["_meta"]["openai/visibility"] == "private"
    assert payload["_meta"]["openai/widgetAccessible"] is True
    assert payload["outputTemplate"] == WIDGET_TEMPLATE_URI
    assert payload["_meta"]["openai/outputTemplate"] == WIDGET_TEMPLATE_URI
    assert registry["sync_cart"].annotations["readOnlyHint"] is False
    assert registry["sync_cart"].annotations["destructiveHint"] is False


def test_theme_and_language_tools_are_registered_for_text_control() -> None:
    registry = tool_registry.create_tool_registry()

    for name in ("set_widget_theme", "set_widget_language", "open_checkout"):
        payload = tool_registry.serialize_tool_definition(registry[name])
        assert payload["outputTemplate"] == WIDGET_TEMPLATE_URI
        assert payload["_meta"]["openai/outputTemplate"] == WIDGET_TEMPLATE_URI
        assert payload["annotations"]["destructiveHint"] is False

    theme_schema = registry["set_widget_theme"].input_schema
    language_schema = registry["set_widget_language"].input_schema
    assert theme_schema["properties"]["theme"]["enum"] == ["light", "dark", "auto"]
    assert language_schema["properties"]["language"]["enum"] == ["ru", "ro"]


def test_widget_ui_config_includes_resource_and_connect_domains(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MCP_WIDGET_DOMAIN", "https://widgets.example")
    monkeypatch.setenv("APTEKA_BASE_URL", "https://api.apteka.md")
    mcp_server._reset_server_caches_for_tests()

    registry = tool_registry.create_tool_registry()
    ui_config = registry["search_products"].ui
    csp = ui_config["csp"]

    assert "https://widgets.example" in csp["resourceDomains"]
    assert get_apteka_base_url() in csp["connectDomains"]
    assert "https://api.apteka.md" in csp["resourceDomains"]
    assert "https://stage.apteka.md" not in csp["connectDomains"]
    assert "https://stage.apteka.md" not in csp["resourceDomains"]
    assert "https://cdn.jsdelivr.net" not in csp["resourceDomains"]


def test_resources_list_uses_snakecase_csp_keys(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MCP_WIDGET_DOMAIN", "https://widgets.example")
    mcp_server._reset_server_caches_for_tests()

    response = mcp_server.handle_rpc_request(
        {"jsonrpc": "2.0", "id": "1", "method": "resources/list"}
    )

    resource_meta = response["result"]["resources"][0]["_meta"]
    widget_csp = resource_meta["openai/widgetCSP"]

    assert "connect_domains" in widget_csp
    assert "resource_domains" in widget_csp
