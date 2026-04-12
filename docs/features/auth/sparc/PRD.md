# PRD: Authentication (Auth)

## Проблема

Без авторизации нельзя изолировать данные пользователей. Транзакции, ростеры, настройки — всё требует идентификации пользователя.

## Цель

Предоставить email-based auth с Magic Link (без паролей). Сессия через httpOnly cookies. Защита всех приватных маршрутов через middleware.

## Пользователи

Все пользователи Клёво — обязательный онбординг.

## MoSCoW

### Must Have
- Email Magic Link (Supabase Auth) — без паролей
- JWT session в httpOnly cookies (не localStorage)
- Middleware защита: /dashboard, /roast, /settings
- Auth callback: /auth/callback → обмен code на session
- Redirect неавторизованных на главную (/?auth_required=1)

### Should Have
- Auto-create profile при первом входе (DB trigger)
- Redirect после логина на запрошенную страницу (?next=)

### Could Have
- Google / VK OAuth
- Telegram Login Widget

### Won't Have (v1)
- Пароли (security risk, поддержка дорогая)
- SMS OTP

## Метрики

| Метрика | Цель |
|---------|------|
| Auth flow completion rate | ≥ 85% |
| Session duration | ≥ 30 мин (auto-refresh) |
| Auth error rate | < 1% |
