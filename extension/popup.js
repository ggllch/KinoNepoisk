const Shared = globalThis.KinoNepoiskShared;
const DEFAULTS = Shared.DEFAULTS;
const buildTargetUrl = Shared.buildTargetUrl;
const normalizeDomain = Shared.normalizeDomain;
const domainFromTemplate = Shared.domainFromTemplate;

const checkbox = document.getElementById("enabled");
const siteSubtitle = document.getElementById("site-subtitle");
const domainInput = document.getElementById("domain");
const siteNameInput = document.getElementById("site-name");
const askBeforeInput = document.getElementById("ask-before");
const saveButton = document.getElementById("save-settings");
const saveStatus = document.getElementById("save-status");
const searchInput = document.getElementById("search");
const resultsEl = document.getElementById("results");
const searchStatus = document.getElementById("search-status");
const filtersBtn = document.getElementById("filters-btn");
const filtersBadge = document.getElementById("filters-badge");
const filtersOverlay = document.getElementById("filters-overlay");
const filtersClose = document.getElementById("filters-close");
const filtersReset = document.getElementById("filters-reset");
const filtersApply = document.getElementById("filters-apply");
const settingsBtn = document.getElementById("settings-btn");
const settingsOverlay = document.getElementById("settings-overlay");
const settingsClose = document.getElementById("settings-close");
const yearFromInput = document.getElementById("year-from");
const yearToInput = document.getElementById("year-to");

let searchTimer = null;
let searchSeq = 0;
let lastResults = [];
const objectUrls = new Set();

const filters = {
  type: "",
  yearFrom: null,
  yearTo: null,
  ratingMin: null,
  sort: "relevance",
  genres: [],
  countries: [],
};

function renderEnabled(enabled) {
  checkbox.checked = enabled;
}

function renderSiteLabel(name) {
  siteSubtitle.textContent = (name || DEFAULTS.siteName).trim() || DEFAULTS.siteName;
}

function openSettings() {
  settingsOverlay.hidden = false;
}

function closeSettings() {
  settingsOverlay.hidden = true;
  saveStatus.hidden = true;
}

function showSearchStatus(text, isError = false) {
  if (!text) {
    searchStatus.hidden = true;
    searchStatus.textContent = "";
    return;
  }
  searchStatus.hidden = false;
  searchStatus.textContent = text;
  searchStatus.style.color = isError ? "#ff8e8e" : "";
}

function selectedChipValue(container) {
  const active = container.querySelector(".chip.active");
  return active ? active.dataset.value : "";
}

function selectedChipValues(container) {
  return [...container.querySelectorAll(".chip.active")]
    .map((el) => el.dataset.value)
    .filter(Boolean);
}

function setSingleChip(container, value) {
  for (const chip of container.querySelectorAll(".chip")) {
    const isActive = chip.dataset.value === String(value ?? "");
    chip.classList.toggle("active", isActive);
  }
}

function syncFiltersFromUi() {
  filters.type = selectedChipValue(document.getElementById("filter-type"));
  filters.ratingMin = selectedChipValue(document.getElementById("filter-rating"));
  filters.ratingMin = filters.ratingMin ? Number(filters.ratingMin) : null;
  filters.sort = selectedChipValue(document.getElementById("filter-sort")) || "relevance";
  filters.genres = selectedChipValues(document.getElementById("filter-genres"));
  filters.countries = selectedChipValues(document.getElementById("filter-countries"));

  const from = yearFromInput.value.trim();
  const to = yearToInput.value.trim();
  filters.yearFrom = from ? Number(from) : null;
  filters.yearTo = to ? Number(to) : null;
}

function syncUiFromFilters() {
  setSingleChip(document.getElementById("filter-type"), filters.type);
  setSingleChip(
    document.getElementById("filter-rating"),
    filters.ratingMin == null ? "" : String(filters.ratingMin)
  );
  setSingleChip(document.getElementById("filter-sort"), filters.sort || "relevance");

  for (const chip of document.querySelectorAll("#filter-genres .chip")) {
    chip.classList.toggle("active", filters.genres.includes(chip.dataset.value));
  }
  for (const chip of document.querySelectorAll("#filter-countries .chip")) {
    chip.classList.toggle("active", filters.countries.includes(chip.dataset.value));
  }

  yearFromInput.value = filters.yearFrom ?? "";
  yearToInput.value = filters.yearTo ?? "";
}

function filtersActiveCount() {
  let count = 0;
  if (filters.type) count += 1;
  if (filters.yearFrom || filters.yearTo) count += 1;
  if (filters.ratingMin) count += 1;
  if (filters.sort && filters.sort !== "relevance") count += 1;
  count += filters.genres.length;
  count += filters.countries.length;
  return count;
}

