---
name: discuss-project
description: Deeper exploration of existing PROJECT.md — gray areas, edge cases, implementation preferences
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
---

<objective>
Dig deeper into an existing PROJECT.md through conversational exploration.

**Difference from `/new-project`:** `/new-project` goes from zero to a defined project. `/discuss-project` takes an existing PROJECT.md and explores gray areas, edge cases, and implementation preferences.

**Updates:** PROJECT.md with additional decisions and context

**After this command:** Run `/research-project`, `/plan-project`, or continue discussing
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/discuss-project.md
@~/.claude/get-shit-done/knowledge/project-domain.md
@~/.claude/get-shit-done/knowledge/AGENTS.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`
</context>

<process>
Execute the discuss-project workflow from the workflow file.
Follow SPEC.md for conversational exploration pattern and plan invalidation warnings.
</process>
