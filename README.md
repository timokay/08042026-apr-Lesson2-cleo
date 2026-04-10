# Клёво

> AI финансовый советник с характером для российской молодёжи 18-30 лет

**Клёво** — российская адаптация Cleo AI ($280M ARR, 7M пользователей). Юмористический ростер расходов + паразит-детектор подписок + AI-чат советник.

---

## Быстрый старт

```bash
# 1. Клонировать и настроить окружение
git clone https://github.com/timokay/08042026-apr-Lesson2-cleo
cd 08042026-apr-Lesson2-cleo
cp .env.example .env        # заполнить переменные

# 2. Запустить всё через Docker Compose
docker compose up -d

# 3. Проверить
curl http://localhost:3000/api/health   # → {"status":"ok"}
curl http://localhost:8000/health       # → {"status":"ok","llm":"connected"}
```

Откройте [http://localhost:3000](http://localhost:3000) — загрузите CSV выписку из Т-Банка.

---

## Структура проекта

```
klevo/
├── apps/
│   ├── web/              Next.js 15 (App Router + BFF)
│   └── ai-service/       Python FastAPI (AI логика)
├── packages/
│   ├── types/            Shared TypeScript types
│   ├── ui/               Shared React components (Recharts + Tailwind)
│   └── db/               Supabase schema + RLS + migrations
├── services/
│   ├── nginx/            Reverse proxy (TLS + rate limiting)
│   └── redis/            Rate limiting + session cache
└── docker-compose.yml    5 сервисов
```

---

## Tech Stack

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 15, Tailwind CSS v4 |
| AI Service | Python FastAPI, Claude 3.5 Sonnet |
| Fallback AI | YandexGPT 3 |
| Database | Supabase PostgreSQL (self-hosted) + RLS |
| Cache | Redis 7 |
| Proxy | Nginx (SSL + CSP) |
| Deploy | Docker Compose → VPS HOSTKEY (Москва) |

---

## Команды разработки

```bash
# Запуск тестов
python3 -m pytest apps/ai-service/tests/ -v

# Сброс и сидирование базы
pnpm db:reset
pnpm db:seed

# Пересборка после изменений
docker compose build && docker compose up -d

# Логи
docker compose logs -f ai-service
docker compose logs -f web
```

---

## Переменные окружения

Скопируй `.env.example` → `.env` и заполни:

| Переменная | Описание |
|-----------|---------|
| `CLAUDE_API_KEY` | Claude API через proxyapi.ru |
| `YANDEX_GPT_API_KEY` | YandexGPT fallback |
| `SUPABASE_URL` | Supabase self-hosted URL |
| `SUPABASE_ANON_KEY` | Публичный ключ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Серверный ключ (только backend) |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `JWT_SECRET` | JWT секрет для Supabase Auth |

---

## Документация

| Документ | Содержание |
|---------|-----------|
| [`docs/Architecture.md`](docs/Architecture.md) | Архитектура, схема БД, tech stack |
| [`docs/Specification.md`](docs/Specification.md) | User Stories, API контракты, NFR |
| [`docs/Pseudocode.md`](docs/Pseudocode.md) | 4 ключевых алгоритма |
| [`docs/Completion.md`](docs/Completion.md) | Деплой, мониторинг, checklist |
| [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) | Гид разработчика |
| [`CLAUDE.md`](CLAUDE.md) | AI-контекст проекта (Claude Code) |

---

## Фичи MVP

- **CSV Upload** — Т-Банк, Сбер, Альфа-Банк (UTF-8 + cp1251)
- **Паразит-детектор** — автоматический поиск забытых подписок
- **AI Ростер** — юмористический анализ расходов (SSE стриминг)
- **Топ-5 категорий** — pie chart Recharts
- **Шеринг** — публичная ссылка на ростер
- **Auth** — Supabase Auth с httpOnly cookies

---

## Безопасность

- Сырые CSV файлы **не хранятся** — обработка только в памяти
- RLS политики на всех таблицах Supabase
- API ключи только в env vars, никогда в коде
- Rate limiting: 10 AI запросов/мин, 1 ростер/месяц (free план)
- Данные на VPS в Москве (ФЗ-152)

---

*Powered by [Claude Code](https://claude.ai/code)*
