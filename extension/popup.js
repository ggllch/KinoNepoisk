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
const gridCellsInput = document.getElementById("grid-cells");
const saveButton = document.getElementById("save-settings");
const saveStatus = document.getElementById("save-status");
const searchInput = document.getElementById("search");
const randomBtn = document.getElementById("random-btn");
const resultsEl = document.getElementById("results");
const resultsGrid = document.getElementById("results-grid");
const resultsHint = document.getElementById("results-hint");
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
const genreTrigger = document.getElementById("genre-trigger");
const countryTrigger = document.getElementById("country-trigger");
const genreValueEl = document.getElementById("genre-value");
const countryValueEl = document.getElementById("country-value");
const wheelOverlay = document.getElementById("wheel-overlay");
const wheelTitle = document.getElementById("wheel-title");
const wheelScroller = document.getElementById("wheel-scroller");
const wheelClose = document.getElementById("wheel-close");
const wheelDone = document.getElementById("wheel-done");

let searchTimer = null;
let searchSeq = 0;
let lastResults = [];
let noveltyResults = [];
let browseMode = "novelties"; // novelties | random | search
let gridCells = DEFAULTS.gridCells;
let activeWheel = null;
const objectUrls = new Set();

function gridLimit() {
  return layoutForCells(gridCells).cells;
}

function setBrowseMode(mode) {
  browseMode = mode;
  randomBtn.classList.toggle("active", mode === "random");
}

const filters = {
  type: "",
  yearFrom: null,
  yearTo: null,
  ratingMin: null,
  sortKey: "relevance",
  sortDir: "desc",
  genre: "",
  country: "",
};

const sortRow = document.getElementById("filter-sort");

const GENRE_OPTIONS = [
  { value: "", label: "Любой" },
  { value: "боевик", label: "Боевик" },
  { value: "комедия", label: "Комедия" },
  { value: "драма", label: "Драма" },
  { value: "фантастика", label: "Фантастика" },
  { value: "фэнтези", label: "Фэнтези" },
  { value: "триллер", label: "Триллер" },
  { value: "ужасы", label: "Ужасы" },
  { value: "мелодрама", label: "Мелодрама" },
  { value: "детектив", label: "Детектив" },
  { value: "приключения", label: "Приключения" },
  { value: "криминал", label: "Криминал" },
  { value: "военный", label: "Военный" },
  { value: "история", label: "История" },
  { value: "биография", label: "Биография" },
  { value: "спорт", label: "Спорт" },
  { value: "музыка", label: "Музыка" },
  { value: "мюзикл", label: "Мюзикл" },
  { value: "western", label: "Вестерн" },
  { value: "мультфильм", label: "Мультфильм" },
  { value: "аниме", label: "Аниме" },
  { value: "семейный", label: "Семейный" },
  { value: "детский", label: "Детский" },
  { value: "документальный", label: "Документальный" },
  { value: "короткометражка", label: "Короткий метр" },
];

const COUNTRY_OPTIONS = [
  { value: "", label: "Любая" },
  { value: "Россия", label: "Россия" },
  { value: "США", label: "США" },
  { value: "СССР", label: "СССР" },
  { value: "Великобритания", label: "Британия" },
  { value: "Франция", label: "Франция" },
  { value: "Германия", label: "Германия" },
  { value: "Корея Южная", label: "Корея" },
  { value: "Япония", label: "Япония" },
  { value: "Китай", label: "Китай" },
  { value: "Индия", label: "Индия" },
  { value: "Испания", label: "Испания" },
  { value: "Италия", label: "Италия" },
  { value: "Канада", label: "Канада" },
  { value: "Турция", label: "Турция" },
];

function layoutForCells(n) {
  // Always 2 rows; grow in width. Map legacy 9 → 10.
  const raw = Number(n) === 9 ? 10 : Number(n);
  const allowed = {
    6: { cols: 3, rows: 2 },
    8: { cols: 4, rows: 2 },
    10: { cols: 5, rows: 2 },
    12: { cols: 6, rows: 2 },
  };
  const cells = allowed[raw] ? raw : 6;
  const { cols, rows } = allowed[cells];
  return { cells, cols, rows };
}

