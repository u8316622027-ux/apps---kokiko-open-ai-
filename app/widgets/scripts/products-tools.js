(() => {
  const attach = (ctx) => {
    const LAST_SEARCH_QUERY_KEY = "apteka_widget_last_query";
    const { state, dom, constants, utils, theme } = ctx;
    const { input } = dom;
    const { INITIAL_PAYLOAD_WAIT_MS, INITIAL_PAYLOAD_POLL_MS } = constants;
    const {
      normalizeText,
      normalizeLanguage,
      setActiveLanguage,
      getActiveLanguage,
      extractItems,
      mapProduct,
      resolveImageUrl,
      getFallbackImage,
      normalizeCartQuantity,
      writeStoredCart,
      setLoading,
      debugLog,
    } = utils;

    const extractToolPage = (payload) => {
      if (!payload || typeof payload !== "object") {
        return "";
      }
      const widgetNode =
        payload.widget && typeof payload.widget === "object"
          ? payload.widget
          : {};
      const openNode =
        widgetNode.open && typeof widgetNode.open === "object"
          ? widgetNode.open
          : {};
      return (
        normalizeText(openNode.page) ||
        normalizeText(payload.widget_page) ||
        normalizeText(payload.page)
      ).toLowerCase();
    };

    const extractCheckoutStep = (payload) => {
      if (!payload || typeof payload !== "object") {
        return "";
      }
      const step = normalizeText(
        payload.checkout_step || payload.checkoutStep || payload.step,
      ).toLowerCase();
      return ["delivery", "address", "review", "success"].includes(step)
        ? step
        : "";
    };

    const hasSearchResultsPayload = (payload) => {
      if (!payload || typeof payload !== "object") {
        return false;
      }
      return (
        Array.isArray(payload.products) ||
        Array.isArray(payload.results) ||
        Object.prototype.hasOwnProperty.call(payload, "no_results") ||
        Object.prototype.hasOwnProperty.call(payload, "query")
      );
    };

    const extractCartItems = (payload) => {
      if (!payload || typeof payload !== "object") {
        return [];
      }
      const cartNode =
        payload.cart && typeof payload.cart === "object" ? payload.cart : {};
      const candidates = [cartNode.items, payload.cart_items, payload.items];
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          return candidate.filter((item) => item && typeof item === "object");
        }
      }
      return [];
    };

    const hasCartPayload = (payload) => {
      if (!payload || typeof payload !== "object") {
        return false;
      }
      return (
        Boolean(payload.cart && typeof payload.cart === "object") ||
        Array.isArray(payload.cart_items)
      );
    };

    const mapCartItem = (item) => {
      const id = normalizeText(item.id || item.product_id);
      const name = normalizeText(item.name);
      const price = Number(item.price);
      if (!id || !name || !Number.isFinite(price) || price <= 0) {
        return null;
      }
      return {
        id,
        name,
        manufacturer: normalizeText(item.manufacturer),
        price,
        imageUrl:
          resolveImageUrl(item.image_url || item.imageUrl || item.image) ||
          getFallbackImage(),
        productUrl: normalizeText(item.product_url || item.productUrl),
        quantity: normalizeCartQuantity(item.quantity),
      };
    };

    const applyCartPayload = (payload) => {
      if (!hasCartPayload(payload)) {
        return false;
      }
      state.cartItems = extractCartItems(payload)
        .map(mapCartItem)
        .filter(Boolean);
      writeStoredCart();
      return true;
    };

    const parsePayloadText = (value) => {
      const text = normalizeText(value);
      if (!text || !text.startsWith("{")) {
        return null;
      }
      try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (_error) {
        return null;
      }
    };

    const unwrapToolPayload = (candidate) => {
      if (!candidate || typeof candidate !== "object") {
        return null;
      }
      const nestedCandidates = [
        candidate.structuredContent,
        candidate.result?.structuredContent,
        candidate.result,
        candidate.payload?.structuredContent,
        candidate.payload,
        candidate.data?.structuredContent,
        candidate.data,
        candidate,
      ];
      for (const nested of nestedCandidates) {
        if (!nested || typeof nested !== "object") {
          continue;
        }
        if (nested !== candidate) {
          const unwrapped = unwrapToolPayload(nested);
          if (unwrapped) {
            return unwrapped;
          }
        }
        if (Array.isArray(nested.content)) {
          for (const contentItem of nested.content) {
            const parsed = parsePayloadText(contentItem?.text);
            if (parsed) {
              return parsed;
            }
          }
        }
        return nested;
      }
      return null;
    };

    const extractInitialToolPayload = () => {
      const candidates = [
        window.__APTEKA_WIDGET_PAYLOAD__,
        window.__MCP_STRUCTURED_CONTENT__,
        window.__MCP_TOOL_RESULT__,
        window.__OPENAI_TOOL_RESULT__,
        window.__INITIAL_TOOL_RESULT__,
        window.openai?.structuredContent,
        window.openai?.toolResult?.structuredContent,
        window.openai?.toolResult,
        window.openai?.toolOutput?.structuredContent,
        window.openai?.toolOutput,
        window.openai?.lastToolResult?.structuredContent,
        window.openai?.lastToolResult,
      ];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") {
          continue;
        }
        const payload = unwrapToolPayload(candidate);
        if (payload) {
          return payload;
        }
      }
      return null;
    };

    const extractPayloadFromMessage = (rawMessage) => {
      if (!rawMessage || typeof rawMessage !== "object") {
        return null;
      }
      const candidates = [
        rawMessage,
        rawMessage.payload,
        rawMessage.data,
        rawMessage.result,
        rawMessage.result?.structuredContent,
        rawMessage.structuredContent,
      ];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") {
          continue;
        }
        const payload = unwrapToolPayload(candidate);
        if (payload) {
          return payload;
        }
      }
      return null;
    };

    const applyInitialToolPayload = (payload) => {
      if (!payload || typeof payload !== "object") {
        return false;
      }
      if (normalizeText(payload.api_base_url)) {
        state.apiBaseUrl = normalizeText(payload.api_base_url);
      }
      const language = normalizeLanguage(payload.language);
      if (language) {
        state.language = language;
      }
      const requestedPage = extractToolPage(payload);
      if (requestedPage) {
        state.requestedPage = requestedPage;
      }
      theme?.updateFromPayload(payload);
      const cartApplied = applyCartPayload(payload);
      const query = normalizeText(payload.query);
      if (query) {
        try {
          window.localStorage.setItem(LAST_SEARCH_QUERY_KEY, query);
        } catch (_error) {
          // ignore storage write errors
        }
      }
      if (hasSearchResultsPayload(payload)) {
        const mapped = extractItems(payload)
          .map(mapProduct)
          .filter((product) => product.id);
        if (query && input) {
          input.value = query;
        }
        state.products = mapped;
        state.lastQuery = query;
      }
      if (
        cartApplied &&
        (requestedPage === "cart" || requestedPage === "checkout")
      ) {
        state.loadedOnce = true;
        window.setTimeout(() => {
          if (requestedPage === "checkout") {
            ctx.actions.openCart();
            ctx.actions.openCheckout();
            const checkoutStep = extractCheckoutStep(payload);
            if (
              checkoutStep &&
              typeof ctx.actions.setCheckoutStep === "function"
            ) {
              ctx.actions.setCheckoutStep(checkoutStep);
            }
            return;
          }
          ctx.actions.openCart();
        }, 0);
        return true;
      }
      const isSearchPayload =
        hasSearchResultsPayload(payload) ||
        !requestedPage ||
        requestedPage === "search";
      if (isSearchPayload) {
        if (query && input) {
          input.value = query;
        }
        state.lastQuery = query;
        state.loadedOnce = true;
        return true;
      }
      if (cartApplied) {
        state.loadedOnce = true;
        window.setTimeout(() => {
          ctx.actions.openCart();
        }, 0);
        return true;
      }
      state.loadedOnce = true;
      return true;
    };

    const isThemePayload = (payload) => {
      if (!payload || typeof payload !== "object") {
        return false;
      }
      return (
        typeof payload.theme === "string" ||
        typeof payload.language === "string" ||
        typeof payload.theme_mode === "string" ||
        typeof payload.mode === "string" ||
        typeof payload.auto_disabled === "boolean"
      );
    };

    const listenForThemeUpdates = () => {
      if (!theme || typeof theme.updateFromPayload !== "function") {
        return;
      }
      const extractThemePayloadFromGlobals = () => {
        const candidates = [
          window.__APTEKA_WIDGET_PAYLOAD__,
          window.__MCP_STRUCTURED_CONTENT__,
          window.__MCP_TOOL_RESULT__,
          window.__OPENAI_TOOL_RESULT__,
          window.__INITIAL_TOOL_RESULT__,
          window.openai?.structuredContent,
          window.openai?.toolResult?.structuredContent,
          window.openai?.toolResult,
          window.openai?.toolOutput?.structuredContent,
          window.openai?.toolOutput,
          window.openai?.lastToolResult?.structuredContent,
          window.openai?.lastToolResult,
        ];
        for (const candidate of candidates) {
          if (!candidate || typeof candidate !== "object") {
            continue;
          }
          const payloads = [
            candidate,
            candidate.structuredContent,
            candidate.result,
            candidate.result?.structuredContent,
            candidate.payload,
            candidate.data,
          ];
          for (const payload of payloads) {
            if (
              payload &&
              typeof payload === "object" &&
              isThemePayload(payload)
            ) {
              return payload;
            }
          }
        }
        return null;
      };

      const applyPreferencePayload = (payload) => {
        const language = normalizeLanguage(payload.language);
        if (language) {
          const action = normalizeText(payload.action).toLowerCase();
          if (typeof ctx.actions.setLanguage === "function") {
            ctx.actions.setLanguage(language);
          } else {
            setActiveLanguage(language, {
              persist: [
                "open_checkout",
                "set_widget_language",
                "set_widget_theme",
              ].includes(action),
            });
          }
        }
        theme.updateFromPayload(payload);
        ctx.ui.renderProducts();
        ctx.ui.renderCart();
        ctx.ui.renderCheckout();
      };

      const getThemeSignature = (payload) => {
        if (!payload || typeof payload !== "object") {
          return "";
        }
        const themeValue = normalizeText(payload.theme);
        const languageValue = normalizeText(payload.language);
        const modeValue = normalizeText(payload.theme_mode || payload.mode);
        const autoValue =
          typeof payload.auto_disabled === "boolean"
            ? String(payload.auto_disabled)
            : "";
        return [themeValue, languageValue, modeValue, autoValue].join("|");
      };

      const MAX_STABLE_THEME_TICKS = 50;
      let lastThemeSignature = "";
      const pollThemeUpdates = () => {
        const payload = extractThemePayloadFromGlobals();
        if (!payload) {
          return false;
        }
        const signature = getThemeSignature(payload);
        if (!signature || signature === lastThemeSignature) {
          return false;
        }
        lastThemeSignature = signature;
        applyPreferencePayload(payload);
        return true;
      };

      const onMessage = (event) => {
        const messagePayload = extractPayloadFromMessage(event?.data);
        if (!isThemePayload(messagePayload)) {
          return;
        }
        applyPreferencePayload(messagePayload);
      };
      window.addEventListener("message", onMessage, { passive: true });
      let stableTicks = 0;
      const themeIntervalId = window.setInterval(() => {
        const changed = pollThemeUpdates();
        if (changed) {
          stableTicks = 0;
          return;
        }
        stableTicks += 1;
        if (stableTicks >= MAX_STABLE_THEME_TICKS) {
          window.clearInterval(themeIntervalId);
        }
      }, INITIAL_PAYLOAD_POLL_MS);
      pollThemeUpdates();
    };

    const tryHydrateInitialPayload = () => {
      const payload = extractInitialToolPayload();
      if (!payload) {
        return false;
      }
      if (!applyInitialToolPayload(payload)) {
        return false;
      }
      setLoading(false);
      ctx.ui.renderProducts();
      ctx.ui.renderCart();
      return true;
    };

    const waitForInitialPayload = () =>
      new Promise((resolve) => {
        if (tryHydrateInitialPayload()) {
          resolve(true);
          return;
        }

        const onMessage = (event) => {
          const messagePayload = extractPayloadFromMessage(event?.data);
          if (!messagePayload) {
            return;
          }
          if (!applyInitialToolPayload(messagePayload)) {
            return;
          }
          window.clearInterval(intervalId);
          window.clearTimeout(timeoutId);
          window.removeEventListener("message", onMessage);
          setLoading(false);
          ctx.ui.renderProducts();
          ctx.ui.renderCart();
          resolve(true);
        };

        window.addEventListener("message", onMessage, { passive: true });

        const intervalId = window.setInterval(() => {
          if (!tryHydrateInitialPayload()) {
            return;
          }
          window.clearInterval(intervalId);
          window.clearTimeout(timeoutId);
          window.removeEventListener("message", onMessage);
          resolve(true);
        }, INITIAL_PAYLOAD_POLL_MS);

        const timeoutId = window.setTimeout(() => {
          window.clearInterval(intervalId);
          window.removeEventListener("message", onMessage);
          resolve(false);
        }, INITIAL_PAYLOAD_WAIT_MS);
      });

    const searchProducts = async (query) => {
      const normalized = normalizeText(query);
      if (!normalized) {
        return;
      }
      if (state.isSearching) {
        return;
      }

      const language = getActiveLanguage();
      state.language = language;
      state.isSearching = true;
      state.lastQuery = normalized;
      try {
        window.localStorage.setItem(LAST_SEARCH_QUERY_KEY, normalized);
      } catch (_error) {
        // ignore storage write errors
      }
      setLoading(true);

      try {
        if (typeof window.openai?.callTool !== "function") {
          throw new Error("openai.callTool is unavailable");
        }
        const toolResult = await window.openai.callTool("search_products", {
          query: normalized,
          language,
        });
        const payload =
          (toolResult &&
            typeof toolResult === "object" &&
            toolResult.structuredContent) ||
          toolResult ||
          {};
        if (normalizeText(payload.api_base_url)) {
          state.apiBaseUrl = normalizeText(payload.api_base_url);
        }
        const responseLanguage = normalizeLanguage(payload.language);
        if (responseLanguage) {
          state.language = responseLanguage;
        }
        theme?.updateFromPayload(payload);
        state.requestedPage = "search";
        state.products = extractItems(payload)
          .map(mapProduct)
          .filter((product) => product.id);
      } catch (error) {
        debugLog("search_products_error", {
          message: String(error?.message ? error.message : error),
          level: "error",
        });
        state.products = [];
      } finally {
        state.isSearching = false;
        state.loadedOnce = true;
        setLoading(false);
        ctx.ui.renderProducts();
      }
    };

    ctx.actions.searchProducts = searchProducts;
    ctx.tools.waitForInitialPayload = waitForInitialPayload;
    ctx.tools.listenForThemeUpdates = listenForThemeUpdates;
  };

  window.ProductsTools = {
    attach,
  };
})();
