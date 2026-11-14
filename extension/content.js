(function () {
  const DISMISS_KEY = "knp_offer_dismissed";

  function parseFilmPage(pathname) {
    const match = pathname.match(/^\/(film|series)\/(\d+)/i);
    if (!match) return null;
    return { type: match[1].toLowerCase(), id: match[2] };
  }

  function alreadyDismissed(id) {
    try {
      return sessionStorage.getItem(`${DISMISS_KEY}:${id}`) === "1";
    } catch {
      return false;
    }
  }

  function dismiss(id) {
    try {
      sessionStorage.setItem(`${DISMISS_KEY}:${id}`, "1");
    } catch (_) {
      // ignore
    }
  }

  function removeOffer() {
    document.getElementById("knp-offer-root")?.remove();
  }

  function showOffer({ siteName, url, id }) {
    removeOffer();
    const root = document.createElement("div");
    root.id = "knp-offer-root";

    const card = document.createElement("div");
    card.className = "knp-card";

    const title = document.createElement("p");
    title.className = "knp-title";
    title.textContent = `Открыть на ${siteName}?`;

    const text = document.createElement("p");
    text.className = "knp-text";
    text.textContent = "Можно перейти на зеркало с тем же id прямо сейчас.";

    const actions = document.createElement("div");
    actions.className = "knp-actions";

    const go = document.createElement("button");
    go.className = "knp-go";
    go.type = "button";
    go.textContent = "Перейти";
    go.addEventListener("click", () => {
      window.location.assign(url);
    });

    const close = document.createElement("button");
    close.className = "knp-close";
    close.type = "button";
    close.textContent = "Позже";
    close.addEventListener("click", () => {
      dismiss(id);
      removeOffer();
    });

    actions.append(go, close);
    card.append(title, text, actions);
    root.append(card);
    document.documentElement.appendChild(root);
  }

  async function init() {
    const parsed = parseFilmPage(location.pathname);
    if (!parsed) return;
    if (alreadyDismissed(parsed.id)) return;

    const response = await chrome.runtime.sendMessage({
      type: "pageOffer",
      itemType: parsed.type,
      id: parsed.id,
      pageUrl: location.href,
    });

    if (!response?.ok || !response.show || !response.url) return;
    showOffer({
      siteName: response.siteName || "Mirror",
      url: response.url,
      id: parsed.id,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
