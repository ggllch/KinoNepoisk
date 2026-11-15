importScripts("shared.js");

const Shared = self.KinoNepoiskShared;
const DEFAULTS = Shared.DEFAULTS;
const typeFromTypename = Shared.typeFromTypename;
const buildTargetUrl = Shared.buildTargetUrl;
const rewriteKinopoiskUrl = Shared.rewriteKinopoiskUrl;
const normalizeDomain = Shared.normalizeDomain;
const domainFromTemplate = Shared.domainFromTemplate;
const templateFromDomain = Shared.templateFromDomain;

const SUGGEST_QUERY = `query SuggestSearch($keyword: String!, $yandexCityId: Int, $limit: Int, $withUserData: Boolean!) { suggest(keyword: $keyword) { top(yandexCityId: $yandexCityId, limit: $limit) { topResult { global { ...SuggestMovieItem ...SuggestPersonItem ...SuggestCinemaItem ...SuggestMovieListItem __typename } __typename } movies { movie { ...SuggestMovieItem __typename } __typename } persons { person { ...SuggestPersonItem __typename } __typename } cinemas { cinema { ...SuggestCinemaItem __typename } __typename } movieLists { movieList { ...SuggestMovieListItem __typename } __typename } __typename } __typename } } fragment ShortImage on Image { avatarsUrl fallbackUrl __typename } fragment MovieHdVerticalPoster on Movie { gallery { posters { hdVertical: vertical(override: OTT_WHEN_EXISTS) { ...ShortImage __typename } __typename } __typename } __typename } fragment MovieKpVerticalPoster on Movie { gallery { posters { kpVertical: vertical { ...ShortImage __typename } __typename } __typename } __typename } fragment TicketOption on Movie { ticketOption { purchasable releaseAnnounce { available releaseDate { accuracy date __typename } __typename } __typename } __typename } fragment SuggestMovieItem on Movie { id contentId title { russian original __typename } rating { kinopoisk { isActive value __typename } __typename } ...MovieHdVerticalPoster ...MovieKpVerticalPoster viewOption { buttonText isAvailableOnline: isWatchable(filter: {anyDevice: false, anyRegion: false}) purchasabilityStatus contentPackageToBuy { billingFeatureName __typename } subscriptionBadge { image { avatarsUrl __typename } __typename } type availabilityAnnounce { groupPeriodType announcePromise availabilityDate type __typename } __typename } ...TicketOption userData @include(if: $withUserData) { isPlannedToWatch __typename } ... on Film { productionYear __typename } ... on TvSeries { releaseYears { end start __typename } __typename } ... on TvShow { releaseYears { end start __typename } __typename } ... on MiniSeries { releaseYears { end start __typename } __typename } __typename } fragment SuggestPersonItem on Person { id name originalName birthDate poster { avatarsUrl fallbackUrl __typename } __typename } fragment SuggestCinemaItem on Cinema { id ctitle: title city { id name geoId __typename } __typename } fragment SuggestMovieListItem on MovieListMeta { id cover { avatarsUrl __typename } coverBackground { avatarsUrl __typename } name url description movies(limit: 0) { total __typename } __typename }`;

async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  let domain = data.domain;
  if (!domain && data.urlTemplate) {
    domain = domainFromTemplate(data.urlTemplate);
  }
  domain = normalizeDomain(domain || DEFAULTS.domain);
  return {
    enabled: data.enabled !== false,
    askBeforeRedirect: data.askBeforeRedirect !== false,
    domain,
    siteName: (data.siteName || DEFAULTS.siteName).trim() || DEFAULTS.siteName,
    urlTemplate: templateFromDomain(domain),
  };
}

async function updateBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#2ecc71" : "#888888",
  });
}

function genId() {
  return `${Date.now()}-${Math.random().toString().slice(2)}:${Math.floor(Math.random() * 100)}`;
}

function genSearchId() {
  return `${Date.now()}${Math.floor(Math.random() * 1e9)}`;
}

function genTrace() {
  const hex = () => Math.random().toString(16).slice(2, 18);
  return `00-${hex()}${hex()}-${hex()}-01`;
}

function toHttps(url) {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http")) return url;
  return null;
}

