---
description: Generate or update project documentation in Russian and English.
  Creates a comprehensive set of markdown files covering deployment, usage,
  architecture, and user flows.
  $ARGUMENTS: optional flags — "rus" (Russian only), "eng" (English only), "update" (refresh existing)
---

# /docs $ARGUMENTS

## Purpose

Generate professional, bilingual project documentation from source code,
existing docs, and development insights. Output: `README/rus/` and `README/eng/`.

## Step 1: Gather Context

Read all available sources:

```
docs/PRD.md                — product requirements, features
docs/Architecture.md       — system architecture, tech stack
docs/Specification.md      — API, data model, user stories
docs/Completion.md         — deployment, environment setup
docs/Final_Summary.md      — executive summary
CLAUDE.md                  — project overview, commands, agents
DEVELOPMENT_GUIDE.md       — development workflow
docker-compose.yml         — infrastructure services
.env.example               — environment variables
myinsights/1nsights.md     — development insights (if exists)
.claude/feature-roadmap.json — feature list and statuses
```

## Step 2: Determine Scope

```
IF $ARGUMENTS contains "rus":  languages = ["rus"]
ELIF $ARGUMENTS contains "eng": languages = ["eng"]
ELSE: languages = ["rus", "eng"]

IF $ARGUMENTS contains "update":
    mode = "update"  — update only changed sections
ELSE:
    mode = "create"  — generate from scratch
```

## Step 3: Generate 7 Files Per Language

For EACH language, generate:

1. **`deployment.md`** — как развернуть / deployment guide
   - Environment requirements, quick start, Docker deploy, env vars, update + rollback

2. **`admin-guide.md`** — руководство администратора / admin guide
   - User management, config, monitoring, backups, troubleshooting

3. **`user-guide.md`** — руководство пользователя / user guide
   - Getting started, features walkthrough (CSV upload, roast, parasites, share), FAQ

4. **`infrastructure.md`** — требования к инфраструктуре / infrastructure
   - CPU/RAM/disk per service, network requirements, external API access (proxyapi.ru, YandexGPT)

5. **`architecture.md`** — архитектура системы / system architecture
   - Mermaid diagram, component breakdown, data model, security, ФЗ-152 compliance

6. **`ui-guide.md`** — интерфейс системы / UI guide
   - Main screens (onboarding, dashboard, roast, share), navigation, mobile behavior

7. **`user-flows.md`** — пользовательские сценарии / user & admin flows
   - Sequence diagrams: registration → CSV upload → roast → share → upgrade to Plus

## Step 4: Generate Index

Create `README/index.md`:

```markdown
# Клёво — Documentation

## 🇷🇺 Документация на русском
- [Развертывание](rus/deployment.md)
- [Руководство администратора](rus/admin-guide.md)
- [Руководство пользователя](rus/user-guide.md)
- [Требования к инфраструктуре](rus/infrastructure.md)
- [Архитектура](rus/architecture.md)
- [Интерфейс](rus/ui-guide.md)
- [Пользовательские сценарии](rus/user-flows.md)

## 🇬🇧 English Documentation
- [Deployment Guide](eng/deployment.md)
- [Administrator Guide](eng/admin-guide.md)
- [User Guide](eng/user-guide.md)
- [Infrastructure Requirements](eng/infrastructure.md)
- [Architecture](eng/architecture.md)
- [UI Guide](eng/ui-guide.md)
- [User & Admin Flows](eng/user-flows.md)
```

## Step 5: Commit and Report

```bash
git add README/
git commit -m "docs: generate project documentation (RU/EN)"
git push origin HEAD
```

```
📚 Documentation generated: README/

🇷🇺 Russian (README/rus/): 7 files
🇬🇧 English (README/eng/): 7 files
📄 README/index.md — table of contents
```

## Update Mode

When `$ARGUMENTS` contains "update":
1. Read existing files in `README/`
2. Compare with current project state
3. Update only changed sections, preserve manual additions
4. Commit: `docs: update project documentation`
