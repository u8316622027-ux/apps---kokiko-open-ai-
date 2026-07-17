import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const openWidgetWithProduct = async (page) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      language: "ru",
      query: "cream",
      products: [
        {
          id: "cream-1",
          name_ru: "Face cream",
          manufacturer: "Kokiko",
          price: 120,
          discount_price: 99,
          image: "",
          slug_ru: "face-cream",
        },
      ],
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });
};

test("products widget shell renders", async ({ page }) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  const sanitized = html.replace(/<script[\s\S]*?<\/script>/g, "");

  await page.setContent(sanitized, { waitUntil: "domcontentloaded" });

  await expect(
    page.locator('[data-widget-shell="search_products"]'),
  ).toBeVisible();
});

test("products widget supports cart quantity changes", async ({ page }) => {
  await openWidgetWithProduct(page);

  const cartButton = page.locator("#products-cart-button");
  await expect(cartButton).toContainText("0");
  await page.locator('[data-action="add-to-cart"]').click();
  await expect(cartButton).toContainText("1");

  await cartButton.click();
  await expect(page.locator("#products-cart-panel")).toBeVisible();
  await expect(page.locator("#products-cart-items")).toContainText(
    "Face cream",
  );
  await expect(page.locator("#products-cart-total")).toContainText("99.00 MDL");

  await page.getByRole("button", { name: /increase/i }).click();
  await expect(page.locator("#products-cart-total")).toContainText(
    "198.00 MDL",
  );

  await page.getByRole("button", { name: /decrease/i }).click();
  await expect(page.locator("#products-cart-total")).toContainText("99.00 MDL");

  await page.getByRole("button", { name: /remove/i }).click();
  await expect(page.locator("#products-cart-items")).toContainText(
    /Cart is empty|Корзина пуста|Coșul este gol/,
  );
});

test("products widget submits checkout form through order tool", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_ORDER_CALLS__ = [];
    window.openai = {
      callTool: async (name, args) => {
        window.__KOKIKO_ORDER_CALLS__.push({ name, args });
        return {
          structuredContent: {
            status: "received",
            order_id: "KOKIKO-TEST",
          },
        };
      },
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();

  await expect(page.locator("#products-checkout-form")).toBeVisible();
  await page.locator("#products-checkout-name").fill("Ana Popescu");
  await page.locator("#products-checkout-phone").fill("079 802 000");
  await page.locator('input[value="courier"]').check();
  await page.locator("#products-checkout-city").fill("Chisinau");
  await page.locator("#products-checkout-address").fill("str. Alecu Russo, 1");
  await page.locator("#products-checkout-comment").fill("Call before delivery");
  await page.locator("#products-order-submit").click();

  await expect(page.locator("#products-checkout-status")).toContainText(
    "KOKIKO-TEST",
  );
  await expect(page.locator("#products-cart-button")).toContainText("0");

  const calls = await page.evaluate(() => window.__KOKIKO_ORDER_CALLS__);
  expect(calls).toHaveLength(1);
  expect(calls[0].name).toBe("submit_order");
  expect(calls[0].args.customer_name).toBe("Ana Popescu");
  expect(calls[0].args.delivery_method).toBe("courier");
  expect(calls[0].args.items[0].id).toBe("cream-1");
});

for (const viewport of [
  { width: 320, height: 720 },
  { width: 768, height: 720 },
  { width: 1280, height: 720 },
]) {
  test(`products cart is usable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openWidgetWithProduct(page);

    await page.locator('[data-action="add-to-cart"]').click();
    await page.locator("#products-cart-button").click();

    const cartPanel = page.locator("#products-cart-panel");
    await expect(cartPanel).toBeVisible();
    await expect(page.locator("#products-cart-total")).toContainText(
      "99.00 MDL",
    );

    const box = await cartPanel.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect(box?.width).toBeLessThanOrEqual(viewport.width);
  });
}
