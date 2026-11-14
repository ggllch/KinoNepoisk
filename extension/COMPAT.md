# Совместимость KinoNepoisk 1.4.2

## Desktop

| Браузер | Статус | Как ставить | Заметки |
|---|---|---|---|
| Chrome | OK | `chrome://extensions` → режим разработчика → распакованное | Manifest V3, service worker |
| Edge | OK | `edge://extensions` → то же | Chromium, тот же пакет |
| Яндекс.Браузер | OK | `browser://extensions` | Chromium |
| Opera / Vivaldi | OK | аналогично Chromium | Может попросить подтверждение прав |
| Firefox | OK с оговорками | `about:debugging` → временное дополнение | Есть `browser_specific_settings.gecko`. После перезапуска Firefox временное расширение снимается. Для постоянного — подпись/AMO |
| Brave | OK | как Chrome | |

## Mobile

| Платформа | Статус | Комментарий |
|---|---|---|
| Chrome Android | Нет | Официально расширения не поддерживаются |
| Edge Android | Нет | Нет расширений |
| Firefox Android | Частично | Только расширения из allowlist/AMO; sideload ограничен. Текущий пакет **не рассчитан** на магазин Firefox Android |
| Kiwi / Lemur Android | Возможно | Можно грузить Chromium-расширения вручную; popup/UX мелкий, поиск/фильтры неудобны |
| Яндекс Android | Ограничено | Зависит от версии; не гарантируется |
| iOS / Safari | Нет | Обычные Chrome-расширения не ставятся |

## Технические риски

- `background.service_worker` + `importScripts` — ок для Chrome/Edge/Firefox desktop MV3
- Поиск/постеры тянут `kinopoisk.ru` / `yandex.net` — на мобильных и в строгих сетях могут отваливаться
- `chrome.storage.sync` на Firefox требует аккаунт Firefox для синка; локально работает через storage API
- Авторедирект через `webNavigation` на мобильных Chromium-форках обычно работает, UI popup — тесный

## Вывод

- **Рабочий целевой контур:** Chrome / Edge / Яндекс / Firefox **на десктопе**
- **Мобильные:** не основной канал; максимум ручная установка в Kiwi-подобных браузерах