function updateFiltersButton() {
  const count = filtersActiveCount();
  filtersBtn.classList.toggle("active", count > 0);
  if (count > 0) {
    filtersBadge.hidden = false;
    filtersBadge.textContent = String(count);
  } else {
    filtersBadge.hidden = true;
  }
}

function openFilters() {
  syncUiFromFilters();
  filtersOverlay.hidden = false;
  filtersBtn.setAttribute("aria-expanded", "true");
}

function closeFilters() {
  filtersOverlay.hidden = true;
  filtersBtn.setAttribute("aria-expanded", "false");
}

function resetFilters() {
  filters.type = "";
  filters.yearFrom = null;
  filters.yearTo = null;
  filters.ratingMin = null;
  filters.sort = "relevance";
  filters.genres = [];
  filters.countries = [];
  syncUiFromFilters();
  updateFiltersButton();
}

function itemYear(item) {
  return item.yearStart || Number(String(item.year || "").slice(0, 4)) || null;
}

function itemRating(item) {
  const n = Number(item.rating);
  return Number.isFinite(n) ? n : null;
}

function applyFilters(items) {
  let list = items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;

    const year = itemYear(item);
    if (filters.yearFrom && (!year || year < filters.yearFrom)) return false;
    if (filters.yearTo && (!year || year > filters.yearTo)) return false;

    if (filters.ratingMin) {
      const rating = itemRating(item);
      if (!rating || rating < filters.ratingMin) return false;
    }

    return true;
  });

  switch (filters.sort) {
    case "rating":
      list = [...list].sort((a, b) => (itemRating(b) || 0) - (itemRating(a) || 0));
      break;
    case "year-desc":
      list = [...list].sort((a, b) => (itemYear(b) || 0) - (itemYear(a) || 0));
      break;
    case "year-asc":
      list = [...list].sort((a, b) => (itemYear(a) || 9999) - (itemYear(b) || 9999));
      break;
    case "title":
      list = [...list].sort((a, b) =>
        String(a.title).localeCompare(String(b.title), "ru")
      );
      break;
    default:
      break;
  }

  return list;
}

function clearObjectUrls() {
  for (const url of objectUrls) URL.revokeObjectURL(url);
  objectUrls.clear();
}

async function loadPoster(img, item) {
  const list = [...new Set([...(item.posters || []), item.poster].filter(Boolean))];
  for (const url of list) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) continue;
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.add(objectUrl);
      img.src = objectUrl;
      return;
    } catch (_) {
      // next
    }
  }

  const ph = document.createElement("span");
  ph.className = "result-poster-fallback";
  img.replaceWith(ph);
}

function renderEmptySlot() {
  const empty = document.createElement("div");
  empty.className = "result-empty";
  empty.setAttribute("aria-hidden", "true");
  const tile = document.createElement("div");
  tile.className = "result-empty-tile";
  empty.appendChild(tile);
  resultsEl.appendChild(empty);
}

function renderResults(items) {
  clearObjectUrls();
  resultsEl.innerHTML = "";

  const list = items || [];
  if (!list.length) {
    resultsEl.classList.add("is-empty");
    for (let i = 0; i < 6; i += 1) renderEmptySlot();
    return;
  }

  resultsEl.classList.remove("is-empty");
  for (const item of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "result";
    const year = item.year || (item.yearStart ? String(item.yearStart) : "");
    btn.title = [item.title, year, item.rating ? `★ ${item.rating}` : ""]
      .filter(Boolean)
      .join(" · ");

    const img = document.createElement("img");
    img.className = "result-poster";
    img.alt = item.title;
    img.decoding = "async";
    btn.appendChild(img);
    loadPoster(img, item);

    const meta = document.createElement("span");
    meta.className = "result-meta";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const sub = document.createElement("small");
    sub.textContent = [year || "год н/д", item.rating ? `★ ${item.rating}` : ""]
      .filter(Boolean)
      .join(" · ");
    meta.append(title, sub);
    btn.appendChild(meta);

    btn.addEventListener("click", () => openResult(item));
    resultsEl.appendChild(btn);
  }
}

renderResults([]);

async function openResult(item) {
  const response = await chrome.runtime.sendMessage({
    type: "buildUrl",
    itemType: item.type,
    id: item.id,
  });

  if (!response?.ok || !response.url) {
    showSearchStatus("Не удалось собрать ссылку", true);
    return;
  }

  await chrome.tabs.create({ url: response.url });
  window.close();
}

