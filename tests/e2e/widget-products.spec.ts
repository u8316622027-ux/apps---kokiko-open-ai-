import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const DEFAULT_PRODUCTS = [
  {
    id: "cream-1",
    name_ru: "Face cream",
    manufacturer: "Kokiko",
    price: 120,
    discount_price: 99,
    image: "",
    slug_ru: "face-cream",
  },
];

const openWidgetWithProduct = async (page, products = DEFAULT_PRODUCTS) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript((seedProducts) => {
    window.localStorage.clear();
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      language: "ru",
      query: "cream",
      products: seedProducts,
    };
  }, products);

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
    .poll(() =>
      page.evaluate(
        () =>
          window.__KOKIKO_CART_CALLS__.filter(
            (call) => call.name !== "sync_cart",
          ).length,
      ),
    )
    .toBe(1);

  await page.locator("#products-cart-button").click();
  await page.getByRole("button", { name: /increase/i }).click();
  await page.getByRole("button", { name: /remove/i }).click();

  const calls = (
    await page.evaluate(() => window.__KOKIKO_CART_CALLS__)
  ).filter((call) => call.name !== "sync_cart");
  expect(calls.map((call) => call.name)).toEqual([
    "add_to_cart",
    "update_cart_item",
    "remove_from_cart",
  ]);
  expect(calls[0].args.product.id).toBe("cream-1");
  expect(calls[1].args.cart.token).toBe("cart-token-123");
  expect(calls[2].args.cart.token).toBe("cart-token-123");
});

test("products widget ignores stale cart add confirmations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_CART_RESOLVERS__ = [];
    window.openai = {
      callTool: async (name, args) =>
        new Promise((resolve) => {
          const items = Array.isArray(args?.cart?.items) ? args.cart.items : [];
          const product = args?.product
            ? {
                ...args.product,
                quantity: args.quantity || args.product.quantity || 1,
              }
            : null;
          const nextItems =
            name === "add_to_cart" && product ? items.concat(product) : items;
          window.__KOKIKO_CART_RESOLVERS__.push({
            name,
            resolve: () =>
              resolve({
                structuredContent: {
                  cart: {
                    token: `cart-token-${nextItems.length}`,
                    synced: true,
                    items: nextItems,
                  },
                },
              }),
          });
        }),
    };
  });
  await openWidgetWithProduct(page);

  const addButton = page.locator('[data-action="add-to-cart"]');
  await addButton.click();
  await addButton.click();
  await addButton.click();
  await expect(page.locator("#products-cart-button")).toContainText("3");

  await page.evaluate(() => window.__KOKIKO_CART_RESOLVERS__[0].resolve());
  await page.waitForTimeout(80);
  await expect(page.locator("#products-cart-button")).toContainText("3");

  await page.evaluate(() => window.__KOKIKO_CART_RESOLVERS__[2].resolve());
  await page.waitForTimeout(80);
  await expect(page.locator("#products-cart-button")).toContainText("3");
});

test("products widget does not resurrect removed items from stale add response", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_CART_RESOLVERS__ = [];
    window.openai = {
      callTool: async (name, args) =>
        new Promise((resolve) => {
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
                : items;
          window.__KOKIKO_CART_RESOLVERS__.push({
            name,
            resolve: () =>
              resolve({
                structuredContent: {
                  cart: {
                    token: `cart-token-${name}`,
                    synced: true,
                    items: nextItems,
                  },
                },
              }),
          });
        }),
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.getByRole("button", { name: /remove/i }).click();
  await expect(page.locator("#products-cart-button")).toContainText("0");

  await page.evaluate(() =>
    window.__KOKIKO_CART_RESOLVERS__
      .find((resolver) => resolver.name === "remove_from_cart")
      .resolve(),
  );
  await page.evaluate(() =>
    window.__KOKIKO_CART_RESOLVERS__
      .find((resolver) => resolver.name === "add_to_cart")
      .resolve(),
  );
  await page.waitForTimeout(80);

  await expect(page.locator("#products-cart-button")).toContainText("0");
  await expect(page.locator("#products-cart-items")).toContainText(
    /Cart is empty|Корзина пуста|Coșul este gol/,
  );
});

test("products widget bootstraps a cart token on mount", async ({ page }) => {
  await page.addInitScript(() => {
    window.__KOKIKO_SYNC_CALLS__ = [];
    window.openai = {
      callTool: async (name, args) => {
        window.__KOKIKO_SYNC_CALLS__.push({ name, args });
        return {
          structuredContent: {
            cart: { token: "bootstrap-token-1", synced: true, items: [] },
          },
        };
      },
    };
  });
  await openWidgetWithProduct(page);

  await expect
    .poll(() => page.evaluate(() => window.__KOKIKO_SYNC_CALLS__.length))
    .toBeGreaterThan(0);

  const calls = await page.evaluate(() => window.__KOKIKO_SYNC_CALLS__);
  expect(calls[0].name).toBe("sync_cart");

  const storedToken = await page.evaluate(() =>
    window.localStorage.getItem("kokiko_widget_cart_token"),
  );
  expect(storedToken).toBe("bootstrap-token-1");
});

