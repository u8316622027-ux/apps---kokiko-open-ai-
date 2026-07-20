(() => {
  const root = document.querySelector("[data-widget-shell]");
  if (!root || typeof window.ProductsState?.createContext !== "function") {
    return;
  }

  const ctx = window.ProductsState.createContext(root);
  window.ProductsRender.attach(ctx);
  if (typeof window.ProductsTheme?.attach === "function") {
    window.ProductsTheme.attach(ctx);
  }
  window.ProductsTools.attach(ctx);
  if (typeof window.ProductsSupport?.attach === "function") {
    window.ProductsSupport.attach(ctx);
  }
  if (typeof ctx.tools?.listenForThemeUpdates === "function") {
    ctx.tools.listenForThemeUpdates();
  }

  const { state, dom, ui, actions, tools, utils } = ctx;
  const {
    input,
    searchButton,
    languageButton,
    themeButton,
    track,
    leftArrow,
    rightArrow,
    cartButton,
    cartLayer,
    cartPanel,
    cartItems,
    cartCheckout,
    checkoutForm,
    checkoutBack,
    checkoutPharmacy,
  } = dom;

  const scrollTrack = (direction) => {
    if (!track) {
      return;
    }
    const firstCard = track.querySelector(".product-card");
    const step =
      firstCard instanceof HTMLElement ? firstCard.offsetWidth + 14 : 280;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
    window.setTimeout(ui.updateCarouselControls, 280);
  };

  leftArrow?.addEventListener("click", () => scrollTrack(-1));
  rightArrow?.addEventListener("click", () => scrollTrack(1));
  track?.addEventListener("scroll", ui.updateCarouselControls, {
    passive: true,
  });
  track?.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest("[data-action]")
        : null;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.dataset.action === "support-contact") {
      event.preventDefault();
      event.stopPropagation();
      actions.openSupportPopup();
    }
    if (target.dataset.action === "add-to-cart") {
      event.preventDefault();
      event.stopPropagation();
      actions.addToCart(target.dataset.productId || "");
    }
  });

  cartButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    actions.openCart();
  });

  cartCheckout?.addEventListener("click", (event) => {
    event.preventDefault();
    if (state.checkoutOpen) {
      actions.closeCheckout();
      return;
    }
    actions.openCheckout();
  });

  checkoutBack?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    actions.previousCheckoutStep();
  });

  checkoutForm?.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest("[data-checkout-action]")
        : null;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    if (target.dataset.checkoutAction === "next") {
      actions.nextCheckoutStep();
      return;
    }
    if (target.dataset.checkoutAction === "back") {
      actions.previousCheckoutStep();
    }
  });

  const collapseCheckoutSelect = (select) => {
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    select.size = 0;
    delete select.dataset.expanded;
  };

  const expandCheckoutSelect = (select) => {
    if (!(select instanceof HTMLSelectElement) || select.options.length < 2) {
      return;
    }
    collapseCheckoutSelect(select);
  };

  checkoutForm?.addEventListener("focusin", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target instanceof HTMLSelectElement) {
      expandCheckoutSelect(target);
    }
  });

  checkoutForm?.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target instanceof HTMLSelectElement) {
      expandCheckoutSelect(target);
    }
  });

  checkoutForm?.addEventListener("focusout", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target instanceof HTMLSelectElement) {
      window.setTimeout(() => collapseCheckoutSelect(target), 120);
    }
  });

  checkoutForm?.addEventListener("keydown", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (
      target instanceof HTMLSelectElement &&
      (event.key === "Escape" || event.key === "Enter")
    ) {
      collapseCheckoutSelect(target);
    }
  });

  checkoutForm?.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (
      target instanceof HTMLInputElement &&
      target.name === "products-delivery-window"
    ) {
      state.checkoutDeliveryWindowIndex = Number(target.value) || 0;
      ui.renderCheckout();
      return;
    }
    if (
      target instanceof HTMLInputElement &&
      target.name === "products-pharmacy-option"
    ) {
      if (checkoutPharmacy instanceof HTMLSelectElement) {
        checkoutPharmacy.value = target.value;
      }
      state.checkoutDeliveryWindowIndex = 0;
    }
    if (
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement &&
        target.name === "products-delivery-method")
    ) {
      state.checkoutDeliveryWindowIndex = 0;
    }
    ui.renderCheckout();
    if (target instanceof HTMLSelectElement) {
      collapseCheckoutSelect(target);
    }
    if (state.checkoutStep === "address") {
      void actions.refreshCheckoutDeliveryData();
    }
  });

  checkoutForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.submitOrder();
  });

  cartPanel?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  cartLayer?.addEventListener("click", (event) => {
    if (event.target === cartLayer) {
      actions.closeCart();
    }
  });

  const cartCloseButton = document.getElementById("products-cart-close");
  cartCloseButton?.addEventListener("click", (event) => {
    event.preventDefault();
    actions.closeCart();
  });

  cartItems?.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest("[data-action]")
        : null;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const productId = target.dataset.productId || "";
    if (target.dataset.action === "cart-increase") {
      event.preventDefault();
      actions.changeCartQuantity(productId, 1);
      return;
    }
    if (target.dataset.action === "cart-decrease") {
      event.preventDefault();
      actions.changeCartQuantity(productId, -1);
      return;
    }
    if (target.dataset.action === "cart-remove") {
      event.preventDefault();
      actions.removeFromCart(productId);
    }
  });

  searchButton?.addEventListener("click", (event) => {
    event.preventDefault();
    actions.searchProducts(
      input instanceof HTMLInputElement ? input.value : "",
    );
  });

  languageButton?.addEventListener("click", (event) => {
    event.preventDefault();
    actions.toggleLanguage();
  });

  themeButton?.addEventListener("click", (event) => {
    event.preventDefault();
    actions.toggleTheme();
  });

  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      actions.searchProducts(input.value);
    }
  });

  window.addEventListener("resize", ui.updateCarouselControls, {
    passive: true,
  });
  window.addEventListener(
    "resize",
    () => {
      for (const select of checkoutForm?.querySelectorAll(
        "select[data-expanded]",
      ) || []) {
        collapseCheckoutSelect(select);
      }
    },
    { passive: true },
  );
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.cartOpen) {
      actions.closeCart();
    }
  });
  if (typeof utils?.setLoading === "function") {
    utils.setLoading(true);
  }
  ui.renderProducts();
  ui.renderCart();
  tools.waitForInitialPayload().then(() => {
    if (!state.loadedOnce) {
      state.loadedOnce = true;
      if (typeof utils?.setLoading === "function") {
        utils.setLoading(false);
      }
      ui.renderProducts();
    }
    ui.renderCart();
    ui.updateCarouselControls();
  });
})();
