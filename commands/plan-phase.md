---
name: plan-phase
description: Produce detailed execution plan for a phase
argument-hint: "N (phase number)"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
---

<objective>
Produce detailed execution plan for phase N.

**Default flow:** Plan → Done

**Orchestrator role:** Parse phase number, validate against PROJECT-PLAN.md, gather context (CONTEXT.md, RESEARCH.md, CODEBASE.md), spawn planner subagent, present results.

**Output:** PHASE-{N}-PLAN.md in `.planning/project/` — the executor's instruction set with YAML frontmatter + XML body per SPEC.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/plan-phase.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

Phase number: $ARGUMENTS (required)
</context>

<process>
Execute the plan-phase workflow end-to-end:

1. Parse phase number and validate against PROJECT-PLAN.md
3. Check for existing PHASE-N-PLAN.md (offer update/view/skip if exists)
4. Load context from:
   - PROJECT-PLAN.md (phase goal and acceptance criteria)
   - PHASE-N-CONTEXT.md (if exists — user decisions)
   - PHASE-N-RESEARCH.md (if exists — technical research)
   - CODEBASE.md (if exists — codebase context)
5. Spawn planner subagent with context
6. Handle subagent return (complete/inconclusive)
7. Present results and suggest next steps

**Output:** PHASE-{N}-PLAN.md with single-commit scope per SPEC:
- No `wave` or `depends_on` in frontmatter
- One plan per phase
- No checkpoint tasks (decisions belong in /discuss-phase)
- YAML frontmatter + XML body format
- `must_haves` section with truths and artifacts
</process>

<success_criteria>
- Phase validated against PROJECT-PLAN.md
- Existing plan checked
- Planner spawned with proper context (CONTEXT.md, RESEARCH.md, CODEBASE.md)
- PHASE-N-PLAN.md uses YAML + XML format per SPEC
- No wave/depends_on/parallelization concepts
- User knows next steps (suggest /execute-phase N)
</success_criteria>
