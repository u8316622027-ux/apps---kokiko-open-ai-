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
    clear_cart,
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
WIDGET_ACCESSIBLE_TOOL_NAMES = {
    "search_products",
    "search_and_add_to_cart",
    "submit_order",
    "add_to_cart",
    "clear_cart",
    "update_cart_item",
    "check_cart",
    "sync_cart",
    "set_widget_theme",
    "set_widget_language",
    "open_checkout",
}


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
                "Args: query. "
                "Always returns every product returned by Kokiko API without limiting results. "
                "Returns structuredContent.products and structuredContent.no_results when empty. "
                "If the user asks to search and add to cart, use search_and_add_to_cart instead. "
                "For multi-step requests such as search-and-add, search silently with "
                "open_widget:false and let the final cart or checkout action open the widget."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "language": {
                        "type": "string",
                        "description": "User language preference (ru or ro).",
                    },
                    "open_widget": {
                        "type": "boolean",
                        "description": (
                            "Set false when this search is an intermediate step and a later "
                            "tool call should open the final widget."
                        ),
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
        "search_and_add_to_cart": ToolDefinition(
            name="search_and_add_to_cart",
            title="Search and add to cart",
            description=(
                "Use this single tool for user requests that combine product search with "
                "adding to cart, including requests that first clear the cart. "
                "It searches all matching Kokiko products without a limit, optionally clears "
                "the active cart, adds the first priced match or requested product, and opens "
                "only the final cart widget."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "quantity": {"type": "integer", "minimum": 1},
                    "clear_cart": {
                        "type": "boolean",
                        "description": (
                            "Set true when the user asks to clear/replace the cart first."
                        ),
                    },
                    "product_id": {
                        "type": "string",
                        "description": "Optional exact product id from search results.",
                    },
                    "product_index": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Optional 1-based index from search results.",
                    },
                    "language": {
                        "type": "string",
                        "description": "User language preference (ru or ro).",
                    },
                    "open_widget": {
                        "type": "boolean",
                        "description": (
                            "Set false only when another later tool call should open "
                            "the final widget."
                        ),
                    },
                },
                "required": ["query"],
            },
            handler=_search_and_add_to_cart_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Searching and updating cart...",
                "invoked": "Cart updated.",
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
                "reject products without a positive price, "
                "sync numeric product ids to Kokiko cart API, and return "
                "structuredContent.cart with the current items, count, total, and sync status. "
                "Only call this tool for products with a positive numeric price; unavailable "
                "or unpriced products cannot be added. "
                "For multi-step requests, pass open_widget:false on intermediate add calls "
                "and allow only the final cart or checkout tool to open the widget."
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
        "clear_cart": ToolDefinition(
            name="clear_cart",
            title="Clear cart",
            description=(
                "Clear all products from the current cart for text-driven cart control, "
                "sync the empty cart to Kokiko cart API when a backend cart session exists, "
                "and return structuredContent.cart with zero items, count, total, and sync status."
            ),
            input_schema=_cart_mutation_schema(),
            handler=_clear_cart_handler,
            output_template=WIDGET_OUTPUT_TEMPLATE,
            ui=widget_ui_config,
            annotations={
                "readOnlyHint": False,
                "openWorldHint": False,
                "destructiveHint": False,
            },
            tool_invocation={
                "invoking": "Clearing cart...",
                "invoked": "Cart cleared.",
            },
        ),
        "update_cart_item": ToolDefinition(
            name="update_cart_item",
            title="Update cart item",
            description=(
                "Set product quantity in a cart payload for text-driven cart control, "
                "remove the product when quantity is 0, "
                "sync numeric product ids to Kokiko cart API, and return "
                "structuredContent.cart with the current items, count, total, and sync status. "
                "If product_id is unknown, call check_cart first or pass product_name so "
                "the active cart can resolve the item by title."
            ),
            input_schema=_cart_mutation_schema(
                require_quantity=True,
                quantity_minimum=0,
            ),
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
                "Not for direct assistant use - use add_to_cart/update_cart_item/check_cart "
                "for user-facing cart actions."
            ),
            input_schema=_cart_mutation_schema(),
            handler=_sync_cart_handler,
            output_template="",
            ui=widget_ui_config,
            visibility="internal",
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
                    "open_widget": {
                        "type": "boolean",
                        "description": (
                            "Set false when this checkout preparation is an intermediate step."
                        ),
                    },
                    "checkout_step": {
                        "type": "string",
                        "enum": ["delivery", "address", "review"],
                        "description": (
                            "Step to open: delivery for pickup/courier choice, "
                            "address for customer data, review for confirmation/payment."
                        ),
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
    if tool.name in WIDGET_ACCESSIBLE_TOOL_NAMES or tool.visibility == "internal":
        payload["_meta"]["openai/widgetAccessible"] = True
    if tool.tool_invocation:
        if tool.tool_invocation.get("invoking"):
            payload["_meta"]["openai/toolInvocation/invoking"] = tool.tool_invocation["invoking"]
        if tool.tool_invocation.get("invoked"):
            payload["_meta"]["openai/toolInvocation/invoked"] = tool.tool_invocation["invoked"]
    if tool.visibility == "internal":
        payload["_meta"]["ui"] = {"visibility": ["app"]}
        payload["_meta"]["openai/visibility"] = "private"
    if tool.output_template:
        payload["outputTemplate"] = tool.output_template
        payload["_meta"]["openai/outputTemplate"] = tool.output_template
        payload["_meta"].setdefault("ui", {})["resourceUri"] = tool.output_template
    if tool.annotations:
        payload["annotations"] = dict(tool.annotations)
    return payload


def decorate_tool_result(
    tool_name: str, tool: ToolDefinition, result_payload: dict[str, Any]
) -> dict[str, Any]:
    payload = dict(result_payload)
    open_widget = payload.pop("open_widget", True) is not False

    if tool_name == "search_products":
        products = payload.get("products")
        if isinstance(products, list):
            normalized_products = products
        else:
            normalized_products = []
        payload["products"] = normalized_products
        payload["no_results"] = len(normalized_products) == 0

    if tool.output_template and open_widget:
        payload["widget"] = {
            "open": {
                "template": tool.output_template,
                "replace_previous": True,
                "page": _resolve_widget_page_from_payload(tool_name, payload),
            },
            "ui": tool.ui,
        }
    return payload


def _resolve_widget_page(tool_name: str) -> str:
    if tool_name in {
        "search_products",
        "set_widget_theme",
        "set_widget_language",
    }:
        return "search"
    if tool_name == "search_and_add_to_cart":
        return "cart"
    if tool_name in {
        "add_to_cart",
        "update_cart_item",
        "clear_cart",
        "check_cart",
    }:
        return "cart"
    if tool_name == "open_checkout":
        return "checkout"
    return "default"


def _resolve_widget_page_from_payload(tool_name: str, payload: dict[str, Any]) -> str:
    page = str(payload.get("widget_page") or "").strip()
    if page in {"search", "cart", "checkout", "default"}:
        return page
    return _resolve_widget_page(tool_name)


def _cart_mutation_schema(
    *,
    require_product: bool = False,
    require_product_id: bool = False,
    require_quantity: bool = False,
    quantity_minimum: int = 1,
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
                "description": (
                    "Product to add: id, name, positive price, quantity, image_url, product_url."
                ),
            },
            "product_id": {"type": "string"},
            "product_name": {
                "type": "string",
                "description": (
                    "Optional product name or user phrase for matching an item "
                    "in the active cart when product_id is not known."
                ),
            },
            "quantity": {"type": "integer", "minimum": quantity_minimum},
            "language": {"type": "string"},
            "open_widget": {
                "type": "boolean",
                "description": (
                    "Set false when this cart operation is an intermediate step and a later "
                    "tool call should open the final widget."
                ),
            },
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
    language = arguments.get("language")
    return _apply_open_widget_preference(
        search_products(query, limit=None, language=language),
        arguments,
    )


def _search_and_add_to_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    query = str(arguments.get("query", ""))
    language = arguments.get("language")
    search_payload = search_products(query, limit=None, language=language)
    products = _extract_products(search_payload)
    quantity = _normalize_tool_quantity(arguments.get("quantity"))

    if arguments.get("clear_cart") is True:
        clear_cart({"language": language, "open_widget": False})

    selected_product = _select_search_product(products, arguments)
    cart_product = _product_to_cart_product(selected_product, quantity=quantity)
    if cart_product is None:
        cart_payload = check_cart({"language": language})
        payload = {
            **cart_payload,
            "status": "not_added",
            "action": "search_add",
            "query": str(search_payload.get("query") or query).strip(),
            "products": products,
            "search_count": len(products),
            "selected_product": selected_product,
            "added_quantity": 0,
            "widget_page": "search",
        }
        return _apply_open_widget_preference(payload, arguments)

    add_payload = add_to_cart(
        {
            "product": cart_product,
            "language": language,
            "open_widget": False,
        }
    )
    payload = {
        **add_payload,
        "action": "search_add",
        "query": str(search_payload.get("query") or query).strip(),
        "products": products,
        "search_count": len(products),
        "selected_product": selected_product,
        "added_quantity": quantity,
        "widget_page": "cart",
    }
    return _apply_open_widget_preference(payload, arguments)


def _submit_order_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    payload = submit_order(arguments)
    clear_active_cart()
    return payload


def _add_to_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return _apply_open_widget_preference(add_to_cart(arguments), arguments)


def _clear_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return _apply_open_widget_preference(clear_cart(arguments), arguments)


def _update_cart_item_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return _apply_open_widget_preference(update_cart_item(arguments), arguments)


def _check_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return _apply_open_widget_preference(check_cart(arguments), arguments)


def _sync_cart_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return _apply_open_widget_preference(sync_cart(arguments), arguments)


def _set_widget_theme_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return set_widget_theme(arguments)


def _set_widget_language_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return set_widget_language(arguments)


def _open_checkout_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    return _apply_open_widget_preference(open_checkout(arguments), arguments)


def _extract_products(search_payload: dict[str, Any]) -> list[dict[str, Any]]:
    products = search_payload.get("products")
    if not isinstance(products, list):
        return []
    return [dict(product) for product in products if isinstance(product, dict)]


def _select_search_product(
    products: list[dict[str, Any]],
    arguments: dict[str, Any],
) -> dict[str, Any] | None:
    product_id = str(arguments.get("product_id") or "").strip()
    if product_id:
        for product in products:
            if str(product.get("id") or product.get("product_id") or "").strip() == product_id:
                return product if _product_effective_price(product) is not None else None
        return None

    try:
        product_index = int(arguments.get("product_index"))
    except (TypeError, ValueError):
        product_index = 0
    if product_index > 0:
        selected = products[product_index - 1] if product_index <= len(products) else None
        return selected if selected and _product_effective_price(selected) is not None else None

    for product in products:
        if _product_effective_price(product) is not None:
            return product
    return None


def _product_to_cart_product(
    product: dict[str, Any] | None,
    *,
    quantity: int,
) -> dict[str, Any] | None:
    if product is None:
        return None
    product_id = str(product.get("id") or product.get("product_id") or "").strip()
    name = str(
        product.get("name") or product.get("name_ru") or product.get("name_ro") or ""
    ).strip()
    price = _product_effective_price(product)
    if not product_id or not name or price is None:
        return None
    return {
        "id": product_id,
        "name": name,
        "manufacturer": str(product.get("manufacturer") or "").strip(),
        "price": price,
        "quantity": quantity,
        "image_url": str(product.get("image_url") or product.get("imageUrl") or "").strip(),
        "product_url": str(product.get("product_url") or product.get("productUrl") or "").strip(),
    }


def _product_effective_price(product: dict[str, Any]) -> float | None:
    for key in ("discount_price", "discountPrice", "price"):
        value = product.get(key)
        try:
            price = float(value)
        except (TypeError, ValueError):
            continue
        if price > 0:
            return round(price, 2)
    return None


def _normalize_tool_quantity(value: Any) -> int:
    try:
        quantity = int(value)
    except (TypeError, ValueError):
        return 1
    return max(1, min(quantity, 99))


def _apply_open_widget_preference(
    payload: dict[str, Any],
    arguments: dict[str, Any],
) -> dict[str, Any]:
    if arguments.get("open_widget") is not False:
        return payload
    next_payload = dict(payload)
    next_payload["open_widget"] = False
    return next_payload
