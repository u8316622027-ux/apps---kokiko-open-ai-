(() => {
  const createContext = (root) => {
    const INITIAL_PAYLOAD_WAIT_MS = 10000;
    const INITIAL_PAYLOAD_POLL_MS = 140;
    const FALLBACK_IMAGE_PATH = "/assets/images/placeholder-600x600.png";
    const CART_STORAGE_KEY = "kokiko_widget_cart";
    const CART_TOKEN_STORAGE_KEY = "kokiko_widget_cart_token";
    const LANGUAGE_STORAGE_KEY = "kokiko_widget_language";

    const state = {
      loadedOnce: false,
      isSearching: false,
      isLoading: true,
      products: [],
      cartItems: [],
      cartMutationSerial: 0,
      cartOpen: false,
      checkoutOpen: false,
      checkoutStep: "delivery",
      checkoutOpenSelectId: "",
      cartToken: "",
      checkoutLookupsLoaded: false,
      checkoutLookupsLoading: false,
      checkoutRegions: [],
      checkoutPharmacies: [],
      checkoutSectorCache: {},
      checkoutTargetCache: {},
      checkoutPickupCache: {},
      checkoutDeliveryWindows: [],
      checkoutDeliveryWindowIndex: 0,
      isSubmittingOrder: false,
      isReconcilingCart: false,
      orderSubmitted: false,
      lastOrderId: "",
      lastQuery: "",
      apiBaseUrl: "",
      requestedPage: "search",
      language: "",
    };

    const input = document.getElementById("products-search-input");
    const searchButton = document.getElementById("products-search-button");
    const track = document.getElementById("product-track");
    const leftArrow = document.getElementById("products-arrow-left");
    const rightArrow = document.getElementById("products-arrow-right");
    const loadingOverlay = document.getElementById("products-loading-overlay");
    const supportButton = document.getElementById("products-support-button");
    const supportLayer = document.getElementById("products-support-layer");
    const supportPopup = document.getElementById("products-support-popup");
    const languageButton = document.getElementById("products-language-toggle");
    const themeButton = document.getElementById("products-theme-toggle");
    const cartButton = document.getElementById("products-cart-button");
    const cartCount = document.getElementById("products-cart-count");
    const cartLayer = document.getElementById("products-cart-layer");
    const cartPanel = document.getElementById("products-cart-panel");
    const cartItems = document.getElementById("products-cart-items");
    const cartTotal = document.getElementById("products-cart-total");
    const cartCheckout = document.getElementById("products-cart-checkout");
    const checkoutForm = document.getElementById("products-checkout-flow");
    const checkoutName = document.getElementById("products-checkout-flow-name");
    const checkoutCountry = document.getElementById(
      "products-checkout-flow-country",
    );
    const checkoutPhone = document.getElementById(
      "products-checkout-flow-phone",
    );
    const checkoutCity = document.getElementById("products-checkout-flow-city");
    const checkoutAddress = document.getElementById(
      "products-checkout-flow-address",
    );
    const checkoutComment = document.getElementById(
      "products-checkout-flow-comment",
    );
    const checkoutStreet = document.getElementById(
      "products-checkout-flow-street",
    );
    const checkoutBuilding = document.getElementById(
      "products-checkout-flow-building",
    );
    const checkoutApartment = document.getElementById(
      "products-checkout-flow-apartment",
    );
    const checkoutEntrance = document.getElementById(
      "products-checkout-flow-entrance",
    );
    const checkoutFloor = document.getElementById(
      "products-checkout-flow-floor",
    );
    const checkoutIntercom = document.getElementById(
      "products-checkout-flow-intercom",
    );
    const checkoutEmail = document.getElementById(
      "products-checkout-flow-email",
    );
    const checkoutRegion = document.getElementById(
      "products-checkout-flow-region",
    );
    const checkoutSector = document.getElementById(
      "products-checkout-flow-sector",
    );
    const checkoutPharmacy = document.getElementById(
      "products-checkout-flow-pharmacy",
    );
    const checkoutPharmacyOptions = document.getElementById(
      "products-checkout-flow-pharmacy-options",
    );
    const checkoutDeliveryWindows = document.getElementById(
      "products-checkout-flow-delivery-windows",
    );
    const checkoutReview = document.getElementById(
      "products-checkout-flow-review",
    );
    const checkoutConsent = document.getElementById(
      "products-checkout-flow-consent",
    );
    const checkoutStatus = document.getElementById(
      "products-checkout-flow-status",
    );
    const orderSubmit = document.getElementById(
      "products-checkout-flow-submit",
    );
    const checkoutBack = document.getElementById("products-checkout-flow-back");

    const normalizeText = (value) => String(value || "").trim();
    const normalizeLanguage = (value) => {
      const normalized = normalizeText(value).toLowerCase();
      if (normalized.startsWith("ro")) {
        return "ro";
      }
      if (normalized.startsWith("ru")) {
        return "ru";
      }
      return "";
    };
    const readStorageValue = (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch (_error) {
        return null;
      }
    };
    const writeStorageValue = (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch (_error) {
        // ignore storage errors
      }
    };
    const setActiveLanguage = (language, options = {}) => {
      const normalized = normalizeLanguage(language);
      if (!normalized) {
        return "";
      }
      state.language = normalized;
      if (options.persist) {
        writeStorageValue(LANGUAGE_STORAGE_KEY, normalized);
      }
      return normalized;
    };
    setActiveLanguage(readStorageValue(LANGUAGE_STORAGE_KEY));
    const escapeHtml = (value) =>
      String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    const debugLog = (eventName, payload) => {
      const name = normalizeText(eventName) || "event";
      const safePayload = payload && typeof payload === "object" ? payload : {};
      const record = {
        ts: new Date().toISOString(),
        event: name,
        payload: safePayload,
      };
      try {
        const prev = Array.isArray(window.__APTEKA_WIDGET_LOGS__)
          ? window.__APTEKA_WIDGET_LOGS__
          : [];
        const next = prev.concat(record).slice(-250);
        window.__APTEKA_WIDGET_LOGS__ = next;
      } catch (_error) {
        // ignore logging storage errors
      }
      try {
        const level = normalizeText(
          String(safePayload.level || ""),
        ).toLowerCase();
        if (level === "error") {
          console.error("[products-widget]", name, safePayload);
          return;
        }
        if (level === "warn") {
          console.warn("[products-widget]", name, safePayload);
          return;
        }
        console.info("[products-widget]", name, safePayload);
      } catch (_error) {
        // ignore console errors
      }
    };

    const toMoney = (value) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return "";
      }
      return `${value.toFixed(2)} MDL`;
    };

    const computeDiscount = (price, discountPrice) => {
      if (
        typeof price !== "number" ||
        typeof discountPrice !== "number" ||
        Number.isNaN(price) ||
        Number.isNaN(discountPrice) ||
        price <= 0 ||
        discountPrice >= price
      ) {
        return null;
      }
      return Math.max(1, Math.round(((price - discountPrice) / price) * 100));
    };

    const getProductPrice = (product) => {
      if (!product || typeof product !== "object") {
        return null;
      }
      const basePrice =
        typeof product.price === "number" && product.price > 0
          ? product.price
          : null;
      const discountPrice =
        typeof product.discountPrice === "number" && product.discountPrice > 0
          ? product.discountPrice
          : null;
      if (
        basePrice !== null &&
        discountPrice !== null &&
        discountPrice < basePrice
      ) {
        return discountPrice;
      }
      return basePrice;
    };

    const resolveImageUrl = (rawUrl) => {
      const imageUrl = normalizeText(rawUrl);
      if (!imageUrl) {
        return "";
      }
      if (imageUrl.startsWith("data:")) {
        return imageUrl;
      }
      if (/^https?:\/\//i.test(imageUrl)) {
        return imageUrl;
      }
      const baseUrl = normalizeText(state.apiBaseUrl);
      if (!baseUrl) {
        return imageUrl;
      }
      try {
        return new URL(imageUrl, baseUrl).href;
      } catch (_error) {
        return imageUrl;
      }
    };

    const resolveUrl = (rawUrl, fallbackBase) => {
      const value = normalizeText(rawUrl);
      if (!value) {
        return "";
      }
      if (/^https?:\/\//i.test(value)) {
        return value;
      }
      try {
        return new URL(value, fallbackBase).href;
      } catch (_error) {
        return value;
      }
    };

    const resolveHostLocale = () => {
      const candidates = [
        window.openai?.locale,
        window.openai?.user?.locale,
        window.openai?.preferences?.locale,
        window.__OPENAI_LOCALE__,
        document.documentElement?.lang,
        window.navigator?.language,
      ];
      for (const candidate of candidates) {
        const normalized = normalizeText(candidate).toLowerCase();
        if (normalized) {
          return normalized.startsWith("ru") ? "ru" : "ro";
        }
      }
      return "ru";
    };
    const getPreferredLanguage = () => resolveHostLocale();
    const getActiveLanguage = (candidate) =>
      normalizeLanguage(candidate) ||
      normalizeLanguage(state.language) ||
      getPreferredLanguage();

    const getSiteBaseUrl = () => "https://www.kokiko.md";

    const normalizeAptekaHost = (url) => {
      const normalized = normalizeText(url);
      if (!normalized) {
        return "";
      }
      return normalized
        .replace("https://api.apteka.md", "https://www.kokiko.md")
        .replace("http://api.apteka.md", "https://www.kokiko.md")
        .replace("https://www.apteka.md", "https://www.kokiko.md")
        .replace("http://www.apteka.md", "https://www.kokiko.md");
    };

    const buildProductUrl = (rawUrl, slug, language) => {
      const base = getSiteBaseUrl();
      const lang = language === "ro" ? "ro" : "ru";
      const normalizedSlug = normalizeText(slug);
      if (normalizedSlug) {
        return `${base}/${lang}/product/${encodeURIComponent(normalizedSlug)}`;
      }
      const resolved = normalizeAptekaHost(resolveUrl(rawUrl, base));
      if (resolved) {
        return resolved;
      }
      return `${base}/${lang}`;
    };

    const getFallbackImage = () => {
      const baseUrl = normalizeText(state.apiBaseUrl);
      if (!baseUrl) {
        return FALLBACK_IMAGE_PATH;
      }
      try {
        return new URL(FALLBACK_IMAGE_PATH, baseUrl).href;
      } catch (_error) {
        return FALLBACK_IMAGE_PATH;
      }
    };

    const setLoading = (nextValue) => {
      state.isLoading = Boolean(nextValue);
      if (state.isLoading) {
        root.classList.add("is-loading");
        return;
      }
      root.classList.remove("is-loading");
      if (loadingOverlay) {
        loadingOverlay.setAttribute("aria-hidden", "true");
      }
    };

    const extractItems = (payload) => {
      if (Array.isArray(payload?.items)) {
        return payload.items.filter((item) => item && typeof item === "object");
      }
      if (Array.isArray(payload?.results)) {
        return payload.results.filter(
          (item) => item && typeof item === "object",
        );
      }
      if (Array.isArray(payload?.products)) {
        return payload.products.filter(
          (item) => item && typeof item === "object",
        );
      }
      if (Array.isArray(payload?.data?.items)) {
        return payload.data.items.filter(
          (item) => item && typeof item === "object",
        );
      }
      if (Array.isArray(payload?.data?.results)) {
        return payload.data.results.filter(
          (item) => item && typeof item === "object",
        );
      }
      if (Array.isArray(payload?.data?.products)) {
        return payload.data.products.filter(
          (item) => item && typeof item === "object",
        );
      }
      if (Array.isArray(payload)) {
        return payload.filter((item) => item && typeof item === "object");
      }
      return [];
    };

    const mapProduct = (item) => {
      const itemTranslations =
        typeof item.translations === "object" && item.translations
          ? item.translations
          : {};
      const ro =
        typeof itemTranslations.ro === "object" && itemTranslations.ro
          ? itemTranslations.ro
          : {};
      const ru =
        typeof itemTranslations.ru === "object" && itemTranslations.ru
          ? itemTranslations.ru
          : {};
      const preferredLanguage = getActiveLanguage(item.language);
      const fallbackLanguage = preferredLanguage === "ru" ? "ro" : "ru";
      const nameRu = normalizeText(item.name_ru) || normalizeText(ru.name);
      const nameRo = normalizeText(item.name_ro) || normalizeText(ro.name);
      const namePreferred =
        preferredLanguage === "ru" ? nameRu || nameRo : nameRo || nameRu;
      const nameFallback =
        fallbackLanguage === "ru" ? nameRu || nameRo : nameRo || nameRu;
      const name =
        namePreferred || nameFallback || normalizeText(item.name) || "?????";
      const manufacturer =
        normalizeText(item.manufacturer) || "Производитель не указан";

      const priceRaw = item.price;
      const discountRaw = item.discountPrice ?? item.discount_price;
      const price = Number(priceRaw);
      const discountPrice = Number(discountRaw);

      let imageUrl =
        resolveImageUrl(item.image) ||
        resolveImageUrl(item.image_url) ||
        resolveImageUrl(item.imageUrl) ||
        resolveImageUrl(item.picture) ||
        resolveImageUrl(item.photo) ||
        resolveImageUrl(item.thumbnail);

      const extractFromObjects = (value) => {
        if (Array.isArray(value)) {
          for (const row of value) {
            if (typeof row === "string") {
              const fromString = resolveImageUrl(row);
              if (fromString) {
                return fromString;
              }
              continue;
            }
            if (!row || typeof row !== "object") {
              continue;
            }
            const fromObject =
              resolveImageUrl(row.full) ||
              resolveImageUrl(row.preview) ||
              resolveImageUrl(row.url) ||
              resolveImageUrl(row.image) ||
              resolveImageUrl(row.src) ||
              resolveImageUrl(row.path);
            if (fromObject) {
              return fromObject;
            }
          }
        }
        if (value && typeof value === "object") {
          return (
            resolveImageUrl(value.full) ||
            resolveImageUrl(value.preview) ||
            resolveImageUrl(value.url) ||
            resolveImageUrl(value.image) ||
            resolveImageUrl(value.src) ||
            resolveImageUrl(value.path)
          );
        }
        return "";
      };

      if (!imageUrl && typeof item.meta === "object" && item.meta) {
        imageUrl =
          resolveImageUrl(item.meta.image) ||
          resolveImageUrl(item.meta.image_url) ||
          resolveImageUrl(item.meta.thumbnail) ||
          extractFromObjects(item.meta.images);
      }
      if (!imageUrl) {
        imageUrl =
          extractFromObjects(item.images) ||
          extractFromObjects(item.gallery) ||
          extractFromObjects(item.photos) ||
          extractFromObjects(item.media);
      }
      if (!imageUrl) {
        imageUrl = getFallbackImage();
      }

      const productId =
        normalizeText(item.id) ||
        normalizeText(item.product_id) ||
        normalizeText(item.productId) ||
        normalizeText(item.item_id) ||
        normalizeText(item.sku);
      const rawUrl =
        normalizeText(item.product_url) ||
        normalizeText(item.productUrl) ||
        normalizeText(item.url) ||
        normalizeText(item.link) ||
        normalizeText(item.permalink) ||
        normalizeText(item.slug);
      const meta = item.meta && typeof item.meta === "object" ? item.meta : {};
      const metaTranslations =
        meta && typeof meta.translations === "object" && meta.translations
          ? meta.translations
          : {};
      const fallbackLang = preferredLanguage === "ru" ? "ro" : "ru";
      const metaTranslationLang =
        metaTranslations &&
        typeof metaTranslations[preferredLanguage] === "object"
          ? metaTranslations[preferredLanguage]
          : {};
      const metaTranslationFallback =
        metaTranslations && typeof metaTranslations[fallbackLang] === "object"
          ? metaTranslations[fallbackLang]
          : {};
      const translationLang =
        typeof itemTranslations[preferredLanguage] === "object" &&
        itemTranslations[preferredLanguage]
          ? itemTranslations[preferredLanguage]
          : {};
      const translationFallback =
        typeof itemTranslations[fallbackLang] === "object" &&
        itemTranslations[fallbackLang]
          ? itemTranslations[fallbackLang]
          : {};
      const slugRu =
        normalizeText(item.slug_ru) ||
        normalizeText(metaTranslations.ru?.slug) ||
        normalizeText(itemTranslations.ru?.slug);
      const slugRo =
        normalizeText(item.slug_ro) ||
        normalizeText(metaTranslations.ro?.slug) ||
        normalizeText(itemTranslations.ro?.slug);
      const slug =
        (preferredLanguage === "ru" ? slugRu || slugRo : slugRo || slugRu) ||
        normalizeText(metaTranslationLang.slug) ||
        normalizeText(metaTranslationFallback.slug) ||
        normalizeText(translationLang.slug) ||
        normalizeText(translationFallback.slug) ||
        normalizeText(item.slug);
      if (!slug && !rawUrl) {
        debugLog("product_link_missing", {
          productId,
          preferredLanguage,
          metaTranslationKeys: Object.keys(metaTranslations || {}),
          translationKeys: Object.keys(itemTranslations || {}),
        });
      }

      return {
        id: productId,
        name,
        nameRu,
        nameRo,
        manufacturer,
        price: Number.isNaN(price) ? null : price,
        discountPrice: Number.isNaN(discountPrice) ? null : discountPrice,
        imageUrl,
        productSlug: slug,
        productSlugRu: slugRu,
        productSlugRo: slugRo,
        rawUrl,
        productUrl: buildProductUrl(rawUrl, slug, preferredLanguage),
      };
    };

    const normalizeCartQuantity = (value) => {
      const quantity = Number(value);
      if (!Number.isFinite(quantity)) {
        return 1;
      }
      return Math.min(99, Math.max(1, Math.floor(quantity)));
    };

    const sanitizeCartItem = (item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const id = normalizeText(item.id);
      const name = normalizeText(item.name);
      const price = Number(item.price);
      if (!id || !name || !Number.isFinite(price) || price <= 0) {
        return null;
      }
      return {
        id,
        name,
        nameRu: normalizeText(item.nameRu || item.name_ru),
        nameRo: normalizeText(item.nameRo || item.name_ro),
        manufacturer: normalizeText(item.manufacturer),
        price,
        imageUrl: normalizeText(item.imageUrl) || getFallbackImage(),
        productUrl: normalizeText(item.productUrl) || getSiteBaseUrl(),
        rawUrl: normalizeText(item.rawUrl || item.raw_url),
        productSlug: normalizeText(item.productSlug || item.slug),
        productSlugRu: normalizeText(item.productSlugRu || item.slug_ru),
        productSlugRo: normalizeText(item.productSlugRo || item.slug_ro),
        quantity: normalizeCartQuantity(item.quantity),
      };
    };

    const readStoredCart = () => {
      try {
        const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
        const parsed = rawCart ? JSON.parse(rawCart) : [];
        if (!Array.isArray(parsed)) {
          return [];
        }
        return parsed.map(sanitizeCartItem).filter(Boolean);
      } catch (_error) {
        return [];
      }
    };

    const writeStoredCart = () => {
      try {
        window.localStorage.setItem(
          CART_STORAGE_KEY,
          JSON.stringify(state.cartItems),
        );
      } catch (_error) {
        // ignore storage write errors
      }
    };

    const readStoredCartToken = () => {
      try {
        return normalizeText(
          window.localStorage.getItem(CART_TOKEN_STORAGE_KEY),
        );
      } catch (_error) {
        return "";
      }
    };

    const writeStoredCartToken = (token) => {
      try {
        const normalized = normalizeText(token);
        if (normalized) {
          window.localStorage.setItem(CART_TOKEN_STORAGE_KEY, normalized);
        } else {
          window.localStorage.removeItem(CART_TOKEN_STORAGE_KEY);
        }
      } catch (_error) {
        // ignore storage write errors
      }
    };

    const getCartCount = () =>
      state.cartItems.reduce((total, item) => total + item.quantity, 0);

    const getCartTotal = () =>
      state.cartItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );

    state.cartItems = readStoredCart();
    state.cartToken = "";
    writeStoredCartToken("");

    return {
      root,
      state,
      constants: {
        INITIAL_PAYLOAD_WAIT_MS,
        INITIAL_PAYLOAD_POLL_MS,
        CART_STORAGE_KEY,
        CART_TOKEN_STORAGE_KEY,
        LANGUAGE_STORAGE_KEY,
      },
      dom: {
        input,
        searchButton,
        track,
        leftArrow,
        rightArrow,
        loadingOverlay,
        supportButton,
        supportLayer,
        supportPopup,
        languageButton,
        themeButton,
        cartButton,
        cartCount,
        cartLayer,
        cartPanel,
        cartItems,
        cartTotal,
        cartCheckout,
        checkoutForm,
        checkoutName,
        checkoutCountry,
        checkoutPhone,
        checkoutCity,
        checkoutAddress,
        checkoutComment,
        checkoutStreet,
        checkoutBuilding,
        checkoutApartment,
        checkoutEntrance,
        checkoutFloor,
        checkoutIntercom,
        checkoutEmail,
        checkoutRegion,
        checkoutSector,
        checkoutPharmacy,
        checkoutPharmacyOptions,
        checkoutDeliveryWindows,
        checkoutReview,
        checkoutConsent,
        checkoutStatus,
        orderSubmit,
        checkoutBack,
      },
      ui: {
        renderProducts: () => {},
        renderCart: () => {},
        renderCheckout: () => {},
        renderCheckoutPhoneMask: () => {},
        updateCarouselControls: () => {},
        toggleCart: (_nextState) => {},
        toggleCheckout: (_nextState) => {},
        toggleSupportPopup: (_nextState) => {},
      },
      actions: {
        searchProducts: (_query) => Promise.resolve(),
        setLanguage: (_language) => {},
        toggleLanguage: () => {},
        setTheme: (_theme) => {},
        toggleTheme: () => {},
        openSupportPopup: () => {},
        addToCart: (_productId) => {},
        formatCheckoutPhone: () => {},
        changeCartQuantity: (_productId, _delta) => {},
        removeFromCart: (_productId) => {},
        toggleCheckoutSelect: (_selectId) => {},
        chooseCheckoutSelect: (_selectId, _value) => {},
        closeCheckoutSelect: () => {},
        openCart: () => {},
        closeCart: () => {},
        openCheckout: () => {},
        closeCheckout: () => {},
        nextCheckoutStep: () => {},
        previousCheckoutStep: () => {},
        setCheckoutStep: (_step) => {},
        refreshCheckoutDeliveryData: () => Promise.resolve(),
        submitOrder: () => Promise.resolve(),
      },
      tools: {
        waitForInitialPayload: () => Promise.resolve(false),
        ensureCartSession: () => Promise.resolve(),
      },
      utils: {
        normalizeText,
        normalizeLanguage,
        setActiveLanguage,
        escapeHtml,
        debugLog,
        toMoney,
        computeDiscount,
        getProductPrice,
        resolveImageUrl,
        resolveUrl,
        getPreferredLanguage,
        getActiveLanguage,
        buildProductUrl,
        getFallbackImage,
        setLoading,
        extractItems,
        mapProduct,
        normalizeCartQuantity,
        writeStoredCart,
        readStoredCartToken,
        writeStoredCartToken,
        getCartCount,
        getCartTotal,
      },
    };
  };

  window.ProductsState = {
    createContext,
  };
})();
