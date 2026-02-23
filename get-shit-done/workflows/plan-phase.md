<purpose>
Create executable phase prompts (PLAN.md files) for a project phase with integrated research and verification. Default flow: Research (if needed) -> Plan -> Verify -> Done. Orchestrates gsd-phase-researcher, gsd-planner, and gsd-plan-checker agents with a revision loop (max 3 iterations).
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.

@~/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<process>

## 1. Initialize

**Prerequisite check:** Verify `.planning/project/PROJECT-PLAN.md` exists.

```bash
if [ ! -f ".planning/project/PROJECT-PLAN.md" ]; then
  echo "PROJECT-PLAN.md not found."
  echo ""
  echo "Run /plan-project first to break your project into phases."
  exit 1
fi
```

**Parse phase number:**
```bash
PHASE="$1"
```

**Validate phase exists in PROJECT-PLAN.md:**
```bash
grep -q "^### Phase ${PHASE}:" .planning/project/PROJECT-PLAN.md 2>/dev/null || {
  echo "Phase ${PHASE} not found in PROJECT-PLAN.md"
  exit 1
}

PHASE_SECTION=$(sed -n "/^### Phase ${PHASE}:/,/^### Phase [0-9]/p" .planning/project/PROJECT-PLAN.md | head -n -1)
PHASE_NAME=$(echo "$PHASE_SECTION" | head -1 | sed 's/^### Phase [0-9]*: //')
PHASE_GOAL=$(echo "$PHASE_SECTION" | grep "^\*\*Goal\*\*:" | sed 's/^\*\*Goal\*\*: //')
PHASE_AC=$(echo "$PHASE_SECTION" | grep "^\*\*Acceptance Criteria\*\*:" | sed 's/^\*\*Acceptance Criteria\*\*: //')
```

## 2. Ensure .planning/project/ exists

```bash
mkdir -p .planning/project
```

## 3. Check Existing Plan

```bash
ls .planning/project/PHASE-${PHASE}-PLAN.md 2>/dev/null
```

**If exists:** Offer: 1) Update plan, 2) View existing, 3) Skip.

## 4. Load Context Files

Collect file paths for planner to load:

```bash
PROJECT_PLAN_PATH=".planning/project/PROJECT-PLAN.md"
CONTEXT_PATH=".planning/project/PHASE-${PHASE}-CONTEXT.md"
RESEARCH_PATH=".planning/project/PHASE-${PHASE}-RESEARCH.md"
CODEBASE_PATH=".planning/CODEBASE.md"

# Check which files exist
[ -f "$PROJECT_PLAN_PATH" ] && HAS_PROJECT_PLAN=true || HAS_PROJECT_PLAN=false
[ -f "$CONTEXT_PATH" ] && HAS_CONTEXT=true || HAS_CONTEXT=false
[ -f "$RESEARCH_PATH" ] && HAS_RESEARCH=true || HAS_RESEARCH=false
[ -f "$CODEBASE_PATH" ] && HAS_CODEBASE=true || HAS_CODEBASE=false
```

**If no CONTEXT.md exists:**

Display soft warning:
```
Note: No PHASE-${PHASE}-CONTEXT.md found.
Plan will use research and codebase only — user design preferences not included.
Consider running /discuss-phase ${PHASE} first if you have specific implementation preferences.
```

Continue anyway (soft warning, not blocking).

## 5. Note About Research

**Note:** Research is handled separately via `/research-phase N` command per SPEC.
This workflow focuses on planning only.

If no RESEARCH.md exists, display soft note:
```
Note: No PHASE-${PHASE}-RESEARCH.md found.
Consider running /research-phase ${PHASE} first for implementation guidance.
Continuing with planning using available context...
```

## 6. Spawn Planner Subagent

Display:
```
Planning Phase ${PHASE}: ${PHASE_NAME}
Spawning planner subagent...
```

Build planner prompt with context files per SPEC (single-commit scope):

