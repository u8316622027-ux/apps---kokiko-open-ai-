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
  const addButton = page.locator('[data-action="add-to-cart"]');
  await expect(addButton).toContainText("Купить");
  await expect(cartButton).toContainText("0");
  await addButton.click();
  await expect(cartButton).toContainText("1");
  await expect(addButton).toContainText("Купить");
  await expect(addButton).not.toContainText(/В корзине|In cart|\d/);

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

test("products cart opens as a centered modal", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();

  const box = await page.locator("#products-cart-panel").boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }
  const modalCenter = box.x + box.width / 2;
  expect(Math.abs(modalCenter - 640)).toBeLessThan(90);
  expect(box.width).toBeGreaterThan(560);
});

test("products widget syncs cart actions through cart tools", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_CART_CALLS__ = [];
    window.openai = {
      callTool: async (name, args) => {
        window.__KOKIKO_CART_CALLS__.push({ name, args });
        const items = Array.isArray(args?.cart?.items) ? args.cart.items : [];
        const product = args?.product
          ? {
              ...args.product,
              quantity: args.quantity || args.product.quantity || 1,
            }
          : null;
        const nextItems =
          name === "add_to_cart" && product
            ? items.concat(product)
            : name === "remove_from_cart"
              ? items.filter((item) => item.id !== args.product_id)
              : items.map((item) =>
                  item.id === args.product_id
                    ? { ...item, quantity: args.quantity }
                    : item,
                );
        return {
          structuredContent: {
            cart: {
              token: "cart-token-123",
              synced: true,
              items: nextItems,
            },
          },
        };
      },
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await expect
    .poll(() => page.evaluate(() => window.__KOKIKO_CART_CALLS__.length))
    .toBe(1);

  await page.locator("#products-cart-button").click();
  await page.getByRole("button", { name: /increase/i }).click();
  await page.getByRole("button", { name: /remove/i }).click();

  const calls = await page.evaluate(() => window.__KOKIKO_CART_CALLS__);
  expect(calls.map((call) => call.name)).toEqual([
    "add_to_cart",
    "update_cart_item",
    "remove_from_cart",
  ]);
  expect(calls[0].args.product.id).toBe("cream-1");
  expect(calls[1].args.cart.token).toBe("cart-token-123");
  expect(calls[2].args.cart.token).toBe("cart-token-123");
});

test("products cart keeps checkout out of the cart list scroll", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.setViewportSize({ width: 768, height: 720 });
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      widget: { open: { page: "cart" } },
      cart: {
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `cream-${index + 1}`,
          name: `Face cream ${index + 1}`,
          price: 99,
          quantity: 1,
        })),
      },
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  const panelOverflow = await page
    .locator("#products-cart-panel")
    .evaluate((element) => getComputedStyle(element).overflowY);
  expect(panelOverflow).toBe("hidden");
  await expect(page.locator("#products-cart-checkout")).toBeVisible();
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
            status: "submitted",
            order_id: "770001",
          },
        };
      },
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();

  await expect(page.locator("#products-cart-panel")).toHaveClass(/is-checkout/);
  await expect(page.locator("#products-cart-items")).toBeHidden();
  await expect(page.locator("#products-checkout-flow")).toBeVisible();
  await expect(page.locator('[data-checkout-step="delivery"]')).toBeVisible();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator('[data-checkout-step="address"]')).toBeVisible();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("079 802 000");
  await page.locator("#products-checkout-flow-street").fill("str. Alecu Russo");
  await page.locator("#products-checkout-flow-building").fill("1");
  await page
    .locator("#products-checkout-flow-comment")
    .fill("Call before delivery");
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator('[data-checkout-step="review"]')).toBeVisible();
  await page.locator('#products-checkout-flow input[value="cash"]').check();
  await page.locator("#products-checkout-flow-consent").check();
  await page.locator("#products-checkout-flow-submit").click();

  await expect(page.locator("#products-checkout-flow-status")).toContainText(
    "770001",
  );
  await expect(page.locator("#products-cart-button")).toContainText("0");

  const calls = await page.evaluate(() => window.__KOKIKO_ORDER_CALLS__);
  const submitCall = calls.find((call) => call.name === "submit_order");
  expect(calls.map((call) => call.name)).toContain("add_to_cart");
  expect(submitCall).toBeDefined();
  if (!submitCall) {
    return;
  }
  expect(submitCall.args.customer_name).toBe("Ana Popescu");
  expect(submitCall.args.delivery_method).toBe("courier");
  expect(submitCall.args.street).toBe("str. Alecu Russo");
  expect(submitCall.args.building).toBe("1");
  expect(submitCall.args.payment_method).toBe("cash");
  expect(submitCall.args.items[0].id).toBe("cream-1");
});

test("products checkout form can scroll on short screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();

  await expect(page.locator("#products-checkout-flow")).toBeVisible();
  await page.locator('[data-checkout-action="next"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-checkout-action="next"]')).toBeVisible();
  const canScroll = await page
    .locator("#products-checkout-flow")
    .evaluate((element) => element.scrollHeight > element.clientHeight);
  expect(canScroll).toBeTruthy();
});

test("products widget applies cart payload from text tools", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      widget: { open: { page: "cart" } },
      cart: {
        items: [
          {
            id: "cream-1",
            name: "Face cream",
            price: 99,
            quantity: 2,
            product_url: "https://www.kokiko.md/ru/product/face-cream",
          },
        ],
      },
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#products-cart-panel")).toBeVisible();
  await expect(page.locator("#products-cart-items")).toContainText(
    "Face cream",
  );
  await expect(page.locator("#products-cart-total")).toContainText(
    "198.00 MDL",
  );
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
