# ADR-003: Технологический стек для Клёво

**Статус:** Принято  
**Дата:** 2026-04-08  
**Автор:** Replicate Pipeline (Claude)  
**Контекст:** Phase 1 Architecture — выбор технологий

---

## Контекст

Нужно выбрать технологический стек для MVP клона Cleo AI, учитывая:
- Целевая архитектура: Distributed Monolith в Monorepo
- Инфраструктура: VPS (AdminVPS/HOSTKEY)
- Деплой: Docker Compose
- AI Integration: MCP серверы
- Команда: небольшая (1-5 разработчиков), быстрый MVP

## Анализ решений

### Frontend

| Вариант | Плюсы | Минусы | Оценка |
|---------|-------|--------|:------:|
| **Next.js 15** | SSR/SSG, App Router, AI SDK, большое сообщество | Сложнее чистого React | 9/10 |
| React + Vite | Простота, скорость сборки | Нет SSR из коробки | 7/10 |
| Vue.js 3 | Простота, хорошая документация | Меньше AI-интеграций | 6/10 |

**Решение: Next.js 15** — SSR для SEO, Vercel AI SDK для стриминга AI-ответов, большая экосистема

### Backend / API

| Вариант | Плюсы | Минусы | Оценка |
|---------|-------|--------|:------:|
| **Next.js API Routes** | Монорепо, меньше сервисов | Ограниченные воркеры | 8/10 |
| FastAPI (Python) | AI/ML нативный, async | Отдельный сервис | 7/10 |
| Node.js + Hono | Быстрый, lightweight | Меньше AI-тулинга | 7/10 |

**Решение: Next.js API Routes + отдельный Python-микросервис для AI-анализа** — монорепо, но с выделенным AI-слоем

### База данных

| Вариант | Плюсы | Минусы | Оценка |
|---------|-------|--------|:------:|
| **Supabase (PostgreSQL)** | Auth из коробки, realtime, RLS | Зависимость от SaaS | 9/10 |
| PostgreSQL (self-hosted) | Полный контроль | Нужно настраивать auth, migrations | 7/10 |
| PlanetScale (MySQL) | Branching, serverless | MySQL, нет в РФ | 5/10 |

**Решение: Supabase** — быстрый старт, встроенная авторизация, Row Level Security для финансовых данных

> **Важно:** Для production РФ рассмотреть self-hosted Supabase на VPS (ФЗ-152 требует хранение данных в РФ)

### AI/LLM

| Вариант | Плюсы | Минусы | Оценка |
|---------|-------|--------|:------:|
| **Claude 3.5 Sonnet (Anthropic)** | Лучший для structured outputs, дешевле GPT-4 | API недоступен в РФ напрямую | 8/10 |
| GPT-4o (OpenAI) | Мощный, широко используется | Дороже, API через прокси для РФ | 8/10 |
| YandexGPT (Yandex) | Доступен в РФ, русский язык | Хуже для сложной аналитики | 6/10 |

**Решение: Claude 3.5 Sonnet через API-прокси (для MVP)** + YandexGPT как fallback  

> **ADR-разворка:** Для production — собственный промокси или партнёрство для API-доступа. Команда Cleo использовала комбинацию LLMs — [источник](https://web.meetcleo.com/blog/how-cleo-uses-ai).

### Банковская интеграция (специфика РФ)

| Вариант | Плюсы | Минусы | Оценка |
|---------|-------|--------|:------:|
| **SMS-парсинг** | Работает со всеми банками, MVP-ready | Ненадёжно, банки блокируют | 7/10 |
| Open API Т-Банка | Официальный, надёжный | Только Т-Банк | 8/10 |
| Open API Сбера | Официальный | Только Сбер, сложная интеграция | 7/10 |
| **CSV-upload (MVP)** | Работает сразу, нет зависимостей | Ручной ввод для пользователя | 9/10 |

**Решение:** 
- **MVP:** CSV upload + ручной ввод трат
- **v1:** Open API Т-Банка (самый открытый)
- **v2:** Агрегатор (SMS + Open Banking APIs)

### Визуализация

| Вариант | Решение |
|---------|---------|
| **Recharts** | Пай-чарты расходов (как у оригинала Cleo) |
| Tremor | Компоненты для дашборда |

## Итоговый стек

```yaml
# Монорепо структура
apps/
  web/          # Next.js 15 (frontend + API routes)
  ai-service/   # Python FastAPI (AI анализ транзакций)

packages/
  db/           # Supabase клиент + типы
  ui/           # shadcn/ui компоненты
  types/        # Shared TypeScript типы

# Infrastructure
database: Supabase (PostgreSQL)
auth: Supabase Auth
ai_primary: Claude 3.5 Sonnet API
ai_fallback: YandexGPT
charts: Recharts
styling: Tailwind CSS + shadcn/ui
deployment: Docker Compose на VPS
containerization: Docker
```

## Последствия

- **Положительные:** Быстрый MVP (2-4 недели), AI SDK поддерживает стриминг ответов
- **Рисковые:** API-доступ к LLM из РФ требует прокси — нужно решить до MVP
- **Юридические:** Хранение финансовых данных в РФ (ФЗ-152) → self-hosted Supabase на VPS

## Источники

- [Cleo tech stack reference](https://web.meetcleo.com/blog/how-cleo-uses-ai)
- [Next.js AI SDK docs](https://sdk.vercel.ai/)
- [Supabase self-hosted](https://supabase.com/docs/guides/self-hosting)
