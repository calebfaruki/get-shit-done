<purpose>
Validate `.planning/` directory integrity and report actionable issues. Checks for project structure, file existence, and codebase map freshness. Report-only, no automated repairs.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="check_planning_structure">
**Check basic .planning/ structure:**

```bash
# Check .planning/ directory exists
if [ ! -d .planning ]; then
  STATUS="broken"
  echo "ERROR: .planning/ directory not found"
  echo "Run /new-project to initialize a project"
  exit 1
fi

# Check for project files
PROJECT_MD_EXISTS=false
PROJECT_PLAN_EXISTS=false

[ -f .planning/project/PROJECT.md ] && PROJECT_MD_EXISTS=true
[ -f .planning/project/PROJECT-PLAN.md ] && PROJECT_PLAN_EXISTS=true

# Determine overall status
if [ "$PROJECT_MD_EXISTS" = "false" ]; then
  STATUS="degraded"
elif [ "$PROJECT_PLAN_EXISTS" = "false" ]; then
  STATUS="healthy-unplanned"
else
  STATUS="healthy"
fi
```
</step>

<step name="check_codebase_map">
**Check codebase map status:**

```bash
# Check if .planning/codebase/ directory exists and its expected files
CODEBASE_DIR_EXISTS=false
TECHSTACK_EXISTS=false
ARCHITECTURE_EXISTS=false
CONVENTIONS_EXISTS=false
CONCERNS_EXISTS=false
CODEBASE_STALE=""

if [ -d .planning/codebase ]; then
  CODEBASE_DIR_EXISTS=true
  [ -f .planning/codebase/tech-stack.md ] && TECHSTACK_EXISTS=true
  [ -f .planning/codebase/architecture.md ] && ARCHITECTURE_EXISTS=true
  [ -f .planning/codebase/conventions.md ] && CONVENTIONS_EXISTS=true
  [ -f .planning/codebase/concerns.md ] && CONCERNS_EXISTS=true

  # Extract SHA from tech-stack.md frontmatter
  if [ "$TECHSTACK_EXISTS" = "true" ]; then
    STORED_SHA=$(grep '^commit_sha:' .planning/codebase/tech-stack.md | head -1 | awk '{print $2}')
    CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null)

    if [ -n "$STORED_SHA" ] && [ -n "$CURRENT_SHA" ]; then
      if [ "$STORED_SHA" != "$CURRENT_SHA" ]; then
        CODEBASE_STALE="yes"
      else
        CODEBASE_STALE="no"
      fi
    else
      CODEBASE_STALE="unknown"
    fi
  fi
fi
```
</step>

<step name="count_todos">
**Count pending todos:**

```bash
TODO_COUNT=0

if [ -d .planning/todos ]; then
  TODO_COUNT=$(find .planning/todos -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
fi
```
</step>

<step name="list_phase_plans">
**List phase plan files:**

```bash
# Find all PHASE-*-PLAN.md files in .planning/project/
PHASE_PLANS=()

if [ -d .planning/project ]; then
  while IFS= read -r -d '' file; do
    PHASE_PLANS+=("$(basename "$file")")
  done < <(find .planning/project -maxdepth 1 -name "PHASE-*-PLAN.md" -print0 2>/dev/null | sort -z)
fi
```
</step>

<step name="format_output">
**Format and display results:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ${STATUS}

## Project Structure

- .planning/ directory: ✓ exists
- PROJECT.md: ${PROJECT_MD_EXISTS ? "✓ exists" : "✗ missing"}
- PROJECT-PLAN.md: ${PROJECT_PLAN_EXISTS ? "✓ exists" : "○ not yet planned"}

## Codebase Map

- .planning/codebase/: ${CODEBASE_DIR_EXISTS ? "✓ exists" : "○ not mapped"}
${CODEBASE_DIR_EXISTS ? "  - tech-stack.md: " + (TECHSTACK_EXISTS ? "✓ exists" : "✗ missing") : ""}
${CODEBASE_DIR_EXISTS ? "  - architecture.md: " + (ARCHITECTURE_EXISTS ? "✓ exists" : "✗ missing") : ""}
${CODEBASE_DIR_EXISTS ? "  - conventions.md: " + (CONVENTIONS_EXISTS ? "✓ exists" : "✗ missing") : ""}
${CODEBASE_DIR_EXISTS ? "  - concerns.md: " + (CONCERNS_EXISTS ? "✓ exists" : "✗ missing") : ""}
${CODEBASE_STALE === "yes" ? "  ⚠ Map is stale (commit SHA mismatch)" : ""}
${CODEBASE_STALE === "no" ? "  ✓ Map is current" : ""}

## Phase Plans

${PHASE_PLANS.length > 0 ? PHASE_PLANS.map(p => `- ${p}`).join('\n') : "  No phase plans found"}

## Todos

- Pending: ${TODO_COUNT}

```

**Status meanings:**
- `healthy`: PROJECT.md and PROJECT-PLAN.md exist
- `healthy-unplanned`: PROJECT.md exists but no PROJECT-PLAN.md yet
- `degraded`: Missing PROJECT.md
- `broken`: .planning/ directory missing

**If degraded:**
```
## Actions

Run /new-project to create PROJECT.md
```

**If healthy-unplanned:**
```
## Actions

Run /plan-project to create PROJECT-PLAN.md
```

**If codebase map stale:**
```
## Actions

Run /map to update codebase map
```
</step>

</process>

<error_codes>

| Code | Severity | Description | Action |
|------|----------|-------------|--------|
| E001 | error | .planning/ directory not found | Run /new-project |
| E002 | error | PROJECT.md not found | Run /new-project |
| E003 | info | PROJECT-PLAN.md not found (project not yet planned) | Run /plan-project |
| W001 | warning | Codebase map is stale | Run /map |

</error_codes>

<notes>

**Verification is report-only**: Health check does NOT auto-repair. It reports status and suggests commands to run.

**No legacy file checks**: Does not check for ROADMAP.md, STATE.md, MILESTONES.md, config.json — these are not part of the new architecture.

**Phase directory validation removed**: Phase plans live in .planning/project/ with flat naming (PHASE-N-PLAN.md), not in phase directories with NN-name format.

</notes>