function posterFromAvatars(raw) {
  const url = toHttps(raw);
  if (!url) return null;

  // CDN kinopoisk-image → стабильный avatars.mds с размером
  const kp = url.match(/\/get-kinopoisk-image\/([^/]+)\/([^/?#]+)/i);
  if (kp) {
    return `https://avatars.mds.yandex.net/get-kinopoisk-image/${kp[1]}/${kp[2]}/200x300`;
  }

  if (/\/\d+x\d+(\?|$)/.test(url) || /\/orig(\?|$)/.test(url)) return url;
  return `${url.replace(/\/$/, "")}/200x300`;
}

function posterUrl(movie) {
  const id = movie?.id;
  const posters = movie?.gallery?.posters;
  const raw =
    posters?.kpVertical?.avatarsUrl ||
    posters?.hdVertical?.avatarsUrl ||
    posters?.kpVertical?.fallbackUrl ||
    posters?.hdVertical?.fallbackUrl ||
    null;

  const fromApi = posterFromAvatars(raw);
  const list = [];
  if (id) {
    list.push(`https://st.kp.yandex.net/images/film_iphone/iphone180_${id}.jpg`);
    list.push(`https://st.kp.yandex.net/images/film_iphone/iphone360_${id}.jpg`);
    list.push(`https://www.kinopoisk.ru/images/sm_film/${id}.jpg`);
  }
  if (fromApi) list.push(fromApi);

  return {
    poster: list[0] || null,
    posters: [...new Set(list.filter(Boolean))],
  };
}

function yearStartOf(movie) {
  const direct =
    movie?.productionYear ??
    movie?.year ??
    movie?.releaseYears?.start ??
    movie?.releaseYears?.end ??
    null;
  if (direct == null || direct === "") return null;
  const num = Number(String(direct).slice(0, 4));
  return Number.isFinite(num) ? num : null;
}

function yearOf(movie) {
  const start = yearStartOf(movie);
  const end = movie?.releaseYears?.end
    ? Number(String(movie.releaseYears.end).slice(0, 4))
    : null;
  if (start && end && end !== start) return `${start}–${end}`;
  if (start) return String(start);
  return "";
}

function normalizeMovie(movie) {
  if (!movie?.id) return null;
  const typename = movie.__typename || "Film";
  if (typename === "Person" || typename === "Cinema" || typename === "MovieListMeta") {
    return null;
  }

  const type = typeFromTypename(typename);
  const title = movie.title?.russian || movie.title?.original || "Без названия";
  const rating = movie.rating?.kinopoisk?.value;
  const posters = posterUrl(movie);
  return {
    id: String(movie.id),
    type,
    title,
    original: movie.title?.original || "",
    year: yearOf(movie),
    yearStart: yearStartOf(movie),
    rating: typeof rating === "number" ? rating.toFixed(1) : "",
    poster: posters.poster,
    posters: posters.posters,
    typename,
  };
}

function collectMovies(payload) {
  const top = payload?.suggest?.top || payload?.data?.suggest?.top;
  if (!top) return [];

  const list = [];
  const seen = new Set();

  const push = (movie) => {
    const item = normalizeMovie(movie);
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    list.push(item);
  };

  const topGlobal = top.topResult?.global;
  if (topGlobal && topGlobal.title) push(topGlobal);

  for (const entry of top.movies || []) {
    push(entry?.movie || entry);
  }

  return list.slice(0, 20);
}

async function searchSuggest(keyword) {
  const q = keyword.trim();
  if (q.length < 2) return [];

  const url = `https://www.kinopoisk.ru/api/suggest/v2/?query=${encodeURIComponent(q)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Referer: "https://www.kinopoisk.ru/",
    },
  });

  if (!response.ok) {
    throw new Error(`Suggest HTTP ${response.status}`);
  }

  const json = await response.json();
  return collectMovies(json);
}

async function searchGraphql(keyword) {
  const q = keyword.trim();
  if (q.length < 2) return [];

  const body = JSON.stringify({
    operationName: "SuggestSearch",
    variables: {
      keyword: q,
      yandexCityId: 6,
      limit: 20,
      withUserData: false,
    },
    query: SUGGEST_QUERY,
  });

  const response = await fetch(
    "https://graphql.kinopoisk.ru/graphql/?operationName=SuggestSearch",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "*/*",
        "Accept-Language": "ru,en;q=0.9",
        Origin: "https://www.kinopoisk.ru",
        Referer: "https://www.kinopoisk.ru/",
        "service-id": "25",
        "source-id": "1",
        "x-preferred-language": "ru",
        "x-request-id": genId(),
        "x-search-request-id": genSearchId(),
        traceparent: genTrace(),
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.errors && !json.data) {
    throw new Error(json.errors[0]?.message || "GraphQL error");
  }

  return collectMovies(json);
}

async function searchKinopoisk(keyword) {
  try {
    const viaSuggest = await searchSuggest(keyword);
    if (viaSuggest.length) return viaSuggest;
  } catch (_) {
    // fallback below
  }
  return searchGraphql(keyword);
}

function uniqMovies(items) {
  const seen = new Set();
  const list = [];
  for (const item of items || []) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    list.push(item);
  }
  return list;
}

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function pickRandom(arr, count) {
  return shuffle(arr).slice(0, count);
}

async function searchMany(queries, perQuery = 12) {
  const batches = await Promise.all(
    queries.map(async (query) => {
      try {
        return await searchKinopoisk(query);
      } catch (_) {
        return [];
      }
    })
  );
  return uniqMovies(batches.flat()).slice(0, Math.max(perQuery * queries.length, 20));
}

async function fetchNovelties(limit = 12) {
  const year = new Date().getFullYear();
  const queries = [
    String(year),
    String(year - 1),
    "премьера",
    "новинки",
    "новые сериалы",
  ];
  const list = await searchMany(queries, 10);
  list.sort((a, b) => (b.yearStart || 0) - (a.yearStart || 0));
  return list.slice(0, limit);
}

async function fetchRandom(limit = 12) {
  const year = new Date().getFullYear();
  const years = [
    year,
    year - 1,
    year - 2,
    year - 3,
    year - 5,
    year - 8,
    year - 12,
  ];
  const filmSeeds = [
    "боевик",
    "комедия",
    "драма",
    "триллер",
    "фантастика",
    "детектив",
    "ужасы",
    "приключения",
    ...pickRandom(years, 3).map(String),
  ];
  const seriesSeeds = [
    "сериал",
    "сериал драма",
    "сериал комедия",
    "мини-сериал",
    "детектив сериал",
    ...pickRandom(years, 2).map((y) => `сериал ${y}`),
  ];
  const cartoonSeeds = [
    "мультфильм",
    "мультсериал",
    "анимация",
    "семейный мультфильм",
    "детский мультфильм",
  ];
  const animeSeeds = ["аниме", "аниме сериал", "японская анимация", "аниме фильм"];

  const [films, series, cartoons, anime] = await Promise.all([
    searchMany(pickRandom(filmSeeds, 3), 10),
    searchMany(pickRandom(seriesSeeds, 3), 10),
    searchMany(pickRandom(cartoonSeeds, 2), 10),
    searchMany(pickRandom(animeSeeds, 2), 10),
  ]);

  const filmOnly = films.filter((item) => item.type === "film");
  const seriesOnly = series.filter((item) => item.type === "series");

  // Aim for a mixed shelf: films, series, cartoons, anime.
  const mix = uniqMovies([
    ...pickRandom(filmOnly, Math.max(2, Math.ceil(limit * 0.35))),
    ...pickRandom(seriesOnly, Math.max(2, Math.ceil(limit * 0.25))),
    ...pickRandom(cartoons, Math.max(1, Math.ceil(limit * 0.2))),
    ...pickRandom(anime, Math.max(1, Math.ceil(limit * 0.2))),
  ]);

  if (mix.length >= limit) return shuffle(mix).slice(0, limit);

  const filler = uniqMovies([...films, ...series, ...cartoons, ...anime]).filter(
    (item) => !mix.some((x) => x.id === item.id)
  );
  return shuffle([...mix, ...pickRandom(filler, limit - mix.length)]).slice(0, limit);
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULTS);
  let domain = current.domain;
  if (!domain && current.urlTemplate) {
    domain = domainFromTemplate(current.urlTemplate);
  }
  domain = normalizeDomain(domain || DEFAULTS.domain);
  await chrome.storage.sync.set({
    enabled: current.enabled !== false,
    askBeforeRedirect: current.askBeforeRedirect !== false,
    domain,
    siteName: current.siteName || DEFAULTS.siteName,
  });
  const settings = await getSettings();
  await updateBadge(settings.enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();
  await updateBadge(settings.enabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) {
    updateBadge(changes.enabled.newValue !== false);
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const settings = await getSettings();
  if (!settings.enabled) return;
  if (settings.askBeforeRedirect) return;

  const rewritten = rewriteKinopoiskUrl(details.url, settings.domain);
  if (!rewritten || rewritten === details.url) return;

  chrome.tabs.update(details.tabId, { url: rewritten });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "search") {
    searchKinopoisk(message.query || "")
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) =>
        sendResponse({ ok: false, error: error?.message || String(error) })
      );
    return true;
  }

  if (message?.type === "novelties") {
    fetchNovelties(Number(message.limit) || 12)
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) =>
        sendResponse({ ok: false, error: error?.message || String(error) })
      );
    return true;
  }

  if (message?.type === "random") {
    fetchRandom(Number(message.limit) || 12)
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) =>
        sendResponse({ ok: false, error: error?.message || String(error) })
      );
    return true;
  }

  if (message?.type === "buildUrl") {
    getSettings().then((settings) => {
      const url = buildTargetUrl(settings.domain, {
        type: message.itemType,
        id: message.id,
      });
      sendResponse({ ok: Boolean(url), url });
    });
    return true;
  }

  if (message?.type === "pageOffer") {
    getSettings().then((settings) => {
      if (!settings.enabled || !settings.askBeforeRedirect) {
        sendResponse({ ok: true, show: false });
        return;
      }
      const url = buildTargetUrl(settings.domain, {
        type: message.itemType,
        id: message.id,
      });
      sendResponse({
        ok: Boolean(url),
        show: Boolean(url),
        url,
        siteName: settings.siteName,
      });
    });
    return true;
  }

  return false;
});

getSettings().then((s) => updateBadge(s.enabled));
