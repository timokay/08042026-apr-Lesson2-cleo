---
name: project-context
description: >
  Load full project context for Клёво — AI financial assistant for Russian Gen Z.
  Use when starting a new session, when context seems missing, or when an agent needs
  full product background. Trigger words: "context", "project overview", "remind me",
  "what is this project", "что за проект".
version: "1.0"
maturity: production
---

# Project Context: Клёво

## Product Overview

**Клёво** — AI-финансовый ассистент с характером для российской молодёжи 18-30 лет.
Российская адаптация Cleo AI ($280M ARR, 7M пользователей в США).

**Core Loop:**
1. Upload T-Bank/Sber CSV → instant spending analysis
2. "Roast" — AI humorous critique of spending habits (viral hook)
3. "Parasite Scanner" — finds forgotten subscriptions
4. Share roast card → organic growth (K > 1.2 target)
5. Upgrade to Plus (299₽/мес) for unlimited roasts + AI chat

**Differentiation:** Only "personality-driven" AI financial advisor in Russia.
Western fintech left. Bank AI (T-Bank, Sber) = corporate and boring.

## Target Users

| Persona | Profile | Key Pain |
|---------|---------|----------|
| Максим, 24 | IT/marketing, 80-120K₽/мес, spends everything | Spends impulsively, wants to know where money goes |
| Алина, 22 | Student, forgotten subscriptions, TikTok/VK | Paying for services she forgot about |
| Дмитрий, 28 | Family, wants savings system | Needs structure but existing tools are boring |

## Architecture Summary

```
Next.js 15 (apps/web) ──→ FastAPI (apps/ai-service) ──→ Claude 3.5 Sonnet
      ↓                           ↓                         ↓
  Supabase Auth            Redis rate limiting         YandexGPT fallback
  httpOnly JWT cookies     (10 req/min, 1 roast/month)
      ↓
  Supabase PostgreSQL (self-hosted, Moscow VPS, ФЗ-152)
```

## Key Numbers

| Metric | Target |
|--------|--------|
| Plus price | 299₽/мес |
| Free roasts | 1/month |
| AI first token | < 2.5s (via proxyapi.ru) |
| CSV max size | 10 MB |
| CSV rows processed | First 1000 most recent |
| Rate limit | 10 AI req/min/user |
| MAU target (12 мес) | 50,000 |
| Viral Coefficient K | > 1.2 |
| Free→Plus conversion | > 12% |

## Research Highlights

1. **Finance-as-Culture:** 76% Gen Z use TikTok/YouTube for financial advice
2. **Roast culture works:** Cleo's Roast Mode doubled subscriber base YoY
3. **RU market empty:** Western fintech left Russia = opportunity
4. **Gen AI in RU growing:** 58B RUB market in 2025, banks leading
5. **Youth vulnerable:** 89% want savings buffer, 100% spend impulsively

## MVP Features (Weeks 1-6)

| ID | Feature | Priority |
|----|---------|---------|
| F1 | CSV Upload (T-Bank, Sber, Alfa) | Must |
| F2 | Parasite Scanner | Must |
| F3 | AI Roast Mode (streaming SSE) | Must |
| F4 | Top-5 spending categories (Recharts) | Must |
| F5 | Share roast card (viral) | Should |
| F6 | Upgrade to Plus / Robokassa | Should |

## Full Docs Index

| File | Purpose |
|------|---------|
| `docs/PRD.md` | Product requirements, personas, roadmap |
| `docs/Architecture.md` | System design, tech stack, DB schema |
| `docs/Specification.md` | User stories, API contracts, NFRs |
| `docs/Pseudocode.md` | Core algorithms (CSV parser, roast, parasites) |
| `docs/Refinement.md` | Edge cases, testing strategy, security hardening |
| `docs/Completion.md` | Deployment, CI/CD, env vars |
| `docs/Solution_Strategy.md` | SCQA, TRIZ, GTM strategy |
| `docs/Final_Summary.md` | Executive summary |
| `docs/ADR-*.md` | Architecture decisions (4 ADRs) |
| `docs/test-scenarios.md` | 18 BDD Gherkin scenarios |