function applyGridLayout() {
  const { cells, cols, rows } = layoutForCells(gridCells);
  gridCells = cells;

  const GAP = 8;
  const CARD_PAD = 10;
  const GRID_PAD = 8;
  const META = 28;
  const CHROME_H = 122;
  const MAX_W = 720;
  const MAX_H = 560;

  let cellW = cols <= 3 ? 110 : cols === 4 ? 98 : cols === 5 ? 88 : 80;
  let popupW = CARD_PAD * 2 + GRID_PAD * 2 + cols * cellW + (cols - 1) * GAP;
  if (popupW > MAX_W) {
    cellW = (MAX_W - CARD_PAD * 2 - GRID_PAD * 2 - (cols - 1) * GAP) / cols;
    popupW = MAX_W;
  }

  let cellH = cellW * 1.5 + META;
  let resultsH = rows * cellH + (rows - 1) * GAP + GRID_PAD * 2;
  let popupH = CHROME_H + resultsH;

  if (popupH > MAX_H) {
    resultsH = MAX_H - CHROME_H;
    cellH = (resultsH - GRID_PAD * 2 - (rows - 1) * GAP) / rows;
    cellW = Math.max(56, (cellH - META) / 1.5);
    popupW = Math.min(
      MAX_W,
      Math.round(CARD_PAD * 2 + GRID_PAD * 2 + cols * cellW + (cols - 1) * GAP)
    );
    cellH = cellW * 1.5 + META;
    resultsH = rows * cellH + (rows - 1) * GAP + GRID_PAD * 2;
    popupH = Math.min(MAX_H, CHROME_H + resultsH);
  }

  popupW = Math.round(popupW);
  popupH = Math.round(popupH);
  resultsH = Math.round(resultsH);

  document.documentElement.style.setProperty("--cols", String(cols));
  document.documentElement.style.setProperty("--rows", String(rows));
  document.documentElement.style.width = `${popupW}px`;
  document.body.style.width = `${popupW}px`;
  document.documentElement.style.height = `${popupH}px`;
  document.body.style.height = `${popupH}px`;
  resultsEl.style.height = `${resultsH}px`;
  resultsEl.style.width = "100%";
}

function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label || options[0].label;
}

function updatePickerLabels() {
  genreValueEl.textContent = optionLabel(GENRE_OPTIONS, filters.genre);
  countryValueEl.textContent = optionLabel(COUNTRY_OPTIONS, filters.country);
}

function buildWheel(options) {
  wheelScroller.innerHTML = "";
  for (const option of options) {
    const item = document.createElement("div");
    item.className = "wheel-item";
    item.dataset.value = option.value;
    item.textContent = option.label;
    wheelScroller.appendChild(item);
  }
}

function wheelSelectedValue() {
  const items = [...wheelScroller.querySelectorAll(".wheel-item")];
  if (!items.length) return "";
  const center = wheelScroller.scrollTop + wheelScroller.clientHeight / 2;
  let best = items[0];
  let bestDist = Infinity;
  for (const item of items) {
    const mid = item.offsetTop + item.offsetHeight / 2;
    const dist = Math.abs(mid - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = item;
    }
  }
  return best.dataset.value || "";
}

function markWheelSelection() {
  const value = wheelSelectedValue();
  for (const item of wheelScroller.querySelectorAll(".wheel-item")) {
    item.classList.toggle("is-selected", item.dataset.value === value);
  }
  return value;
}

function setWheelValue(value, smooth = false) {
  const items = [...wheelScroller.querySelectorAll(".wheel-item")];
  const target =
    items.find((item) => item.dataset.value === String(value ?? "")) || items[0];
  if (!target) return;
  const height = wheelScroller.clientHeight || target.offsetHeight * 5;
  const top = Math.max(
    0,
    target.offsetTop - (height / 2 - target.offsetHeight / 2)
  );
  if (smooth) {
    wheelScroller.scrollTo({ top, behavior: "smooth" });
  } else {
    wheelScroller.scrollTop = top;
  }
  markWheelSelection();
}

