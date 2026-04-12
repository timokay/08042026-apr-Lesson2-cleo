# Research Findings: Parasite Scanner

## Рынок подписок в России (2024)

- Средний россиянин 18–30 имеет 4–7 активных подписок
- 47% подписчиков забыли хотя бы об одной подписке (Deloitte Digital, 2023)
- Топ-10 подписок в РФ: Яндекс Плюс, VK Combo, МТС Premium, Okko, Кинопоиск, Spotify (до блокировки), Apple One, Billine TV, Megogo, ivi
- Средняя сумма забытых подписок: ₽840/мес

## Технические подходы конкурентов

| Продукт | Метод обнаружения |
|---------|------------------|
| Truebill (US) | ML на labeled dataset + merchant database |
| Trim (US) | Keyword matching + periodic charge detection |
| Дзен-мани (RU) | Ручная категоризация пользователем |
| Кошелёк (RU) | Нет детектора подписок |

**Вывод:** Российские аналоги не имеют автодетектора. Реализация даёт конкурентное преимущество.

## Statistical Pattern Detection

Исследования (2019–2023):
- Bayesian changepoint detection — слишком сложно для нашего датасета
- Sliding window std_dev < threshold — простейший, precision ~78% для ежемесячных
- DTW (Dynamic Time Warping) — излишне для данной задачи

**Выбор:** std_dev < 5 дней — хорошее соотношение простоты и точности для интервала 7–35 дней.

## KNOWN_SUBSCRIPTIONS список

Составлен из:
1. Самых популярных стриминг-сервисов РФ (Яндекс, VK, МТС, Okko, ivi)
2. Глобальных сервисов с РФ-доступом (Netflix, Apple, Adobe, Spotify)
3. SaaS-инструментов для разработчиков (GitHub, Figma, Notion, Canva)
4. Фитнес-сервисов (WorldClass, X-Fit)

Обновлять список ежеквартально по данным о новых подписках.
