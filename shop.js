(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const page = document.body.dataset.page;
  const menuButton = $(".rh-menu-toggle");
  const mobileNav = $(".rh-mobile-nav");
  const setMenu = (open) => {
    if (!menuButton || !mobileNav) return;
    mobileNav.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
  };
  menuButton?.addEventListener("click", () => setMenu(mobileNav.hidden));
  mobileNav?.addEventListener("click", (event) => { if (event.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setMenu(false); });
  if (!["category", "product", "search"].includes(page)) return;

  const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
  const image = (src, alt, loading = "lazy") => {
    const result = document.createElement("img");
    result.src = src;
    result.alt = alt;
    result.loading = loading;
    result.decoding = "async";
    return result;
  };
  async function loadCatalog() {
    try {
      const response = await fetch("/api/catalog", {
        cache: "no-cache", signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error("Live product data unavailable");
      const catalog = await response.json();
      if (catalog.source !== "live" || !catalog.products) throw new Error("Invalid catalog");
      return catalog;
    } catch (error) {
      console.warn("Using saved catalog snapshot:", error.message);
      const response = await fetch("/shop-data.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("Produktdaten nicht verfügbar");
      const snapshot = await response.json();
      snapshot.source = "snapshot";
      return snapshot;
    }
  }
  function sourceText(catalog) {
    const date = new Date(catalog.synced_at);
    const formatted = Number.isFinite(date.getTime())
      ? date.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "unbekannt";
    return catalog.source === "live"
      ? "Produktdaten aus dem Ruby Hair Shop · Stand: " + formatted
      : "Gespeicherte Vorschau · Stand: " + formatted + " · Preis und Bestand im Shop prüfen";
  }
  function markSource(catalog) {
    const label = $("#rh-catalog-status");
    if (!label) return;
    label.textContent = sourceText(catalog);
    label.classList.toggle("rh-snapshot", catalog.source !== "live");
  }
  function colorGroups(product) {
    const groups = new Map();
    product.variations.forEach((v) => {
      if (!groups.has(v.color)) groups.set(v.color, []);
      groups.get(v.color).push(v);
    });
    return groups;
  }
  function localProductUrl(product, color) {
    const url = new URL("/produkt/" + product.slug + "/", location.origin);
    if (color) url.searchParams.set("farbe", color);
    return url.pathname + url.search;
  }
  function renderCategory(product) {
    const grid = $("#rh-shade-grid");
    const filter = $("#rh-color-filter");
    const empty = $("#rh-filter-empty");
    const cards = [];
    colorGroups(product).forEach((variants, color) => {
      const available = variants.filter((v) => v.available && v.purchasable);
      const candidate = available[0] || variants[0];
      if (!candidate) return;
      const name = candidate.color_label;
      const card = document.createElement("a");
      card.className = "rh-shade-card";
      card.href = localProductUrl(product, color);
      card.setAttribute("aria-label", product.name + ", Farbe " + name + " ansehen");
      const picture = document.createElement("div");
      picture.className = "rh-shade-image";
      picture.append(image(candidate.image || product.image, product.name + " – Farbe " + name));
      const badge = document.createElement("span");
      badge.className = "rh-shade-badge";
      badge.textContent = available.length ? "FARBE " + name : "NICHT VERFÜGBAR";
      picture.append(badge);
      const caption = document.createElement("div");
      const left = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = product.name;
      const sub = document.createElement("small");
      sub.textContent = "Farbe " + name;
      left.append(heading, sub);
      const price = document.createElement("span");
      price.className = "rh-price-small";
      price.textContent = available.length ? "ab " + euro.format(Math.min(...available.map((v) => v.price))) : "Ausverkauft";
      caption.append(left, price);
      card.append(picture, caption);
      grid.append(card);
      cards.push({ card, search: (name + " " + color + " " + product.name).toLocaleLowerCase("de") });
    });
    filter?.addEventListener("input", () => {
      const term = filter.value.trim().toLocaleLowerCase("de");
      let count = 0;
      cards.forEach(({ card, search }) => {
        const matches = search.includes(term);
        card.hidden = !matches;
        if (matches) count++;
      });
      empty.hidden = count > 0;
    });
  }
  function renderProduct(product) {
    const groups = colorGroups(product);
    const colors = [...groups.keys()];
    const colorOptions = $("#rh-color-options");
    const lengthOptions = $("#rh-length-options");
    const titleColor = $("#rh-selected-color");
    const displayPrice = $("#rh-price");
    const displayImage = $("#rh-product-image");
    const availability = $("#rh-availability");
    const buy = $("#rh-buy-button");
    const requested = new URLSearchParams(location.search).get("farbe")?.toLocaleLowerCase("de");
    let color = requested && groups.has(requested) ? requested : (groups.has("ruby") ? "ruby" : colors[0]);
    let length = null;
    colors.forEach((value) => {
      const choices = groups.get(value);
      const candidate = choices.find((v) => v.available && v.purchasable) || choices[0];
      const button = document.createElement("button");
      button.className = "rh-color-choice";
      button.type = "button";
      button.dataset.color = value;
      button.setAttribute("aria-label", "Farbe " + candidate.color_label);
      button.append(image(candidate.image || product.image, "", "lazy"));
      const label = document.createElement("span");
      label.textContent = candidate.color_label;
      button.append(label);
      button.disabled = !choices.some((v) => v.available && v.purchasable);
      button.addEventListener("click", () => { color = value; refresh(); });
      colorOptions.append(button);
    });

    function refresh() {
      const choices = groups.get(color) || [];
      if (!choices.length) return;
      const available = choices.filter((v) => v.available && v.purchasable);
      const initial = available.find((v) => v.length === length) || available[0] || choices[0];
      length = initial.length;
      colorOptions.querySelectorAll("button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.color === color));
      });
      titleColor.textContent = "· " + initial.color_label;
      lengthOptions.replaceChildren();
      [...new Set(choices.map((v) => v.length))].forEach((value) => {
        const options = choices.filter((v) => v.length === value);
        const first = options[0];
        const enabled = options.some((v) => v.available && v.purchasable);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "rh-length-choice";
        button.textContent = first.length_label;
        button.setAttribute("aria-pressed", String(length === value));
        button.disabled = !enabled;
        button.addEventListener("click", () => { length = value; refresh(); });
        lengthOptions.append(button);
      });
      const selected = choices.find((v) => v.length === length);
      if (!selected) return;
      const inStock = selected.available && selected.purchasable;
      displayPrice.textContent = euro.format(selected.price);
      displayImage.src = selected.image || product.image;
      displayImage.alt = product.name + " – Farbe " + selected.color_label;
      availability.textContent = inStock ? "Zum Datenstand verfügbar · bitte im Shop prüfen" : "Zum Datenstand nicht verfügbar · bitte im Shop prüfen";
      availability.classList.toggle("rh-not-available", !inStock);
      buy.setAttribute("aria-disabled", String(!inStock));
      buy.tabIndex = inStock ? 0 : -1;
      const url = new URL(product.live_url);
      url.searchParams.set("attribute_pa_produktfarbe", selected.color);
      url.searchParams.set("attribute_pa_produktlaenge", selected.length);
      buy.href = url.href;
      const current = new URL(location.href);
      current.searchParams.set("farbe", color);
      history.replaceState(null, "", current.pathname + current.search);
      // Actual cart, payment, pricing and stock confirmation remain on the live shop.
    }
    refresh();
  }
  function renderSearch(catalog) {
    const input = $("#rh-shop-search");
    const count = $("#rh-search-count");
    const grid = $("#rh-shade-grid");
    const groups = [];
    for (const product of Object.values(catalog.products)) {
      for (const [color, variants] of colorGroups(product)) {
        const available = variants.filter(v => v.available && v.purchasable);
        const candidate = available[0] || variants[0];
        if (!candidate) continue;
        const card = document.createElement("a");
        card.className = "rh-shade-card";
        card.href = localProductUrl(product, color);
        const picture = document.createElement("div");
        picture.className = "rh-shade-image";
        picture.append(image(candidate.image || product.image,
          product.name + " – Farbe " + candidate.color_label));
        const body = document.createElement("div");
        const left = document.createElement("div");
        const heading = document.createElement("strong");
        heading.textContent = product.name;
        const subtitle = document.createElement("small");
        subtitle.textContent = "Farbe " + candidate.color_label;
        left.append(heading, subtitle);
        const price = document.createElement("span");
        price.className = "rh-price-small";
        price.textContent = available.length
          ? "ab " + euro.format(Math.min(...available.map(v => v.price)))
          : "Ausverkauft";
        body.append(left, price);
        card.append(picture, body);
        grid.append(card);
        groups.push({
          card, label: (product.name + " " + product.original_name + " " +
            candidate.color_label + " " + color).toLocaleLowerCase("de")
        });
      }
    }
    const update = () => {
      const query = input.value.trim().toLocaleLowerCase("de");
      let results = 0;
      for (const item of groups) {
        const show = !query || item.label.includes(query);
        item.card.hidden = !show;
        if (show) results++;
      }
      count.textContent = results === 1 ? "1 Ergebnis" : results + " Ergebnisse";
      $("#rh-filter-empty").hidden = results > 0;
      const url = new URL(location.href);
      if (query) url.searchParams.set("q", input.value.trim());
      else url.searchParams.delete("q");
      history.replaceState(null, "", url.pathname + url.search);
    };
    input.value = new URLSearchParams(location.search).get("q") || "";
    input.addEventListener("input", update);
    update();
  }

  loadCatalog().then((catalog) => {
    markSource(catalog);
    if (page === "search") return renderSearch(catalog);
    const slug = $("[data-product]")?.dataset.product;
    const product = catalog.products[slug];
    if (!product) throw new Error("Produkt nicht gefunden");
    if (page === "category") renderCategory(product);
    if (page === "product") renderProduct(product);
  }).catch((error) => {
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = "Produktdaten konnten nicht geladen werden. Bitte öffne den aktuellen Ruby Hair Shop.";
    const link = document.createElement("a");
    link.href = "https://rubyhair.de/";
    link.textContent = "Zum aktuellen Shop";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const container = $(".rh-detail-layout") || $(".rh-shades-section") || $(".rh-search-results");
    container?.prepend(message, link);
    console.error("Ruby Hair catalog preview:", error.message);
  });
})();
