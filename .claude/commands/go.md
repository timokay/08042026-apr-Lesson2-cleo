---
description: Intelligent feature implementation pipeline. Analyzes complexity and selects
  optimal approach (/plan, /feature), then executes autonomously with parallel agents
  and frequent commits.
  $ARGUMENTS: feature name, ID, or brief description (optional — defaults to next from roadmap)
---

# /go $ARGUMENTS

## Purpose

One-command feature implementation that automatically selects the right pipeline
based on feature complexity, then executes it without manual confirmations.

> **PROCESS COMPLIANCE — BLOCKING RULES:**
> - MUST use /plan or /feature commands — NEVER launch raw Agent tools directly
> - MUST follow the skill chain: /next → /go → /plan|/feature
> - FORBIDDEN: Bypassing the skill chain by spawning parallel agents without commands
> - CRITICAL: Each feature MUST get its own plan, validation, and commit sequence

## Step 1: Determine Target Feature

IF $ARGUMENTS is provided:
  - Parse as feature name, roadmap ID, or description
  - Look up in `.claude/feature-roadmap.json` if it matches an ID
ELSE:
  - Run `/next` logic to find the highest-priority `next` feature
  - If no `next` feature found, pick first `planned` feature
  - Confirm selection before proceeding

## Step 2: Analyze Complexity

Evaluate the feature to determine the right pipeline:

| Signal | Score |
|--------|-------|
| Touches ≤3 files | -2 |
| Touches 4-10 files | 0 |
| Touches >10 files | +3 |
| Has external API integration (Claude, YandexGPT, Robokassa) | +2 |
| Requires new database entities | +2 |
| Is a hotfix or minor improvement | -3 |
| Has Gherkin scenarios for this feature (docs/test-scenarios.md) | +1 |
| Estimated implementation < 30 min | -2 |
| Estimated implementation > 2 hours | +3 |

**Decision matrix:**

| Total Score | Pipeline | Rationale |
|-------------|----------|-----------|
| ≤ -2 | `/plan` | Simple task, lightweight plan is enough |
| -1 to +4 | `/feature` | Standard feature, needs SPARC lifecycle |
| ≥ +5 | `/feature` | Complex feature — extra attention to architecture |

> Complex feature (score ≥ +5) uses `/feature` with recommendation to create ADRs manually.

## Step 3: Execute Selected Pipeline

### If `/plan` selected:
1. Run `/plan <feature-name>`
2. After plan is confirmed, immediately implement it
3. Use `Task` tool to parallelize independent changes
4. Run tests after implementation
5. Commit and push: `git push origin HEAD`

### If `/feature` selected:
1. Run `/feature <feature-name>` in AUTO mode (no confirmations between phases)
   - Phase 1: PLAN (sparc-prd-mini → docs)
   - Phase 2: VALIDATE (requirements-validator → score ≥70)
   - Phase 3: IMPLEMENT (parallel agents from docs)
   - Phase 4: REVIEW (brutal-honesty-review → fix criticals)
2. Spawn concurrent tasks where possible:
   - Parallel test writing + implementation
   - Parallel apps/web + apps/ai-service if independent
3. Commit frequently (after each logical change)
4. Push after each phase: `git push origin HEAD`

## Step 4: Post-Implementation

1. Update `.claude/feature-roadmap.json`:
   - Set feature status to `"done"`
2. Commit roadmap update
3. Push: `git push origin HEAD`
4. Report summary:

```
✅ Feature completed: <feature-name>
   Pipeline used: /plan | /feature
   Complexity score: <N>
   Files changed: <count>
   Commits: <count>
   Tests: <passed>/<total>
   
   Next suggested: /next or /go for the next feature
```

## Git Strategy

- Commit after each logical unit of work (not giant commits)
- Format: `type(scope): description`
- Push to remote after each completed phase to prevent data loss
