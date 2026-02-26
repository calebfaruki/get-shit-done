---
name: execute-phase
description: Execute a phase plan. Changes remain unstaged.
argument-hint: "N (phase number)"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
---
<objective>
Execute a phase plan according to PHASE-N-PLAN.md.

The executor implements the plan, tracks what happened in PROJECT-SUMMARY.md, but never commits, stages, or auto-advances. All changes remain unstaged for `/verify-phase N` to review and stage.

Context budget: Subagent loads fresh 200k context with execution domain knowledge.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-phase.md
@~/.claude/get-shit-done/knowledge/execution-domain.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

Phase: $ARGUMENTS

Context files are resolved inside the workflow. The executor subagent receives explicit `<files_to_read>` with all required context.
</context>

<process>
Execute the execute-phase workflow from @~/.claude/get-shit-done/workflows/execute-phase.md end-to-end.

The workflow:
1. Bootstraps (reads PROJECT.md, phase plan, CODEBASE.md if exists, context/research if exists)
2. Spawns executor subagent with `<files_to_read>` block
3. Agent executes tasks with deviation rules (Rules 1-4 from execution-domain.md)
4. Agent updates PROJECT-SUMMARY.md (appends phase block, overwrites on re-run)
5. Reports completion — all changes remain unstaged

No commits, no STATE.md/ROADMAP.md updates, no auto-advance, no continuation agents, no checkpoints.
</process>
