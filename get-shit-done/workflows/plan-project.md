# Plan Project Workflow

Strategic planning workflow that breaks a project into phases. Produces PROJECT-PLAN.md as the sole planning artifact.

## Prerequisites

Check that `.planning/project/PROJECT.md` exists:

```bash
[ -f .planning/project/PROJECT.md ] && echo "PROJECT.md exists" || echo "PROJECT.md missing"
```

**If missing:** Soft warning. Suggest running `/new-project` first. Do not hard block.

## Flow

### 1. Check for existing plan

```bash
[ -f .planning/project/PROJECT-PLAN.md ] && echo "exists" || echo "missing"
```

If exists: Inform user that re-running will overwrite existing plan. Confirm before proceeding.

### 2. Read context files

**Required:**
- `.planning/project/PROJECT.md`

**Optional (read if exist):**
- `.planning/project/PROJECT-RESEARCH.md`
- `.planning/CODEBASE.md`
- Relevant todos from `.planning/todos/`

### 3. Spawn planning subagent

Agent: Use `resolve-model` for model selection (typically planner profile)

**Files to read** (`<files_to_read>` block in subagent spawn):
- `.planning/project/PROJECT.md`
- `.planning/project/PROJECT-RESEARCH.md` (if exists)
- `.planning/CODEBASE.md` (if exists)
- `get-shit-done/knowledge/planning-domain.md`
- `get-shit-done/knowledge/project-domain.md`

**Agent task:**
1. Read PROJECT.md acceptance criteria
2. Read PROJECT-RESEARCH.md recommendations (if exists)
3. Read CODEBASE.md to understand existing architecture (if exists)
4. Break project into phases using goal-backward methodology
5. Map each acceptance criterion to a phase
6. Verify all criteria are covered (no orphans)
7. Write `.planning/project/PROJECT-PLAN.md`

**Planning guidance:**
- Prefer vertical slices (end-to-end features) over horizontal layers
- Target 1-2 phases for most projects, rarely more than 3
- Each phase should be independently verifiable
- Phase goals are outcome-shaped ("working chat interface"), not task-shaped ("build chat components")

### 4. Output format

PROJECT-PLAN.md structure per SPEC:

**YAML frontmatter:**
```yaml
---
project: [short-name-slug]
phases: [total count]
acceptance_criteria_count: [total from PROJECT.md]
---
```

**Markdown body:**
```markdown
# Project Plan: [Short name]

## Phases

### Phase 1: [Name]

**Goal**: [Outcome-shaped — what is true when this phase is done]
**Acceptance Criteria**: [AC-1, AC-2]
**Depends on**: Nothing

### Phase 2: [Name]

**Goal**: [Outcome]
**Acceptance Criteria**: [AC-3, AC-4]
**Depends on**: Phase 1

## Criteria Mapping

| Criterion | Phase | Description |
|-----------|-------|-------------|
| AC-1 | 1 | [Short description from PROJECT.md] |
| AC-2 | 1 | [Short description] |
| AC-3 | 2 | [Short description] |
| AC-4 | 2 | [Short description] |

**Coverage**: All [N] acceptance criteria mapped. No orphans.
```

**AC-N identifiers** are assigned by the planner based on PROJECT.md acceptance criteria order. Local to this project.

### 5. Validation

After plan is written, verify:

- [ ] All acceptance criteria from PROJECT.md are mapped to phases
- [ ] No orphan criteria (every criterion appears in mapping table)
- [ ] Phase count is reasonable (1-3 for most projects)
- [ ] Phase goals are outcome-shaped
- [ ] Dependencies are clear

### 6. Deferred scope as todos

If any acceptance criteria or scope items were shaved during planning (deemed too broad for a single project), create todos for them:

- Propose each deferred item to the user before writing
- One file per todo in `.planning/todos/`
- Frontmatter: `area:` and `created:` fields
- Body: freeform description of the deferred work

### 7. State artifacts

**CRITICAL:** Do NOT create:
- ROADMAP.md
- STATE.md
- MILESTONES.md
- REQUIREMENTS.md

PROJECT-PLAN.md is the sole planning artifact per SPEC (STATE-02).

### 8. Handoff

After planning completes:

```
Planning complete. [N] phases identified.

Phase 1: [Name] — [Goal one-liner]
Phase 2: [Name] — [Goal one-liner]

All [N] acceptance criteria mapped. Coverage verified.

Next steps:
- /discuss-phase 1 - Clarify implementation decisions for Phase 1
- /research-phase 1 - Tactical research for Phase 1 implementation
- /plan-phase 1 - Create detailed execution plan for Phase 1

The project plan is available at .planning/project/PROJECT-PLAN.md
```

**Never auto-advance.** Human decides which phase-level command to run next.

## Success Criteria

- [ ] PROJECT.md was read
- [ ] PROJECT-RESEARCH.md was considered if it exists
- [ ] CODEBASE.md was considered if it exists
- [ ] PROJECT-PLAN.md written to `.planning/project/`
- [ ] YAML frontmatter includes project, phases, acceptance_criteria_count
- [ ] All acceptance criteria from PROJECT.md are mapped to phases
- [ ] Criteria mapping table shows coverage
- [ ] No GSD-specific state files created (ROADMAP, STATE, MILESTONES, REQUIREMENTS)
- [ ] Handoff message suggests phase-level commands without auto-advancing
