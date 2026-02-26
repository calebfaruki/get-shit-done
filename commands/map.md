---
name: map
description: Analyze the codebase, anchored to current commit SHA
argument-hint: "[optional: specific area to map, e.g., 'api' or 'auth']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
---

<objective>
Analyze existing codebase using parallel mapper agents to produce 4 specialized codebase files.

Each mapper agent explores a focus area and writes its file directly to .planning/codebase/. No consolidation step needed.

Output: .planning/codebase/ directory with 4 topic-specific files (architecture.md, conventions.md, tech-stack.md, concerns.md), each with commit SHA
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/map-codebase.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

Focus area: $ARGUMENTS (optional - if provided, tells agents to focus on specific subsystem)

**This command can run:**
- Before /new-project (understand existing code first)
- After /new-project (refresh codebase understanding as code evolves)
- Anytime to refresh codebase map
</context>

<when_to_use>
**Use /map for:**
- Brownfield projects before initialization (understand existing code first)
- Refreshing codebase map after significant changes
- Onboarding to an unfamiliar codebase
- Before major refactoring (understand current state)

**Skip /map for:**
- Greenfield projects with no code yet (nothing to map)
- Trivial codebases (<5 files)
</when_to_use>

<process>
1. Check if .planning/codebase/ directory exists (offer to refresh or skip)
2. Create .planning/codebase/ directory if needed
3. Spawn parallel mapper agents to analyze codebase
4. Each agent writes its own file to .planning/codebase/
5. Suggest /new-project as next step
</process>

<success_criteria>
- [ ] .planning/codebase/ directory created
- [ ] 4 files written in .planning/codebase/, each with commit SHA
- [ ] Parallel agents completed without errors
- [ ] User knows next steps
</success_criteria>