function openWheel(kind) {
  activeWheel = kind;
  const options = kind === "genre" ? GENRE_OPTIONS : COUNTRY_OPTIONS;
  const value = kind === "genre" ? filters.genre : filters.country;
  wheelTitle.textContent = kind === "genre" ? "Жанр" : "Страна";
  buildWheel(options);
  wheelOverlay.hidden = false;
  // Wait until overlay is laid out, then center the selected row.
  requestAnimationFrame(() => {
    void wheelScroller.offsetHeight;
    setWheelValue(value, false);
    requestAnimationFrame(() => setWheelValue(value, false));
  });
}

function closeWheel(commit) {
  if (commit && activeWheel) {
    const value = markWheelSelection();
    if (activeWheel === "genre") filters.genre = value;
    else filters.country = value;
    updatePickerLabels();
  }
  activeWheel = null;
  wheelOverlay.hidden = true;
}

let wheelSnapTimer = null;
wheelScroller.addEventListener("scroll", () => {
  markWheelSelection();
  clearTimeout(wheelSnapTimer);
  wheelSnapTimer = setTimeout(() => {
    const value = wheelSelectedValue();
    setWheelValue(value, true);
  }, 80);
});

wheelScroller.addEventListener("click", (event) => {
  const item = event.target.closest(".wheel-item");
  if (!item) return;
  setWheelValue(item.dataset.value, true);
});

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

function setSingleChip(container, value) {
  for (const chip of container.querySelectorAll(".chip")) {
    chip.classList.toggle("active", chip.dataset.value === String(value ?? ""));
  }
}

function syncFiltersFromUi() {
  filters.type = selectedChipValue(document.getElementById("filter-type"));
  filters.ratingMin = selectedChipValue(document.getElementById("filter-rating"));
  filters.ratingMin = filters.ratingMin ? Number(filters.ratingMin) : null;

  const from = yearFromInput.value.trim();
  const to = yearToInput.value.trim();
  filters.yearFrom = from ? Number(from) : null;
  filters.yearTo = to ? Number(to) : null;
}

function syncSortUi() {
  for (const btn of sortRow.querySelectorAll(".sort-btn")) {
    const key = btn.dataset.key;
    const active = key === filters.sortKey;
    btn.classList.toggle("active", active);
    if (key === "relevance") continue;
    const dir =
      active
        ? filters.sortDir
        : key === "title"
          ? "asc"
          : "desc";
    btn.dataset.dir = dir;
    if (key === "title") {
      const label = btn.querySelector(".sort-label");
      if (label) label.textContent = dir === "asc" ? "А–Я" : "Я–А";
    }
  }
}

function syncUiFromFilters() {
  setSingleChip(document.getElementById("filter-type"), filters.type);
  setSingleChip(
    document.getElementById("filter-rating"),
    filters.ratingMin == null ? "" : String(filters.ratingMin)
  );
  syncSortUi();
  yearFromInput.value = filters.yearFrom ?? "";
  yearToInput.value = filters.yearTo ?? "";
  updatePickerLabels();
}

function filtersActiveCount() {
  let count = 0;
  if (filters.type) count += 1;
  if (filters.yearFrom || filters.yearTo) count += 1;
  if (filters.ratingMin) count += 1;
  if (filters.genre) count += 1;
  if (filters.country) count += 1;
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
  if (!wheelOverlay.hidden) closeWheel(false);
}

