# CandleAI — Vercel + OpenAI Vision MVP

Это версия проекта, где скриншот реально передаётся в OpenAI через серверную Vercel Function.

## 1. Файлы

- `index.html` — интерфейс Mini App
- `app.js` — загрузка/сжатие изображения и вызов API
- `api/analyze.js` — серверный AI-анализ
- `style.css` — интерфейс
- `vercel.json` — настройки Vercel

## 2. Добавь ключ OpenAI в Vercel

В Vercel открой:

Project → Settings → Environment Variables

Добавь:

`OPENAI_API_KEY`

Значение — твой API key.

Можно также добавить:

`OPENAI_MODEL` = `gpt-5`

Ключ НЕ нужно вставлять в HTML или JavaScript.

После изменения Environment Variables сделай Redeploy.

## 3. GitHub

Залей содержимое этой папки в репозиторий `candleai`.

Структура:

```text
candleai/
├── index.html
├── app.js
├── style.css
├── package.json
├── vercel.json
├── .env.example
└── api/
    └── analyze.js
```

## 4. Vercel

Если репозиторий уже подключён к Vercel, после push в `main` Vercel автоматически создаст новый production deployment.

Открой свой `candleai.vercel.app`.

## 5. Как проверить

1. Выбери `30 сек`, `1 мин`, `2 мин` и т.д.
2. Загрузи скриншот графика.
3. Нажми `Анализировать график`.
4. Frontend отправит изображение на `/api/analyze`.
5. Vercel Function отправит изображение в OpenAI.
6. Ответ AI появится на странице.

## Важно

Это MVP визуального анализа, а не торговая система с гарантированным исходом. Перед использованием с реальными деньгами нужна отдельная проверка качества на исторических данных и paper trading.

OpenAI поддерживает image input в Responses API; изображение можно передавать как data URL. API-ключ должен оставаться на сервере, а не в клиентском JavaScript.