```markdown
<objective>
Create detailed execution plan for Phase ${PHASE}: ${PHASE_NAME}

**Critical:** This is single-commit scope. One plan per phase. No waves, no parallelization. Decisions belong in /discuss-phase, not mid-execution.
</objective>

<files_to_read>
${HAS_PROJECT_PLAN && "- .planning/project/PROJECT-PLAN.md (Phase goal and acceptance criteria)"}
${HAS_CONTEXT && "- .planning/project/PHASE-${PHASE}-CONTEXT.md (User decisions from /discuss-phase)"}
${HAS_RESEARCH && "- .planning/project/PHASE-${PHASE}-RESEARCH.md (Technical research)"}
${HAS_CODEBASE && "- .planning/CODEBASE.md (Codebase context)"}
- get-shit-done/knowledge/planning-domain.md (if exists)
- get-shit-done/knowledge/project-domain.md (if exists)
</files_to_read>

<additional_context>
**Phase goal:** ${PHASE_GOAL}
**Acceptance criteria:** ${PHASE_AC}

**Project instructions:** Read ./CLAUDE.md if exists — follow project-specific guidelines
</additional_context>

<output_format>
Write to: .planning/project/PHASE-${PHASE}-PLAN.md

**CRITICAL: SPEC-compliant format (YAML frontmatter + XML body):**

\`\`\`yaml
---
phase: ${PHASE}
type: execute | tdd
acceptance_criteria: [${PHASE_AC}]
files_modified: []
must_haves:
  truths: []     # Observable behaviors that must be true when phase is done
  artifacts: []  # Files that must exist with substantive implementation
---
\`\`\`

\`\`\`xml
<objective>
[What this phase accomplishes — one paragraph]
</objective>

<context>
@.planning/project/PROJECT-PLAN.md
${HAS_CONTEXT && "@.planning/project/PHASE-${PHASE}-CONTEXT.md"}
${HAS_RESEARCH && "@.planning/project/PHASE-${PHASE}-RESEARCH.md"}
${HAS_CODEBASE && "@.planning/CODEBASE.md"}
</context>

<tasks>
<task>
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[What to do, how, what to avoid and WHY]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria for this task]</done>
</task>
</tasks>

<verification>
- [ ] [Specific test command that must pass]
- [ ] [Build/lint/typecheck that must pass]
- [ ] [Behavioral check]
</verification>
\`\`\`

**NO wave, NO depends_on.** Decisions belong in /discuss-phase, not mid-execution.
</output_format>
```

Spawn planner subagent:

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-planner",
  description="Plan Phase ${PHASE}"
)
```

## 7. Handle Planner Return

- **`## PLANNING COMPLETE`:** Proceed to plan-checker verification (step 7.1)
- **`## PLANNING INCONCLUSIVE`:** Show what was attempted, offer: Add context / Retry / Manual edit

## 7.1. Plan-Checker Verification

Spawn `gsd-plan-checker` for secondary scope validation per SPEC §2:

```
Task(
  prompt="Check this phase plan for scope compliance and verifiability.\n\nRead: .planning/project/PHASE-${PHASE}-PLAN.md\nAlso read: .planning/project/PROJECT-PLAN.md\n\nCheck:\n- Does the plan stay within the phase's planned scope?\n- Is the work verifiable in a single commit?\n- Number of behavioral changes, systems touched, architectural boundary crossings\n- Are must_haves concrete and testable?\n\nReturn ## CHECK PASSED or ## CHECK FAILED with specific concerns.",
  subagent_type="gsd-plan-checker",
  description="Check Phase ${PHASE} plan"
)
```

- **`## CHECK PASSED`:** Proceed to step 8
- **`## CHECK FAILED`:** Show concerns, offer: Revise plan (re-run planner with checker feedback) / Accept anyway / Manual edit
- **Revision loop:** Max 3 iterations (plan → check → revise). After 3 failures, present plan with checker warnings and let human decide.

## 8. Present Results and Next Steps

Display summary:
```
Planning complete for Phase ${PHASE}: ${PHASE_NAME}

Created: .planning/project/PHASE-${PHASE}-PLAN.md

## Next Steps

Suggest continuing with:
- Review the plan: cat .planning/project/PHASE-${PHASE}-PLAN.md
- Execute the phase: /execute-phase ${PHASE}
- Verify after execution: /verify-phase ${PHASE}
```

**Never auto-advance** — user decides next command per SPEC (SAFE-03).

Track `iteration_count` (starts at 1 after initial plan + check).


<success_criteria>
- [ ] PROJECT-PLAN.md validated
- [ ] Phase validated against PROJECT-PLAN.md
- [ ] .planning/project/ directory exists
- [ ] Context files loaded (CONTEXT.md, RESEARCH.md, CODEBASE.md if they exist)
- [ ] Existing plan checked
- [ ] Planner spawned with proper context
- [ ] PHASE-N-PLAN.md created with YAML + XML format per SPEC
- [ ] Plan has no wave/depends_on/parallelization per SPEC
- [ ] Plan has must_haves section
- [ ] User knows next steps (suggest /execute-phase N)
</success_criteria>