function resetFilters() {
  filters.type = "";
  filters.yearFrom = null;
  filters.yearTo = null;
  filters.ratingMin = null;
  filters.sortKey = "relevance";
  filters.sortDir = "desc";
  filters.genre = "";
  filters.country = "";
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

  const dir = filters.sortDir === "asc" ? 1 : -1;
  switch (filters.sortKey) {
    case "rating":
      list = [...list].sort(
        (a, b) => dir * ((itemRating(a) || 0) - (itemRating(b) || 0))
      );
      break;
    case "year":
      list = [...list].sort((a, b) => {
        const ay = itemYear(a) || (dir > 0 ? 9999 : 0);
        const by = itemYear(b) || (dir > 0 ? 9999 : 0);
        return dir * (ay - by);
      });
      break;
    case "title":
      list = [...list].sort(
        (a, b) => dir * String(a.title).localeCompare(String(b.title), "ru")
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
  const meta = document.createElement("span");
  meta.className = "result-meta";
  empty.append(tile, meta);
  resultsGrid.appendChild(empty);
}

function renderResults(items) {
  clearObjectUrls();
  resultsGrid.innerHTML = "";
  applyGridLayout();

  const list = items || [];
  const { cells } = layoutForCells(gridCells);

  if (!list.length) {
    resultsEl.classList.add("is-empty");
    for (let i = 0; i < cells; i += 1) renderEmptySlot();
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
    resultsGrid.appendChild(btn);
  }
}

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
  if (filters.genre && !parts.join(" ").toLowerCase().includes(filters.genre.toLowerCase())) {
    parts.push(filters.genre);
  }
  if (
    filters.country &&
    !parts.join(" ").toLowerCase().includes(filters.country.toLowerCase())
  ) {
    parts.push(filters.country);
  }
  return parts.filter(Boolean).join(" ").trim();
}

async function loadNovelties() {
  const seq = ++searchSeq;
  setBrowseMode("novelties");
  resultsHint.textContent = "Загружаю новинки…";
  showSearchStatus("Новинки…");
  renderResults([]);

  const response = await chrome.runtime.sendMessage({
    type: "novelties",
    limit: Math.max(gridLimit(), 12),
  });

  if (seq !== searchSeq) return;

  if (!response?.ok) {
    noveltyResults = [];
    lastResults = [];
    resultsHint.textContent = "Не удалось загрузить новинки";
    renderResults([]);
    showSearchStatus(response?.error || "Ошибка загрузки новинок", true);
    return;
  }

  noveltyResults = response.results || [];
  lastResults = noveltyResults;
  const filtered = applyFilters(noveltyResults).slice(0, gridLimit());
  renderResults(filtered);
  showSearchStatus(filtered.length ? "Новинки" : "Новинок пока нет");
}

async function loadRandom() {
  const seq = ++searchSeq;
  setBrowseMode("random");
  searchInput.value = "";
  resultsHint.textContent = "Подбираю случайные…";
  showSearchStatus("Рандом…");
  renderResults([]);

  const response = await chrome.runtime.sendMessage({
    type: "random",
    limit: Math.max(gridLimit(), 12),
  });

  if (seq !== searchSeq) return;

  if (!response?.ok) {
    lastResults = [];
    resultsHint.textContent = "Не удалось собрать подборку";
    renderResults([]);
    showSearchStatus(response?.error || "Ошибка рандома", true);
    return;
  }

  lastResults = response.results || [];
  const filtered = applyFilters(lastResults).slice(0, gridLimit());
  renderResults(filtered);
  showSearchStatus(filtered.length ? "Случайная подборка" : "Ничего не нашлось");
}

async function runSearch(query) {
  const seq = ++searchSeq;
  const q = buildSearchQuery(query);

  if (q.length < 2) {
    if (noveltyResults.length) {
      setBrowseMode("novelties");
      lastResults = noveltyResults;
      renderResults(applyFilters(noveltyResults).slice(0, gridLimit()));
      showSearchStatus("Новинки");
      return;
    }
    await loadNovelties();
    return;
  }

  setBrowseMode("search");
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

function bindChipGroup(container, onChange) {
  const single = container.dataset.single === "true";
  container.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip || !container.contains(chip)) return;

    if (single) {
      for (const el of container.querySelectorAll(".chip")) {
        el.classList.remove("active");
      }
      chip.classList.add("active");
    } else {
      chip.classList.toggle("active");
    }
    onChange?.();
  });
}

bindChipGroup(document.getElementById("filter-type"));
bindChipGroup(document.getElementById("filter-rating"));

sortRow.addEventListener("click", (event) => {
  const btn = event.target.closest(".sort-btn");
  if (!btn || !sortRow.contains(btn)) return;

  const key = btn.dataset.key;
  if (key === "relevance") {
    filters.sortKey = "relevance";
    filters.sortDir = "desc";
  } else if (filters.sortKey === key) {
    filters.sortDir = filters.sortDir === "asc" ? "desc" : "asc";
  } else {
    filters.sortKey = key;
    filters.sortDir = key === "title" ? "asc" : "desc";
  }

  syncSortUi();
  if (lastResults.length) {
    const list = applyFilters(lastResults);
    renderResults(
      browseMode === "search" ? list : list.slice(0, gridLimit())
    );
  }
});