test("products widget clears stale local cart items when no token is persisted", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "kokiko_widget_cart",
      JSON.stringify([
        { id: "cream-1", name: "Face cream", price: 99, quantity: 2 },
      ]),
    );
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  const cartCount = await page.locator("#products-cart-count").textContent();
  expect(cartCount).toBe("0");
  const storedCart = await page.evaluate(() =>
    window.localStorage.getItem("kokiko_widget_cart"),
  );
  expect(JSON.parse(storedCart || "[]")).toEqual([]);
});

test("products widget keeps a persisted cart when the mount sync confirms it", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("kokiko_widget_cart_token", "existing-token");
    window.localStorage.setItem(
      "kokiko_widget_cart",
      JSON.stringify([
        { id: "26078", name: "Shampoo", price: 57.27, quantity: 1 },
      ]),
    );
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      language: "ru",
      query: "cream",
      products: [],
    };
    window.openai = {
      callTool: async (name, args) => ({
        structuredContent: {
          cart: {
            token: "existing-token",
            synced: true,
            items: Array.isArray(args?.cart?.items) ? args.cart.items : [],
          },
        },
      }),
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#products-cart-count")).toContainText("1");
});

test("products widget clears a persisted cart when the mount sync reports it unsynced", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("kokiko_widget_cart_token", "existing-token");
    window.localStorage.setItem(
      "kokiko_widget_cart",
      JSON.stringify([
        { id: "26078", name: "Shampoo", price: 57.27, quantity: 1 },
      ]),
    );
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      language: "ru",
      query: "cream",
      products: [],
    };
    window.openai = {
      callTool: async (name, args) => ({
        structuredContent: {
          cart: {
            token: "existing-token",
            synced: false,
            items: Array.isArray(args?.cart?.items) ? args.cart.items : [],
          },
        },
      }),
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  await expect(page.locator("#products-cart-count")).toContainText("0");
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

test("products widget applies dark theme and Romanian language payload", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      theme: "dark",
      theme_mode: "manual",
      language: "ro",
      query: "crema",
      products: [
        {
          id: "cream-1",
          name_ru: "Крем",
          name_ro: "Cremă de față",
          manufacturer: "Kokiko",
          price: 120,
          discount_price: 99,
          image: "",
          slug_ro: "crema-de-fata",
        },
      ],
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#products-search-input")).toHaveAttribute(
    "placeholder",
    "Caută produse",
  );
  await expect(page.locator('[data-action="add-to-cart"]')).toContainText(
    "Cumpără",
  );
  await expect(page.locator(".product-title")).toContainText("Cremă de față");
});

test("products widget defaults to Romanian for unrecognized ChatGPT locales", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.openai = { locale: "en-US" };
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      query: "cream",
      products: [
        {
          id: "cream-1",
          name_ru: "Крем",
          name_ro: "Cremă de față",
          manufacturer: "Kokiko",
          price: 120,
          discount_price: 99,
          image: "",
          slug_ro: "crema-de-fata",
        },
      ],
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-action="add-to-cart"]')).toContainText(
    "Cumpără",
  );
});

test("products widget uses Russian copy for a Russian ChatGPT locale", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.openai = { locale: "ru-RU" };
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      query: "cream",
      products: [
        {
          id: "cream-1",
          name_ru: "Крем",
          manufacturer: "Kokiko",
          price: 120,
          discount_price: 99,
          image: "",
          slug_ru: "krem",
        },
      ],
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-action="add-to-cart"]')).toContainText(
    "Купить",
  );
});

test("products widget keeps manually selected language after reload", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    const alreadyReady = window.localStorage.getItem(
      "__kokiko_language_test_ready",
    );
    if (!alreadyReady) {
      window.localStorage.clear();
      window.localStorage.setItem("__kokiko_language_test_ready", "1");
    }
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      ...(alreadyReady ? {} : { language: "ru" }),
      query: "cream",
      products: [
        {
          id: "cream-1",
          name_ru: "Face cream",
          name_ro: "Crema",
          manufacturer: "Kokiko",
          price: 120,
          discount_price: 99,
          image: "",
          slug_ro: "crema",
        },
      ],
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#products-language-toggle").click();
  await expect(page.locator("#products-search-input")).toHaveAttribute(
    "placeholder",
    "Caută produse",
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#products-search-input")).toHaveAttribute(
    "placeholder",
    "Caută produse",
  );
});

