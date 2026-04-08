# Product Requirements Document: Клёво
**Версия:** 1.0 | **Дата:** 2026-04-08 | **Статус:** Draft

---

## 1. Executive Summary

**Клёво** — AI-финансовый ассистент с характером для российской молодёжи 18-30 лет. Российский клон Cleo AI (https://meetcleo.com), адаптированный под специфику РФ-рынка: юмористический "ростер" расходов, анализ трат и автоматический поиск паразитных подписок.

**Ключевая дифференциация:** Единственный AI-финансовый советник в РФ с "personality" — дружелюбная честность вместо скучных банковских дашбордов.

**Бизнес-цель:** 10,000 платящих подписчиков за 12 месяцев → ~3M₽/мес ARR → Breakeven.

---

## 2. Problem Statement

### Ситуация (Situation)
Российская молодёжь 18-30 лет активно использует мобильные банки (Т-Банк, Сбер), но большинство не управляет финансами осознанно.

### Осложнение (Complication)
- 89% молодёжи хотят финансовую подушку, но не копят ([ЦБ РФ](https://cbr.ru/analytics/szpp/fin_literacy/research/fin_ed_5/))
- Импульсивные покупки — норма поведения 18-24 лет ([НАФИ](https://nafi.ru/analytics/naskolko-finansovo-gramotny-rossiyskie-podrostki-i-molodezh-do-24-let/))
- Существующие инструменты (Дзен-мани, CoinKeeper) — скучные таблицы без AI
- Банковские AI-боты корпоративные, без personality
- Western fintech (Cleo, Revolut) недоступен в РФ

### Ключевой вопрос (Question)
Как создать AI-финансового советника, который молодёжь будет использовать с удовольствием, а не из обязанности?

### Ответ (Answer)
Финансовый советник с характером: юмор + честность + немедленная ценность (найти паразитов, зарострить расходы) + легко поделиться.

---

## 3. Target Users

### Primary Persona: Максим, 24 года, Москва
- Работает в IT или маркетинге, зарплата 80-120K₽
- Тратит всё до зарплаты, не понимает куда
- Использует Т-Банк, покупки онлайн и в доставке
- Смотрит мемы в ВКонтакте, финансовый контент в Telegram
- **Job-to-be-Done:** "Помоги понять, куда уходят деньги — весело, а не занудно"

### Secondary Persona: Алина, 22 года, Санкт-Петербург
- Студентка/джун, 40-60K₽
- Несколько забытых подписок, живёт от стипендии до зарплаты
- Активна в TikTok и ВКонтакте, делится мемами
- **Job-to-be-Done:** "Найди, где я теряю деньги незаметно"

### Tertiary Persona: Дмитрий, 28 лет, регионы
- Семья, двое детей, 60-80K₽, хочет копить на что-то конкретное
- Использует Сбербанк + Т-Банк
- **Job-to-be-Done:** "Помоги выстроить систему накоплений на конкретную цель"

---

## 4. MVP Feature Set

### 4.1 Core Features (MVP — 4-6 недель)

| # | Feature | Priority | User Story |
|---|---------|----------|-----------|
| F1 | CSV Upload — загрузка выписки | P0 | As Максим, I want to upload my bank statement CSV so that I don't need to connect bank accounts immediately |
| F2 | AI Roast Mode | P0 | As Максим, I want AI to roast my spending so that I laugh and actually pay attention |
| F3 | Топ-5 категорий трат | P0 | As Алина, I want to see where my money goes so that I understand my spending patterns |
| F4 | Паразит-сканер | P0 | As Алина, I want to find forgotten subscriptions so that I can save money immediately |
| F5 | AI Chat — вопросы о тратах | P1 | As Максим, I want to ask AI about my spending so that I get personalized advice |
| F6 | Шеринг ростера | P1 | As Максим, I want to share my roast screenshot so that my friends laugh and try the app |

### 4.2 v1 Features (1-2 месяца после MVP)

| # | Feature | Notes |
|---|---------|-------|
| F7 | Подключение банков (Т-Банк API или SMS) | Open Banking или SMS парсинг |
| F8 | Автосбережения (правило %) | Клёво Plus фича |
| F9 | Финансовые цели с прогресс-баром | Элемент варианта B CJM |
| F10 | История трат 6+ месяцев | Клёво Plus |
| F11 | Streak система (экономия N дней) | Геймификация retention |

### 4.3 v2 Features (3-6 месяцев)

| # | Feature | Notes |
|---|---------|-------|
| F12 | Прогноз cash flow на 3 мес | ML модель |
| F13 | Советы по инвестициям (ОФЗ, депозиты) | Регуляторный риск — проверить ФЗ |
| F14 | Сравнение с "нормой" по региону | Агрегированная статистика |
| F15 | Telegram Mini App | Расширение каналов |

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Первый ростер: < 5 секунд после загрузки CSV (P0)
- AI ответ в чате: < 3 секунды (streaming preferred) (P0)
- Страница загружается: < 2 секунды (LCP) (P1)

### 5.2 Security
- Финансовые данные шифруются в покое (AES-256) (P0)
- Пользовательские данные хранятся на серверах в РФ (ФЗ-152) (P0)
- CSV не хранится постоянно — только извлечённые транзакции (P1)
- API-ключи LLM — только server-side, никогда client-side (P0)

### 5.3 Scalability
- MVP: 100 concurrent users
- v1: 10,000 MAU
- v2: 100,000 MAU

### 5.4 Compliance
- ФЗ-152 (персональные данные)
- ФЗ-161 (национальная платёжная система) — при работе с платёжными данными
- GDPR — при работе с иностранными пользователями (опционально v2)

### 5.5 Availability
- MVP: 99% uptime (single VPS)
- v1: 99.9% (primary + backup VPS)

---

## 6. Success Metrics

### North Star Metric
**Количество "просветляющих моментов"** — пользователей, изменивших финансовое поведение после использования Клёво (прокси: повторное использование > 4 раз за месяц)

### Acquisition
- CAC < 150₽
- Органика > 40% от новых пользователей (из шеринга ростеров)

### Activation
- Activation rate (первый ростер завершён): > 55%
- Time-to-AHA: < 60 секунд

### Retention
- D7 retention: > 35%
- D30 retention: > 20%

### Revenue
- Free→Plus конверсия: > 12% в первые 30 дней
- Monthly Churn: < 8%
- MRR через 12 месяцев: > 3M₽ (10,000 подписчиков × 299₽)

### Referral
- Viral coefficient K: > 1.2
- % пользователей, поделившихся ростером: > 30%

---

## 7. Timeline

| Phase | Срок | Deliverables |
|-------|------|--------------|
| MVP | Нед. 1-6 | F1-F6: CSV upload, ростер, паразит-сканер, шеринг |
| Private Beta | Нед. 7-8 | 100 тестовых пользователей, итерации по UX |
| Public Launch | Нед. 9-10 | Запуск в VK, Telegram, TikTok |
| v1.0 | Мес. 3-4 | F7-F11: банковская интеграция, автосбережения, цели |
| v2.0 | Мес. 5-6 | F12-F15: прогнозы, инвестиции, Telegram Mini App |

---

## 8. Risks & Mitigations

| Риск | Вероятность | Влияние | Митигация |
|------|:-----------:|:-------:|-----------|
| Ростер воспринимается как обидный | Medium | High | Soft tone ("дружелюбная честность"), тест на фокус-группе до запуска |
| LLM API недоступен из РФ | High | Critical | API-прокси или YandexGPT fallback (ADR-003) |
| ФЗ-152 нарушения | Medium | Critical | Self-hosted Supabase на VPS в РФ от старта |
| Конкуренты (Т-Банк) копируют фичу | Medium | High | Скорость + personality — сложно скопировать быстро |
| Низкая конверсия free→paid | Medium | High | Paywall после ростера (эмоциональный пик), A/B тест |

---

## 9. Dependencies & Integrations

| Интеграция | Тип | MVP | v1 |
|-----------|-----|:---:|:--:|
| Claude API (Anthropic) | AI/LLM | ✅ | ✅ |
| YandexGPT | AI/LLM (fallback) | ⚡ | ✅ |
| Supabase | Database + Auth | ✅ | ✅ |
| Т-Банк Open API | Banking | ❌ | ✅ |
| SMS парсинг | Banking (alternative) | ❌ | ✅ |
| Recharts | Charts | ✅ | ✅ |
| Telegram Bot API | Channel | ❌ | ✅ |
