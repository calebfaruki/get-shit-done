<purpose>
List all pending todos from `.planning/todos/` with area filtering support.

This is a view-only command. Displays todos with area tags and summaries. Human manages todo lifecycle.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="init_context">
Load todo context:

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init todos)
```

Extract from init JSON: `todo_count`, `todos`, `pending_dir`.

If `todo_count` is 0:
```
No pending todos.

Todos are captured during project planning with /new-project and /plan-project.
```

Exit.
</step>

<step name="parse_filter">
Check for area filter in arguments:
- `/todo` → show all
- `/todo api` → filter to area:api only
</step>

<step name="list_todos">
Use the `todos` array from init context (already filtered by area if specified).

Parse and display as simple list:

```
Pending Todos:

1. Add auth token refresh (api, 2d ago)
2. Fix modal z-index issue (ui, 1d ago)
3. Refactor database connection pool (database, 5h ago)

---

Use `/todo [area]` to filter by area.
```

Format age as relative time from created timestamp.

End workflow.
</step>


</process>

<success_criteria>
- [ ] All pending todos listed with title, area, age
- [ ] Area filter applied if specified
- [ ] No session state consulted
- [ ] View-only (no mutations)
</success_criteria>