test("products widget relocalizes products and checkout lookups when language changes", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__KOKIKO_FETCH_CALLS__ = [];
    window.fetch = async (url, options) => {
      window.__KOKIKO_FETCH_CALLS__.push({
        url: String(url),
        language: options?.headers?.["Accept-Language"],
      });
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 2,
              translations: {
                ru: { name: "г. Кишинёв" },
                ro: { name: "mun. Chișinău" },
              },
            },
          ],
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 36,
              translations: {
                ru: { name: "Аптека", address: "ул. Руссо, 1" },
                ro: { name: "Farmacie", address: "str. Russo, 1" },
              },
              region: {
                id: 2,
                translations: {
                  ru: { name: "г. Кишинёв" },
                  ro: { name: "mun. Chișinău" },
                },
              },
              sector: {
                id: 20,
                translations: {
                  ru: { name: "Рышкановка" },
                  ro: { name: "Rîșcani" },
                },
              },
            },
          ],
        };
      }
      if (String(url).endsWith("/delivery/calculate/pick-up/36")) {
        return {
          ok: true,
          json: async () => ({
            deliveryDate: "20.07.2026",
            from: "14:00",
            to: "20:00",
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    };
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      language: "ro",
      query: "crema",
      products: [
        {
          id: "cream-1",
          name_ru: "Крем для лица",
          name_ro: "Cremă de față",
          manufacturer: "Kokiko",
          price: 120,
          discount_price: 99,
          image: "",
          slug_ru: "krem-dlya-litsa",
          slug_ro: "crema-de-fata",
        },
      ],
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".product-title")).toContainText("Cremă de față");

  await page.locator("#products-language-toggle").click();
  await expect(page.locator(".product-title")).toContainText("Крем для лица");
  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  await page.locator("#products-checkout-flow-region").selectOption("2");
  await expect(page.locator("#products-checkout-flow-region")).toContainText(
    "г. Кишинёв",
  );
  await expect(page.locator("#products-checkout-flow-sector")).toContainText(
    "Рышкановка",
  );
  const calls = await page.evaluate(() => window.__KOKIKO_FETCH_CALLS__);
  expect(calls.some((call) => call.language === "ru")).toBeTruthy();
});

test("products checkout is dark themed beyond the search cards", async ({
  page,
}) => {
  const htmlPath = path.resolve(process.cwd(), "app/widgets/products.html");
  const htmlUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__APTEKA_WIDGET_PAYLOAD__ = {
      theme: "dark",
      theme_mode: "manual",
      language: "ru",
      query: "cream",
      products: [
        {
          id: "cream-1",
          name_ru: "Крем",
          manufacturer: "Kokiko",
          price: 120,
          discount_price: 99,
          image: "",
        },
      ],
    };
  });

  await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });
  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();

  const colors = await page.locator("#products-cart-panel").evaluate(() => {
    const panel = document.getElementById("products-cart-panel");
    const form = document.getElementById("products-checkout-flow");
    const field = document.getElementById("products-checkout-flow-name");
    return {
      panel: getComputedStyle(panel).backgroundColor,
      form: getComputedStyle(form).backgroundColor,
      field: getComputedStyle(field).backgroundColor,
    };
  });
  expect(colors.panel).not.toBe("rgb(255, 255, 255)");
  expect(colors.form).not.toBe("rgb(255, 255, 255)");
  expect(colors.field).not.toBe("rgb(255, 255, 255)");
});

test("products checkout delivery step matches Kokiko card mechanics", async ({
  page,
}) => {
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();

  const courierCard = page.locator(
    '#products-checkout-flow .products-checkout-delivery label:has(input[value="courier"])',
  );
  await expect(courierCard).toContainText("Курьерская доставка");
  await expect(courierCard).toContainText("Доставка по Молдове");
  const cardStyle = await courierCard.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderWidth: style.borderTopWidth,
      borderColor: style.borderTopColor,
      minHeight: style.minHeight,
    };
  });
  expect(cardStyle.borderWidth).toBe("2px");
  expect(cardStyle.borderColor).toBe("rgb(0, 169, 157)");
  expect(Number.parseFloat(cardStyle.minHeight)).toBeLessThanOrEqual(112);
});

test("products checkout opens custom selects inside the app panel", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.fetch = async (url) => {
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () =>
            Array.from({ length: 14 }, (_, index) => ({
              id: index + 1,
              translations: { ru: { name: `Регион ${index + 1}` } },
            })),
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-region-trigger").click();

  const menu = page.locator(
    '[data-select-for="products-checkout-flow-region"]',
  );
  await expect(menu).toBeVisible();
  const boxes = await page.evaluate(() => {
    const panel = document.getElementById("products-cart-panel");
    const menu = document.querySelector(
      '[data-select-for="products-checkout-flow-region"]',
    );
    const panelBox = panel.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    return {
      panelLeft: panelBox.left,
      panelRight: panelBox.right,
      panelTop: panelBox.top,
      panelBottom: panelBox.bottom,
      menuLeft: menuBox.left,
      menuRight: menuBox.right,
      menuTop: menuBox.top,
      menuBottom: menuBox.bottom,
    };
  });
  expect(boxes.menuLeft).toBeGreaterThanOrEqual(boxes.panelLeft);
  expect(boxes.menuRight).toBeLessThanOrEqual(boxes.panelRight);
  expect(boxes.menuTop).toBeGreaterThanOrEqual(boxes.panelTop);
  expect(boxes.menuBottom).toBeLessThanOrEqual(boxes.panelBottom);
});

