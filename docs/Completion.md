# Completion: Клёво
**Версия:** 1.0 | **Дата:** 2026-04-08

---

## Pre-Deployment Checklist

### MVP Launch Gate
- [ ] CSV parser обрабатывает Т-Банк формат без ошибок
- [ ] Ростер генерируется за < 15 секунд
- [ ] Паразит-сканер находит > 80% реальных подписок (тест на тестовом датасете)
- [ ] Шеринг-карточка генерируется корректно
- [ ] Supabase Auth работает (регистрация, вход, выход)
- [ ] Данные хранятся на VPS в РФ (проверить geolocation сервера)
- [ ] SSL сертификат активен (Let's Encrypt)
- [ ] Rate limiting активен (10 AI req/min для free)
- [ ] Paywall блокирует extra-roast для free пользователей
- [ ] Payment webhook обрабатывает успешную оплату → plan upgrade
- [ ] Rollback procedure протестирован
- [ ] Нагрузочный тест: 50 concurrent users без деградации

---

## Deployment Sequence

### 1. Infrastructure Setup
```bash
# На VPS (AdminVPS/HOSTKEY, Moscow)
git clone https://github.com/[org]/klevo
cd klevo
cp .env.example .env  # заполнить все переменные

# Запуск через Docker Compose
docker-compose -f docker-compose.yml up -d
docker-compose ps  # проверить все контейнеры healthy
```

### 2. Database Migration
```bash
# Supabase self-hosted migrations
supabase db reset
supabase migration up
supabase db push
```

### 3. Health Checks
```bash
# Web app
curl https://klevo.app/api/health  # → {"status": "ok", "version": "1.0.0"}

# AI service
curl http://localhost:8000/health  # → {"status": "ok", "llm": "connected"}

# Redis
redis-cli ping  # → PONG
```

### 4. Smoke Tests
```bash
# Проверить основной flow
pytest tests/smoke/ -v --tb=short
```

### 5. DNS & SSL
```bash
# Проверить DNS propagation
dig klevo.app +short  # → IP VPS

# Renew SSL (setup cron)
0 3 * * 0 certbot renew --quiet && nginx -s reload
```

---

## Rollback Procedure

```bash
# Откат к предыдущей версии
docker-compose down
git checkout v1.0.0  # предыдущий тег
docker-compose build
docker-compose up -d

# Если нужен откат БД
supabase db reset --version [previous_migration]

# Уведомление пользователей
# → Статус-страница: https://status.klevo.app
```

---

## CI/CD Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          npm ci
          npm test
          cd apps/ai-service && python -m pytest

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: docker-compose build
      - name: Push to registry
        run: |
          docker push ${{ secrets.REGISTRY }}/klevo-web:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/klevo-ai:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/klevo
            git pull origin main
            docker-compose pull
            docker-compose up -d --force-recreate
            docker system prune -f
```

---

## Monitoring & Alerting

### Key Metrics

| Метрика | Threshold | Alert Channel |
|---------|-----------|:-------------:|
| API response time p99 | > 5000ms | Telegram bot |
| AI service p99 | > 20000ms | Telegram bot |
| Error rate (5xx) | > 2% | Telegram bot |
| CPU usage (VPS) | > 85% | Email |
| Memory usage | > 80% | Email |
| Disk usage | > 90% | Email + SMS |
| Failed logins | > 100/min | Telegram + Email |
| AI API spend | > $50/day | Email |

### Logging Strategy

```yaml
# Уровни логирования
production:
  web: INFO (errors, warnings, slow queries)
  ai-service: INFO (requests, errors, model fallbacks)
  nginx: access log (для анализа трафика)
  
# Retention
  logs: 30 дней (gzip rotate)
  error_logs: 90 дней
  
# Aggregation
  tool: Loki + Grafana (self-hosted на том же VPS)
  dashboard: klevo.app/admin/logs (только admin роль)
```

### Business Metrics Dashboard (Grafana)

```
Панели:
1. DAU/MAU ratio
2. New signups per day
3. CSV uploads per day  
4. Roasts generated per day
5. Free → Plus conversions
6. Monthly churn rate
7. AI API cost per day
8. Viral coefficient (referrals / signups)
```

---

## Handoff Checklists

### For Development Team
- [ ] Репо настроен, CI/CD запущен
- [ ] Local dev environment: `docker-compose -f docker-compose.dev.yml up`
- [ ] Seed data скрипт: `npm run db:seed`
- [ ] Code review guidelines: PR → 1 review → merge
- [ ] Branch strategy: main (prod) / develop / feature/[name]

### For QA Team
- [ ] Test environment: staging.klevo.app
- [ ] Test accounts: qa_free@klevo.app / qa_plus@klevo.app
- [ ] Test CSV files: `tests/fixtures/` (Т-Банк, Сбербанк, Альфа)
- [ ] Bug reporting: GitHub Issues с тегом `bug`

### For Operations Team
- [ ] VPS access: SSH key в 1Password vault
- [ ] Docker Compose manual: `/opt/klevo/RUNBOOK.md`
- [ ] Escalation: Telegram @klevo_oncall
- [ ] Status page: status.klevo.app (Upptime)

---

## Environment Variables

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # server only
AI_SERVICE_URL=http://ai-service:8000
NEXT_PUBLIC_APP_URL=https://klevo.app

# apps/ai-service/.env
ANTHROPIC_API_KEY=sk-ant-...
YANDEX_GPT_API_KEY=...
YANDEX_GPT_FOLDER_ID=...
SUPABASE_SERVICE_ROLE_KEY=[same as above]
REDIS_URL=redis://redis:6379

# Payments
ROBOKASSA_MERCHANT_LOGIN=...
ROBOKASSA_PASSWORD1=...  # for generating payment links
ROBOKASSA_PASSWORD2=...  # for webhook verification
```
