(() => {
  const attach = (ctx) => {
    const { dom } = ctx;
    const { supportButton, supportLayer, supportPopup } = dom;
    const supportCloseButton = document.getElementById(
      "products-support-close",
    );
    if (
      !(supportButton instanceof HTMLElement) ||
      !(supportLayer instanceof HTMLElement) ||
      !(supportPopup instanceof HTMLElement)
    ) {
      return;
    }
    if (supportLayer.parentElement !== document.body) {
      document.body.append(supportLayer);
    }

    const setOpen = (nextState) => {
      const isOpen = Boolean(nextState);
      supportLayer.hidden = !isOpen;
      supportButton.setAttribute("aria-expanded", String(isOpen));
      supportPopup.classList.toggle("is-open", isOpen);
    };

    const toggle = () => setOpen(supportLayer.hidden);

    supportButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    });

    supportPopup.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    if (supportCloseButton instanceof HTMLButtonElement) {
      supportCloseButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      });
    }

    supportLayer.addEventListener("click", (event) => {
      if (event.target === supportLayer) {
        setOpen(false);
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !supportLayer.hidden) {
        setOpen(false);
      }
    });

    ctx.ui.toggleSupportPopup = (nextState) => {
      if (typeof nextState === "boolean") {
        setOpen(nextState);
        return;
      }
      toggle();
    };

    ctx.actions.openSupportPopup = () => {
      setOpen(true);
    };
  };

  window.ProductsSupport = {
    attach,
  };
})();