test("products checkout keeps sector disabled until a region is selected", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_FETCH_CALLS__ = [];
    window.fetch = async (url, options) => {
      window.__KOKIKO_FETCH_CALLS__.push({
        url: String(url),
        market: options?.headers?.market,
      });
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () => [
            { id: 2, translations: { ru: { name: "Region A" } } },
            { id: 7, translations: { ru: { name: "Region B" } } },
          ],
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return { ok: true, json: async () => [] };
      }
      if (String(url).endsWith("/cities-by-region/7")) {
        return {
          ok: true,
          json: async () => [
            { id: 701, translations: { ru: { name: "Sector B" } } },
          ],
        };
      }
      if (String(url).endsWith("/delivery/calculate/target/7")) {
        return {
          ok: true,
          json: async () => ({
            availableWindows: {
              "21.07.2026": [
                { deliveryDate: "21.07.2026", from: "13:00", to: "15:00" },
              ],
            },
          }),
        };
      }
      throw new Error(`Unexpected fetch ${url}`);
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  const region = page.locator("#products-checkout-flow-region");
  const sector = page.locator("#products-checkout-flow-sector");
  await expect(region).toHaveValue("");
  await expect(sector).toBeDisabled();
  await expect(sector).toHaveValue("");
  await expect(region).toHaveJSProperty("size", 0);

  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator("#products-checkout-flow-region")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#products-checkout-flow-sector")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.locator("#products-checkout-flow-region-trigger"),
  ).toHaveAttribute("data-invalid", "true");
  await expect(
    page.locator("#products-checkout-flow-sector-trigger"),
  ).toHaveAttribute("data-invalid", "false");

  const callsBeforeRegion = await page.evaluate(() =>
    window.__KOKIKO_FETCH_CALLS__.map((call) => call.url),
  );
  expect(callsBeforeRegion).not.toContain(
    "https://api.apteka.md/api/v1/front/delivery/calculate/target/7",
  );

  const sectorBefore = await sector.boundingBox();
  await region.focus();
  await expect(region).toHaveJSProperty("size", 0);
  const sectorAfterFocus = await sector.boundingBox();
  expect(sectorAfterFocus?.height).toBe(sectorBefore?.height);

  await region.selectOption("7");
  await expect(sector).toBeEnabled();
  await expect(sector).toContainText("Sector B");
  await expect(
    page.locator("#products-checkout-flow-delivery-windows"),
  ).toContainText("13:00 - 15:00");
});

test("products checkout uses bounded custom select picker on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => {
    window.fetch = async (url) => {
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () =>
            Array.from({ length: 14 }, (_, index) => ({
              id: index + 1,
              translations: { ru: { name: `Region ${index + 1}` } },
            })),
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-region-trigger").click();

  const metrics = await page.evaluate(() => {
    const panel = document.getElementById("products-cart-panel");
    const menu = document.querySelector(
      '[data-select-for="products-checkout-flow-region"]',
    );
    const panelBox = panel.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      menuLeft: menuBox.left,
      menuRight: menuBox.right,
      menuBottom: menuBox.bottom,
      panelBottom: panelBox.bottom,
    };
  });
  expect(metrics.menuLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.menuRight).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.menuBottom).toBeLessThanOrEqual(metrics.panelBottom);
});

test("products checkout courier time slots stay compact in the modal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.fetch = async (url) => {
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () => [
            { id: 2, translations: { ru: { name: "г. Кишинёв" } } },
          ],
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return { ok: true, json: async () => [] };
      }
      if (String(url).endsWith("/cities-by-region/2")) {
        return {
          ok: true,
          json: async () => [
            { id: 20, translations: { ru: { name: "Центр" } } },
          ],
        };
      }
      if (String(url).endsWith("/delivery/calculate/target/2")) {
        return {
          ok: true,
          json: async () => ({
            availableWindows: {
              "20.07.2026": [
                { deliveryDate: "20.07.2026", from: "17:00", to: "20:00" },
                { deliveryDate: "20.07.2026", from: "20:00", to: "22:30" },
                { deliveryDate: "20.07.2026", from: "22:00", to: "23:30" },
              ],
              "21.07.2026": [
                { deliveryDate: "21.07.2026", from: "09:30", to: "14:00" },
                { deliveryDate: "21.07.2026", from: "14:00", to: "18:00" },
              ],
              "22.07.2026": [
                { deliveryDate: "22.07.2026", from: "09:30", to: "13:00" },
              ],
            },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-region").selectOption("2");

  const firstSlot = page.locator(".products-delivery-window-slot").first();
  await expect(firstSlot).toBeVisible();
  const box = await firstSlot.boundingBox();
  expect(box?.width).toBeLessThan(190);
});

test("products checkout loads courier regions sectors and delivery windows from Kokiko API", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_FETCH_CALLS__ = [];
    window.fetch = async (url, options) => {
      window.__KOKIKO_FETCH_CALLS__.push({
        url: String(url),
        market: options?.headers?.market,
      });
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () => [
            { id: 2, translations: { ru: { name: "г. Кишинёв" } } },
            { id: 7, translations: { ru: { name: "г. Бессарабка" } } },
          ],
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return {
          ok: true,
          json: async () => [],
        };
      }
      if (String(url).endsWith("/cities-by-region/7")) {
        return {
          ok: true,
          json: async () => [
            { id: 701, translations: { ru: { name: "Центр" } } },
          ],
        };
      }
      if (String(url).includes("/cities-by-region/")) {
        return {
          ok: true,
          json: async () => [],
        };
      }
      if (String(url).endsWith("/delivery/calculate/target/7")) {
        return {
          ok: true,
          json: async () => ({
            availableWindows: {
              "21.07.2026": [
                {
                  deliveryDate: "21.07.2026",
                  from: "13:00",
                  to: "15:00",
                },
                {
                  deliveryDate: "21.07.2026",
                  from: "17:00",
                  to: "20:00",
                },
              ],
            },
          }),
        };
      }
      if (String(url).includes("/delivery/calculate/target/")) {
        return {
          ok: true,
          json: async () => ({ sectors: [], availableWindows: {} }),
        };
      }
      throw new Error(`Unexpected fetch ${url}`);
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator("#products-checkout-flow-region")).toContainText(
    "г. Бессарабка",
  );
  await page.locator("#products-checkout-flow-region").selectOption("7");
  await expect(page.locator("#products-checkout-flow-sector")).toContainText(
    "Центр",
  );
  await expect(
    page.locator("#products-checkout-flow-delivery-windows"),
  ).toContainText("13:00 - 15:00");
  await page
    .locator('input[name="products-delivery-window"][value="1"]')
    .click();
  await expect(
    page.locator('input[name="products-delivery-window"][value="1"]'),
  ).toBeChecked();

  const calls = await page.evaluate(() => window.__KOKIKO_FETCH_CALLS__);
  expect(calls.map((call) => call.url)).toEqual(
    expect.arrayContaining([
      "https://api.apteka.md/api/v1/front/regions",
      "https://api.apteka.md/api/v1/front/pharmacies/list",
      "https://api.apteka.md/api/v1/front/cities-by-region/7",
      "https://api.apteka.md/api/v1/front/delivery/calculate/target/7",
    ]),
  );
  expect(calls.every((call) => call.market === "kokikomd")).toBeTruthy();
});

