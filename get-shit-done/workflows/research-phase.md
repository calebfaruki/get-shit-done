<purpose>
Research how to implement a phase. Spawns 4 parallel researcher subagents covering implementation details, codebase conventions, domain best practices, and safety analysis.

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

Collect file paths for researchers to load:

```bash
PROJECT_PLAN_PATH=".planning/project/PROJECT-PLAN.md"
CONTEXT_PATH=".planning/project/PHASE-${PHASE}-CONTEXT.md"
CODEBASE_PATH=".planning/CODEBASE.md"

# Check which files exist
[ -f "$PROJECT_PLAN_PATH" ] && HAS_PROJECT_PLAN=true || HAS_PROJECT_PLAN=false
[ -f "$CONTEXT_PATH" ] && HAS_CONTEXT=true || HAS_CONTEXT=false
[ -f "$CODEBASE_PATH" ] && HAS_CODEBASE=true || HAS_CODEBASE=false
```

## Step 4: Spawn All 4 Researchers in Parallel

Build prompts and spawn all agents with `run_in_background=true`.

### Agent 1: Phase Researcher (existing — writes PHASE-N-RESEARCH.md)

Same prompt as before — this agent writes the base research file.

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

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-phase-researcher",
  run_in_background=true,
  description="Research Phase ${PHASE}"
)
```

### Agent 2: Conventions Researcher (returns findings to orchestrator)

```markdown
<objective>
Analyze codebase conventions relevant to Phase ${PHASE}: ${PHASE_NAME}

Answer: "What conventions does this codebase follow that are relevant to this phase's work?"
</objective>

<files_to_read>
${HAS_CODEBASE && "- .planning/CODEBASE.md (Codebase context)"}
${HAS_PROJECT_PLAN && "- .planning/project/PROJECT-PLAN.md (Project phases)"}
</files_to_read>

<phase_context>
**Phase number:** ${PHASE}
**Phase name:** ${PHASE_NAME}
**Phase goal:** ${PHASE_GOAL}
</phase_context>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-conventions-researcher",
  run_in_background=true,
  description="Research Phase ${PHASE} conventions"
)
```

### Agent 3: Best Practices Researcher (returns findings to orchestrator)

```markdown
<objective>
Research community best practices for the domain of Phase ${PHASE}: ${PHASE_NAME}

Answer: "What do experts agree you should always/never do in this domain?"
</objective>

<files_to_read>
${HAS_PROJECT_PLAN && "- .planning/project/PROJECT-PLAN.md (Project phases)"}
${HAS_CONTEXT && "- .planning/project/PHASE-${PHASE}-CONTEXT.md (User decisions from /discuss-phase)"}
</files_to_read>

<phase_context>
**Phase number:** ${PHASE}
**Phase name:** ${PHASE_NAME}
**Phase goal:** ${PHASE_GOAL}
</phase_context>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-bestpractices-researcher",
  run_in_background=true,
  description="Research Phase ${PHASE} best practices"
)
```

### Agent 4: Safety Researcher (returns findings to orchestrator)

```markdown
<objective>
Analyze safety risks for Phase ${PHASE}: ${PHASE_NAME}

Answer: "What could go catastrophically wrong during this phase, and how do we prevent it?"
</objective>

<files_to_read>
${HAS_CODEBASE && "- .planning/CODEBASE.md (Codebase context)"}
${HAS_PROJECT_PLAN && "- .planning/project/PROJECT-PLAN.md (Project phases)"}
</files_to_read>

<phase_context>
**Phase number:** ${PHASE}
**Phase name:** ${PHASE_NAME}
**Phase goal:** ${PHASE_GOAL}
</phase_context>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-safety-researcher",
  run_in_background=true,
  description="Research Phase ${PHASE} safety"
)
```

**CRITICAL:** All 4 Task calls must be in a single message for parallel execution.

## Step 5: Wait and Collect Results

Wait for all 4 agents to complete. Read each agent's output.

Track outcomes:

```
PHASE_RESEARCHER: COMPLETE | BLOCKED | INCONCLUSIVE
CONVENTIONS: COMPLETE | BLOCKED
BESTPRACTICES: COMPLETE | BLOCKED
SAFETY: COMPLETE | BLOCKED
```

**Minimum viable output:** The phase researcher's file (PHASE-N-RESEARCH.md) must exist. The 3 supplemental agents are additive — if they fail, log the failure and continue.

## Step 6: Append Supplemental Research

**Guard:** If the phase researcher returned BLOCKED or INCONCLUSIVE, skip this step — there is no base research file to append to. Proceed directly to Step 7.

Read `PHASE-${PHASE}-RESEARCH.md` (written by the phase researcher in Step 4).

For each successful supplemental agent (conventions, best practices, safety), append its XML block to the end of the research file:

```markdown
[existing PHASE-N-RESEARCH.md content from phase researcher]

<codebase_conventions>
[Conventions researcher findings]
</codebase_conventions>

<domain_best_practices>
[Best practices researcher findings]
</domain_best_practices>

<safety_analysis>
[Safety researcher findings]
</safety_analysis>
```

Only append sections from agents that returned successfully. Skip sections from failed agents.

Write the updated file back to `.planning/project/PHASE-${PHASE}-RESEARCH.md`.

## Step 7: Handle Return

Report outcomes for all 4 agents:

```
Research complete for Phase ${PHASE}.

Phase Research:      [COMPLETE/BLOCKED/INCONCLUSIVE]
Conventions:         [COMPLETE/BLOCKED]
Best Practices:      [COMPLETE/BLOCKED]
Safety Analysis:     [COMPLETE/BLOCKED]

Written to: .planning/project/PHASE-${PHASE}-RESEARCH.md
```

If phase researcher succeeded:
- Display summary from `<research_summary>` section
- Note which supplemental sections were added
- Suggest next steps

If phase researcher failed:
- Display blocker
- Offer alternatives
- Do NOT attempt to use supplemental research as a substitute

Determine next step:

```bash
node ~/.claude/hooks/gsd-state-resolver.js
```

Parse the JSON result and present:
```
Research complete for Phase ${PHASE}.

Next: [nextCommand from resolver]
Context: [context from resolver]

<sub>`/clear` first -> fresh context window</sub>
```

Present exactly ONE next step from the resolver. Do not list alternatives.

**Never auto-advance** -- user decides next command per SPEC (SAFE-03).

</process>