syncSortUi();

chrome.storage.sync.get(DEFAULTS, (data) => {
  renderEnabled(data.enabled !== false);
  askBeforeInput.checked = data.askBeforeRedirect !== false;
  gridCells = layoutForCells(data.gridCells).cells;
  gridCellsInput.value = String(gridCells);

  let domain = data.domain;
  if (!domain && data.urlTemplate) domain = domainFromTemplate(data.urlTemplate);
  domain = normalizeDomain(domain || DEFAULTS.domain);
  const siteName = data.siteName || DEFAULTS.siteName;
  domainInput.value = domain;
  siteNameInput.value = siteName;
  renderSiteLabel(siteName);
  loadNovelties();
});

checkbox.addEventListener("change", () => {
  const enabled = checkbox.checked;
  chrome.storage.sync.set({ enabled }, () => renderEnabled(enabled));
});

askBeforeInput.addEventListener("change", () => {
  chrome.storage.sync.set({ askBeforeRedirect: askBeforeInput.checked });
});

gridCellsInput.addEventListener("change", () => {
  gridCells = layoutForCells(gridCellsInput.value).cells;
  chrome.storage.sync.set({ gridCells });
  if (!lastResults.length) {
    renderResults([]);
    return;
  }
  const list = applyFilters(lastResults);
  renderResults(browseMode === "search" ? list : list.slice(0, gridLimit()));
});

randomBtn.addEventListener("click", () => {
  loadRandom();
});

saveButton.addEventListener("click", () => {
  const domain = normalizeDomain(domainInput.value || DEFAULTS.domain);
  const siteName = (siteNameInput.value || DEFAULTS.siteName).trim() || DEFAULTS.siteName;
  const askBeforeRedirect = askBeforeInput.checked;
  gridCells = layoutForCells(gridCellsInput.value).cells;
  const sample = buildTargetUrl(domain, { type: "film", id: "301" });
  if (!sample) {
    saveStatus.hidden = false;
    saveStatus.style.color = "#ff8e8e";
    saveStatus.textContent = "Домен некорректный";
    return;
  }

  chrome.storage.sync.set(
    { domain, siteName, askBeforeRedirect, gridCells },
    () => {
      domainInput.value = domain;
      siteNameInput.value = siteName;
      gridCellsInput.value = String(gridCells);
      renderSiteLabel(siteName);
      renderResults(lastResults.length ? applyFilters(lastResults) : []);
      saveStatus.hidden = false;
      saveStatus.style.color = "";
      saveStatus.textContent = "Сохранено";
    }
  );
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

genreTrigger.addEventListener("click", () => openWheel("genre"));
countryTrigger.addEventListener("click", () => openWheel("country"));
wheelClose.addEventListener("click", () => closeWheel(false));
wheelDone.addEventListener("click", () => closeWheel(true));
wheelOverlay.addEventListener("click", (event) => {
  if (event.target === wheelOverlay) closeWheel(false);
});

filtersReset.addEventListener("click", () => {
  resetFilters();
});

filtersApply.addEventListener("click", () => {
  syncFiltersFromUi();
  updateFiltersButton();
  closeFilters();
  if (searchInput.value.trim().length >= 2) {
    scheduleSearch();
  } else if (browseMode === "random") {
    loadRandom();
  } else {
    loadNovelties();
  }
});

searchInput.addEventListener("input", scheduleSearch);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!wheelOverlay.hidden) {
      closeWheel(false);
      return;
    }
    if (!filtersOverlay.hidden) {
      closeFilters();
      return;
    }
    if (!settingsOverlay.hidden) {
      closeSettings();
      return;
    }
    searchInput.value = "";
    loadNovelties();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!wheelOverlay.hidden) closeWheel(false);
  else if (!filtersOverlay.hidden) closeFilters();
  else if (!settingsOverlay.hidden) closeSettings();
});

updateFiltersButton();
applyGridLayout();