test("products checkout waits for address step before loading pickup time", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_FETCH_CALLS__ = [];
    window.fetch = async (url, options) => {
      window.__KOKIKO_FETCH_CALLS__.push({
        url: String(url),
        market: options?.headers?.market,
      });
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () => [
            { id: 2, translations: { ru: { name: "Pickup Region" } } },
          ],
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              translations: {
                ru: { name: "Pickup Pharmacy", address: "Main 1" },
              },
              region: {
                id: 2,
                translations: { ru: { name: "Pickup Region" } },
              },
              sector: { id: 20, translations: { ru: { name: "Center" } } },
            },
          ],
        };
      }
      throw new Error(`Unexpected fetch ${url}`);
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.__KOKIKO_FETCH_CALLS__.filter((call) =>
            /\/(regions|pharmacies\/list)$/.test(call.url),
          ).length,
      ),
    )
    .toBeGreaterThanOrEqual(2);
  const calls = await page.evaluate(() => window.__KOKIKO_FETCH_CALLS__);
  expect(calls.some((call) => call.url.includes("/pick-up/"))).toBeFalsy();
});

test("products checkout filters pickup pharmacies by region and sector and loads pickup time", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_FETCH_CALLS__ = [];
    window.fetch = async (url, options) => {
      window.__KOKIKO_FETCH_CALLS__.push({
        url: String(url),
        market: options?.headers?.market,
      });
      if (String(url).endsWith("/regions")) {
        return {
          ok: true,
          json: async () => [
            { id: 2, translations: { ru: { name: "г. Кишинёв" } } },
            { id: 7, translations: { ru: { name: "г. Бессарабка" } } },
            { id: 99, translations: { ru: { name: "No Pharmacy Region" } } },
          ],
        };
      }
      if (String(url).endsWith("/pharmacies/list")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 36,
              translations: {
                ru: {
                  name: "Магазин КоКиКо",
                  address: "ул. А. Руссо, 1",
                  phone: "079 802 000",
                },
              },
              region: { id: 2, translations: { ru: { name: "г. Кишинёв" } } },
              sector: {
                id: 1550,
                translations: { ru: { name: "Рышкановка" } },
              },
            },
            {
              id: 77,
              translations: {
                ru: {
                  name: "Аптека Бессарабка",
                  address: "ул. Индепенденцей, 4",
                  phone: "022 000 000",
                },
              },
              region: {
                id: 7,
                translations: { ru: { name: "г. Бессарабка" } },
              },
              sector: { id: 701, translations: { ru: { name: "Центр" } } },
              schedule: {
                monday: { from: "08:00", to: "20:00" },
                tuesday: { from: "08:00", to: "20:00" },
                wednesday: { from: "08:00", to: "20:00" },
                thursday: { from: "08:00", to: "20:00" },
                friday: { from: "08:00", to: "20:00" },
                saturday: { from: "09:00", to: "18:00" },
                sunday: { from: "09:00", to: "16:00" },
              },
            },
          ],
        };
      }
      if (String(url).endsWith("/delivery/calculate/pick-up/77")) {
        return {
          ok: true,
          json: async () => ({
            deliveryDate: "20.07.2026",
            from: "14:00",
            to: "20:00",
            orderEnd: "23.07.2026",
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  await expect(
    page.locator("#products-checkout-flow-region"),
  ).not.toContainText("No Pharmacy Region");
  await page.locator("#products-checkout-flow-region").selectOption("7");
  await expect(page.locator("#products-checkout-flow-sector")).toContainText(
    "Центр",
  );
  await expect(page.locator("#products-checkout-flow-pharmacy")).toBeHidden();
  await expect(
    page.locator("#products-checkout-flow-pharmacy-options"),
  ).toContainText("Аптека Бессарабка");
  await expect(
    page.locator("#products-checkout-flow-pharmacy-options"),
  ).toContainText("08:00-20:00");
  await expect(
    page.locator("#products-checkout-flow-delivery-windows"),
  ).toContainText("20.07.2026 • 20:00");

  const calls = await page.evaluate(() => window.__KOKIKO_FETCH_CALLS__);
  expect(calls.map((call) => call.url)).toEqual(
    expect.arrayContaining([
      "https://api.apteka.md/api/v1/front/regions",
      "https://api.apteka.md/api/v1/front/pharmacies/list",
      "https://api.apteka.md/api/v1/front/delivery/calculate/pick-up/77",
    ]),
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
  await expect(page.locator("#products-cart-title")).toHaveText("Корзина");
  await page.locator("#products-cart-checkout").click();

  await expect(page.locator("#products-cart-panel")).toHaveClass(/is-checkout/);
  await expect(page.locator("#products-cart-items")).toBeHidden();
  await expect(page.locator("#products-checkout-flow")).toBeVisible();
  await expect(page.locator("#products-cart-title")).toBeVisible();
  await expect(page.locator("#products-cart-title")).toHaveText(
    "Оформление заказа",
  );
  await expect(page.locator("#products-cart-close")).toBeVisible();
  await expect(
    page.locator("#products-checkout-flow .products-checkout-heading"),
  ).toBeHidden();
  await expect(page.locator('[data-checkout-step="delivery"]')).toBeVisible();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator('[data-checkout-step="address"]')).toBeVisible();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
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

  await expect(page.locator('[data-checkout-step="success"]')).toBeVisible();
  await expect(
    page.locator("#products-checkout-flow-order-number"),
  ).toContainText("770001");
  await expect(page.locator("#products-cart-button")).toContainText("0");

  const calls = await page.evaluate(() => window.__KOKIKO_ORDER_CALLS__);
  const submitCall = calls.find((call) => call.name === "submit_order");
  expect(calls.map((call) => call.name)).toContain("add_to_cart");
  expect(submitCall).toBeDefined();
  if (!submitCall) {
    return;
  }
  expect(submitCall.args.customer_name).toBe("Ana Popescu");
  expect(submitCall.args.customer_phone).toBe("+37379703000");
  expect(submitCall.args.delivery_method).toBe("courier");
  expect(submitCall.args.street).toBe("str. Alecu Russo");
  expect(submitCall.args.building).toBe("1");
  expect(submitCall.args.payment_method).toBe("cash");
  expect(submitCall.args.items[0].id).toBe("cream-1");
});

test("products checkout shows a dedicated success screen after submit and resets on continue", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.openai = {
      callTool: async (name, args) => {
        if (name === "submit_order") {
          return {
            structuredContent: { status: "submitted", order_id: "990002" },
          };
        }
        const items = Array.isArray(args?.cart?.items) ? args.cart.items : [];
        const product = args?.product
          ? {
              ...args.product,
              quantity: args.quantity || args.product.quantity || 1,
            }
          : null;
        const nextItems =
          name === "add_to_cart" && product ? items.concat(product) : items;
        return {
          structuredContent: {
            cart: { token: "success-token", synced: true, items: nextItems },
          },
        };
      },
    };
  });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator('[data-checkout-step="review"]')).toBeVisible();
  await page.locator('#products-checkout-flow input[value="cash"]').check();
  await page.locator("#products-checkout-flow-consent").check();
  await page.locator("#products-checkout-flow-submit").click();

  await expect(page.locator('[data-checkout-step="success"]')).toBeVisible();
  await expect(
    page.locator("#products-checkout-flow-order-number"),
  ).toContainText("990002");
  const checkoutFlow = page.locator("#products-checkout-flow");
  await expect(page.locator("#products-checkout-flow-review")).toBeHidden();
  await expect(checkoutFlow.locator(".products-payment-methods")).toBeHidden();
  await expect(checkoutFlow.locator(".products-checkout-actions")).toBeHidden();
  await expect(checkoutFlow.locator(".products-checkout-steps")).toBeHidden();

  await page.locator("#products-checkout-flow-continue").click();

  await expect(page.locator("#products-checkout-flow")).toBeHidden();
  await expect(page.locator("#products-cart-items")).toBeVisible();
  await expect(page.locator("#products-cart-items")).toContainText(
    /Cart is empty|Корзина пуста|Coșul este gol/,
  );
});

