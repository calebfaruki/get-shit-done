<purpose>
List all pending todos from `.planning/todos/` with area filtering support.

This is a view-only command. Displays todos with area tags and summaries. Human manages todo lifecycle.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="check_todos_directory">
Check if todos directory exists:

```bash
TODO_DIR=".planning/todos"
if [ ! -d "$TODO_DIR" ]; then
  echo "No pending todos."
  echo ""
  echo "Todos are captured during project planning with /new-project and /plan-project."
  exit 0
fi
```
</step>

<step name="parse_filter">
Check for area filter in arguments:
- `/todo` → show all
- `/todo api` → filter to area:api only

```bash
AREA_FILTER="${ARGUMENTS[0]:-}"
```
</step>

<step name="list_todos">
Use Glob to find todo files, optionally filter by area.

```bash
if [ -n "$AREA_FILTER" ]; then
  TODO_FILES=$(ls "$TODO_DIR"/*.md 2>/dev/null | xargs grep -l "^area: $AREA_FILTER" 2>/dev/null || echo "")
else
  TODO_FILES=$(ls "$TODO_DIR"/*.md 2>/dev/null || echo "")
fi
```

If no todo files found:
```
No pending todos matching filter.
```
Exit.

Parse and display as simple list using Read tool for each file:

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