function buildSearchQuery(raw) {
  const parts = [raw.trim()];
  for (const genre of filters.genres) {
    if (!parts.join(" ").toLowerCase().includes(genre.toLowerCase())) {
      parts.push(genre);
    }
  }
  for (const country of filters.countries) {
    if (!parts.join(" ").toLowerCase().includes(country.toLowerCase())) {
      parts.push(country);
    }
  }
  return parts.filter(Boolean).join(" ").trim();
}

async function runSearch(query) {
  const seq = ++searchSeq;
  const q = buildSearchQuery(query);

  if (q.length < 2) {
    lastResults = [];
    renderResults([]);
    showSearchStatus("");
    return;
  }

  showSearchStatus("Ищу…");
  const response = await chrome.runtime.sendMessage({
    type: "search",
    query: q,
  });

  if (seq !== searchSeq) return;

  if (!response?.ok) {
    lastResults = [];
    renderResults([]);
    showSearchStatus(response?.error || "Ошибка поиска", true);
    return;
  }

  lastResults = response.results || [];
  const filtered = applyFilters(lastResults);
  renderResults(filtered);
  showSearchStatus(filtered.length ? "" : "Ничего не найдено");
}

function scheduleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(searchInput.value), 280);
}

function bindChipGroup(container) {
  const single = container.dataset.single === "true";
  container.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip || !container.contains(chip)) return;

    if (single) {
      for (const el of container.querySelectorAll(".chip")) {
        el.classList.remove("active");
      }
      chip.classList.add("active");
      return;
    }

    chip.classList.toggle("active");
  });
}

bindChipGroup(document.getElementById("filter-type"));
bindChipGroup(document.getElementById("filter-rating"));
bindChipGroup(document.getElementById("filter-sort"));
bindChipGroup(document.getElementById("filter-genres"));
bindChipGroup(document.getElementById("filter-countries"));

chrome.storage.sync.get(DEFAULTS, (data) => {
  renderEnabled(data.enabled !== false);
  askBeforeInput.checked = data.askBeforeRedirect !== false;
  let domain = data.domain;
  if (!domain && data.urlTemplate) domain = domainFromTemplate(data.urlTemplate);
  domain = normalizeDomain(domain || DEFAULTS.domain);
  const siteName = data.siteName || DEFAULTS.siteName;
  domainInput.value = domain;
  siteNameInput.value = siteName;
  renderSiteLabel(siteName);
});

checkbox.addEventListener("change", () => {
  const enabled = checkbox.checked;
  chrome.storage.sync.set({ enabled }, () => renderEnabled(enabled));
});

askBeforeInput.addEventListener("change", () => {
  chrome.storage.sync.set({ askBeforeRedirect: askBeforeInput.checked });
});

saveButton.addEventListener("click", () => {
  const domain = normalizeDomain(domainInput.value || DEFAULTS.domain);
  const siteName = (siteNameInput.value || DEFAULTS.siteName).trim() || DEFAULTS.siteName;
  const askBeforeRedirect = askBeforeInput.checked;
  const sample = buildTargetUrl(domain, { type: "film", id: "301" });
  if (!sample) {
    saveStatus.hidden = false;
    saveStatus.style.color = "#ff8e8e";
    saveStatus.textContent = "Домен некорректный";
    return;
  }

  chrome.storage.sync.set({ domain, siteName, askBeforeRedirect }, () => {
    domainInput.value = domain;
    siteNameInput.value = siteName;
    renderSiteLabel(siteName);
    saveStatus.hidden = false;
    saveStatus.style.color = "";
    saveStatus.textContent = "Сохранено";
  });
});

settingsBtn.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", (event) => {
  if (event.target === settingsOverlay) closeSettings();
});

filtersBtn.addEventListener("click", openFilters);
filtersClose.addEventListener("click", closeFilters);
filtersOverlay.addEventListener("click", (event) => {
  if (event.target === filtersOverlay) closeFilters();
});

filtersReset.addEventListener("click", () => {
  resetFilters();
});

filtersApply.addEventListener("click", () => {
  syncFiltersFromUi();
  updateFiltersButton();
  closeFilters();
  scheduleSearch();
});

searchInput.addEventListener("input", scheduleSearch);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!filtersOverlay.hidden) {
      closeFilters();
      return;
    }
    if (!settingsOverlay.hidden) {
      closeSettings();
      return;
    }
    searchInput.value = "";
    lastResults = [];
    renderResults([]);
    showSearchStatus("");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!filtersOverlay.hidden) closeFilters();
  else if (!settingsOverlay.hidden) closeSettings();
});

updateFiltersButton();
