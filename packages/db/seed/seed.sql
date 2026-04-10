-- ============================================================
-- Клёво — Seed Data for Development/Testing
-- Creates 3 test users with realistic transaction data
-- ============================================================
-- WARNING: Run only in development/staging environments
-- ============================================================

-- Note: In a real Supabase setup, auth.users rows must be created
-- via the Auth API. These profiles assume auth.users entries exist.
-- For local dev with supabase CLI: `supabase seed` or manual signup.

-- Test profiles (use fixed UUIDs for reproducibility)
INSERT INTO profiles (id, display_name, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Максим (Free)', 'free'),
  ('00000000-0000-0000-0000-000000000002', 'Алина (Plus)',  'plus'),
  ('00000000-0000-0000-0000-000000000003', 'Дмитрий (Pro)', 'pro')
ON CONFLICT (id) DO NOTHING;

-- Transactions for Максим (free user) — 50 transactions, last 60 days
INSERT INTO transactions (user_id, amount, currency, category, description, merchant, transaction_date, source, is_subscription) VALUES
  ('00000000-0000-0000-0000-000000000001', -450.00, 'RUB', 'food_delivery',  'Яндекс Еда — Суши',           'Яндекс Еда',        CURRENT_DATE - 1,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -320.00, 'RUB', 'transport',      'Яндекс Такси',                'Яндекс Такси',      CURRENT_DATE - 1,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -199.00, 'RUB', 'subscriptions',  'Яндекс Плюс подписка',        'Яндекс Плюс',       CURRENT_DATE - 2,  'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -1250.00,'RUB', 'groceries',      'Пятёрочка',                   'Пятёрочка',         CURRENT_DATE - 3,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -890.00, 'RUB', 'restaurants',    'Кафе Буфет',                  'Кафе Буфет',        CURRENT_DATE - 4,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -590.00, 'RUB', 'subscriptions',  'Netflix подписка',            'Netflix',           CURRENT_DATE - 5,  'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -350.00, 'RUB', 'food_delivery',  'Delivery Club',               'Delivery Club',     CURRENT_DATE - 5,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -2800.00,'RUB', 'shopping',       'Wildberries заказ',           'Wildberries',       CURRENT_DATE - 7,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -420.00, 'RUB', 'transport',      'Яндекс Такси',                'Яндекс Такси',      CURRENT_DATE - 7,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -1100.00,'RUB', 'groceries',      'Магнит',                      'Магнит',            CURRENT_DATE - 8,  'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -299.00, 'RUB', 'subscriptions',  'Spotify Premium',             'Spotify',           CURRENT_DATE - 9,  'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -680.00, 'RUB', 'food_delivery',  'Самокат',                     'Самокат',           CURRENT_DATE - 10, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -3500.00,'RUB', 'utilities',      'ЖКХ оплата',                  'ЖКХ',               CURRENT_DATE - 11, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -450.00, 'RUB', 'entertainment',  'Кино Каро',                   'Каро Фильм',        CURRENT_DATE - 12, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -560.00, 'RUB', 'food_delivery',  'Яндекс Еда — Пицца',          'Яндекс Еда',        CURRENT_DATE - 13, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -199.00, 'RUB', 'subscriptions',  'Яндекс Плюс подписка',        'Яндекс Плюс',       CURRENT_DATE - 32, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -590.00, 'RUB', 'subscriptions',  'Netflix подписка',            'Netflix',           CURRENT_DATE - 35, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -299.00, 'RUB', 'subscriptions',  'Spotify Premium',             'Spotify',           CURRENT_DATE - 39, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -1400.00,'RUB', 'groceries',      'Перекрёсток',                 'Перекрёсток',       CURRENT_DATE - 14, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -750.00, 'RUB', 'restaurants',    'Бургер Кинг',                 'Burger King',       CURRENT_DATE - 15, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -380.00, 'RUB', 'transport',      'Яндекс Такси',                'Яндекс Такси',      CURRENT_DATE - 15, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -1900.00,'RUB', 'shopping',       'Ozon заказ',                  'Ozon',              CURRENT_DATE - 17, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -490.00, 'RUB', 'food_delivery',  'Самокат',                     'Самокат',           CURRENT_DATE - 18, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -89.00,  'RUB', 'subscriptions',  'VK Музыка',                   'VK Музыка',         CURRENT_DATE - 19, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -2200.00,'RUB', 'entertainment',  'Спортзал абонемент',          'WorldClass',        CURRENT_DATE - 20, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -670.00, 'RUB', 'food_delivery',  'Яндекс Еда — Роллы',          'Яндекс Еда',        CURRENT_DATE - 21, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -1050.00,'RUB', 'groceries',      'Лента',                       'Лента',             CURRENT_DATE - 22, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -89.00,  'RUB', 'subscriptions',  'VK Музыка',                   'VK Музыка',         CURRENT_DATE - 49, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -2200.00,'RUB', 'entertainment',  'Спортзал абонемент',          'WorldClass',        CURRENT_DATE - 50, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -199.00, 'RUB', 'subscriptions',  'Яндекс Плюс подписка',        'Яндекс Плюс',       CURRENT_DATE - 62, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -330.00, 'RUB', 'transport',      'Каршеринг Делимобиль',        'Делимобиль',        CURRENT_DATE - 23, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -520.00, 'RUB', 'food_delivery',  'Delivery Club',               'Delivery Club',     CURRENT_DATE - 24, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -1750.00,'RUB', 'shopping',       'Wildberries заказ',           'Wildberries',       CURRENT_DATE - 25, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -440.00, 'RUB', 'restaurants',    'Кофе Хауз',                   'Кофе Хауз',         CURRENT_DATE - 26, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -280.00, 'RUB', 'transport',      'Яндекс Такси',                'Яндекс Такси',      CURRENT_DATE - 27, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -1200.00,'RUB', 'groceries',      'Пятёрочка',                   'Пятёрочка',         CURRENT_DATE - 28, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -599.00, 'RUB', 'subscriptions',  'Netflix подписка',            'Netflix',           CURRENT_DATE - 65, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -299.00, 'RUB', 'subscriptions',  'Spotify Premium',             'Spotify',           CURRENT_DATE - 69, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -850.00, 'RUB', 'food_delivery',  'Яндекс Еда — Бургеры',        'Яндекс Еда',        CURRENT_DATE - 29, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -2100.00,'RUB', 'entertainment',  'Спортзал абонемент',          'WorldClass',        CURRENT_DATE - 80, 'csv', TRUE),
  ('00000000-0000-0000-0000-000000000001', -450.00, 'RUB', 'restaurants',    'Макдоналдс',                  'McDonald''s',       CURRENT_DATE - 30, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -1800.00,'RUB', 'shopping',       'Ozon заказ',                  'Ozon',              CURRENT_DATE - 31, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -360.00, 'RUB', 'transport',      'Метро',                       'Московское метро',  CURRENT_DATE - 31, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -490.00, 'RUB', 'food_delivery',  'Самокат',                     'Самокат',           CURRENT_DATE - 32, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -1350.00,'RUB', 'groceries',      'Вкусвилл',                    'ВкусВилл',          CURRENT_DATE - 33, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -650.00, 'RUB', 'restaurants',    'Шашлычная',                   'Шашлычная Арбат',   CURRENT_DATE - 34, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -299.00, 'RUB', 'entertainment',  'Кино онлайн',                 'Иви',               CURRENT_DATE - 35, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -420.00, 'RUB', 'transport',      'Яндекс Такси',                'Яндекс Такси',      CURRENT_DATE - 36, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -780.00, 'RUB', 'food_delivery',  'Яндекс Еда — Пицца',          'Яндекс Еда',        CURRENT_DATE - 37, 'csv', FALSE),
  ('00000000-0000-0000-0000-000000000001', -2500.00,'RUB', 'shopping',       'Wildberries одежда',          'Wildberries',       CURRENT_DATE - 38, 'csv', FALSE)
ON CONFLICT DO NOTHING;

-- A sample public roast for sharing tests
INSERT INTO roasts (user_id, content, summary, period_start, period_end, share_token, is_public)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Слушай, ты потратил ₽4,200 на доставку еды за месяц. Это больше, чем некоторые тратят на квартплату! 🍕 При этом у тебя 5 активных подписок, о которых ты, судя по всему, забыл ещё в прошлом квартале. Netflix смотришь? Spotify слушаешь? Яндекс Плюс используешь хоть иногда? Советы: отпишись от 2 подписок прямо сейчас — сэкономишь ₽888/мес. Готовь дома хотя бы 2 раза в неделю вместо доставки.',
  'Ты потратил ₽4,200 на доставку за месяц — это больше квартплаты некоторых!',
  CURRENT_DATE - 30,
  CURRENT_DATE,
  'demo_share_token_001',
  TRUE
) ON CONFLICT DO NOTHING;
