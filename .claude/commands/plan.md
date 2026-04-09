---
description: Lightweight implementation planning. Saves plan to docs/plans/ and
  auto-commits on session end. Use for simple tasks, hotfixes, and quick features
  that don't need full SPARC lifecycle.
  $ARGUMENTS: brief task description
---

# /plan $ARGUMENTS

## Purpose

Quick implementation plan for tasks too simple for `/feature` but needing more than a one-liner.
Saves plans to `docs/plans/` with auto-commit on session end (Stop hook).

## When to Use /plan vs /feature

| Use `/plan` for | Use `/feature` for |
|----------------|-------------------|
| Hotfixes (1-5 files) | New features |
| Config changes | Any feature with >5 files |
| Minor improvements | External API integrations |
| Dependency updates | New database entities |
| Refactoring (no new behavior) | Score ≥-1 from complexity check |

When in doubt → use `/go` to auto-select.

## Process

### Step 1: Read Relevant Docs

Based on task type, read:
- `docs/Pseudocode.md` — if touching algorithms
- `docs/Architecture.md` — if touching services or DB
- `docs/Refinement.md` — for edge cases to handle
- `docs/Specification.md` — if touching API contracts

### Step 2: Create Plan File

Save to `docs/plans/YYYY-MM-DD-[slug].md`:

```markdown
# Plan: [Task Description]
**Date:** YYYY-MM-DD
**Complexity:** Simple | Low
**Estimated:** < 30 min | < 1 hour

## Goal
[What we're trying to achieve and why]

## Files to Modify
- `path/to/file.ts` — [what change]
- `path/to/other.py` — [what change]

## Implementation Steps
1. [Specific step with file path]
2. [Specific step]
3. [Verification step]

## Edge Cases
- [Edge case from Refinement.md if applicable]

## Tests
- [What to test / which existing test to update]

## Commit
`type(scope): description`
```

### Step 3: Implement

After the plan is confirmed:
1. Implement changes following the plan
2. Run relevant tests
3. Commit: `type(scope): [description from plan]`

## Output

```
📋 Plan saved: docs/plans/YYYY-MM-DD-[slug].md
🔄 Will auto-commit on session end (Stop hook)

Ready to implement? Say "go" or "yes" to proceed.
```