test("products checkout re-syncs cart on every entry into the review step", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__KOKIKO_SYNC_CALLS__ = [];
    window.openai = {
      callTool: async (name, args) => {
        if (name === "sync_cart") {
          window.__KOKIKO_SYNC_CALLS__.push({ name, args });
        }
        const items = Array.isArray(args?.cart?.items) ? args.cart.items : [];
        const product = args?.product
          ? {
              ...args.product,
              quantity: args.quantity || args.product.quantity || 1,
            }
          : null;
        const nextItems =
          name === "add_to_cart" && product ? items.concat(product) : items;
        return {
          structuredContent: {
            cart: {
              token: "review-sync-token",
              synced: true,
              items: nextItems,
            },
          },
        };
      },
    };
  });
  await openWidgetWithProduct(page);

  await expect
    .poll(() => page.evaluate(() => window.__KOKIKO_SYNC_CALLS__.length))
    .toBe(1);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator('[data-checkout-step="review"]')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__KOKIKO_SYNC_CALLS__.length))
    .toBe(2);

  await page.locator("#products-checkout-flow-back").click();
  await expect(page.locator('[data-checkout-step="address"]')).toBeVisible();
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator('[data-checkout-step="review"]')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__KOKIKO_SYNC_CALLS__.length))
    .toBe(3);
});

