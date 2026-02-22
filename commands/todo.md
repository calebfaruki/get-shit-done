---
name: todo
description: View parking lot items. Lists all todos; optionally filter by area.
argument-hint: "[area filter]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

<objective>
List pending todos from `.planning/todos/` showing area and summary.

This is a lightweight viewing command. Displays all todos; optionally filtered by area. Human manages todo lifecycle (creation happens in `/new-project` and `/plan-project`).

Output: Formatted list of todos with area tags and summaries
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/check-todos.md
</execution_context>

<context>
Arguments: $ARGUMENTS (optional area filter)

Examples:
- `/todo` - List all todos
- `/todo payments` - List only todos in payments area
</context>

<process>
1. Check for todos in `.planning/todos/`
2. Apply area filter if specified
3. Display todos with area tag and summary
4. Human decides what to do next (no automated actions)
</process>

<success_criteria>
- [ ] All pending todos listed with area and summary
- [ ] Area filter applied if specified
- [ ] No session state consulted
</success_criteria>
