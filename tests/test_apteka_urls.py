"""Tests for Apteka URL builders."""

from __future__ import annotations

from app.interfaces.mcp.tools import apteka_urls


def test_apteka_base_url_defaults_to_api_domain(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("APTEKA_BASE_URL", raising=False)
    monkeypatch.delenv("APTEKA_ORDER_BASE_URL", raising=False)
    monkeypatch.setattr(apteka_urls, "ENV_FILE_PATH", tmp_path / "missing.env")

    assert apteka_urls.get_apteka_base_url() == "https://api.apteka.md"
    assert apteka_urls.build_front_url("/search") == ("https://api.apteka.md/api/v1/front/search")


def test_order_base_url_defaults_to_stage_for_temporary_checkout(monkeypatch, tmp_path) -> None:
    monkeypatch.delenv("APTEKA_ORDER_BASE_URL", raising=False)
    monkeypatch.setattr(apteka_urls, "ENV_FILE_PATH", tmp_path / "missing.env")

    assert apteka_urls.get_apteka_order_base_url() == "https://stage.apteka.md"
    assert apteka_urls.build_order_front_url("/order/confirm-order-by-using-mobile") == (
        "https://stage.apteka.md/api/v1/front/order/confirm-order-by-using-mobile"
    )
