(() => {
  const attach = (ctx) => {
    const { state, dom, utils } = ctx;
    const {
      input,
      searchButton,
      track,
      leftArrow,
      rightArrow,
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
    } = dom;
    const {
      normalizeText,
      escapeHtml,
      toMoney,
      computeDiscount,
      getProductPrice,
      writeStoredCart,
      writeStoredCartToken,
      getCartCount,
      getCartTotal,
      getFallbackImage,
      getActiveLanguage,
      normalizeLanguage,
      setActiveLanguage,
      buildProductUrl,
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
        total: "Итого",
      };
    };

    const getUiCopy = () => {
      if (getActiveLanguage() === "ro") {
        return {
          address: "Adresă",
          addressAndTime: "Adresă și timp",
          cancellationDate: "Data anulării:",
          apartment: "Apartament",
          askAvailability: "Verifică disponibilitatea",
          back: "Înapoi",
          building: "Nr. casă*",
          cartClose: "Închide coșul",
          checkout: "Finalizare comandă",
          checkoutTitle: "Finalizarea comenzii",
          comment: "Comentariu",
          courier: "Livrare prin curier",
          courierDescription:
            "Livrarea în Moldova este efectuată de serviciul nostru de curierat.",
          delivery: "Livrare",
          deliveryMethod: "Alegeți metoda de livrare:",
          deliveryTime: "Alegeți timpul livrării:",
          deliveryType: "Tip livrare:",
          email: "Email",
          entrance: "Scară",
          floor: "Etaj",
          intercom: "Cod interfon",
          language: "Schimbă limba",
          lightTheme: "Tema luminoasă",
          name: "Nume*",
          next: "Următorul",
          openProduct: "Deschide pagina produsului",
          paymentReview: "Revizuire și plată",
          noPharmacies: "Nu sunt farmacii în sectorul selectat.",
          paymentMethodCard: "Cu cardul la primire",
          paymentMethodCash: "Numerar",
          paymentMethodCashless: "Transfer bancar",
          paymentMethodMaib: "Cu cardul online",
          paymentMethodMia: "Online prin QR cod",
          paymentMethods: "Alegeți metoda de plată:",
          pharmacy: "Farmacie",
          phone: "Număr de telefon*",
          phoneCountry: "Cod țară",
          phoneCountryMoldova: "Moldova",
          phoneLengthError:
            "Introduceți numărul Moldovei: 8 cifre după +373, de exemplu 79 703 000.",
          phonePrefixError:
            "Introduceți un număr mobil valid din Moldova, de exemplu 79 703 000.",
          pickup: "Ridicare personală",
          pickupDescription: "Livrare gratuită la farmacii în toată țara.",
          pickupFromStore: "Ridicare din farmacie",
          preliminaryNotice:
            "Data și ora sunt preliminare. Așteptați apelul operatorului.",
          privacyConsent:
            "Sunt de acord cu termenii și politica de confidențialitate",
          privacyConsentPrefix: "Sunt de acord cu",
          privacyPolicyLabel: "politica de confidențialitate",
          pickupDate: "Data livrării:",
          region: "Regiune*",
          reviewCustomer: "Datele comenzii",
          reviewItems: "Lista produselor",
          search: "Caută",
          searchPlaceholder: "Caută produse",
          selectPharmacy: "Alegeți farmacia",
          selectRegion: "Alegeți regiunea",
          selectSector: "Alegeți sectorul",
          sector: "Sector*",
          totalPayment: "Total de plată:",
          totalProducts: "Costul produselor:",
          street: "Stradă*",
          submitOrder: "Trimite comanda",
          termsLabel: "termenii",
          darkTheme: "Tema întunecată",
          unavailable: "Nu este în stoc",
        };
      }
      return {
        address: "Адрес",
        addressAndTime: "Адрес и время",
        cancellationDate: "Дата аннулирования:",
        apartment: "Квартира",
        askAvailability: "Уточнить наличие",
        back: "Назад",
        building: "№ дома*",
        cartClose: "Закрыть корзину",
        checkout: "Оформить заказ",
        checkoutTitle: "Оформление заказа",
        comment: "Комментарий",
        courier: "Курьерская доставка",
        courierDescription:
          "Доставка по Молдове осуществляется нашей курьерской службой.",
        delivery: "Доставка",
        deliveryMethod: "Выберите способ доставки:",
        deliveryTime: "Выберите время доставки:",
        deliveryType: "Тип доставки:",
        email: "Email",
        entrance: "Подъезд",
        floor: "Этаж",
        intercom: "Код домофона",
        language: "Сменить язык",
        lightTheme: "Светлая тема",
        name: "Имя*",
        next: "Следующий",
        openProduct: "Открыть страницу товара",
        paymentReview: "Обзор и оплата",
        noPharmacies: "В выбранном секторе нет аптек.",
        paymentMethodCard: "Картой при получении",
        paymentMethodCash: "Наличными",
        paymentMethodCashless: "Перечислением",
        paymentMethodMaib: "Картой онлайн",
        paymentMethodMia: "Онлайн по QR коду",
        paymentMethods: "Выберите способ оплаты:",
        pharmacy: "Аптека",
        phone: "Номер телефона*",
        phoneCountry: "Код страны",
        phoneCountryMoldova: "Молдова",
        phoneLengthError:
          "Введите молдавский номер: 8 цифр после +373, например 79 703 000.",
        phonePrefixError:
          "Введите корректный мобильный номер Молдовы, например 79 703 000.",
        pickup: "Самовывоз",
        pickupDescription: "Бесплатная доставка в аптеки по всей стране.",
        pickupFromStore: "Самовывоз из аптеки",
        preliminaryNotice:
          "Дата и время предварительные. Дождитесь звонка оператора.",
        privacyConsent:
          "Согласен с пользовательским соглашением / политикой конфиденциальности",
        privacyConsentPrefix: "Согласен с",
        privacyPolicyLabel: "политикой конфиденциальности",
        pickupDate: "Дата доставки:",
        region: "Регион*",
        reviewCustomer: "Данные заказа",
        reviewItems: "Список товаров",
        search: "Поиск",
        searchPlaceholder: "Искать по всем категориям",
        selectPharmacy: "Выберите аптеку",
        selectRegion: "Выберите регион",
        selectSector: "Выберите сектор",
        sector: "Сектор*",
        totalPayment: "Итого к оплате:",
        totalProducts: "Стоимость товаров:",
        street: "Улица*",
        submitOrder: "Отправить заказ",
        termsLabel: "пользовательским соглашением",
        darkTheme: "Темная тема",
        unavailable: "Нет в наличии",
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

    const getLocalizedProductName = (item) => {
      const language = getActiveLanguage();
      const preferred =
        language === "ro"
          ? normalizeText(item?.nameRo || item?.name_ro)
          : normalizeText(item?.nameRu || item?.name_ru);
      const fallback =
        language === "ro"
          ? normalizeText(item?.nameRu || item?.name_ru)
          : normalizeText(item?.nameRo || item?.name_ro);
      return preferred || fallback || normalizeText(item?.name) || "";
    };

    const getLocalizedProductUrl = (item) => {
      const language = getActiveLanguage();
      const slug =
        normalizeText(
          language === "ro" ? item?.productSlugRo : item?.productSlugRu,
        ) || normalizeText(item?.productSlug);
      const rawUrl =
        normalizeText(item?.rawUrl) || normalizeText(item?.productUrl);
      return buildProductUrl(rawUrl, slug, language);
    };

    const persistAndRenderCart = () => {
      writeStoredCart();
      renderCart();
      renderProducts();
    };

    const getCheckoutCopy = () => {
      if (getActiveLanguage() === "ro") {
        return {
          addressStep: "address",
          deliveryStep: "delivery",
          reviewStep: "review",
          successStep: "success",
          missingConsent: "Confirmați acordul cu termenii.",
          missingDelivery: "Alegeți metoda de livrare.",
          missingPayment: "Alegeți metoda de plată.",
          missingRequiredFields: "Completați câmpurile obligatorii",
          missingStreet: "Introduceți strada și numărul casei.",
          minOrderTotal: "Suma minimă a comenzii este 30 MDL.",
          next: "Continuă",
          submit: "Finalizează",
          syncing: "Se sincronizează coșul...",
          successTitle: "Comanda a fost plasată!",
          successText: "Vă mulțumim pentru cumpărătură.",
          orderNumberLabel: "Numărul comenzii:",
          continueShopping: "Continuă cumpărăturile",
        };
      }
      return {
        addressStep: "address",
        deliveryStep: "delivery",
        reviewStep: "review",
        successStep: "success",
        missingConsent: "Подтвердите согласие с условиями.",
        missingDelivery: "Выберите способ доставки.",
        missingPayment: "Выберите способ оплаты.",
        missingRequiredFields: "Заполните обязательные поля",
        missingStreet: "Укажите улицу и номер дома.",
        minOrderTotal: "Минимальная сумма заказа 30 MDL.",
        next: "Продолжить",
        submit: "Оформить",
        syncing: "Синхронизируем корзину...",
        successTitle: "Заказ оформлен!",
        successText: "Спасибо за покупку.",
        orderNumberLabel: "Номер заказа:",
        continueShopping: "Продолжить покупки",
      };
    };

    const setLabelText = (control, text) => {
      const label =
        control instanceof HTMLElement ? control.closest("label") : null;
      const labelText =
        label instanceof HTMLElement ? label.querySelector("span") : null;
      if (labelText instanceof HTMLElement) {
        labelText.textContent = text;
      }
    };

    const setDeliveryCardDescription = (control, text) => {
      const label =
        control instanceof HTMLElement ? control.closest("label") : null;
      if (!(label instanceof HTMLElement)) {
        return;
      }
      let description = label.querySelector(
        ".products-checkout-delivery-description",
      );
      if (!(description instanceof HTMLElement)) {
        description = document.createElement("small");
        description.className = "products-checkout-delivery-description";
        label.append(description);
      }
      description.textContent = text;
    };

    const renderStaticCopy = () => {
      const copy = getUiCopy();
      const cartCopy = getCartCopy();
      const language = getActiveLanguage();
      document.documentElement.lang = language;
      if (input instanceof HTMLInputElement) {
        input.placeholder = copy.searchPlaceholder;
      }
      searchButton?.setAttribute("aria-label", copy.search);
      leftArrow?.setAttribute("aria-label", copy.back);
      rightArrow?.setAttribute("aria-label", copy.next);
      const cartTitle = document.getElementById("products-cart-title");
      if (cartTitle instanceof HTMLElement) {
        const showingCheckout = state.checkoutOpen || state.orderSubmitted;
        cartTitle.textContent = showingCheckout
          ? copy.checkoutTitle
          : cartCopy.cart;
      }
      document
        .getElementById("products-cart-close")
        ?.setAttribute("aria-label", copy.cartClose);
      languageButton?.setAttribute("aria-label", copy.language);
      languageButton?.setAttribute("title", copy.language);
      if (languageButton instanceof HTMLElement) {
        languageButton.textContent = language === "ro" ? "RU" : "RO";
      }
      const currentTheme =
        ctx.theme?.getCurrentTheme?.() ||
        document.documentElement.getAttribute("data-theme") ||
        "light";
      const themeLabel =
        currentTheme === "dark" ? copy.lightTheme : copy.darkTheme;
      themeButton?.setAttribute("aria-label", themeLabel);
      themeButton?.setAttribute("title", themeLabel);
      if (themeButton instanceof HTMLElement) {
        themeButton.dataset.themeState = currentTheme;
      }
      const checkoutTitles =
        checkoutForm?.querySelectorAll(".products-checkout-title") || [];
      for (const title of checkoutTitles) {
        if (title instanceof HTMLElement) {
          title.textContent = copy.checkoutTitle;
        }
      }
      checkoutForm
        ?.querySelector('[data-step-indicator="delivery"]')
        ?.replaceChildren(copy.delivery);
      checkoutForm
        ?.querySelector('[data-step-indicator="address"]')
        ?.replaceChildren(copy.addressAndTime);
      checkoutForm
        ?.querySelector('[data-step-indicator="review"]')
        ?.replaceChildren(copy.paymentReview);
      const deliveryLegend = checkoutForm?.querySelector(
        '[data-checkout-step="delivery"] .products-checkout-delivery legend',
      );
      if (deliveryLegend instanceof HTMLElement) {
        deliveryLegend.textContent = copy.deliveryMethod;
      }
      const courierLabel = checkoutForm?.querySelector(
        'input[name="products-delivery-method"][value="courier"] + span',
      );
      const pickupLabel = checkoutForm?.querySelector(
        'input[name="products-delivery-method"][value="pickup"] + span',
      );
      if (courierLabel instanceof HTMLElement) {
        courierLabel.textContent = copy.courier;
        setDeliveryCardDescription(courierLabel, copy.courierDescription);
      }
      if (pickupLabel instanceof HTMLElement) {
        pickupLabel.textContent = copy.pickup;
        setDeliveryCardDescription(pickupLabel, copy.pickupDescription);
      }
      setLabelText(checkoutName, copy.name);
      setLabelText(checkoutPhone, copy.phone);
      if (checkoutCountry instanceof HTMLSelectElement) {
        checkoutCountry.setAttribute("aria-label", copy.phoneCountry);
        const moldovaOption =
          checkoutCountry.querySelector('option[value="MD"]');
        if (moldovaOption instanceof HTMLOptionElement) {
          moldovaOption.textContent = "MD +373";
        }
      }
      renderCheckoutPhoneMask();
      setLabelText(checkoutRegion, copy.region);
      setLabelText(checkoutSector, copy.sector);
      setLabelText(checkoutStreet, copy.street);
      setLabelText(checkoutBuilding, copy.building);
      setLabelText(checkoutApartment, copy.apartment);
      setLabelText(checkoutEntrance, copy.entrance);
      setLabelText(checkoutFloor, copy.floor);
      setLabelText(checkoutIntercom, copy.intercom);
      setLabelText(checkoutPharmacy, copy.pharmacy);
      setLabelText(checkoutEmail, copy.email);
      setLabelText(checkoutComment, copy.comment);
      const paymentLegend = checkoutForm?.querySelector(
        ".products-payment-methods legend",
      );
      if (paymentLegend instanceof HTMLElement) {
        paymentLegend.textContent = copy.paymentMethods;
      }
      const paymentLabels = {
        cash: copy.paymentMethodCash,
        card: copy.paymentMethodCard,
      };
      for (const [value, text] of Object.entries(paymentLabels)) {
        const label = checkoutForm?.querySelector(
          `input[name="products-payment-method"][value="${value}"] + span`,
        );
        if (label instanceof HTMLElement) {
          label.textContent = text;
        }
      }
      const consent = checkoutForm?.querySelector(
        ".products-checkout-consent span",
      );
      if (consent instanceof HTMLElement) {
        consent.innerHTML = `${escapeHtml(
          copy.privacyConsentPrefix,
        )} <a href="https://www.kokiko.md/ru/info/terms" target="_blank" rel="noopener noreferrer">${escapeHtml(
          copy.termsLabel,
        )}</a> / <a href="https://www.kokiko.md/ru/info/policy" target="_blank" rel="noopener noreferrer">${escapeHtml(
          copy.privacyPolicyLabel,
        )}</a>`;
      }
    };

    const normalizeCartToolItem = (item) => ({
      id: item.id,
      name: getLocalizedProductName(item) || item.name,
      name_ru: item.nameRu,
      name_ro: item.nameRo,
      manufacturer: item.manufacturer,
      price: item.price,
      quantity: item.quantity,
      image_url: item.imageUrl,
      product_url: getLocalizedProductUrl(item) || item.productUrl,
      raw_url: item.rawUrl,
      slug_ru: item.productSlugRu,
      slug_ro: item.productSlugRo,
    });

    const getCartPayload = () => ({
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
      if (!Array.isArray(cart.items)) {
        return cart;
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
            nameRu: normalizeText(item.name_ru || item.nameRu),
            nameRo: normalizeText(item.name_ro || item.nameRo),
            manufacturer: normalizeText(item.manufacturer),
            price,
            imageUrl: normalizeText(item.image_url || item.imageUrl),
            productUrl: normalizeText(item.product_url || item.productUrl),
            rawUrl: normalizeText(item.raw_url || item.rawUrl),
            productSlug: normalizeText(item.slug || item.productSlug),
            productSlugRu: normalizeText(item.slug_ru || item.productSlugRu),
            productSlugRo: normalizeText(item.slug_ro || item.productSlugRo),
            quantity,
          };
        })
        .filter(Boolean);
      persistAndRenderCart();
      return cart;
    };

    const nextCartMutationSerial = () => {
      state.cartMutationSerial = Number(state.cartMutationSerial || 0) + 1;
      return state.cartMutationSerial;
    };

    const callCartTool = async (name, args, mutationSerial) => {
      if (typeof window.openai?.callTool !== "function") {
        return undefined;
      }
      try {
        const toolResult = await window.openai.callTool(name, args);
        if (mutationSerial !== state.cartMutationSerial) {
          debugLog("cart_tool_stale_response_ignored", {
            tool: name,
            mutationSerial,
            currentMutationSerial: state.cartMutationSerial,
          });
          return undefined;
        }
        return applyCartToolResult(toolResult);
      } catch (error) {
        debugLog("cart_tool_error", {
          tool: name,
          message: String(error?.message ? error.message : error),
          level: "warn",
        });
        return undefined;
      }
    };

    const ensureCartSession = async () => {
      if (typeof window.openai?.callTool !== "function") {
        return;
      }
      const mutationSerial = nextCartMutationSerial();
      const result = await callCartTool(
        "sync_cart",
        { cart: getCartPayload(), language: getActiveLanguage() },
        mutationSerial,
      );
      if (mutationSerial !== state.cartMutationSerial) {
        return;
      }
      if (
        !result ||
        (result.synced !== true &&
          (!Array.isArray(result.items) || !result.items.length))
      ) {
        state.cartItems = [];
        persistAndRenderCart();
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

    const getCustomSelectParts = (select) => {
      if (!(select instanceof HTMLSelectElement) || !select.id) {
        return { trigger: null, menu: null };
      }
      const trigger = checkoutForm?.querySelector(
        `[data-select-trigger="${select.id}"]`,
      );
      const menu = checkoutForm?.querySelector(
        `[data-select-for="${select.id}"]`,
      );
      return {
        trigger: trigger instanceof HTMLButtonElement ? trigger : null,
        menu: menu instanceof HTMLElement ? menu : null,
      };
    };

    const getCheckoutSelectById = (selectId) => {
      const element = document.getElementById(normalizeText(selectId));
      return element instanceof HTMLSelectElement ? element : null;
    };

    const getSelectOptionLabel = (option) =>
      normalizeText(option?.label) || normalizeText(option?.textContent);

    const getSelectDisplayText = (select) => {
      if (!(select instanceof HTMLSelectElement)) {
        return "";
      }
      const selected = select.selectedOptions[0];
      if (selected?.value) {
        return getSelectOptionLabel(selected);
      }
      const placeholder = Array.from(select.options).find(
        (option) => !option.value,
      );
      return getSelectOptionLabel(placeholder);
    };

    const positionCustomSelectMenu = (select) => {
      const { trigger, menu } = getCustomSelectParts(select);
      if (!trigger || !menu || menu.hidden) {
        return;
      }
      const panel =
        cartPanel instanceof HTMLElement
          ? cartPanel
          : checkoutForm instanceof HTMLElement
            ? checkoutForm
            : null;
      if (!panel) {
        return;
      }
      const panelBox = panel.getBoundingClientRect();
      const triggerBox = trigger.getBoundingClientRect();
      const spaceBelow = Math.max(0, panelBox.bottom - triggerBox.bottom - 8);
      const spaceAbove = Math.max(0, triggerBox.top - panelBox.top - 8);
      const useAbove = spaceBelow < 120 && spaceAbove > spaceBelow;
      const available = useAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(44, Math.min(260, Math.floor(available)));
      menu.dataset.placement = useAbove ? "above" : "below";
      menu.style.setProperty(
        "--products-select-menu-max-height",
        `${maxHeight}px`,
      );
    };

    const renderCustomSelect = (select) => {
      const { trigger, menu } = getCustomSelectParts(select);
      if (!trigger || !menu) {
        return;
      }
      const isOpen = state.checkoutOpenSelectId === select.id;
      const selectedText = getSelectDisplayText(select);
      const label = trigger.querySelector("[data-select-label]");
      if (label instanceof HTMLElement) {
        label.textContent = selectedText;
      }
      trigger.disabled =
        select.disabled ||
        select.dataset.lookupDisabled === "true" ||
        state.isSubmittingOrder ||
        state.orderSubmitted;
      trigger.dataset.placeholder = select.value ? "false" : "true";
      trigger.dataset.invalid =
        select.getAttribute("aria-invalid") === "true" && !trigger.disabled
          ? "true"
          : "false";
      trigger.setAttribute("aria-expanded", String(isOpen));
      trigger.setAttribute("aria-controls", menu.id);
      menu.hidden = !isOpen;
      if (isOpen) {
        const selectedValue = getCheckoutValue(select);
        menu.innerHTML = Array.from(select.options)
          .filter((option) => option.value)
          .map((option) => {
            const labelText = getSelectOptionLabel(option);
            const selected = option.value === selectedValue;
            return `
              <button
                class="products-select-option"
                type="button"
                role="option"
                data-select-option="${escapeHtml(select.id)}"
                data-select-value="${escapeHtml(option.value)}"
                aria-selected="${selected ? "true" : "false"}"
              >${escapeHtml(labelText)}</button>
            `;
          })
          .join("");
        positionCustomSelectMenu(select);
      }
    };

    const renderCustomSelects = () => {
      for (const select of [checkoutRegion, checkoutSector]) {
        renderCustomSelect(select);
      }
    };

    const setSelectOptions = (
      select,
      options,
      preferredValue = "",
      config = {},
    ) => {
      if (!(select instanceof HTMLSelectElement)) {
        return "";
      }
      const placeholder = normalizeText(config.placeholder);
      const autoSelect = config.autoSelect !== false;
      const shouldDisable = Boolean(config.disabled);
      const normalizedOptions = (Array.isArray(options) ? options : []).filter(
        (option) => option?.id,
      );
      const currentValue = normalizeLookupId(preferredValue);
      const nextValue =
        normalizedOptions.find((option) => option.id === currentValue)?.id ||
        (autoSelect ? normalizedOptions[0]?.id : "") ||
        "";
      const signature = [
        placeholder ? `:${placeholder}` : "",
        ...normalizedOptions.map(
          (option) => `${option.id}:${option.name || option.label}`,
        ),
      ].join("|");
      if (select.dataset.optionsSignature !== signature) {
        const placeholderHtml = placeholder
          ? `<option value="">${escapeHtml(placeholder)}</option>`
          : "";
        const optionsHtml = normalizedOptions
          .map((option) => {
            const label = escapeHtml(option.label || option.name || option.id);
            return `<option value="${escapeHtml(option.id)}">${label}</option>`;
          })
          .join("");
        select.innerHTML = `${placeholderHtml}${optionsHtml}`;
        select.dataset.optionsSignature = signature;
      }
      select.value = nextValue;
      if (shouldDisable) {
        select.dataset.lookupDisabled = "true";
      } else {
        delete select.dataset.lookupDisabled;
      }
      renderCustomSelect(select);
      return nextValue;
    };

    const getInitializedSelectValue = (select) => {
      if (!(select instanceof HTMLSelectElement)) {
        return "";
      }
      return select.dataset.optionsSignature ? getCheckoutValue(select) : "";
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
        const copy = getUiCopy();
        legend.textContent =
          getDeliveryMethod() === "pickup"
            ? copy.pickupDate
            : copy.deliveryTime;
      }
      const windows = state.checkoutDeliveryWindows || [];
      if (!windows.length) {
        checkoutDeliveryWindows.innerHTML =
          getDeliveryMethod() === "pickup"
            ? `<p class="products-delivery-window-empty">${escapeHtml(
                getActiveLanguage() === "ro"
                  ? "Alegeți farmacia pentru a vedea ora."
                  : "Выберите аптеку, чтобы увидеть время.",
              )}</p>`
            : `<p class="products-delivery-window-empty">${escapeHtml(
                getActiveLanguage() === "ro"
                  ? "Alegeți regiunea pentru a vedea ora."
                  : "Выберите регион, чтобы увидеть время.",
              )}</p>`;
        return;
      }
      const selectedIndex = Math.min(
        Math.max(Number(state.checkoutDeliveryWindowIndex) || 0, 0),
        windows.length - 1,
      );
      state.checkoutDeliveryWindowIndex = selectedIndex;
      if (getDeliveryMethod() === "pickup") {
        const copy = getUiCopy();
        const windowItem = windows[selectedIndex];
        const cancelDate = normalizeText(windowItem.orderEnd);
        const pickupTime =
          normalizeText(windowItem.to) || normalizeText(windowItem.from);
        checkoutDeliveryWindows.innerHTML = `
          <div class="products-pickup-window-card">
            <p><span>${escapeHtml(copy.pickupDate)}</span><strong>${escapeHtml(windowItem.deliveryDate)} • ${escapeHtml(pickupTime)}</strong></p>
            ${
              cancelDate
                ? `<p><span>${escapeHtml(copy.cancellationDate)}</span><strong class="products-pickup-window-card__danger">${escapeHtml(cancelDate)} • ${escapeHtml(pickupTime)}</strong></p>`
                : ""
            }
            <small>${escapeHtml(copy.preliminaryNotice)}</small>
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
      const copy = getUiCopy();
      const selectedRegionId = setSelectOptions(
        checkoutRegion,
        state.checkoutRegions,
        getInitializedSelectValue(checkoutRegion),
        {
          autoSelect: false,
          disabled: !state.checkoutRegions.length,
          placeholder: copy.selectRegion,
        },
      );
      const selectedRegion =
        state.checkoutRegions.find(
          (region) => region.id === selectedRegionId,
        ) || getSelectedRegion();
      const targetPayload = selectedRegionId
        ? state.checkoutTargetCache[selectedRegionId]
        : null;
      const sectors =
        selectedRegionId && state.checkoutSectorCache[selectedRegionId]
          ? state.checkoutSectorCache[selectedRegionId]
          : selectedRegionId && targetPayload
            ? extractSectors(targetPayload, selectedRegion)
            : [];
      setSelectOptions(
        checkoutSector,
        sectors,
        getInitializedSelectValue(checkoutSector),
        {
          disabled: !selectedRegionId || !sectors.length,
          placeholder: copy.selectSector,
        },
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
        checkoutPharmacyOptions.innerHTML = `<p class="products-delivery-window-empty">${escapeHtml(getUiCopy().noPharmacies)}</p>`;
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
      const copy = getUiCopy();
      const pickupRegions = getPickupRegions();
      const selectedRegionId = setSelectOptions(
        checkoutRegion,
        pickupRegions,
        getInitializedSelectValue(checkoutRegion),
        {
          autoSelect: false,
          disabled: !pickupRegions.length,
          placeholder: copy.selectRegion,
        },
      );
      const pharmaciesForRegion = selectedRegionId
        ? getPickupPharmaciesForRegion(selectedRegionId)
        : [];
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
        getInitializedSelectValue(checkoutSector),
        {
          disabled: !selectedRegionId || !sectors.length,
          placeholder: copy.selectSector,
        },
      );
      const pharmaciesForSector = pharmaciesForRegion.filter(
        (pharmacy) =>
          !selectedSectorId || pharmacy.sectorId === selectedSectorId,
      );
      const selectedPharmacyId = setSelectOptions(
        checkoutPharmacy,
        pharmaciesForSector,
        getInitializedSelectValue(checkoutPharmacy),
        {
          disabled: !selectedRegionId || !pharmaciesForSector.length,
          placeholder: copy.selectPharmacy,
        },
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

    const resetCheckoutLookupsForLanguage = () => {
      state.checkoutLookupsLoaded = false;
      state.checkoutLookupsLoading = false;
      state.checkoutRegions = [];
      state.checkoutPharmacies = [];
      state.checkoutSectorCache = {};
      state.checkoutTargetCache = {};
      state.checkoutPickupCache = {};
      state.checkoutDeliveryWindows = [];
      state.checkoutDeliveryWindowIndex = 0;
      for (const select of [checkoutRegion, checkoutSector, checkoutPharmacy]) {
        if (select instanceof HTMLSelectElement) {
          select.dataset.optionsSignature = "";
          delete select.dataset.lookupDisabled;
        }
      }
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
          const regionId = getCheckoutValue(checkoutRegion);
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

    const setLanguage = (language) => {
      const normalized = setActiveLanguage(language, { persist: true });
      if (!normalized) {
        return;
      }
      resetCheckoutLookupsForLanguage();
      renderStaticCopy();
      renderProducts();
      renderCart();
      renderCheckout();
      if (state.cartOpen && state.checkoutOpen) {
        void ensureCheckoutLookups().then(() => refreshCheckoutDeliveryData());
      }
      if (state.lastQuery && typeof window.openai?.callTool === "function") {
        void ctx.actions.searchProducts(state.lastQuery);
      }
      debugLog("language_applied", { language: normalized });
    };

    const toggleLanguage = () => {
      setLanguage(getActiveLanguage() === "ro" ? "ru" : "ro");
    };

    const setTheme = (theme) => {
      const normalized = normalizeText(theme).toLowerCase();
      if (normalized === "auto") {
        ctx.theme?.setAutoTheme?.();
      } else if (normalized === "dark" || normalized === "light") {
        ctx.theme?.setManualTheme?.(normalized);
      } else {
        return;
      }
      renderStaticCopy();
    };

    const toggleTheme = () => {
      const currentTheme =
        ctx.theme?.getCurrentTheme?.() ||
        document.documentElement.getAttribute("data-theme") ||
        "light";
      setTheme(currentTheme === "dark" ? "light" : "dark");
    };

    const setCheckoutStep = (step) => {
      const copy = getCheckoutCopy();
      const normalized = normalizeText(step);
      if (
        ![
          copy.deliveryStep,
          copy.addressStep,
          copy.reviewStep,
          copy.successStep,
        ].includes(normalized)
      ) {
        return;
      }
      state.checkoutOpenSelectId = "";
      state.checkoutStep = normalized;
      setCheckoutStatus("", "");
      renderCheckout();
      if (normalized === getCheckoutCopy().addressStep) {
        void refreshCheckoutDeliveryData();
      }
    };

    const reconcileCartBeforeReview = async () => {
      const copy = getCheckoutCopy();
      state.isReconcilingCart = true;
      renderCheckout();
      const mutationSerial = nextCartMutationSerial();
      await callCartTool(
        "sync_cart",
        { cart: getCartPayload(), language: getActiveLanguage() },
        mutationSerial,
      );
      state.isReconcilingCart = false;
      setCheckoutStep(copy.reviewStep);
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
          includeReview: false,
        });
        if (validationError) {
          setCheckoutStatus(validationError, "error");
          return;
        }
        void reconcileCartBeforeReview();
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
      if (!normalizeText(message)) {
        clearCheckoutValidation();
      }
    };

    const setCheckoutSelectOpen = (selectId) => {
      const normalized = normalizeText(selectId);
      const select = getCheckoutSelectById(normalized);
      if (
        !select ||
        select.disabled ||
        select.dataset.lookupDisabled === "true" ||
        !select.options.length
      ) {
        state.checkoutOpenSelectId = "";
        renderCustomSelects();
        return;
      }
      state.checkoutOpenSelectId =
        state.checkoutOpenSelectId === normalized ? "" : normalized;
      renderCustomSelects();
      if (state.checkoutOpenSelectId) {
        window.requestAnimationFrame(() => positionCustomSelectMenu(select));
      }
    };

    const closeCheckoutSelect = () => {
      if (!state.checkoutOpenSelectId) {
        return;
      }
      state.checkoutOpenSelectId = "";
      renderCustomSelects();
    };

    const chooseCheckoutSelect = (selectId, value) => {
      const select = getCheckoutSelectById(selectId);
      if (
        !select ||
        select.disabled ||
        select.dataset.lookupDisabled === "true"
      ) {
        return;
      }
      select.value = normalizeText(value);
      state.checkoutOpenSelectId = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      renderCustomSelect(select);
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

    const PHONE_COUNTRIES = {
      MD: {
        code: "MD",
        dialCode: "+373",
        groups: [2, 3, 3],
        nationalLength: 8,
        mobilePattern: /^(6\d|71|7[6-9])\d{6}$/,
        mask: "XX XXX XXX",
      },
    };

    const getSelectedPhoneCountry = () =>
      PHONE_COUNTRIES[getCheckoutValue(checkoutCountry)] || PHONE_COUNTRIES.MD;

    const getDigitsOnly = (value) => normalizeText(value).replace(/\D/g, "");

    const getNationalPhoneDigitsFromValue = (value, country) => {
      const dialDigits = getDigitsOnly(country.dialCode);
      let digits = getDigitsOnly(value);
      if (digits.startsWith(dialDigits)) {
        digits = digits.slice(dialDigits.length);
      }
      if (
        digits.startsWith("0") &&
        digits.length === country.nationalLength + 1
      ) {
        digits = digits.slice(1);
      }
      return digits.slice(0, country.nationalLength);
    };

    const getCheckoutPhoneNationalDigits = () =>
      getNationalPhoneDigitsFromValue(
        getCheckoutValue(checkoutPhone),
        getSelectedPhoneCountry(),
      );

    const formatPhoneDigits = (digits, country) => {
      const groups = [];
      let offset = 0;
      for (const size of country.groups) {
        const part = digits.slice(offset, offset + size);
        if (part) {
          groups.push(part);
        }
        offset += size;
      }
      return groups.join(" ");
    };

    const renderCheckoutPhoneMask = () => {
      const country = getSelectedPhoneCountry();
      if (checkoutPhone instanceof HTMLInputElement) {
        checkoutPhone.placeholder = country.mask;
        checkoutPhone.removeAttribute("maxlength");
      }
    };

    const getPhoneCaretPosition = (formattedValue, digitCount) => {
      if (digitCount <= 0) {
        return 0;
      }
      let seenDigits = 0;
      for (let index = 0; index < formattedValue.length; index += 1) {
        if (/\d/.test(formattedValue[index])) {
          seenDigits += 1;
        }
        if (seenDigits >= digitCount) {
          return index + 1;
        }
      }
      return formattedValue.length;
    };

    const getNationalDigitCaret = (rawValue, caretPosition, country) => {
      const rawCaret =
        typeof caretPosition === "number" && caretPosition >= 0
          ? caretPosition
          : rawValue.length;
      const dialDigits = getDigitsOnly(country.dialCode);
      const allDigits = getDigitsOnly(rawValue);
      let digitsBeforeCaret = getDigitsOnly(rawValue.slice(0, rawCaret)).length;
      if (allDigits.startsWith(dialDigits)) {
        digitsBeforeCaret = Math.max(0, digitsBeforeCaret - dialDigits.length);
      }
      if (
        allDigits.startsWith("0") &&
        allDigits.length === country.nationalLength + 1 &&
        digitsBeforeCaret > 0
      ) {
        digitsBeforeCaret -= 1;
      }
      return Math.max(0, Math.min(country.nationalLength, digitsBeforeCaret));
    };

    const formatCheckoutPhoneInput = (caretPosition = null) => {
      if (!(checkoutPhone instanceof HTMLInputElement)) {
        return "";
      }
      const country = getSelectedPhoneCountry();
      const rawValue = checkoutPhone.value;
      const digitCaret = getNationalDigitCaret(
        rawValue,
        caretPosition,
        country,
      );
      const digits = getNationalPhoneDigitsFromValue(rawValue, country);
      const formattedValue = formatPhoneDigits(digits, country);
      checkoutPhone.value = formattedValue;
      const nextCaret = getPhoneCaretPosition(
        formattedValue,
        Math.min(digitCaret, digits.length),
      );
      checkoutPhone.setSelectionRange(nextCaret, nextCaret);
      renderCheckoutPhoneMask();
      return digits;
    };

    const getFullCheckoutPhone = () => {
      const country = getSelectedPhoneCountry();
      const digits = getCheckoutPhoneNationalDigits();
      if (digits.length !== country.nationalLength) {
        return "";
      }
      return `${country.dialCode}${digits}`;
    };

    const validateCheckoutPhone = () => {
      const country = getSelectedPhoneCountry();
      const copy = getUiCopy();
      const digits = getCheckoutPhoneNationalDigits();
      if (!digits) {
        return "";
      }
      if (digits.length !== country.nationalLength) {
        return copy.phoneLengthError;
      }
      if (
        country.mobilePattern instanceof RegExp &&
        !country.mobilePattern.test(digits)
      ) {
        return copy.phonePrefixError;
      }
      return "";
    };

    const setControlInvalid = (control, invalid) => {
      if (!(control instanceof HTMLElement)) {
        return;
      }
      if (invalid) {
        control.setAttribute("aria-invalid", "true");
      } else {
        control.removeAttribute("aria-invalid");
      }
      if (control instanceof HTMLSelectElement) {
        const { trigger } = getCustomSelectParts(control);
        if (trigger) {
          trigger.dataset.invalid = invalid ? "true" : "false";
        }
      }
    };

    const clearCheckoutValidation = () => {
      for (const control of [
        checkoutName,
        checkoutPhone,
        checkoutRegion,
        checkoutSector,
        checkoutStreet,
        checkoutBuilding,
        checkoutConsent,
      ]) {
        setControlInvalid(control, false);
      }
      const paymentFieldset = checkoutForm?.querySelector(
        ".products-payment-methods",
      );
      if (paymentFieldset instanceof HTMLElement) {
        paymentFieldset.removeAttribute("aria-invalid");
      }
    };

    const getMissingAddressFields = (payload) => {
      const copy = getUiCopy();
      const missing = [];
      if (!payload.customer_name) {
        missing.push({
          control: checkoutName,
          label: copy.name.replace("*", ""),
        });
      }
      if (!getCheckoutPhoneNationalDigits()) {
        missing.push({
          control: checkoutPhone,
          label: copy.phone.replace("*", ""),
        });
      }
      if (!getCheckoutValue(checkoutRegion)) {
        missing.push({
          control: checkoutRegion,
          label: copy.region.replace("*", ""),
        });
      }
      if (!getCheckoutValue(checkoutSector)) {
        missing.push({
          control: checkoutSector,
          label: copy.sector.replace("*", ""),
        });
      }
      if (payload.delivery_method === "courier") {
        if (!payload.street) {
          missing.push({
            control: checkoutStreet,
            label: copy.street.replace("*", ""),
          });
        }
        if (!payload.building) {
          missing.push({
            control: checkoutBuilding,
            label: copy.building.replace("*", ""),
          });
        }
      }
      return missing;
    };

    const getSelectedPaymentControl = () =>
      checkoutForm instanceof HTMLElement
        ? checkoutForm.querySelector(
            'input[name="products-payment-method"]:checked',
          )
        : null;

    const getSelectedPaymentMethod = () => {
      const selected = getSelectedPaymentControl();
      if (selected instanceof HTMLInputElement) {
        return normalizeText(selected.value);
      }
      return "";
    };

    const clearCheckoutControlValidation = (control) => {
      if (!(control instanceof HTMLElement)) {
        return;
      }
      let isValidNow = false;
      if (control === checkoutPhone) {
        isValidNow = Boolean(
          getCheckoutPhoneNationalDigits() &&
            getFullCheckoutPhone() &&
            !validateCheckoutPhone(),
        );
      } else if (control instanceof HTMLSelectElement) {
        isValidNow = Boolean(getCheckoutValue(control));
      } else if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement
      ) {
        if (control.type === "checkbox" || control.type === "radio") {
          isValidNow = control.checked;
        } else {
          isValidNow = Boolean(getCheckoutValue(control));
        }
      }
      if (isValidNow) {
        setControlInvalid(control, false);
      }
      if (
        control instanceof HTMLInputElement &&
        control.name === "products-payment-method" &&
        getSelectedPaymentMethod()
      ) {
        const paymentFieldset = checkoutForm?.querySelector(
          ".products-payment-methods",
        );
        if (paymentFieldset instanceof HTMLElement) {
          paymentFieldset.removeAttribute("aria-invalid");
        }
      }
      renderCustomSelects();
      const invalidControl = checkoutForm?.querySelector(
        '[aria-invalid="true"], .products-payment-methods[aria-invalid="true"]',
      );
      if (!invalidControl && checkoutStatus?.dataset.tone === "error") {
        setCheckoutStatus("", "");
      }
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
      customer_name: getCheckoutValue(checkoutName),
      customer_phone: getFullCheckoutPhone(),
      customer_phone_country: getSelectedPhoneCountry().code,
      customer_phone_national: getCheckoutPhoneNationalDigits(),
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
        name: getLocalizedProductName(item) || item.name,
        price: item.price,
        quantity: item.quantity,
        product_url: getLocalizedProductUrl(item) || item.productUrl,
      })),
    });

    const validateOrderPayload = (payload, options = {}) => {
      const copy = getCartCopy();
      const checkoutCopy = getCheckoutCopy();
      clearCheckoutValidation();
      if (!payload.items.length) {
        return copy.errorItems;
      }
      const missingFields = getMissingAddressFields(payload);
      if (missingFields.length) {
        for (const field of missingFields) {
          setControlInvalid(field.control, true);
        }
        renderCustomSelects();
        return `${checkoutCopy.missingRequiredFields}: ${missingFields
          .map((field) => field.label)
          .join(", ")}.`;
      }
      const phoneError = validateCheckoutPhone();
      if (phoneError) {
        setControlInvalid(checkoutPhone, true);
        return phoneError;
      }
      if (options.includeReview !== false && getCartTotal() < 30) {
        return checkoutCopy.minOrderTotal;
      }
      if (options.includeReview !== false && !getSelectedPaymentMethod()) {
        const paymentFieldset = checkoutForm?.querySelector(
          ".products-payment-methods",
        );
        if (paymentFieldset instanceof HTMLElement) {
          paymentFieldset.setAttribute("aria-invalid", "true");
        }
        return checkoutCopy.missingPayment;
      }
      if (
        options.includeReview !== false &&
        options.includeConsent !== false &&
        checkoutConsent instanceof HTMLInputElement &&
        !checkoutConsent.checked
      ) {
        setControlInvalid(checkoutConsent, true);
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
        state.lastOrderId = orderId;
        writeStoredCart();
        writeStoredCartToken("");
        renderCart();
        renderProducts();
        setCheckoutStep(getCheckoutCopy().successStep);
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
        name: getLocalizedProductName(product),
        name_ru: product.nameRu,
        name_ro: product.nameRo,
        manufacturer: product.manufacturer,
        price,
        image_url: product.imageUrl,
        product_url: getLocalizedProductUrl(product),
        raw_url: product.rawUrl,
        slug_ru: product.productSlugRu,
        slug_ro: product.productSlugRo,
        quantity: 1,
      };
      const existing = findCartItem(product.id);
      if (existing) {
        existing.quantity = Math.min(99, existing.quantity + 1);
        existing.name = getLocalizedProductName(product);
        existing.nameRu = product.nameRu;
        existing.nameRo = product.nameRo;
        existing.productUrl = getLocalizedProductUrl(product);
        existing.rawUrl = product.rawUrl;
        existing.productSlugRu = product.productSlugRu;
        existing.productSlugRo = product.productSlugRo;
      } else {
        state.cartItems.push({
          id: product.id,
          name: getLocalizedProductName(product),
          nameRu: product.nameRu,
          nameRo: product.nameRo,
          manufacturer: product.manufacturer,
          price,
          imageUrl: product.imageUrl,
          productUrl: getLocalizedProductUrl(product),
          rawUrl: product.rawUrl,
          productSlug: product.productSlug,
          productSlugRu: product.productSlugRu,
          productSlugRo: product.productSlugRo,
          quantity: 1,
        });
      }
      state.orderSubmitted = false;
      debugLog("cart_add", { productId: product.id });
      persistAndRenderCart();
      const mutationSerial = nextCartMutationSerial();
      void callCartTool(
        "add_to_cart",
        {
          cart: previousCart,
          product: productPayload,
          quantity: 1,
          language: getActiveLanguage(),
        },
        mutationSerial,
      );
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
      const mutationSerial = nextCartMutationSerial();
      void callCartTool(
        "update_cart_item",
        {
          cart: getCartPayload(),
          product_id: cartItem.id,
          quantity: nextQuantity,
          language: getActiveLanguage(),
        },
        mutationSerial,
      );
    };

    const removeFromCart = (productId) => {
      const normalizedProductId = normalizeText(productId);
      state.cartItems = state.cartItems.filter(
        (item) => item.id !== normalizedProductId,
      );
      debugLog("cart_remove", { productId: normalizedProductId });
      persistAndRenderCart();
      const mutationSerial = nextCartMutationSerial();
      void callCartTool(
        "remove_from_cart",
        {
          cart: getCartPayload(),
          product_id: normalizedProductId,
          language: getActiveLanguage(),
        },
        mutationSerial,
      );
    };

    const renderCart = () => {
      renderStaticCopy();
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
          const itemName = getLocalizedProductName(item) || item.name;
          const safeName = escapeHtml(itemName);
          const safeManufacturer = escapeHtml(item.manufacturer);
          const safeImageUrl = escapeHtml(item.imageUrl || getFallbackImage());
          const safeProductUrl = escapeHtml(
            getLocalizedProductUrl(item) || "https://www.kokiko.md/",
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
      const copy = getUiCopy();
      const payload = buildOrderPayload();
      const deliveryLabel =
        payload.delivery_method === "courier" ? copy.courier : copy.pickup;
      const selectedPharmacy = state.checkoutPharmacies.find(
        (pharmacy) => Number(pharmacy.id) === Number(payload.pharmacy_id),
      );
      const addressLabel =
        payload.delivery_method === "courier"
          ? payload.address || "-"
          : selectedPharmacy?.label || copy.pickupFromStore;
      const deliveryWindow = payload.delivery_window
        ? `${payload.delivery_window.date} • ${payload.delivery_window.time}`
        : payload.delivery_method === "pickup"
          ? copy.pickupFromStore
          : "-";
      const pickupWindow =
        payload.delivery_method === "pickup"
          ? state.checkoutDeliveryWindows[
              Math.min(
                Math.max(Number(state.checkoutDeliveryWindowIndex) || 0, 0),
                Math.max(state.checkoutDeliveryWindows.length - 1, 0),
              )
            ]
          : null;
      const deliveryWindowSource = payload.delivery_window || pickupWindow;
      const reviewDeliveryWindow = deliveryWindowSource
        ? `${deliveryWindowSource.date || deliveryWindowSource.deliveryDate || ""} • ${
            deliveryWindowSource.time ||
            [deliveryWindowSource.from, deliveryWindowSource.to]
              .filter(Boolean)
              .join(" - ")
          }`
        : deliveryWindow;
      const itemsHtml = state.cartItems
        .map((item) => {
          const lineTotal = toMoney(item.price * item.quantity);
          const itemName = getLocalizedProductName(item) || item.name;
          const safeImageUrl = escapeHtml(item.imageUrl || getFallbackImage());
          const safeName = escapeHtml(itemName);
          return `
            <li class="products-review-product">
              <img
                class="products-review-product-image"
                src="${safeImageUrl}"
                alt="${safeName}"
                loading="lazy"
                onerror="this.onerror=null;this.src='${escapeHtml(getFallbackImage())}'"
              />
              <span class="products-review-product-name">${safeName}</span>
              <strong class="products-review-product-total">${toMoney(item.price)} x ${item.quantity} = ${lineTotal}</strong>
            </li>
          `;
        })
        .join("");
      const detailRows = [
        [copy.name.replace("*", ""), payload.customer_name || "-"],
        [copy.phone.replace("*", ""), payload.customer_phone || "-"],
        [copy.deliveryType, deliveryLabel],
        [copy.address, addressLabel],
        [copy.pickupDate, reviewDeliveryWindow],
        [copy.comment, payload.comment || "-"],
      ];
      if (
        payload.delivery_method === "pickup" &&
        selectedPharmacy?.scheduleText
      ) {
        detailRows.splice(4, 0, [
          getActiveLanguage() === "ro" ? "Program:" : "График работы:",
          selectedPharmacy.scheduleText,
        ]);
      }
      const detailsHtml = detailRows
        .map(
          ([label, value]) => `
            <p class="products-review-detail-row">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </p>
          `,
        )
        .join("");
      checkoutReview.innerHTML = `
        <div class="products-checkout-review-summary">
          <h4>${escapeHtml(copy.reviewItems)}</h4>
          <ul class="products-review-product-list">${itemsHtml}</ul>
          <p class="products-review-total-row"><span>${escapeHtml(copy.totalProducts)}</span><strong>${toMoney(getCartTotal())}</strong></p>
          <p class="products-review-total-row products-review-total-row--highlight"><span>${escapeHtml(copy.totalPayment)}</span><strong>${toMoney(getCartTotal())}</strong></p>
        </div>
        <div class="products-checkout-review-details">
          <h4>${escapeHtml(copy.reviewCustomer)}</h4>
          ${detailsHtml}
        </div>
      `;
    };

    const renderCheckoutFlow = () => {
      if (!(checkoutForm instanceof HTMLElement)) {
        return;
      }
      renderStaticCopy();
      const shouldShowCheckout = state.checkoutOpen || state.orderSubmitted;
      checkoutForm.hidden = !shouldShowCheckout;
      if (cartPanel instanceof HTMLElement) {
        cartPanel.classList.toggle("is-checkout", shouldShowCheckout);
      }
      if (cartItems instanceof HTMLElement) {
        cartItems.hidden = shouldShowCheckout;
      }
      if (cartCheckout instanceof HTMLButtonElement) {
        cartCheckout.textContent = shouldShowCheckout
          ? getCartCopy().cart
          : getUiCopy().checkout;
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

      const isSuccessStep =
        state.checkoutStep === getCheckoutCopy().successStep;
      const stepsNav = checkoutForm.querySelector(".products-checkout-steps");
      if (stepsNav instanceof HTMLElement) {
        stepsNav.hidden = isSuccessStep;
      }
      if (isSuccessStep) {
        const successCopy = getCheckoutCopy();
        const successTitle = document.getElementById(
          "products-checkout-flow-success-title",
        );
        const successText = document.getElementById(
          "products-checkout-flow-success-text",
        );
        const orderLabel = document.getElementById(
          "products-checkout-flow-order-label",
        );
        const orderNumber = document.getElementById(
          "products-checkout-flow-order-number",
        );
        const continueButton = document.getElementById(
          "products-checkout-flow-continue",
        );
        if (successTitle instanceof HTMLElement) {
          successTitle.textContent = successCopy.successTitle;
        }
        if (successText instanceof HTMLElement) {
          successText.textContent = successCopy.successText;
        }
        if (orderLabel instanceof HTMLElement) {
          orderLabel.textContent = successCopy.orderNumberLabel;
        }
        if (orderNumber instanceof HTMLElement) {
          orderNumber.textContent = state.lastOrderId;
        }
        const orderRow = document.querySelector(
          ".products-checkout-success-order",
        );
        if (orderRow instanceof HTMLElement) {
          orderRow.hidden = !state.lastOrderId;
        }
        if (continueButton instanceof HTMLElement) {
          continueButton.textContent = successCopy.continueShopping;
        }
      }

      const actionsBar = checkoutForm.querySelector(
        ".products-checkout-actions",
      );
      if (actionsBar instanceof HTMLElement) {
        actionsBar.hidden = isSuccessStep;
      }
      const nextButton = checkoutForm.querySelector(
        '[data-checkout-action="next"]',
      );
      if (nextButton instanceof HTMLButtonElement) {
        nextButton.hidden = state.checkoutStep === getCheckoutCopy().reviewStep;
        nextButton.disabled =
          state.isSubmittingOrder || state.isReconcilingCart;
        nextButton.textContent = state.isReconcilingCart
          ? getCheckoutCopy().syncing
          : getCheckoutCopy().next;
      }
      if (checkoutBack instanceof HTMLButtonElement) {
        checkoutBack.disabled =
          state.isSubmittingOrder || state.isReconcilingCart;
        checkoutBack.textContent = getUiCopy().back;
      }
      if (orderSubmit instanceof HTMLButtonElement) {
        orderSubmit.hidden =
          state.checkoutStep !== getCheckoutCopy().reviewStep;
        orderSubmit.disabled =
          state.isSubmittingOrder ||
          state.isReconcilingCart ||
          !state.cartItems.length;
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
          const lookupDisabled =
            control instanceof HTMLSelectElement &&
            control.dataset.lookupDisabled === "true";
          control.disabled =
            state.isSubmittingOrder ||
            lookupDisabled ||
            (state.orderSubmitted &&
              control.id !== "products-checkout-flow-back" &&
              control.id !== "products-checkout-flow-continue");
        }
      }
      renderCustomSelects();
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
      renderStaticCopy();
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
            : `<p class="new-price is-unavailable">${escapeHtml(getUiCopy().unavailable)}</p>`;
          const safeImageUrl = escapeHtml(product.imageUrl);
          const safeName = escapeHtml(
            getLocalizedProductName(product) || product.name,
          );
          const safeManufacturer = escapeHtml(product.manufacturer);
          const safeFallbackImage = escapeHtml(getFallbackImage());
          const safeProductId = escapeHtml(product.id);
          const safeProductUrl = escapeHtml(
            getLocalizedProductUrl(product) || "https://www.kokiko.md/",
          );
          const copy = getCartCopy();
          const actionButton = inStock
            ? `<div class="product-card-actions">
                <button class="add-to-cart-button" type="button" data-action="add-to-cart" data-product-id="${safeProductId}" aria-label="Add to cart ${safeName}">
                  ${escapeHtml(copy.add)}
                </button>
                <a class="buy-link product-details-link" href="${safeProductUrl}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(getUiCopy().openProduct)}">
                  <svg class="products-icon products-icon--external" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 4h6v6"></path>
                    <path d="M10 14L20 4"></path>
                    <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"></path>
                  </svg>
                </a>
              </div>`
            : `<button class="add-to-cart-button add-to-cart-button--ghost" type="button" data-action="support-contact" data-product-id="${safeProductId}">${escapeHtml(getUiCopy().askAvailability)}</button>`;

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
    ctx.ui.renderCheckoutPhoneMask = renderCheckoutPhoneMask;
    ctx.ui.clearCheckoutControlValidation = clearCheckoutControlValidation;
    ctx.ui.toggleCart = setCartOpen;
    ctx.ui.toggleCheckout = setCheckoutOpen;
    ctx.actions.addToCart = addToCart;
    ctx.actions.formatCheckoutPhone = formatCheckoutPhoneInput;
    ctx.actions.setLanguage = setLanguage;
    ctx.actions.toggleLanguage = toggleLanguage;
    ctx.actions.setTheme = setTheme;
    ctx.actions.toggleTheme = toggleTheme;
    ctx.actions.changeCartQuantity = changeCartQuantity;
    ctx.actions.removeFromCart = removeFromCart;
    ctx.actions.toggleCheckoutSelect = setCheckoutSelectOpen;
    ctx.actions.chooseCheckoutSelect = chooseCheckoutSelect;
    ctx.actions.closeCheckoutSelect = closeCheckoutSelect;
    ctx.actions.openCart = () => setCartOpen(true);
    ctx.actions.closeCart = () => setCartOpen(false);
    ctx.actions.openCheckout = () => setCheckoutOpen(true);
    ctx.actions.closeCheckout = () => setCheckoutOpen(false);
    ctx.actions.nextCheckoutStep = nextCheckoutStep;
    ctx.actions.previousCheckoutStep = previousCheckoutStep;
    ctx.actions.setCheckoutStep = setCheckoutStep;
    ctx.actions.refreshCheckoutDeliveryData = refreshCheckoutDeliveryData;
    ctx.actions.submitOrder = submitOrder;
    ctx.tools.ensureCartSession = ensureCartSession;
  };

  window.ProductsRender = {
    attach,
  };
})();
