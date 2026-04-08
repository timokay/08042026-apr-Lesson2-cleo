# Клёво — Executive Summary
**Дата:** 2026-04-08 | **SPARC версия:** 1.0

---

## Overview

**Клёво** — AI-финансовый ассистент с характером для российской молодёжи 18-30 лет. Российская адаптация Cleo AI ($280M ARR, 7M пользователей в США). Использует юмористический "ростер расходов" как viral hook и паразит-детектор как onboarding механику.

**Название:** "Клёво" = "Cleo" + молодёжный сленг "клёво = круто". Двойной смысл.

---

## Problem & Solution

**Problem:** Российская молодёжь не управляет финансами — не из-за незнания, а из-за того, что существующие инструменты скучные и требуют дисциплины.

**Solution:** Финансовый советник с характером — юмор + немедленная ценность (найти паразитов/ростер) + вирусная механика (шеринг ростера) = продукт, которым хочется пользоваться.

**Дифференциация:** Единственный "personality-driven" AI финансовый советник в РФ. Западный конкурент (Cleo) недоступен. Банковские AI (Т-Банк, Сбер) корпоративные и скучные.

---

## Target Users

**Primary:** Максим, 24 года — IT/маркетинг, Москва, 80-120K₽, тратит всё до зарплаты  
**Secondary:** Алина, 22 года — студентка, забытые подписки, TikTok/VK  
**Tertiary:** Дмитрий, 28 лет — семья, хочет систему накоплений

---

## Key Features (MVP)

1. **Паразит-Детектор** — за 2 минуты найти забытые подписки (₽1,500-3,000/мес потенциальная экономия)
2. **AI Ростер** — юмористический анализ расходов, стриминг ответа за < 15 сек
3. **Топ-5 категорий** — пай-чарт трат (Recharts)
4. **CSV Upload** — без подключения банка для MVP
5. **Шеринг карточки** — вирусный мем-контент, органический рост

---

## Technical Approach

- **Architecture:** Distributed Monolith (Monorepo) — Next.js 15 + Python FastAPI
- **Infrastructure:** Docker Compose на VPS HOSTKEY (Москва, для ФЗ-152)
- **AI:** Claude 3.5 Sonnet (primary) + YandexGPT (fallback)
- **Database:** Supabase PostgreSQL с Row Level Security
- **Key Differentiator:** Prompt engineering для "дружелюбной честности" — тончайшая настройка тона ростера

---

## Research Highlights

1. **Finance-as-Culture:** 76% Gen Z используют TikTok/YouTube вместо банков для финсоветов ([FinTech Weekly](https://www.fintechweekly.com/magazine/articles/how-gen-z-is-changing-personal-finance-habits-in-2025))
2. **Roast culture работает:** Cleo's Roast Mode → удвоение subscriber base year-on-year ([overdraftapps.com](https://overdraftapps.com/cleo-roast-mode/))
3. **РФ рынок пустой:** Western fintech ушёл, банковские AI без personality ([Statista](https://www.statista.com/topics/6609/fintech-in-russia/))
4. **Gen AI в РФ растёт:** 58 млрд руб. рынок в 2025, банки лидируют ([СберПро](https://sber.pro/publication/daidzhest-globalnih-tehnologicheskih-trendov-ii-v-finansah-i-korporativnoi-srede-i-kosmicheskaya-ekonomika/))
5. **Молодёжь уязвима:** 89% хотят финподушку, 100% тратят импульсивно ([ЦБ РФ](https://cbr.ru/analytics/szpp/fin_literacy/research/fin_ed_5/))

---

## Success Metrics

| Метрика | Цель (12 мес.) | Источник |
|---------|:-------------:|---------|
| MAU | 50,000 | — |
| Платящих подписчиков | 10,000 | — |
| MRR | 3M₽ | 10K × 299₽ |
| Viral Coefficient K | > 1.2 | — |
| Free → Plus conversion | > 12% | — |
| D30 Retention | > 20% | — |
| CAC | < 150₽ | — |
| LTV/CAC | > 25x | LTV ~3,700₽ / CAC 150₽ |

---

## Timeline & Phases

| Phase | Фичи | Срок |
|-------|------|------|
| **MVP** | CSV Upload, Ростер, Паразит-сканер, Шеринг | Нед. 1-6 |
| **Beta** | 100 пользователей, итерации UX | Нед. 7-8 |
| **Public Launch** | VK, Telegram, TikTok кампании | Нед. 9-10 |
| **v1.0** | Банковская интеграция, автосбережения, цели | Мес. 3-4 |
| **v2.0** | Cash flow прогноз, инвестиции, Telegram Mini App | Мес. 5-6 |

---

## Risks & Mitigations

| Риск | Митигация |
|------|-----------|
| Ростер обидный, не смешной | Фокус-группа + мягкий tone ("дружелюбная честность") |
| LLM API недоступен из РФ | API прокси + YandexGPT fallback |
| ФЗ-152 нарушения | Self-hosted VPS в Москве с первого дня |
| Банки копируют | Speed to market + branding + personality (hard to copy) |

---

## Immediate Next Steps

1. Настроить monorepo: Next.js 15 + FastAPI + Docker Compose
2. Реализовать CSV parser для Т-Банк формата (P0)
3. Prompt engineering для ростера (фокус-группа 10 чел)
4. Настроить Supabase self-hosted на VPS в РФ
5. Запустить первые 100 пользователей через студенческие Telegram-чаты

---

## Documentation Package

| Файл | Содержание |
|------|-----------|
| [PRD.md](./PRD.md) | Product Requirements |
| [Solution_Strategy.md](./Solution_Strategy.md) | Problem Analysis + TRIZ |
| [Specification.md](./Specification.md) | User Stories + API Contracts |
| [Pseudocode.md](./Pseudocode.md) | Algorithms + Data Flow |
| [Architecture.md](./Architecture.md) | System Design + Tech Stack |
| [Refinement.md](./Refinement.md) | Testing + Edge Cases |
| [Completion.md](./Completion.md) | Deployment + CI/CD |
| [FACT_SHEET.md](./FACT_SHEET.md) | Intelligence on Cleo AI |
| [Research_MicroTrends.md](./Research_MicroTrends.md) | Micro-trends (strict mode) |
| [CJM_variants.md](./CJM_variants.md) | 3 CJM variants + comparison |
| [CJM_prototype.html](./CJM_prototype.html) | Interactive HTML CJM |
| [ADR-001](./ADR-001-market-localization.md) | Localization decision |
| [ADR-002](./ADR-002-cjm-variant-selection.md) | CJM variant selection |
| [ADR-003](./ADR-003-tech-stack.md) | Tech stack decision |
| [ADR-004](./ADR-004-monetization-model.md) | Monetization model |
