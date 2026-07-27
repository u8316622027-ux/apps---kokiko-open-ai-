"""MCP tool registry and serialization helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from app.core.config import get_settings
from app.interfaces.mcp.tools.apteka_urls import get_apteka_base_url
from app.interfaces.mcp.tools.cart_tools import (
    add_to_cart,
    check_cart,
    clear_active_cart,
    remove_from_cart,
    sync_cart,
    update_cart_item,
)
from app.interfaces.mcp.tools.order_tools import submit_order
from app.interfaces.mcp.tools.preference_tools import (
    open_checkout,
    set_widget_language,
    set_widget_theme,
)
from app.interfaces.mcp.tools.search_tools import search_products

WIDGET_OUTPUT_TEMPLATE = "ui://widget/products.html"


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    """Metadata and callable for an MCP tool."""

    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[[dict[str, Any]], dict[str, Any]]
    output_template: str
    ui: dict[str, Any]
    title: str | None = None
    annotations: dict[str, Any] = field(default_factory=dict)
    tool_invocation: dict[str, str] = field(default_factory=dict)
    visibility: str = "public"


def create_tool_registry() -> dict[str, ToolDefinition]:
    """Create the default tool registry for MCP requests."""
    widget_ui_config = _build_widget_ui_config()

    return {
        "search_products": ToolDefinition(
            name="search_products",
            title="Search products",
            description=(
                "Search products by free-text query via Stage API. "
                "Args: query and optional limit. "
                "Returns structuredContent.products and structuredContent.no_results when empty."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1},
                    "language": {
                        "type": "string",
                        "description": "User language preference (ru or ro).",
                    },
                },
                "required": ["query"],
            },
            handler=_search_products_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": True,
                "openWorldHint": True,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Searching products...",
                "invoked": "Products found.",
            },
        ),
        "submit_order": ToolDefinition(
            name="submit_order",
            title="Submit order",
            description=(
                "Submit a live Kokiko checkout order by syncing the widget cart "
                "to Kokiko API and calling the official order endpoint. "
                "Returns submitted status, upstream order id, normalized items and total."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string"},
                    "customer_phone": {"type": "string"},
                    "email": {"type": "string"},
                    "delivery_method": {
                        "type": "string",
                        "description": "pickup or courier",
                    },
                    "city": {"type": "string"},
                    "address": {"type": "string"},
                    "street": {"type": "string"},
                    "building": {"type": "string"},
                    "apartment": {"type": "string"},
                    "entrance": {"type": "string"},
                    "floor": {"type": "string"},
                    "intercom_code": {"type": "string"},
                    "region_id": {"type": "integer"},
                    "sector_id": {"type": "integer"},
                    "pharmacy_id": {"type": "integer"},
                    "shop_id": {"type": "integer"},
                    "payment_method": {
                        "type": "string",
                        "enum": ["cash", "card"],
                        "description": "cash or card on delivery",
                    },
                    "delivery_window": {"type": ["object", "null"]},
                    "use_bonuses": {"type": "boolean"},
                    "promo_code": {"type": "string"},
                    "comment": {"type": "string"},
                    "language": {"type": "string"},
                    "platform": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {"type": "object"},
                    },
                },
                "required": ["customer_name", "customer_phone", "items"],
            },
            handler=_submit_order_handler,
            output_template="",
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Submitting order...",
                "invoked": "Order submitted.",
            },
        ),
        "add_to_cart": ToolDefinition(
            name="add_to_cart",
            title="Add to cart",
            description=(
                "Add a product to a cart payload for text-driven cart control, "
                "sync numeric product ids to Kokiko cart API, and return "
                "structuredContent.cart with the current items, count, total, and sync status."
            ),
            input_schema=_cart_mutation_schema(require_product=True),
            handler=_add_to_cart_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Adding product to cart...",
                "invoked": "Cart updated.",
            },
        ),
        "remove_from_cart": ToolDefinition(
            name="remove_from_cart",
            title="Remove from cart",
            description=(
                "Remove a product from a cart payload for text-driven cart control, "
                "sync the remaining numeric product ids to Kokiko cart API, and return "
                "structuredContent.cart with the current items, count, total, and sync status."
            ),
            input_schema=_cart_mutation_schema(require_product_id=True),
            handler=_remove_from_cart_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Removing product from cart...",
                "invoked": "Cart updated.",
            },
        ),
        "update_cart_item": ToolDefinition(
            name="update_cart_item",
            title="Update cart item",
            description=(
                "Set product quantity in a cart payload for text-driven cart control, "
                "sync numeric product ids to Kokiko cart API, and return "
                "structuredContent.cart with the current items, count, total, and sync status."
            ),
            input_schema=_cart_mutation_schema(require_product_id=True, require_quantity=True),
            handler=_update_cart_item_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Updating cart...",
                "invoked": "Cart updated.",
            },
        ),
        "check_cart": ToolDefinition(
            name="check_cart",
            title="Check cart",
            description=(
                "Normalize and summarize a cart payload for text-driven cart control. "
                "Returns structuredContent.cart and opens the cart widget."
            ),
            input_schema=_cart_mutation_schema(),
            handler=_check_cart_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": True,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Checking cart...",
                "invoked": "Cart checked.",
            },
        ),
        "sync_cart": ToolDefinition(
            name="sync_cart",
            title="Sync cart",
            description=(
                "Internal cart-session tool used by the widget to create/confirm the "
                "backend Kokiko cart session and push the current cart items to it. "
                "Not for direct assistant use - use add_to_cart/remove_from_cart/check_cart "
                "for user-facing cart actions."
            ),
            input_schema=_cart_mutation_schema(),
            handler=_sync_cart_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Syncing cart...",
                "invoked": "Cart synced.",
            },
        ),
        "set_widget_theme": ToolDefinition(
            name="set_widget_theme",
            title="Set widget theme",
            description=(
                "Switch the products widget theme from text control. Use light, dark, or auto."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "theme": {
                        "type": "string",
                        "enum": ["light", "dark", "auto"],
                    },
                    "language": {
                        "type": "string",
                        "enum": ["ru", "ro"],
                    },
                },
                "required": ["theme"],
            },
            handler=_set_widget_theme_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Switching theme...",
                "invoked": "Theme switched.",
            },
        ),
        "set_widget_language": ToolDefinition(
            name="set_widget_language",
            title="Set widget language",
            description="Switch the products widget language between Russian and Romanian.",
            input_schema={
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "enum": ["ru", "ro"],
                    },
                    "theme": {
                        "type": "string",
                        "enum": ["light", "dark", "auto"],
                    },
                },
                "required": ["language"],
            },
            handler=_set_widget_language_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Switching language...",
                "invoked": "Language switched.",
            },
        ),
        "open_checkout": ToolDefinition(
            name="open_checkout",
            title="Open checkout",
            description=(
                "Open the products widget directly on checkout using an optional cart payload. "
                "Use submit_order only when the customer data is complete "
                "and the order should be sent."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "cart": {
                        "type": "object",
                        "description": "Current cart payload with items.",
                    },
                    "language": {
                        "type": "string",
                        "enum": ["ru", "ro"],
                    },
                    "theme": {
                        "type": "string",
                        "enum": ["light", "dark", "auto"],
                    },
                },
            },
            handler=_open_checkout_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": True,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Opening checkout...",
                "invoked": "Checkout opened.",
            },
        ),
    }


def serialize_tool_definition(tool: ToolDefinition) -> dict[str, Any]:
    ui_domain = str(tool.ui.get("domain") or "").strip()
    ui_csp = tool.ui.get("csp") if isinstance(tool.ui.get("csp"), dict) else {}
    connect_domains = ui_csp.get("connectDomains")
    resource_domains = ui_csp.get("resourceDomains")
    if not isinstance(connect_domains, list):
        connect_domains = []
    if not isinstance(resource_domains, list):
        resource_domains = []
    payload = {
        "name": tool.name,
        "title": tool.title or tool.name,
        "description": tool.description,
        "inputSchema": tool.input_schema,
        "ui": tool.ui,
        "_meta": {
            "openai/widgetDomain": ui_domain,
            "openai/widgetCSP": {
                "connect_domains": list(connect_domains),
                "resource_domains": list(resource_domains),
            },
        },
    }
    if tool.tool_invocation:
        if tool.tool_invocation.get("invoking"):
            payload["_meta"]["openai/toolInvocation/invoking"] = tool.tool_invocation["invoking"]
        if tool.tool_invocation.get("invoked"):
            payload["_meta"]["openai/toolInvocation/invoked"] = tool.tool_invocation["invoked"]
    if tool.output_template:
        payload["outputTemplate"] = tool.output_template
        payload["_meta"]["openai/outputTemplate"] = tool.output_template
    if tool.annotations:
        payload["annotations"] = dict(tool.annotations)
    return payload


def decorate_tool_result(
    tool_name: str, tool: ToolDefinition, result_payload: dict[str, Any]
) -> dict[str, Any]:
    payload = dict(result_payload)

    if tool_name == "search_products":
        products = payload.get("products")
        if isinstance(products, list):
            normalized_products = products
        else:
            normalized_products = []
        payload["products"] = normalized_products
        payload["no_results"] = len(normalized_products) == 0

    if tool.output_template:
        payload["widget"] = {
            "open": {
                "template": tool.output_template,
                "replace_previous": True,
                "page": _resolve_widget_page(tool_name),
            },
            "ui": tool.ui,
        }
    return payload


def _resolve_widget_page(tool_name: str) -> str:
    if tool_name == "search_products":
        return "search"
    if tool_name in {
        "add_to_cart",
        "remove_from_cart",
        "update_cart_item",
        "check_cart",
        "sync_cart",
    }:
        return "cart"
    if tool_name == "open_checkout":
        return "checkout"
    return "default"


def _cart_mutation_schema(
    *,
    require_product: bool = False,
    require_product_id: bool = False,
    require_quantity: bool = False,
) -> dict[str, Any]:
    required: list[str] = []
    if require_product:
        required.append("product")
    if require_product_id:
        required.append("product_id")
    if require_quantity:
        required.append("quantity")
    return {
        "type": "object",
        "properties": {
            "cart": {
                "type": "object",
                "description": "Current cart payload with an items array.",
            },
            "product": {
                "type": "object",
                "description": "Product to add: id, name, price, quantity, image_url, product_url.",
            },
            "product_id": {"type": "string"},
            "quantity": {"type": "integer", "minimum": 1},
            "language": {"type": "string"},
        },
        "required": required,
    }


def _build_widget_ui_config() -> dict[str, Any]:
    settings = get_settings()
    widget_domain = (
        str(
            getattr(
                settings,
                "mcp_widget_domain",
                "https://subgerminal-yevette-lactogenic.ngrok-free.dev",
            )
        ).strip()
        or "https://subgerminal-yevette-lactogenic.ngrok-free.dev"
    )
    apteka_base_url = get_apteka_base_url()
    resource_domains = list(
        dict.fromkeys(
            [
                widget_domain,
                apteka_base_url,
                "https://api.apteka.md",
                "https://www.apteka.md",
            ]
        )
    )
    return {
        "domain": widget_domain,
        "csp": {
            "connectDomains": [apteka_base_url],
            "resourceDomains": resource_domains,
        },
    }


def _search_products_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    query = str(arguments.get("query", ""))
    limit = int(arguments.get("limit", 10))
    language = arguments.get("language")
    return search_products(query, limit=limit, language=language)


def _submit_order_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    payload = submit_order(arguments)
    clear_active_cart()
    return payload


def _add_to_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return add_to_cart(arguments)


def _remove_from_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return remove_from_cart(arguments)


def _update_cart_item_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return update_cart_item(arguments)


def _check_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return check_cart(arguments)


def _sync_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return sync_cart(arguments)


def _set_widget_theme_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return set_widget_theme(arguments)


def _set_widget_language_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return set_widget_language(arguments)


def _open_checkout_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return open_checkout(arguments)
