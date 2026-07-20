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

    const getCheckoutCopy = () => ({
      addressStep: "address",
      deliveryStep: "delivery",
      reviewStep: "review",
      missingConsent: "Подтвердите согласие с условиями.",
      missingDelivery: "Выберите способ доставки.",
      missingStreet: "Укажите улицу и номер дома.",
      next: "Продолжить",
      submit: "Оформить",
    });

    const normalizeCartToolItem = (item) => ({
      id: item.id,
      name: item.name,
      manufacturer: item.manufacturer,
      price: item.price,
      quantity: item.quantity,
      image_url: item.imageUrl,
      product_url: item.productUrl,
    });

    const getCartPayload = () => ({
      token: state.cartToken,
      items: state.cartItems.map(normalizeCartToolItem),
    });

    const applyCartToolResult = (toolResult) => {
      const payload =
        (toolResult &&
          typeof toolResult === "object" &&
          toolResult.structuredContent) ||
        toolResult ||
        {};
      const cart =
        payload.cart && typeof payload.cart === "object" ? payload.cart : {};
      if (normalizeText(cart.token)) {
        state.cartToken = normalizeText(cart.token);
      }
      if (!Array.isArray(cart.items)) {
        return;
      }
      state.cartItems = cart.items
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const id = normalizeText(item.id || item.product_id);
          const name = normalizeText(item.name);
          if (!id || !name) {
            return null;
          }
          const quantity = Math.max(
            1,
            Math.min(99, Number(item.quantity) || 1),
          );
          const price = Number(item.price) || 0;
          return {
            id,
            name,
            manufacturer: normalizeText(item.manufacturer),
            price,
            imageUrl: normalizeText(item.image_url || item.imageUrl),
            productUrl: normalizeText(item.product_url || item.productUrl),
            quantity,
          };
        })
        .filter(Boolean);
      persistAndRenderCart();
    };

    const callCartTool = async (name, args) => {
      if (typeof window.openai?.callTool !== "function") {
        return;
      }
      try {
        const toolResult = await window.openai.callTool(name, args);
        applyCartToolResult(toolResult);
      } catch (error) {
        debugLog("cart_tool_error", {
          tool: name,
          message: String(error?.message ? error.message : error),
          level: "warn",
        });
      }
    };

    const getApiBaseUrl = () =>
      normalizeText(state.apiBaseUrl) || "https://api.apteka.md";

    const buildFrontApiUrl = (path) => {
      const cleanPath = `/${normalizeText(path).replace(/^\/+/, "")}`;
      const baseUrl = getApiBaseUrl();
      if (/\/api\/v1\/front\/?$/i.test(baseUrl)) {
        return `${baseUrl.replace(/\/+$/, "")}${cleanPath}`;
      }
      return `${baseUrl.replace(/\/+$/, "")}/api/v1/front${cleanPath}`;
    };

    const getApiHeaders = () => ({
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
      market: "kokikomd",
      "Accept-Language": getActiveLanguage(),
    });

    const fetchCheckoutJson = async (path) => {
      if (typeof window.fetch !== "function") {
        throw new Error("fetch is unavailable");
      }
      const response = await window.fetch(buildFrontApiUrl(path), {
        method: "GET",
        headers: getApiHeaders(),
      });
      if (!response || !response.ok) {
        throw new Error(`Kokiko checkout request failed: ${path}`);
      }
      return response.json();
    };

    const getTranslatedName = (entity, fallback = "") => {
      if (!entity || typeof entity !== "object") {
        return normalizeText(fallback);
      }
      const language = getActiveLanguage();
      const fallbackLanguage = language === "ru" ? "ro" : "ru";
      const translations =
        entity.translations && typeof entity.translations === "object"
          ? entity.translations
          : {};
      const preferred =
        translations[language] && typeof translations[language] === "object"
          ? translations[language]
          : {};
      const fallbackTranslation =
        translations[fallbackLanguage] &&
        typeof translations[fallbackLanguage] === "object"
          ? translations[fallbackLanguage]
          : {};
      return (
        normalizeText(preferred.name) ||
        normalizeText(fallbackTranslation.name) ||
        normalizeText(entity.name) ||
        normalizeText(fallback)
      );
    };

    const getTranslatedAddress = (entity) => {
      const language = getActiveLanguage();
      const fallbackLanguage = language === "ru" ? "ro" : "ru";
      const translations =
        entity?.translations && typeof entity.translations === "object"
          ? entity.translations
          : {};
      const preferred =
        translations[language] && typeof translations[language] === "object"
          ? translations[language]
          : {};
      const fallbackTranslation =
        translations[fallbackLanguage] &&
        typeof translations[fallbackLanguage] === "object"
          ? translations[fallbackLanguage]
          : {};
      return (
        normalizeText(preferred.address) ||
        normalizeText(fallbackTranslation.address) ||
        normalizeText(entity?.address)
      );
    };

    const scheduleDayLabels = {
      monday: "Понедельник",
      tuesday: "Вторник",
      wednesday: "Среда",
      thursday: "Четверг",
      friday: "Пятница",
      saturday: "Суббота",
      sunday: "Воскресенье",
    };

    const formatScheduleRange = (range) => {
      const from = normalizeText(range?.from);
      const to = normalizeText(range?.to);
      return from && to ? `${from}-${to}` : "";
    };

    const formatPharmacySchedule = (schedule) => {
      if (!schedule || typeof schedule !== "object") {
        return "";
      }
      const weekdayRange = formatScheduleRange(schedule.monday);
      const weekdaysMatch = [
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ].every((day) => formatScheduleRange(schedule[day]) === weekdayRange);
      const parts = [];
      if (weekdayRange && weekdaysMatch) {
        parts.push(`Понедельник-Пятница: ${weekdayRange}`);
      } else {
        for (const day of [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
        ]) {
          const range = formatScheduleRange(schedule[day]);
          if (range) {
            parts.push(`${scheduleDayLabels[day]}: ${range}`);
          }
        }
      }
      for (const day of ["saturday", "sunday"]) {
        const range = formatScheduleRange(schedule[day]);
        if (range) {
          parts.push(`${scheduleDayLabels[day]}: ${range}`);
        }
      }
      return parts.join(" • ");
    };

    const normalizeLookupId = (value) => normalizeText(value);

    const mapRegion = (region) => {
      if (!region || typeof region !== "object") {
        return null;
      }
      const id = normalizeLookupId(region.id);
      const name = getTranslatedName(region, id);
      if (!id || !name) {
        return null;
      }
      return { id, name, raw: region };
    };

    const mapSector = (sector, fallbackRegion) => {
      if (!sector || typeof sector !== "object") {
        return null;
      }
      const id = normalizeLookupId(sector.id);
      const name = getTranslatedName(sector, id);
      if (!id || !name) {
        return null;
      }
      return {
        id,
        name,
        regionId: normalizeLookupId(sector.region?.id || fallbackRegion?.id),
        raw: sector,
      };
    };

    const mapPharmacy = (pharmacy) => {
      if (!pharmacy || typeof pharmacy !== "object") {
        return null;
      }
      const id = normalizeLookupId(pharmacy.id);
      const name = getTranslatedName(pharmacy, id);
      if (!id || !name) {
        return null;
      }
      const address = getTranslatedAddress(pharmacy);
      const sector = mapSector(pharmacy.sector, pharmacy.region);
      const regionName = getTranslatedName(
        pharmacy.region,
        pharmacy.region?.id,
      );
      return {
        id,
        name,
        label: [name, address].filter(Boolean).join(", "),
        address,
        regionId: normalizeLookupId(pharmacy.region?.id),
        regionName,
        sectorId: sector?.id || "",
        sectorName: sector?.name || "",
        scheduleText: formatPharmacySchedule(pharmacy.schedule),
        raw: pharmacy,
      };
    };

    const uniqueById = (items) => {
      const seen = new Set();
      const result = [];
      for (const item of items) {
        if (!item?.id || seen.has(item.id)) {
          continue;
        }
        seen.add(item.id);
        result.push(item);
      }
      return result;
    };

    const getSelectedRegion = () => {
      const selectedId = getCheckoutValue(checkoutRegion);
      return (
        state.checkoutRegions.find((region) => region.id === selectedId) ||
        state.checkoutRegions[0] ||
        null
      );
    };

    const setSelectOptions = (select, options, preferredValue = "") => {
      if (!(select instanceof HTMLSelectElement)) {
        return "";
      }
      const normalizedOptions = options.filter((option) => option?.id);
      const currentValue = normalizeLookupId(preferredValue || select.value);
      const nextValue =
        normalizedOptions.find((option) => option.id === currentValue)?.id ||
        normalizedOptions[0]?.id ||
        "";
      const signature = normalizedOptions
        .map((option) => `${option.id}:${option.name || option.label}`)
        .join("|");
      if (select.dataset.optionsSignature !== signature) {
        select.innerHTML = normalizedOptions
          .map((option) => {
            const label = escapeHtml(option.label || option.name || option.id);
            return `<option value="${escapeHtml(option.id)}">${label}</option>`;
          })
          .join("");
        select.dataset.optionsSignature = signature;
      }
      select.value = nextValue;
      return nextValue;
    };

    const normalizeDeliveryWindows = (payload) => {
      if (!payload || typeof payload !== "object") {
        return [];
      }
      const windows = [];
      if (
        payload.availableWindows &&
        typeof payload.availableWindows === "object"
      ) {
        for (const [date, dayWindows] of Object.entries(
          payload.availableWindows,
        )) {
          if (!Array.isArray(dayWindows)) {
            continue;
          }
          for (const windowItem of dayWindows) {
            if (!windowItem || typeof windowItem !== "object") {
              continue;
            }
            windows.push({
              deliveryDate:
                normalizeText(windowItem.deliveryDate) || normalizeText(date),
              from: normalizeText(windowItem.from),
              to: normalizeText(windowItem.to),
            });
          }
        }
      }
      if (normalizeText(payload.deliveryDate) && normalizeText(payload.from)) {
        windows.push({
          deliveryDate: normalizeText(payload.deliveryDate),
          from: normalizeText(payload.from),
          to: normalizeText(payload.to),
          orderEnd: normalizeText(payload.orderEnd),
          pharmacyClose: normalizeText(payload.pharmacyClose),
        });
      }
      const seen = new Set();
      return windows.filter((windowItem) => {
        if (!windowItem.deliveryDate || !windowItem.from || !windowItem.to) {
          return false;
        }
        const key = `${windowItem.deliveryDate}|${windowItem.from}|${windowItem.to}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    };

    const extractSectors = (payload, fallbackRegion) => {
      const candidates = [];
      if (Array.isArray(payload)) {
        candidates.push(...payload);
      }
      if (Array.isArray(payload?.sectors)) {
        candidates.push(...payload.sectors);
      }
      if (Array.isArray(payload?.data)) {
        candidates.push(...payload.data);
      }
      if (Array.isArray(payload?.data?.sectors)) {
        candidates.push(...payload.data.sectors);
      }
      if (Array.isArray(payload?.items)) {
        candidates.push(...payload.items);
      }
      const sectors = uniqueById(
        candidates
          .map((sector) =>
            mapSector(sector, fallbackRegion?.raw || fallbackRegion),
          )
          .filter(Boolean),
      );
      if (sectors.length) {
        return sectors;
      }
      if (fallbackRegion?.id) {
        return [
          {
            id: fallbackRegion.id,
            name: fallbackRegion.name,
            regionId: fallbackRegion.id,
          },
        ];
      }
      return [];
    };

    const renderDeliveryWindows = () => {
      if (!(checkoutDeliveryWindows instanceof HTMLElement)) {
        return;
      }
      const fieldset = checkoutDeliveryWindows.closest(
        ".products-delivery-window",
      );
      const legend =
        fieldset instanceof HTMLElement
          ? fieldset.querySelector("legend")
          : null;
      if (legend instanceof HTMLElement) {
        legend.textContent =
          getDeliveryMethod() === "pickup"
            ? "Дата доставки:"
            : "Выберите время доставки:";
      }
      const windows = state.checkoutDeliveryWindows || [];
      if (!windows.length) {
        checkoutDeliveryWindows.innerHTML =
          getDeliveryMethod() === "pickup"
            ? '<p class="products-delivery-window-empty">Выберите аптеку, чтобы увидеть время.</p>'
            : '<p class="products-delivery-window-empty">Выберите регион, чтобы увидеть время.</p>';
        return;
      }
      const selectedIndex = Math.min(
        Math.max(Number(state.checkoutDeliveryWindowIndex) || 0, 0),
        windows.length - 1,
      );
      state.checkoutDeliveryWindowIndex = selectedIndex;
      if (getDeliveryMethod() === "pickup") {
        const windowItem = windows[selectedIndex];
        const cancelDate = normalizeText(windowItem.orderEnd);
        const pickupTime =
          normalizeText(windowItem.to) || normalizeText(windowItem.from);
        checkoutDeliveryWindows.innerHTML = `
          <div class="products-pickup-window-card">
            <p><span>Дата доставки:</span><strong>${escapeHtml(windowItem.deliveryDate)} • ${escapeHtml(pickupTime)}</strong></p>
            ${
              cancelDate
                ? `<p><span>Дата аннулирования:</span><strong class="products-pickup-window-card__danger">${escapeHtml(cancelDate)} • ${escapeHtml(pickupTime)}</strong></p>`
                : ""
            }
            <small>Дата и время предварительные. Дождитесь звонка оператора.</small>
          </div>
        `;
        return;
      }
      const groups = new Map();
      windows.forEach((windowItem, index) => {
        const date = normalizeText(windowItem.deliveryDate);
        if (!groups.has(date)) {
          groups.set(date, []);
        }
        groups.get(date).push({ ...windowItem, index });
      });
      checkoutDeliveryWindows.innerHTML = Array.from(groups.entries())
        .map(([date, dayWindows]) => {
          const labels = dayWindows
            .map((windowItem) => {
              const checked =
                windowItem.index === selectedIndex ? "checked" : "";
              const selectedClass =
                windowItem.index === selectedIndex ? " is-selected" : "";
              return `
                <label class="products-delivery-window-slot${selectedClass}">
                  <input type="radio" name="products-delivery-window" value="${windowItem.index}" ${checked} />
                  <span>${escapeHtml(windowItem.from)} - ${escapeHtml(windowItem.to)}</span>
                </label>
              `;
            })
            .join("");
          return `
            <div class="products-delivery-window-day">
              <strong>${escapeHtml(date)}</strong>
              ${labels}
            </div>
          `;
        })
        .join("");
    };

    const renderCourierOptions = () => {
      const selectedRegionId = setSelectOptions(
        checkoutRegion,
        state.checkoutRegions,
        getCheckoutValue(checkoutRegion) || "2",
      );
      const selectedRegion =
        state.checkoutRegions.find(
          (region) => region.id === selectedRegionId,
        ) || getSelectedRegion();
      const targetPayload = selectedRegionId
        ? state.checkoutTargetCache[selectedRegionId]
        : null;
      const sectors =
        state.checkoutSectorCache[selectedRegionId] ||
        extractSectors(targetPayload || {}, selectedRegion);
      setSelectOptions(
        checkoutSector,
        sectors,
        getCheckoutValue(checkoutSector),
      );
      if (targetPayload) {
        state.checkoutDeliveryWindows = normalizeDeliveryWindows(targetPayload);
      } else {
        state.checkoutDeliveryWindows = [];
      }
    };

    const getPickupPharmaciesForRegion = (regionId) =>
      state.checkoutPharmacies.filter(
        (pharmacy) => pharmacy.regionId === normalizeLookupId(regionId),
      );

    const getPickupRegions = () => {
      const regionIds = new Set(
        state.checkoutPharmacies
          .map((pharmacy) => pharmacy.regionId)
          .filter(Boolean),
      );
      const regions = state.checkoutRegions.filter((region) =>
        regionIds.has(region.id),
      );
      const knownRegionIds = new Set(regions.map((region) => region.id));
      const missingRegions = state.checkoutPharmacies
        .filter(
          (pharmacy) =>
            pharmacy.regionId && !knownRegionIds.has(pharmacy.regionId),
        )
        .map((pharmacy) => ({
          id: pharmacy.regionId,
          name: pharmacy.regionName || pharmacy.regionId,
        }));
      return uniqueById([...regions, ...missingRegions]);
    };

    const renderPickupPharmacyCards = (pharmacies, selectedPharmacyId) => {
      if (!(checkoutPharmacyOptions instanceof HTMLElement)) {
        return;
      }
      if (!pharmacies.length) {
        checkoutPharmacyOptions.innerHTML =
          '<p class="products-delivery-window-empty">В выбранном секторе нет аптек.</p>';
        return;
      }
      checkoutPharmacyOptions.innerHTML = pharmacies
        .map((pharmacy) => {
          const checked = pharmacy.id === selectedPharmacyId ? "checked" : "";
          const selectedClass =
            pharmacy.id === selectedPharmacyId ? " is-selected" : "";
          const address = normalizeText(pharmacy.address);
          const schedule = normalizeText(pharmacy.scheduleText);
          return `
            <label class="products-pharmacy-card${selectedClass}">
              <input type="radio" name="products-pharmacy-option" value="${escapeHtml(pharmacy.id)}" ${checked} />
              <span class="products-pharmacy-card__title">${escapeHtml(pharmacy.label || pharmacy.name)}</span>
              ${address ? `<span class="products-pharmacy-card__address">${escapeHtml(address)}</span>` : ""}
              ${schedule ? `<span class="products-pharmacy-card__schedule">${escapeHtml(schedule)}</span>` : ""}
            </label>
          `;
        })
        .join("");
    };

    const renderPickupOptions = () => {
      const pickupRegions = getPickupRegions();
      const selectedRegionId = setSelectOptions(
        checkoutRegion,
        pickupRegions,
        getCheckoutValue(checkoutRegion),
      );
      const pharmaciesForRegion =
        getPickupPharmaciesForRegion(selectedRegionId);
      const sectors = uniqueById(
        pharmaciesForRegion
          .filter((pharmacy) => pharmacy.sectorId)
          .map((pharmacy) => ({
            id: pharmacy.sectorId,
            name: pharmacy.sectorName || pharmacy.regionId,
            regionId: pharmacy.regionId,
          })),
      );
      const selectedSectorId = setSelectOptions(
        checkoutSector,
        sectors,
        getCheckoutValue(checkoutSector),
      );
      const pharmaciesForSector = pharmaciesForRegion.filter(
        (pharmacy) =>
          !selectedSectorId || pharmacy.sectorId === selectedSectorId,
      );
      const selectedPharmacyId = setSelectOptions(
        checkoutPharmacy,
        pharmaciesForSector,
        getCheckoutValue(checkoutPharmacy),
      );
      renderPickupPharmacyCards(pharmaciesForSector, selectedPharmacyId);
      const pickupPayload = selectedPharmacyId
        ? state.checkoutPickupCache[selectedPharmacyId]
        : null;
      if (pickupPayload) {
        state.checkoutDeliveryWindows = normalizeDeliveryWindows(pickupPayload);
      } else {
        state.checkoutDeliveryWindows = [];
      }
    };

    const renderCheckoutDictionaries = () => {
      if (getDeliveryMethod() === "courier") {
        renderCourierOptions();
      } else {
        renderPickupOptions();
      }
      renderDeliveryWindows();
    };

    const ensureCheckoutLookups = async () => {
      if (state.checkoutLookupsLoaded || state.checkoutLookupsLoading) {
        return;
      }
      state.checkoutLookupsLoading = true;
      try {
        const [regionsPayload, pharmaciesPayload] = await Promise.all([
          fetchCheckoutJson("/regions"),
          fetchCheckoutJson("/pharmacies/list"),
        ]);
        state.checkoutRegions = Array.isArray(regionsPayload)
          ? regionsPayload.map(mapRegion).filter(Boolean)
          : [];
        state.checkoutPharmacies = Array.isArray(pharmaciesPayload)
          ? pharmaciesPayload.map(mapPharmacy).filter(Boolean)
          : [];
        state.checkoutLookupsLoaded = true;
        renderCheckoutDictionaries();
      } catch (error) {
        debugLog("checkout_lookup_error", {
          message: String(error?.message ? error.message : error),
          level: "warn",
        });
      } finally {
        state.checkoutLookupsLoading = false;
        renderCheckout();
      }
    };

    const refreshCheckoutDeliveryData = async () => {
      if (!state.checkoutLookupsLoaded) {
        await ensureCheckoutLookups();
        if (!state.checkoutLookupsLoaded) {
          return;
        }
      }
      if (state.checkoutStep !== getCheckoutCopy().addressStep) {
        return;
      }
      try {
        if (getDeliveryMethod() === "courier") {
          const regionId = getCheckoutValue(checkoutRegion) || "2";
          if (regionId) {
            const selectedRegion =
              state.checkoutRegions.find((region) => region.id === regionId) ||
              getSelectedRegion();
            const lookupTasks = [];
            if (!state.checkoutSectorCache[regionId]) {
              lookupTasks.push(
                fetchCheckoutJson(
                  `/cities-by-region/${encodeURIComponent(regionId)}`,
                ).then((payload) => {
                  state.checkoutSectorCache[regionId] = extractSectors(
                    payload,
                    selectedRegion,
                  );
                }),
              );
            }
            if (!state.checkoutTargetCache[regionId]) {
              lookupTasks.push(
                fetchCheckoutJson(
                  `/delivery/calculate/target/${encodeURIComponent(regionId)}`,
                ).then((payload) => {
                  state.checkoutTargetCache[regionId] = payload;
                }),
              );
            }
            await Promise.all(lookupTasks);
          }
        } else {
          renderPickupOptions();
          const pharmacyId = getCheckoutValue(checkoutPharmacy);
          if (pharmacyId && !state.checkoutPickupCache[pharmacyId]) {
            state.checkoutPickupCache[pharmacyId] = await fetchCheckoutJson(
              `/delivery/calculate/pick-up/${encodeURIComponent(pharmacyId)}`,
            );
          }
        }
      } catch (error) {
        debugLog("checkout_delivery_lookup_error", {
          message: String(error?.message ? error.message : error),
          level: "warn",
        });
      } finally {
        renderCheckoutDictionaries();
        renderCheckout();
      }
    };

    const setCartOpen = (nextState) => {
      if (!(cartLayer instanceof HTMLElement)) {
        return;
      }
      const isOpen = Boolean(nextState);
      state.cartOpen = isOpen;
      if (!isOpen) {
        state.checkoutOpen = false;
        state.checkoutStep = getCheckoutCopy().deliveryStep;
      }
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
        state.checkoutStep = getCheckoutCopy().deliveryStep;
        setCheckoutStatus("", "");
      } else {
        state.orderSubmitted = false;
        state.checkoutStep = getCheckoutCopy().deliveryStep;
      }
      state.checkoutOpen = isOpen;
      renderCheckout();
      if (isOpen) {
        void ensureCheckoutLookups();
        window.setTimeout(() => {
          if (checkoutName instanceof HTMLInputElement) {
            checkoutName.focus();
          }
        }, 0);
      }
    };

    const setCheckoutStep = (step) => {
      const copy = getCheckoutCopy();
      const normalized = normalizeText(step);
      if (
        ![copy.deliveryStep, copy.addressStep, copy.reviewStep].includes(
          normalized,
        )
      ) {
        return;
      }
      state.checkoutStep = normalized;
      setCheckoutStatus("", "");
      renderCheckout();
      if (normalized === getCheckoutCopy().addressStep) {
        void refreshCheckoutDeliveryData();
      }
    };

    const nextCheckoutStep = () => {
      const copy = getCheckoutCopy();
      const payload = buildOrderPayload();
      if (state.checkoutStep === copy.deliveryStep) {
        setCheckoutStep(copy.addressStep);
        return;
      }
      if (state.checkoutStep === copy.addressStep) {
        const validationError = validateOrderPayload(payload, {
          includeConsent: false,
        });
        if (validationError) {
          setCheckoutStatus(validationError, "error");
          return;
        }
        setCheckoutStep(copy.reviewStep);
      }
    };

    const previousCheckoutStep = () => {
      const copy = getCheckoutCopy();
      if (state.checkoutStep === copy.reviewStep) {
        setCheckoutStep(copy.addressStep);
        return;
      }
      if (state.checkoutStep === copy.addressStep) {
        setCheckoutStep(copy.deliveryStep);
        return;
      }
      setCheckoutOpen(false);
    };

    const getDeliveryMethod = () => {
      const selected =
        checkoutForm instanceof HTMLElement
          ? checkoutForm.querySelector(
              'input[name="products-delivery-method"]:checked',
            )
          : null;
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
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      ) {
        return normalizeText(element.value);
      }
      return "";
    };

    const getSelectedPaymentMethod = () => {
      const selected =
        checkoutForm instanceof HTMLElement
          ? checkoutForm.querySelector(
              'input[name="products-payment-method"]:checked',
            )
          : null;
      if (selected instanceof HTMLInputElement) {
        return normalizeText(selected.value) || "cash";
      }
      return "cash";
    };

    const getSelectedDeliveryWindow = () => {
      const selected =
        checkoutForm instanceof HTMLElement
          ? checkoutForm.querySelector(
              'input[name="products-delivery-window"]:checked',
            )
          : null;
      if (!(selected instanceof HTMLInputElement) || !selected.value) {
        return null;
      }
      const index = Number(selected.value);
      const windowItem = state.checkoutDeliveryWindows[index];
      if (!windowItem) {
        return null;
      }
      return {
        deliveryDate: windowItem.deliveryDate,
        from: windowItem.from,
        to: windowItem.to,
        date: windowItem.deliveryDate,
        time: `${windowItem.from} - ${windowItem.to}`,
        orderEnd: windowItem.orderEnd,
        pharmacyClose: windowItem.pharmacyClose,
      };
    };

    const composeAddress = () => {
      const explicitAddress = getCheckoutValue(checkoutAddress);
      if (explicitAddress) {
        return explicitAddress;
      }
      const street = getCheckoutValue(checkoutStreet);
      const building = getCheckoutValue(checkoutBuilding);
      return [street, building].filter(Boolean).join(", ");
    };

    const buildOrderPayload = () => ({
      cart_token: state.cartToken,
      customer_name: getCheckoutValue(checkoutName),
      customer_phone: getCheckoutValue(checkoutPhone),
      delivery_method: getDeliveryMethod(),
      city: getCheckoutValue(checkoutCity) || "Chisinau",
      address: composeAddress(),
      street: getCheckoutValue(checkoutStreet),
      building: getCheckoutValue(checkoutBuilding),
      apartment: getCheckoutValue(checkoutApartment),
      entrance: getCheckoutValue(checkoutEntrance),
      floor: getCheckoutValue(checkoutFloor),
      intercom_code: getCheckoutValue(checkoutIntercom),
      email: getCheckoutValue(checkoutEmail),
      region_id: Number(getCheckoutValue(checkoutRegion)) || 2,
      sector_id: Number(getCheckoutValue(checkoutSector)) || 1550,
      pharmacy_id: Number(getCheckoutValue(checkoutPharmacy)) || 36,
      payment_method: getSelectedPaymentMethod(),
      delivery_window:
        getDeliveryMethod() === "courier" ? getSelectedDeliveryWindow() : null,
      comment: getCheckoutValue(checkoutComment),
      language: getActiveLanguage(),
      platform: "web",
      total: getCartTotal(),
      items: state.cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        product_url: item.productUrl,
      })),
    });

    const validateOrderPayload = (payload, options = {}) => {
      const copy = getCartCopy();
      const checkoutCopy = getCheckoutCopy();
      if (!payload.items.length) {
        return copy.errorItems;
      }
      if (!payload.customer_name || !payload.customer_phone) {
        return copy.errorContact;
      }
      if (
        payload.delivery_method === "courier" &&
        (!payload.street || !payload.building)
      ) {
        return checkoutCopy.missingStreet || copy.errorAddress;
      }
      if (
        options.includeConsent !== false &&
        checkoutConsent instanceof HTMLInputElement &&
        !checkoutConsent.checked
      ) {
        return checkoutCopy.missingConsent;
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
        state.cartToken = "";
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
      const previousCart = getCartPayload();
      const productPayload = {
        id: product.id,
        name: product.name,
        manufacturer: product.manufacturer,
        price,
        image_url: product.imageUrl,
        product_url: product.productUrl,
        quantity: 1,
      };
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
      void callCartTool("add_to_cart", {
        cart: previousCart,
        product: productPayload,
        quantity: 1,
        language: getActiveLanguage(),
      });
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
      void callCartTool("update_cart_item", {
        cart: getCartPayload(),
        product_id: cartItem.id,
        quantity: nextQuantity,
        language: getActiveLanguage(),
      });
    };

    const removeFromCart = (productId) => {
      const normalizedProductId = normalizeText(productId);
      state.cartItems = state.cartItems.filter(
        (item) => item.id !== normalizedProductId,
      );
      debugLog("cart_remove", { productId: normalizedProductId });
      persistAndRenderCart();
      void callCartTool("remove_from_cart", {
        cart: getCartPayload(),
        product_id: normalizedProductId,
        language: getActiveLanguage(),
      });
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
      if (cartPanel instanceof HTMLElement) {
        cartPanel.classList.toggle("is-checkout", state.checkoutOpen);
      }
      if (cartItems instanceof HTMLElement) {
        cartItems.hidden = state.checkoutOpen;
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

    const renderCheckoutReview = () => {
      if (!(checkoutReview instanceof HTMLElement)) {
        return;
      }
      const payload = buildOrderPayload();
      const deliveryLabel =
        payload.delivery_method === "courier"
          ? "Курьерская доставка"
          : "Самовывоз";
      const addressLabel =
        payload.delivery_method === "courier"
          ? payload.address || "-"
          : "Магазин косметики КоКиКо, ул. А. Руссо, 1";
      const deliveryWindow = payload.delivery_window
        ? `${payload.delivery_window.date} • ${payload.delivery_window.time}`
        : payload.delivery_method === "pickup"
          ? "Самовывоз из магазина"
          : "-";
      const itemsHtml = state.cartItems
        .map((item) => {
          const lineTotal = toMoney(item.price * item.quantity);
          return `
            <li>
              <span>${escapeHtml(item.name)}</span>
              <strong>${toMoney(item.price)} x ${item.quantity} = ${lineTotal}</strong>
            </li>
          `;
        })
        .join("");
      checkoutReview.innerHTML = `
        <div class="products-checkout-review-card">
          <h4>Список товаров</h4>
          <ul>${itemsHtml}</ul>
          <p><span>Стоимость товаров:</span><strong>${toMoney(getCartTotal())}</strong></p>
          <p><span>Итого к оплате:</span><strong>${toMoney(getCartTotal())}</strong></p>
        </div>
        <div class="products-checkout-review-card">
          <h4>Данные заказа</h4>
          <p><span>Имя:</span><strong>${escapeHtml(payload.customer_name || "-")}</strong></p>
          <p><span>Телефон:</span><strong>${escapeHtml(payload.customer_phone || "-")}</strong></p>
          <p><span>Тип доставки:</span><strong>${escapeHtml(deliveryLabel)}</strong></p>
          <p><span>Адрес доставки:</span><strong>${escapeHtml(addressLabel)}</strong></p>
          <p><span>Дата доставки:</span><strong>${escapeHtml(deliveryWindow)}</strong></p>
          <p><span>Комментарий:</span><strong>${escapeHtml(payload.comment || "-")}</strong></p>
        </div>
      `;
    };

    const renderCheckoutFlow = () => {
      if (!(checkoutForm instanceof HTMLElement)) {
        return;
      }
      const shouldShowCheckout = state.checkoutOpen || state.orderSubmitted;
      checkoutForm.hidden = !shouldShowCheckout;
      if (cartPanel instanceof HTMLElement) {
        cartPanel.classList.toggle("is-checkout", shouldShowCheckout);
      }
      if (cartItems instanceof HTMLElement) {
        cartItems.hidden = shouldShowCheckout;
      }
      if (cartCheckout instanceof HTMLButtonElement) {
        cartCheckout.disabled =
          state.isSubmittingOrder ||
          (!state.cartItems.length && !state.orderSubmitted);
      }
      checkoutForm.dataset.deliveryMethod = getDeliveryMethod();
      if (state.checkoutLookupsLoaded) {
        renderCheckoutDictionaries();
      } else {
        renderDeliveryWindows();
      }
      const steps = checkoutForm.querySelectorAll("[data-checkout-step]");
      for (const step of steps) {
        if (step instanceof HTMLElement) {
          step.hidden = step.dataset.checkoutStep !== state.checkoutStep;
        }
      }
      const indicators = checkoutForm.querySelectorAll("[data-step-indicator]");
      for (const indicator of indicators) {
        if (indicator instanceof HTMLElement) {
          indicator.dataset.state =
            indicator.dataset.stepIndicator === state.checkoutStep
              ? "active"
              : "";
        }
      }
      if (state.checkoutStep === getCheckoutCopy().reviewStep) {
        renderCheckoutReview();
      }

      const nextButton = checkoutForm.querySelector(
        '[data-checkout-action="next"]',
      );
      if (nextButton instanceof HTMLButtonElement) {
        nextButton.hidden = state.checkoutStep === getCheckoutCopy().reviewStep;
        nextButton.disabled = state.isSubmittingOrder;
        nextButton.textContent = getCheckoutCopy().next;
      }
      if (checkoutBack instanceof HTMLButtonElement) {
        checkoutBack.disabled = state.isSubmittingOrder;
      }
      if (orderSubmit instanceof HTMLButtonElement) {
        orderSubmit.hidden =
          state.checkoutStep !== getCheckoutCopy().reviewStep;
        orderSubmit.disabled =
          state.isSubmittingOrder || !state.cartItems.length;
        orderSubmit.textContent = state.isSubmittingOrder
          ? getCartCopy().sending
          : getCheckoutCopy().submit;
      }
      const formControls = checkoutForm.querySelectorAll(
        "input, textarea, select, button",
      );
      for (const control of formControls) {
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLButtonElement
        ) {
          control.disabled =
            state.isSubmittingOrder ||
            (state.orderSubmitted &&
              control.id !== "products-checkout-flow-back");
        }
      }
    };

    const renderCheckout = () => {
      renderCheckoutFlow();
      if (state) {
        return;
      }
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
    ctx.actions.nextCheckoutStep = nextCheckoutStep;
    ctx.actions.previousCheckoutStep = previousCheckoutStep;
    ctx.actions.setCheckoutStep = setCheckoutStep;
    ctx.actions.refreshCheckoutDeliveryData = refreshCheckoutDeliveryData;
    ctx.actions.submitOrder = submitOrder;
  };

  window.ProductsRender = {
    attach,
  };
})();
