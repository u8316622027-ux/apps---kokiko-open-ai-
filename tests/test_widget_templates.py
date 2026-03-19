"""Tests for products widget template."""

from __future__ import annotations

import re
import unittest
from pathlib import Path


class WidgetTemplateTests(unittest.TestCase):
    @staticmethod
    def _read_products_bundle_text() -> str:
        html_path = Path("app/widgets/products.html")
        html_text = html_path.read_text(encoding="utf-8")
        bundle_parts = [html_text]

        css_paths = [
            match
            for match in re.findall(r'href="(\./styles/[^"]+\.css)"', html_text)
            if match.startswith("./styles/")
        ]
        for css_rel_path in css_paths:
            css_path = html_path.parent / css_rel_path.removeprefix("./")
            bundle_parts.append(css_path.read_text(encoding="utf-8"))

        js_paths = [
            match
            for match in re.findall(r'src="(\./scripts/[^"]+\.js)"', html_text)
            if match.startswith("./scripts/")
        ]
        for js_rel_path in js_paths:
            js_path = html_path.parent / js_rel_path.removeprefix("./")
            bundle_parts.append(js_path.read_text(encoding="utf-8"))

        return "\n".join(bundle_parts)

    def test_products_template_shell_is_present(self) -> None:
        template_text = Path("app/widgets/products.html").read_text(encoding="utf-8")
        self.assertIn("data-widget-shell=", template_text)
        self.assertNotIn("x-data=", template_text)
        self.assertNotIn("alpinejs", template_text)

    def test_products_template_has_toolbar_and_carousel(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn('class="search-toolbar"', template_text)
        self.assertIn('class="product-track"', template_text)
        self.assertIn('class="carousel-arrow-wrap left"', template_text)
        self.assertIn('class="carousel-arrow-wrap right"', template_text)

    def test_products_template_has_support_popup(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn('id="products-support-button"', template_text)
        self.assertIn('id="products-support-layer"', template_text)
        self.assertIn('id="products-support-popup"', template_text)
        self.assertIn('id="products-support-close"', template_text)
        self.assertIn("https://t.me/aptekamd_bot", template_text)
        self.assertIn("viber://pa?chatURI=aptekamd_bot", template_text)

    def test_products_template_renders_buy_links(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn('class="buy-link"', template_text)
        self.assertIn('target="_blank"', template_text)
        self.assertIn('rel="noopener noreferrer"', template_text)

    def test_products_template_includes_empty_state_copy(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn("product-card--empty", template_text)
        self.assertIn("empty-state-icon", template_text)
        self.assertIn("Товар не найден", template_text)
        self.assertIn("Produsul nu a fost găsit", template_text)
        self.assertIn("--empty-card-bg", template_text)
        self.assertIn("--empty-icon-bg", template_text)

    def test_products_template_removes_cart_and_checkout_ui(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertNotIn("products-cart-modal", template_text)
        self.assertNotIn("products-page-checkout", template_text)
        self.assertNotIn("products-page-my-cart", template_text)
        self.assertNotIn("products-page-tracking", template_text)
        self.assertNotIn("products-toast-layer", template_text)

    def test_products_template_includes_theme_script(self) -> None:
        html_text = Path("app/widgets/products.html").read_text(encoding="utf-8")
        self.assertIn('src="./scripts/products-theme.js"', html_text)

    def test_products_template_excludes_theme_debug_indicator(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertNotIn('id="theme-debug-indicator"', template_text)
        self.assertNotIn(".theme-debug-indicator", template_text)

    def test_products_template_polls_for_theme_updates(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn("pollThemeUpdates", template_text)
        self.assertIn("setInterval", template_text)

    def test_products_template_limits_theme_polling(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn("themeIntervalId", template_text)
        self.assertIn("stableTicks", template_text)
        self.assertIn("clearInterval", template_text)

    def test_products_template_includes_theme_notice(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn('id="theme-notice"', template_text)
        self.assertIn(".theme-notice", template_text)

    def test_products_template_includes_mobile_and_theme_tuning(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn("scroll-snap-type: x mandatory", template_text)
        self.assertIn(':root[data-theme="light"]', template_text)
        self.assertIn(
            "--shadow-card: 0 6px 14px rgba(20, 40, 80, 0.12)",
            template_text,
        )
        self.assertIn("padding-bottom: 12px", template_text)

    def test_products_template_sets_initial_payload_timeout(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn("INITIAL_PAYLOAD_WAIT_MS = 10000", template_text)

    def test_products_template_scales_product_images(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn("transform: scale(1.05)", template_text)
        self.assertIn("height: 208px", template_text)
        self.assertIn(
            "grid-template-rows: 208px 66px 24px 22px 40px 38px",
            template_text,
        )

    def test_products_template_mobile_toolbar_is_single_row(self) -> None:
        template_text = self._read_products_bundle_text()
        self.assertIn("@media (max-width: 520px)", template_text)
        self.assertIn("grid-template-columns: 120px 1fr 44px", template_text)


if __name__ == "__main__":
    unittest.main()
