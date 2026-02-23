<purpose>
Research how to implement a phase. Spawns researcher subagent with phase context.

Standalone research command. For most workflows, use `/plan-phase` which can integrate research automatically.
</purpose>

<process>

## Step 1: Validate Prerequisites

**Check PROJECT-PLAN.md exists:**

```bash
if [ ! -f ".planning/project/PROJECT-PLAN.md" ]; then
  echo "Warning: PROJECT-PLAN.md not found."
  echo "This command works best within a project context."
  echo "Consider running /plan-project first."
  # Continue anyway — soft warning
fi
```

**Parse phase number:**

```bash
PHASE="$1"
```

**Validate phase exists in PROJECT-PLAN.md (if file exists):**

```bash
if [ -f ".planning/project/PROJECT-PLAN.md" ]; then
  grep -q "^### Phase ${PHASE}:" .planning/project/PROJECT-PLAN.md 2>/dev/null || {
    echo "Phase ${PHASE} not found in PROJECT-PLAN.md"
    exit 1
  }
  PHASE_SECTION=$(sed -n "/^### Phase ${PHASE}:/,/^### Phase [0-9]/p" .planning/project/PROJECT-PLAN.md | head -n -1)
  PHASE_NAME=$(echo "$PHASE_SECTION" | head -1 | sed 's/^### Phase [0-9]*: //')
  PHASE_GOAL=$(echo "$PHASE_SECTION" | grep "^\*\*Goal\*\*:" | sed 's/^\*\*Goal\*\*: //')
fi
```

## Step 2: Check Existing Research

```bash
ls .planning/project/PHASE-${PHASE}-RESEARCH.md 2>/dev/null
```

If exists: Offer update/view/skip options (re-run overwrites per SPEC).

## Step 3: Gather Phase Context

Collect file paths for researcher to load:

```bash
PROJECT_PLAN_PATH=".planning/project/PROJECT-PLAN.md"
CONTEXT_PATH=".planning/project/PHASE-${PHASE}-CONTEXT.md"
CODEBASE_PATH=".planning/CODEBASE.md"

# Check which files exist
[ -f "$PROJECT_PLAN_PATH" ] && HAS_PROJECT_PLAN=true || HAS_PROJECT_PLAN=false
[ -f "$CONTEXT_PATH" ] && HAS_CONTEXT=true || HAS_CONTEXT=false
[ -f "$CODEBASE_PATH" ] && HAS_CODEBASE=true || HAS_CODEBASE=false
```

## Step 4: Spawn Researcher

Build researcher prompt with XML-tagged sections per SPEC:

```markdown
<objective>
Research implementation approach for Phase ${PHASE}: ${PHASE_NAME}

Answer: "What do I need to know to PLAN and EXECUTE this phase well?"
</objective>

<files_to_read>
${HAS_PROJECT_PLAN && "- .planning/project/PROJECT-PLAN.md (Project phases)"}
${HAS_CONTEXT && "- .planning/project/PHASE-${PHASE}-CONTEXT.md (User decisions from /discuss-phase)"}
${HAS_CODEBASE && "- .planning/CODEBASE.md (Codebase context)"}
</files_to_read>

<additional_context>
**Phase goal:** ${PHASE_GOAL}

This is tactical phase-level research for single-commit scope.
Be lighter touch than project-level research — focus on implementation specifics, gotchas, and patterns.
</additional_context>

<output_format>
Write to: .planning/project/PHASE-${PHASE}-RESEARCH.md

**CRITICAL: Use XML-tagged sections per SPEC:**

<user_constraints>
## User Constraints (from PHASE-${PHASE}-CONTEXT.md)

### Locked Decisions
[Copy from CONTEXT.md — these are NON-NEGOTIABLE for the planner/executor]

### Discretion Areas
[Copy from CONTEXT.md — areas where planner/executor can choose]

### Deferred Ideas (OUT OF SCOPE)
[Copy from CONTEXT.md — do NOT research or plan these]

**If no CONTEXT.md exists:** "No user constraints — all decisions at researcher's discretion"
</user_constraints>

<research_summary>
## Summary
[1-2 paragraph summary. What was researched, key recommendation, main risk.]
**Primary recommendation:** [one-liner actionable guidance for the planner]
</research_summary>

<standard_stack>
## Standard Stack
[Libraries and tools that are industry standard for this problem]
</standard_stack>

<implementation_patterns>
## Implementation Patterns
[Code examples and patterns from official docs]
</implementation_patterns>

<common_pitfalls>
## Common Pitfalls
[What goes wrong, how to avoid, warning signs]
</common_pitfalls>

<open_questions>
## Open Questions
[Things that couldn't be resolved — recommendation for how to handle during execution]
</open_questions>

<sources>
## Sources
[Primary and secondary sources with confidence levels]
</sources>
</output_format>
```

Spawn researcher subagent:

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-phase-researcher",
  description="Research Phase ${PHASE}"
)
```

## Step 5: Handle Return

- `## RESEARCH COMPLETE` — Display summary, suggest next steps
- `## RESEARCH BLOCKED` — Display blocker, offer alternatives
- `## RESEARCH INCONCLUSIVE` — Show attempts, offer: Add context/Retry/Manual

**Handoff suggestion:** Recommend `/plan-phase ${PHASE}` after successful research.

**Never auto-advance** — user decides next command per SPEC (SAFE-03).

</process>
