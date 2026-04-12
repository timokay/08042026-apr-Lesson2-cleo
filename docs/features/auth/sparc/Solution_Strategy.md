# Solution Strategy: Authentication

## Ключевые ре��ения

### 1. Magic Link вместо паролей

**Обоснование:**
- Нет пароля = нет password hashes в DB = нет риска утечки
- Молодёжь 18–30 привыкла к "войти через email" (Notion, Linear, etc.)
- Supabase Auth поддерживает Magic Link из коробки

**Риск:** Email delivery issues. Mitigation: выбор надёжного SMTP provider.

### 2. httpOnly cookies через @supabase/ssr

**Обоснование:**
- localStorage → XSS уязвимость (злоумышленник может украсть токен)
- httpOnly cookie → JavaScript не имеет доступа → защита от XSS
- @supabase/ssr работает в Next.js App Router (Server Components, middleware)
- Сессия автомати��ески refresh без пользовательского действия

### 3. Три клиента (browser / server / middleware)

**Обоснование:**
- Next.js 15 разделяет runtime на client / server / edge
- `cookies()` работает по-разному в каждом контексте
- Единый client = неправильное использование cookie API

### 4. updateSession в middleware

**Обоснование:**
- Access tokens истекают через 1 час
- updateSession() автоматически о��новляет cookie при каждом запросе если нужно
- Без middleware → пользователь вылетит через час (плохой UX)

### 5. DB Trigger для profiles

**Обоснование:**
- Атомарно: пользователь не может существовать без профиля
- SECURITY DEFINER: выполняетс�� с правами создателя функции, не запрашивающего
- Нет race condition (не через API)

### 6. Next.js 15: await cookies()

**Критичная особенность:** В Next.js 15 `cookies()` ��� async функция. При синхр��нном вызове — ошибка. Все серверные клиенты используют `await cookies()`.
