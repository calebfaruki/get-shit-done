---
name: plan-project
description: Break project into phases (strategic). Produces PROJECT-PLAN.md.
argument-hint: ""
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
  - Task
---

<objective>
Break project into phases at strategic level. Produces PROJECT-PLAN.md as the sole planning artifact.

Spawns a planning subagent that reads project context and produces a phase breakdown with acceptance criteria mapping.

Output: .planning/project/PROJECT-PLAN.md
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/plan-project.md
</execution_context>

<context>
**This command runs after /new-project** (and optionally after /research-project and /discuss-project).

PROJECT-PLAN.md is the sole planning artifact — no ROADMAP.md, STATE.md, or MILESTONES.md created.

The plan identifies phases, their order, and maps acceptance criteria. It does NOT produce phase-level implementation plans (that's /plan-phase N).
</context>

<process>
1. Check that PROJECT.md exists (soft warning if missing)
2. Spawn planning subagent with project context
3. Agent produces PROJECT-PLAN.md with phase breakdown
4. Suggest /discuss-phase 1, /research-phase 1, or /plan-phase 1 as next steps
</process>

<success_criteria>
- [ ] PROJECT.md exists and was read
- [ ] Planning subagent completed
- [ ] PROJECT-PLAN.md written to .planning/project/
- [ ] All acceptance criteria from PROJECT.md are mapped to phases
- [ ] No GSD-specific state artifacts created (no ROADMAP, STATE, MILESTONES, REQUIREMENTS)
- [ ] User knows next steps (suggest phase-level commands)
</success_criteria>