test("products checkout validates Moldova phone mask and digits only", async ({
  page,
}) => {
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator("#products-checkout-flow-country")).toHaveValue(
    "MD",
  );
  await expect(
    page.locator('#products-checkout-flow-country option[value="MD"]'),
  ).toHaveText("MD +373");
  await expect(page.locator("#products-checkout-flow-phone-mask")).toHaveCount(
    0,
  );
  await expect(page.locator("#products-checkout-flow-phone")).toHaveAttribute(
    "placeholder",
    "XX XXX XXX",
  );

  const phone = page.locator("#products-checkout-flow-phone");
  await phone.fill("79abc703000!!");
  await expect(phone).toHaveValue("79 703 000");

  await phone.fill("12");
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
  await page.locator('[data-checkout-action="next"]').click();
  await expect(page.locator("#products-checkout-flow-status")).toContainText(
    /8 цифр|8 digits/,
  );

  await phone.fill("79703000");
  await expect(phone).toHaveValue("79 703 000");
  await page.locator('[data-checkout-action="next"]').click();
  await expect(page.locator('[data-checkout-step="review"]')).toBeVisible();
});

test("products checkout phone can be edited from the middle", async ({
  page,
}) => {
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();

  const phone = page.locator("#products-checkout-flow-phone");
  await phone.fill("79703000");
  await expect(phone).toHaveValue("79 703 000");
  await phone.evaluate((input) => {
    input.setSelectionRange(3, 4);
  });
  await page.keyboard.type("8");

  await expect(phone).toHaveValue("79 803 000");
  const selection = await phone.evaluate((input) => input.selectionStart);
  expect(selection).toBeLessThan("79 803 000".length);
});

test("products checkout only offers cash and card on delivery payment", async ({
  page,
}) => {
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
  await page.locator('[data-checkout-action="next"]').click();

  const paymentValues = await page
    .locator('input[name="products-payment-method"]')
    .evaluateAll((inputs) => inputs.map((input) => input.value));
  expect(paymentValues).toEqual(["cash", "card"]);
  await expect(page.locator('input[value="maib"]')).toHaveCount(0);
  await expect(page.locator('input[value="mia"]')).toHaveCount(0);
  await expect(page.locator('input[value="cashless_individual"]')).toHaveCount(
    0,
  );

  await expect(page.locator('[data-checkout-step="review"]')).toBeVisible();
  const legendBox = await page
    .locator(".products-payment-methods legend")
    .boundingBox();
  const firstLabelBox = await page
    .locator(".products-payment-methods label")
    .first()
    .boundingBox();
  expect(legendBox).not.toBeNull();
  expect(firstLabelBox).not.toBeNull();
  if (legendBox && firstLabelBox) {
    const gap = firstLabelBox.y - (legendBox.y + legendBox.height);
    expect(gap).toBeGreaterThanOrEqual(8);
  }
});

test("products checkout validates required pickup address fields", async ({
  page,
}) => {
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator("#products-checkout-flow-status")).toContainText(
    /Заполните обязательные поля/,
  );
  await expect(page.locator("#products-checkout-flow-name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#products-checkout-flow-phone")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#products-checkout-flow-region")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#products-checkout-flow-sector")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("products checkout validates required courier address fields", async ({
  page,
}) => {
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="courier"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator("#products-checkout-flow-status")).toContainText(
    /Заполните обязательные поля/,
  );
  for (const selector of [
    "#products-checkout-flow-region",
    "#products-checkout-flow-sector",
    "#products-checkout-flow-street",
    "#products-checkout-flow-building",
  ]) {
    await expect(page.locator(selector)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  }
});

test("products checkout validates minimum review total before submit", async ({
  page,
}) => {
  await openWidgetWithProduct(page, [
    {
      id: "sample-1",
      name_ru: "Sample",
      manufacturer: "Kokiko",
      price: 20,
      discount_price: 20,
      image: "",
      slug_ru: "sample",
    },
  ]);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-consent").check();
  await page.locator("#products-checkout-flow-submit").click();

  await expect(page.locator("#products-checkout-flow-status")).toContainText(
    /30 MDL/,
  );
});

