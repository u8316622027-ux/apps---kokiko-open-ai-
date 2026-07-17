(() => {
  const attach = (ctx) => {
    const { state, dom, utils } = ctx;
    const {
      track,
      leftArrow,
      rightArrow,
      cartButton,
      cartCount,
      cartLayer,
      cartPanel,
      cartItems,
      cartTotal,
      cartCheckout,
      checkoutForm,
      checkoutName,
      checkoutPhone,
      checkoutCity,
      checkoutAddress,
      checkoutComment,
      checkoutStatus,
      orderSubmit,
    } = dom;
    const {
      normalizeText,
      escapeHtml,
      toMoney,
      computeDiscount,
      getProductPrice,
      writeStoredCart,
      getCartCount,
      getCartTotal,
      getFallbackImage,
      getActiveLanguage,
      debugLog,
    } = utils;

    const getCartCopy = () => {
      const language = getActiveLanguage();
      if (language === "ro") {
        return {
          add: "Cumpără",
          added: "În coș",
          cart: "Coș",
          empty: "Coșul este gol",
          errorAddress: "Introduceți adresa pentru livrare prin curier.",
          errorContact: "Introduceți numele și telefonul.",
          errorItems: "Coșul este gol.",
          errorSubmit: "Comanda nu a putut fi trimisă. Încercați din nou.",
          open: "Coș",
          sending: "Se trimite comanda...",
          success: "Comanda a fost primită",
          total: "Total",
        };
      }
      return {
        add: "Купить",
        added: "В корзине",
        cart: "Корзина",
        empty: "Корзина пуста",
        errorAddress: "Укажите адрес для курьерской доставки.",
        errorContact: "Укажите имя и телефон.",
        errorItems: "Корзина пуста.",
        errorSubmit: "Не удалось отправить заказ. Попробуйте еще раз.",
        open: "Корзина",
        sending: "Отправляем заказ...",
        success: "Заказ принят",
        total: "Итого",
      };
    };

    const updateCarouselControls = () => {
      if (!track || !leftArrow || !rightArrow) {
        return;
      }
      const canScroll = track.scrollWidth > track.clientWidth + 2;
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      leftArrow.disabled = !canScroll || track.scrollLeft <= 2;
      rightArrow.disabled = !canScroll || track.scrollLeft >= maxScroll - 2;
    };

    const findCartItem = (productId) =>
      state.cartItems.find((item) => item.id === productId);

    const findProduct = (productId) =>
      state.products.find((product) => product.id === productId);

    const persistAndRenderCart = () => {
      writeStoredCart();
      renderCart();
      renderProducts();
    };

    const setCartOpen = (nextState) => {
      if (!(cartLayer instanceof HTMLElement)) {
        return;
      }
      const isOpen = Boolean(nextState);
      state.cartOpen = isOpen;
      cartLayer.hidden = !isOpen;
      cartButton?.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        renderCart();
        renderCheckout();
        window.setTimeout(() => {
          if (cartPanel instanceof HTMLElement) {
            cartPanel.focus();
          }
        }, 0);
      }
    };

    const setCheckoutOpen = (nextState) => {
      const isOpen = Boolean(nextState);
      if (isOpen && !state.cartItems.length && !state.orderSubmitted) {
        return;
      }
      if (isOpen) {
        state.orderSubmitted = false;
        setCheckoutStatus("", "");
      } else {
        state.orderSubmitted = false;
      }
      state.checkoutOpen = isOpen;
      renderCheckout();
      if (isOpen) {
        window.setTimeout(() => {
          if (checkoutName instanceof HTMLInputElement) {
            checkoutName.focus();
          }
        }, 0);
      }
    };

    const getDeliveryMethod = () => {
      const selected = document.querySelector(
        'input[name="products-delivery-method"]:checked',
      );
      if (
        selected instanceof HTMLInputElement &&
        selected.value === "courier"
      ) {
        return "courier";
      }
      return "pickup";
    };

    const setCheckoutStatus = (message, tone = "") => {
      if (!(checkoutStatus instanceof HTMLElement)) {
        return;
      }
      checkoutStatus.textContent = normalizeText(message);
      checkoutStatus.dataset.tone = normalizeText(tone);
    };

    const getCheckoutValue = (element) => {
      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      ) {
        return normalizeText(element.value);
      }
      return "";
    };

    const buildOrderPayload = () => ({
      customer_name: getCheckoutValue(checkoutName),
      customer_phone: getCheckoutValue(checkoutPhone),
      delivery_method: getDeliveryMethod(),
      city: getCheckoutValue(checkoutCity) || "Chisinau",
      address: getCheckoutValue(checkoutAddress),
      comment: getCheckoutValue(checkoutComment),
      language: getActiveLanguage(),
      total: getCartTotal(),
      items: state.cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        product_url: item.productUrl,
      })),
    });

    const validateOrderPayload = (payload) => {
      const copy = getCartCopy();
      if (!payload.items.length) {
        return copy.errorItems;
      }
      if (!payload.customer_name || !payload.customer_phone) {
        return copy.errorContact;
      }
      if (payload.delivery_method === "courier" && !payload.address) {
        return copy.errorAddress;
      }
      return "";
    };

    const submitOrder = async () => {
      if (state.isSubmittingOrder) {
        return;
      }
      const payload = buildOrderPayload();
      const validationError = validateOrderPayload(payload);
      if (validationError) {
        setCheckoutStatus(validationError, "error");
        return;
      }
      if (typeof window.openai?.callTool !== "function") {
        setCheckoutStatus(getCartCopy().errorSubmit, "error");
        debugLog("submit_order_unavailable", { level: "warn" });
        return;
      }

      state.isSubmittingOrder = true;
      renderCheckout();
      setCheckoutStatus(getCartCopy().sending, "muted");
      try {
        const toolResult = await window.openai.callTool(
          "submit_order",
          payload,
        );
        const structuredContent =
          (toolResult &&
            typeof toolResult === "object" &&
            toolResult.structuredContent) ||
          toolResult ||
          {};
        const orderId = normalizeText(structuredContent.order_id);
        state.cartItems = [];
        state.orderSubmitted = true;
        state.checkoutOpen = true;
        writeStoredCart();
        renderCart();
        renderProducts();
        setCheckoutStatus(
          orderId
            ? `${getCartCopy().success}: ${orderId}`
            : getCartCopy().success,
          "success",
        );
        debugLog("submit_order_success", { orderId });
      } catch (error) {
        setCheckoutStatus(getCartCopy().errorSubmit, "error");
        debugLog("submit_order_error", {
          message: String(error?.message ? error.message : error),
          level: "error",
        });
      } finally {
        state.isSubmittingOrder = false;
        renderCheckout();
      }
    };

    const addToCart = (productId) => {
      const product = findProduct(normalizeText(productId));
      const price = getProductPrice(product);
      if (!product || typeof price !== "number") {
        debugLog("cart_add_unavailable", { productId });
        return;
      }
      const existing = findCartItem(product.id);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + 1);
      } else {
        state.cartItems.push({
          id: product.id,
          name: product.name,
          manufacturer: product.manufacturer,
          price,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          quantity: 1,
        });
      }
      state.orderSubmitted = false;
      debugLog("cart_add", { productId: product.id });
      persistAndRenderCart();
    };

    const changeCartQuantity = (productId, delta) => {
      const cartItem = findCartItem(normalizeText(productId));
      if (!cartItem) {
        return;
      }
      const nextQuantity = Math.min(
        99,
        Math.max(1, cartItem.quantity + Number(delta || 0)),
      );
      cartItem.quantity = nextQuantity;
      debugLog("cart_quantity_change", {
        productId: cartItem.id,
        quantity: nextQuantity,
      });
      persistAndRenderCart();
    };

    const removeFromCart = (productId) => {
      const normalizedProductId = normalizeText(productId);
      state.cartItems = state.cartItems.filter(
        (item) => item.id !== normalizedProductId,
      );
      debugLog("cart_remove", { productId: normalizedProductId });
      persistAndRenderCart();
    };

    const renderCart = () => {
      const copy = getCartCopy();
      const count = getCartCount();
      const total = getCartTotal();
      if (cartCount instanceof HTMLElement) {
        cartCount.textContent = String(count);
      }
      if (cartButton instanceof HTMLElement) {
        cartButton.classList.toggle("has-items", count > 0);
        cartButton.setAttribute(
          "aria-label",
          `${copy.open}, ${count} ${count === 1 ? "item" : "items"}`,
        );
      }
      if (cartCheckout instanceof HTMLButtonElement) {
        cartCheckout.disabled = count < 1;
      }
      if (cartTotal instanceof HTMLElement) {
        cartTotal.textContent = toMoney(total);
      }
      if (!(cartItems instanceof HTMLElement)) {
        return;
      }
      if (!state.cartItems.length) {
        cartItems.innerHTML = `
          <div class="products-cart-empty" role="status">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <path d="M18 18h30l-3 24H21L18 18z"></path>
              <path d="M25 18a7 7 0 0 1 14 0"></path>
              <path d="M24 48h18"></path>
            </svg>
            <p>${escapeHtml(copy.empty)}</p>
          </div>
        `;
        if (!state.orderSubmitted) {
          state.checkoutOpen = false;
        }
        renderCheckout();
        return;
      }
      cartItems.innerHTML = state.cartItems
        .map((item) => {
          const safeId = escapeHtml(item.id);
          const safeName = escapeHtml(item.name);
          const safeManufacturer = escapeHtml(item.manufacturer);
          const safeImageUrl = escapeHtml(item.imageUrl || getFallbackImage());
          const safeProductUrl = escapeHtml(
            normalizeText(item.productUrl) || "https://www.kokiko.md/",
          );
          return `
            <article class="products-cart-item" data-product-id="${safeId}">
              <a class="products-cart-image-link" href="${safeProductUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open ${safeName}">
                <img
                  class="products-cart-image"
                  src="${safeImageUrl}"
                  alt="${safeName}"
                  loading="lazy"
                  onerror="this.onerror=null;this.src='${escapeHtml(getFallbackImage())}'"
                />
              </a>
              <div class="products-cart-item-body">
                <h3 class="products-cart-item-title">${safeName}</h3>
                <p class="products-cart-item-meta">${safeManufacturer}</p>
                <p class="products-cart-item-price">${toMoney(item.price)}</p>
              </div>
              <div class="products-cart-controls">
                <button class="products-cart-qty-button" type="button" data-action="cart-decrease" data-product-id="${safeId}" aria-label="Decrease quantity">
                  -
                </button>
                <span class="products-cart-qty" aria-label="Quantity">${item.quantity}</span>
                <button class="products-cart-qty-button" type="button" data-action="cart-increase" data-product-id="${safeId}" aria-label="Increase quantity">
                  +
                </button>
                <button class="products-cart-remove" type="button" data-action="cart-remove" data-product-id="${safeId}" aria-label="Remove ${safeName}">
                  ×
                </button>
              </div>
            </article>
          `;
        })
        .join("");
      renderCheckout();
    };

    const renderCheckout = () => {
      if (!(checkoutForm instanceof HTMLElement)) {
        return;
      }
      const shouldShowCheckout = state.checkoutOpen || state.orderSubmitted;
      checkoutForm.hidden = !shouldShowCheckout;
      if (cartCheckout instanceof HTMLButtonElement) {
        cartCheckout.textContent = shouldShowCheckout
          ? getCartCopy().cart
          : "Оформить заказ";
        cartCheckout.disabled =
          state.isSubmittingOrder ||
          (!state.cartItems.length && !state.orderSubmitted);
      }
      if (orderSubmit instanceof HTMLButtonElement) {
        orderSubmit.disabled =
          state.isSubmittingOrder || !state.cartItems.length;
        orderSubmit.textContent = state.isSubmittingOrder
          ? getCartCopy().sending
          : "Отправить заказ";
      }
      const formControls = checkoutForm.querySelectorAll(
        "input, textarea, button",
      );
      for (const control of formControls) {
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLButtonElement
        ) {
          control.disabled =
            state.isSubmittingOrder ||
            (state.orderSubmitted && control.id !== "products-checkout-back");
        }
      }
    };

    const renderProducts = () => {
      if (!track) {
        return;
      }

      if (state.isLoading || !state.loadedOnce) {
        track.innerHTML = `
          <article class="skeleton-card" aria-hidden="true">
            <div class="skeleton-block skeleton-image"></div>
            <div class="skeleton-block skeleton-title"></div>
            <div class="skeleton-block skeleton-title"></div>
            <div class="skeleton-block skeleton-meta"></div>
            <div class="skeleton-block skeleton-price"></div>
            <div class="skeleton-block skeleton-button"></div>
          </article>
          <article class="skeleton-card" aria-hidden="true">
            <div class="skeleton-block skeleton-image"></div>
            <div class="skeleton-block skeleton-title"></div>
            <div class="skeleton-block skeleton-title"></div>
            <div class="skeleton-block skeleton-meta"></div>
            <div class="skeleton-block skeleton-price"></div>
            <div class="skeleton-block skeleton-button"></div>
          </article>
          <article class="skeleton-card" aria-hidden="true">
            <div class="skeleton-block skeleton-image"></div>
            <div class="skeleton-block skeleton-title"></div>
            <div class="skeleton-block skeleton-title"></div>
            <div class="skeleton-block skeleton-meta"></div>
            <div class="skeleton-block skeleton-price"></div>
            <div class="skeleton-block skeleton-button"></div>
          </article>
        `;
        updateCarouselControls();
        return;
      }

      if (!state.products.length) {
        const language = getActiveLanguage();
        const emptyCopy =
          language === "ro"
            ? {
                title: "Produsul nu a fost găsit",
              }
            : {
                title: "Товар не найден",
              };
        track.innerHTML = `
          <article class="product-card product-card--empty" role="status" aria-live="polite">
            <div class="empty-state">
              <div class="empty-state-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <path d="M20 16h18l10 10v22a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z"></path>
                  <path d="M38 16v10h10"></path>
                  <circle cx="28" cy="42" r="6.5"></circle>
                  <path d="M33 46l6 6"></path>
                  <path d="M24 28h12"></path>
                  <path d="M24 32h16"></path>
                </svg>
              </div>
              <h3 class="empty-state-title">${escapeHtml(emptyCopy.title)}</h3>
            </div>
          </article>
        `;
        track.classList.add("product-track--empty");
        updateCarouselControls();
        return;
      }

      track.classList.remove("product-track--empty");
      track.innerHTML = state.products
        .map((product) => {
          const hasBasePrice =
            typeof product.price === "number" && product.price > 0;
          const hasDiscountPrice =
            typeof product.discountPrice === "number" &&
            product.discountPrice > 0;
          const hasDiscount =
            hasBasePrice &&
            hasDiscountPrice &&
            product.discountPrice < product.price;
          const effectivePrice = hasDiscount
            ? product.discountPrice
            : hasBasePrice
              ? product.price
              : null;
          const discount = hasDiscount
            ? computeDiscount(product.price, product.discountPrice)
            : null;
          const discountBadge = discount
            ? `<span class="discount">-${discount}%</span>`
            : "";
          const oldPriceLine = hasDiscount
            ? `<p class="old-price">${toMoney(product.price)} ${discountBadge}</p>`
            : "";
          const inStock = typeof effectivePrice === "number";
          const priceLine = inStock
            ? `<p class="new-price">${toMoney(effectivePrice)}</p>`
            : '<p class="new-price is-unavailable">Нет в наличии</p>';
          const safeImageUrl = escapeHtml(product.imageUrl);
          const safeName = escapeHtml(product.name);
          const safeManufacturer = escapeHtml(product.manufacturer);
          const safeFallbackImage = escapeHtml(getFallbackImage());
          const safeProductId = escapeHtml(product.id);
          const safeProductUrl = escapeHtml(
            normalizeText(product.productUrl) || "https://www.kokiko.md/",
          );
          const copy = getCartCopy();
          const actionButton = inStock
            ? `<div class="product-card-actions">
                <button class="add-to-cart-button" type="button" data-action="add-to-cart" data-product-id="${safeProductId}" aria-label="Add to cart ${safeName}">
                  ${escapeHtml(copy.add)}
                </button>
                <a class="buy-link product-details-link" href="${safeProductUrl}" target="_blank" rel="noopener noreferrer" aria-label="Open product page">
                  <svg class="products-icon products-icon--external" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 4h6v6"></path>
                    <path d="M10 14L20 4"></path>
                    <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"></path>
                  </svg>
                </a>
              </div>`
            : `<button class="add-to-cart-button add-to-cart-button--ghost" type="button" data-action="support-contact" data-product-id="${safeProductId}">Уточнить наличие</button>`;

          return `
            <article class="product-card ${inStock ? "" : "is-unavailable"}" data-product-id="${safeProductId}">
              <img
                class="product-image"
                src="${safeImageUrl}"
                alt="${safeName}"
                loading="lazy"
                onerror="this.onerror=null;this.src='${safeFallbackImage}'"
              />
              <h3 class="product-title">${safeName}</h3>
              <div class="product-manufacturer-row">
                <p class="manufacturer">${safeManufacturer}</p>
              </div>
              <div class="product-price-row">${oldPriceLine}</div>
              ${priceLine}
              ${actionButton}
            </article>
          `;
        })
        .join("");

      const supportButtons = track.querySelectorAll(
        '[data-action="support-contact"]',
      );
      for (const button of supportButtons) {
        if (!(button instanceof HTMLElement)) {
          continue;
        }
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (typeof ctx.actions.openSupportPopup === "function") {
            ctx.actions.openSupportPopup(button);
          }
        });
      }

      const buyLinks = track.querySelectorAll(".buy-link");
      for (const link of buyLinks) {
        if (!(link instanceof HTMLAnchorElement)) {
          continue;
        }
        link.addEventListener("click", () => {
          debugLog("buy_link_click", { url: link.href });
        });
      }

      updateCarouselControls();
    };

    ctx.ui.updateCarouselControls = updateCarouselControls;
    ctx.ui.renderProducts = renderProducts;
    ctx.ui.renderCart = renderCart;
    ctx.ui.renderCheckout = renderCheckout;
    ctx.ui.toggleCart = setCartOpen;
    ctx.ui.toggleCheckout = setCheckoutOpen;
    ctx.actions.addToCart = addToCart;
    ctx.actions.changeCartQuantity = changeCartQuantity;
    ctx.actions.removeFromCart = removeFromCart;
    ctx.actions.openCart = () => setCartOpen(true);
    ctx.actions.closeCart = () => setCartOpen(false);
    ctx.actions.openCheckout = () => setCheckoutOpen(true);
    ctx.actions.closeCheckout = () => setCheckoutOpen(false);
    ctx.actions.submitOrder = submitOrder;
  };

  window.ProductsRender = {
    attach,
  };
})();
