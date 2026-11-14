(function (root) {
  const DEFAULTS = {
    enabled: true,
    domain: "www.kinokino.vip",
    siteName: "Kinokino",
    // старое поле — для миграции
    urlTemplate: "",
  };

  const SERIES_TYPES = new Set(["TvSeries", "TvShow", "MiniSeries"]);

  function typeFromTypename(typename) {
    if (SERIES_TYPES.has(typename)) return "series";
    return "film";
  }

  function typeFromPath(pathname) {
    const match = pathname.match(/^\/(film|series)\/(\d+)/i);
    if (!match) return null;
    return { type: match[1].toLowerCase(), id: match[2] };
  }

  function normalizeDomain(domain) {
    let value = String(domain || DEFAULTS.domain).trim();
    value = value.replace(/^https?:\/\//i, "");
    value = value.replace(/\/.*$/, "");
    value = value.replace(/\/+$/, "");
    return value || DEFAULTS.domain;
  }

  function templateFromDomain(domain) {
    return `https://${normalizeDomain(domain)}/{type}/{id}/`;
  }

  function domainFromTemplate(template) {
    try {
      const sample = String(template || "")
        .replaceAll("{type}", "film")
        .replaceAll("{id}", "1")
        .replaceAll("{path}", "film/1");
      return normalizeDomain(new URL(sample).host);
    } catch {
      return DEFAULTS.domain;
    }
  }

  function buildTargetUrl(domainOrTemplate, { type, id }) {
    const safeType = type === "series" ? "series" : "film";
    const safeId = String(id);
    const path = `${safeType}/${safeId}`;

    let base = String(domainOrTemplate || "").trim();
    if (!base) base = templateFromDomain(DEFAULTS.domain);

    // Если передали просто домен без схемы/плейсхолдеров
    if (!/^https?:\/\//i.test(base) && !/\{(type|id|path)\}/.test(base)) {
      base = templateFromDomain(base);
    }

    let url = base
      .replaceAll("{type}", safeType)
      .replaceAll("{id}", safeId)
      .replaceAll("{path}", path);

    if (!/\{(type|id|path)\}/.test(base) && !url.includes(safeId)) {
      url = base.replace(/\/?$/, "/") + path + "/";
    }

    try {
      return new URL(url).toString();
    } catch {
      return null;
    }
  }

  function rewriteKinopoiskUrl(urlString, domainOrTemplate) {
    let url;
    try {
      url = new URL(urlString);
    } catch {
      return null;
    }

    const host = url.hostname.toLowerCase();
    if (host !== "kinopoisk.ru" && !host.endsWith(".kinopoisk.ru")) {
      return null;
    }

    const parsed = typeFromPath(url.pathname);
    if (!parsed) return null;

    return buildTargetUrl(domainOrTemplate, parsed);
  }

  root.KinoNepoiskShared = {
    DEFAULTS,
    SERIES_TYPES,
    typeFromTypename,
    typeFromPath,
    normalizeDomain,
    templateFromDomain,
    domainFromTemplate,
    buildTargetUrl,
    rewriteKinopoiskUrl,
  };
})(globalThis);
