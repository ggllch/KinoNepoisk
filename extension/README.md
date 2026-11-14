# KinoNepoisk

Расширение для Chrome / Edge / Firefox / Яндекс.Браузера.

## Возможности

- Автозамена `kinopoisk.ru/film|series/...` на свой домен
- Настраиваемый шаблон URL (`{type}`, `{id}`, `{path}`)
- Поиск фильмов/сериалов с подсказками Кинопоиска
- Переключатель вкл/выкл
- Ссылка на донат

По умолчанию:

`https://www.kinopoisk.ru/film/301/` → `https://www.kinokino.vip/film/301/`

## Установка (Chrome / Edge / Яндекс)

1. Открой `chrome://extensions` (или `edge://extensions`).
2. Включи **Режим разработчика**.
3. **Загрузить распакованное расширение** → папка `kinonepoisk`.
4. После обновления файлов нажми **Обновить** на карточке расширения.

## Установка (Firefox)

1. `about:debugging#/runtime/this-firefox`
2. **Загрузить временное дополнение…** → `manifest.json`

## Шаблон ссылки

Примеры:

- `https://www.kinokino.vip/{type}/{id}/`
- `https://example.com/watch/{path}`
- `https://mirror.site/{type}/{id}`

`{type}` — `film` или `series`, `{id}` — id Кинопоиска, `{path}` — `film/301`.
