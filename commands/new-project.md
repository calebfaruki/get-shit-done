---
name: new-project
description: Sharpen vague idea into PROJECT.md with acceptance criteria
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
---

<objective>
Conduct conversational project intake that sharpens a fuzzy idea into verifiable acceptance criteria and produces PROJECT.md in `.planning/project/`.

**Purpose:** Good intake means good plans, good execution. This is the entry point to the project lifecycle.

**Creates:** `.planning/project/PROJECT.md`

**After this command:** Run `/research-project`, `/discuss-project`, or `/plan-project`
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/new-project.md
@~/.claude/get-shit-done/knowledge/project-domain.md
@~/.claude/get-shit-done/knowledge/AGENTS.md
</execution_context>

<process>
Execute the new-project workflow from the workflow file.
Follow SPEC.md for all intake flow, scope validation, and PROJECT.md format.
</process>