test("products checkout validates review consent before submit", async ({
  page,
}) => {
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("79703000");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-submit").click();

  await expect(page.locator("#products-checkout-flow-status")).toContainText(
    /согласие/,
  );
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

test("products toolbar adapts to a narrow app container", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await openWidgetWithProduct(page);
  await page.addStyleTag({
    content: ".widget-shell.search-mock { width: 360px !important; }",
  });
  await page.locator("#products-search-input").fill("shampoo");

  const metrics = await page.evaluate(() => {
    const logo = document.querySelector(".search-logo-link");
    const actions = document.querySelector(".toolbar-actions");
    const search = document.querySelector(".search-input-wrap");
    const input = document.getElementById("products-search-input");
    const readBox = (element) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
      };
    };
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      logo: readBox(logo),
      actions: readBox(actions),
      search: readBox(search),
      input: readBox(input),
      inputValue: input instanceof HTMLInputElement ? input.value : "",
    };
  });

  expect(metrics.inputValue).toBe("shampoo");
  expect(metrics.search.top).toBeGreaterThanOrEqual(metrics.actions.bottom + 4);
  expect(metrics.input.width).toBeGreaterThanOrEqual(260);
  expect(metrics.search.left).toBeGreaterThanOrEqual(metrics.logo.left);
  expect(metrics.search.right).toBeLessThanOrEqual(metrics.actions.right);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport);
});

test("products widget mobile shell does not overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openWidgetWithProduct(page);

  const metrics = await page.evaluate(() => {
    const selectors = [
      ".search-toolbar",
      ".search-logo-link",
      ".toolbar-actions",
      ".search-input-wrap",
      ".carousel-frame",
      ".product-card",
    ];
    const boxes = selectors
      .map((selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
          return null;
        }
        const box = element.getBoundingClientRect();
        return {
          selector,
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
        };
      })
      .filter(Boolean);
    const logo = boxes.find((box) => box.selector === ".search-logo-link");
    const search = boxes.find((box) => box.selector === ".search-input-wrap");
    return {
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      boxes,
      searchStartsBelowLogo:
        Boolean(logo && search) && search.top >= logo.bottom + 4,
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.searchStartsBelowLogo).toBeTruthy();
  for (const box of metrics.boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(metrics.viewport);
  }
});

test("products checkout mobile keeps primary controls reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();

  const metrics = await page.evaluate(() => {
    const panel = document.getElementById("products-cart-panel");
    const form = document.getElementById("products-checkout-flow");
    const actions = document.querySelector(".products-checkout-actions");
    const back = document.getElementById("products-checkout-flow-back");
    const next = document.querySelector('[data-checkout-action="next"]');
    const courierCard = document.querySelector(
      '#products-checkout-flow .products-checkout-delivery label:has(input[value="courier"])',
    );
    const readBox = (element) => {
      if (!(element instanceof HTMLElement)) {
        return null;
      }
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    return {
      viewport: window.innerWidth,
      panel: readBox(panel),
      form: readBox(form),
      actions: readBox(actions),
      back: readBox(back),
      next: readBox(next),
      courierCard: readBox(courierCard),
    };
  });

  for (const box of [
    metrics.panel,
    metrics.form,
    metrics.actions,
    metrics.back,
    metrics.next,
    metrics.courierCard,
  ]) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(metrics.viewport);
  }
  expect(Math.abs(metrics.back.top - metrics.next.top)).toBeLessThan(2);
  expect(metrics.back.height).toBeGreaterThanOrEqual(44);
  expect(metrics.next.height).toBeGreaterThanOrEqual(44);
});

test("products checkout review uses Kokiko summary layout and legal links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 720 });
  await openWidgetWithProduct(page);

  await page.locator('[data-action="add-to-cart"]').click();
  await page.locator("#products-cart-button").click();
  await page.locator("#products-cart-checkout").click();
  await page.locator('#products-checkout-flow input[value="pickup"]').check();
  await page.locator('[data-checkout-action="next"]').click();
  await page.locator("#products-checkout-flow-name").fill("Ana Popescu");
  await page.locator("#products-checkout-flow-phone").fill("079 802 000");
  await page.locator("#products-checkout-flow-region").selectOption("2");
  await page.locator("#products-checkout-flow-sector").selectOption("1550");
  await page.locator('[data-checkout-action="next"]').click();

  await expect(page.locator('[data-checkout-step="review"]')).toBeVisible();
  await expect(page.locator(".products-checkout-review-summary")).toBeVisible();
  await expect(page.locator(".products-checkout-review-details")).toBeVisible();
  await expect(page.locator(".products-review-product-image")).toBeVisible();
  await expect(
    page.locator(
      '.products-checkout-consent a[href="https://www.kokiko.md/ru/info/terms"]',
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      '.products-checkout-consent a[href="https://www.kokiko.md/ru/info/policy"]',
    ),
  ).toBeVisible();

  const layout = await page.evaluate(() => {
    const summary = document.querySelector(".products-checkout-review-summary");
    const details = document.querySelector(".products-checkout-review-details");
    const review = document.querySelector(".products-checkout-review");
    const summaryBox = summary?.getBoundingClientRect();
    const detailsBox = details?.getBoundingClientRect();
    return {
      gridColumns: review ? getComputedStyle(review).gridTemplateColumns : "",
      summaryLeft: summaryBox?.left || 0,
      detailsLeft: detailsBox?.left || 0,
      summaryWidth: summaryBox?.width || 0,
      detailsWidth: detailsBox?.width || 0,
    };
  });
  expect(layout.gridColumns.split(" ").length).toBeGreaterThanOrEqual(2);
  expect(layout.detailsLeft).toBeGreaterThan(layout.summaryLeft);
  expect(layout.summaryWidth).toBeGreaterThan(layout.detailsWidth);
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
