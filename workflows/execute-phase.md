<purpose>
Execute a phase plan (PHASE-N-PLAN.md) and track execution history in PROJECT-SUMMARY.md.
</purpose>

<core_principle>
The executor implements. It does not verify, stage, or commit. All changes remain unstaged for `/verify-phase N` to review.

**From SPEC section 4:** Executor applies deviation rules (Rules 1-4), tracks what happened, updates PROJECT-SUMMARY.md, reports completion. Changes stay unstaged.
</core_principle>

<required_reading>
@~/.claude/get-shit-done/knowledge/execution-domain.md
</required_reading>

<process>

<step name="check_prerequisites" priority="first">
Soft prerequisite checks (warn and offer help, not hard error):

```bash
PHASE_ARG="${ARGUMENTS[0]}"
PHASE_PLAN=".planning/project/PHASE-${PHASE_ARG}-PLAN.md"
PROJECT_FILE=".planning/project/PROJECT.md"

if [ ! -f "$PHASE_PLAN" ]; then
  echo "⚠️  Phase plan not found: $PHASE_PLAN"
  echo "Run: /plan-phase ${PHASE_ARG}"
  exit 1
fi

if [ ! -f "$PROJECT_FILE" ]; then
  echo "⚠️  Project file not found: $PROJECT_FILE"
  echo "Run: /new-project"
  exit 1
fi
```
</step>

<step name="bootstrap">
Load phase context:

```bash
# Read phase plan to extract objective and task count
PHASE_NUM="${ARGUMENTS[0]}"
PHASE_PLAN=".planning/project/PHASE-${PHASE_NUM}-PLAN.md"
```

Use **Read** to load:
- `$PHASE_PLAN`
- `.planning/project/PROJECT.md`
- `.planning/CODEBASE.md` (if exists)
- `.planning/project/PHASE-${PHASE_NUM}-CONTEXT.md` (if exists)
- `.planning/project/PHASE-${PHASE_NUM}-RESEARCH.md` (if exists)

Parse phase plan frontmatter:
- `phase`: phase number
- `type`: execute | tdd
- `acceptance_criteria`: which ACs this phase satisfies
- `files_modified`: predicted file list

Parse tasks count from `<tasks>` section.

Report what will be executed:
```
## Executing Phase ${PHASE_NUM}

**Type:** ${TYPE}
**Acceptance Criteria:** ${AC_LIST}
**Tasks:** ${TASK_COUNT}

Starting executor...
```
</step>

<step name="spawn_executor">
Spawn executor subagent with explicit context via `<files_to_read>`:

```
Task(
  subagent_type="gsd-executor",
  model="sonnet",
  prompt="
    <objective>
    Execute phase ${PHASE_NUM} according to PHASE-${PHASE_NUM}-PLAN.md.

    Apply deviation rules (Rules 1-4) as needed. Track what was done, deviations, and decisions. Update PROJECT-SUMMARY.md with phase execution block.

    All changes remain unstaged. DO NOT commit, stage, or update STATE.md/ROADMAP.md.
    </objective>

    <execution_context>
    @~/.claude/get-shit-done/knowledge/execution-domain.md
    </execution_context>

    <files_to_read>
    Read these files at execution start using the Read tool:
    - .planning/project/PHASE-${PHASE_NUM}-PLAN.md (Plan)
    - .planning/project/PROJECT.md (Project context)
    - .planning/CODEBASE.md (if exists — Codebase map)
    - .planning/project/PHASE-${PHASE_NUM}-CONTEXT.md (if exists — Locked decisions from /discuss-phase)
    - .planning/project/PHASE-${PHASE_NUM}-RESEARCH.md (if exists — Research findings)
    - ./CLAUDE.md (if exists — Project instructions)
    </files_to_read>

    <deviation_rules>
    Apply Rules 1-4 from execution-domain.md:
    - Rule 1: Auto-fix bugs encountered during implementation
    - Rule 2: Auto-add missing critical functionality (security, validation)
    - Rule 3: Auto-fix blocking issues
    - Rule 4: Architectural change needed — STOP immediately

    **Fix attempt limit:** Max 3 attempts per issue, then stop and report.
    **Scope boundary:** Deviations stay within planned scope.
    </deviation_rules>

    <tracking>
    Track during execution:
    - What was done (files created/modified)
    - Deviations applied (which rule, what fixed, why)
    - Decisions made during implementation
    - Any issues encountered
    </tracking>

    <output>
    Update .planning/project/PROJECT-SUMMARY.md:

    If phase block already exists (re-run), overwrite it. Otherwise append:

    ## Phase ${PHASE_NUM}: [Name from plan]
    **Status:** Complete | Failed (step X) | Stopped (Rule 4)
    **Files changed:** [list]
    **Deviations:** [list or \"None\"]
    **Decisions:** [any runtime decisions made]
    **Notes:** [anything the human should know when reviewing the diff]

    Create the file if it doesn't exist.
    </output>

    <success_criteria>
    - [ ] All tasks executed (or stopped at Rule 4 with documented reason)
    - [ ] PROJECT-SUMMARY.md updated with phase block
    - [ ] All changes remain unstaged (NEVER run git add or git commit)
    - [ ] Deviations tracked in summary
    </success_criteria>
  "
)
```

**Wait for subagent to complete.**
</step>

<step name="handle_rule4_termination">
If executor returns with "Stopped (Rule 4)" status:

1. Read PROJECT-SUMMARY.md phase block
2. Present architectural concern to human:
```
## ⚠️ Architectural Decision Required

Phase ${PHASE_NUM} execution stopped — architectural change needed.

**What was completed:**
${COMPLETED_WORK}

**Architectural concern:**
${CONCERN_DESCRIPTION}

**Proposed change:**
${PROPOSED_CHANGE}

**Impact:**
${IMPACT}

---
Re-running /execute-phase ${PHASE_NUM} will replay from scratch.
```

STOP. Do not proceed to next steps. Human decides how to proceed.
</step>

<step name="report_completion">
If executor completes normally:

Read PROJECT-SUMMARY.md phase block to get:
- Status
- Files changed
- Deviations
- Notes

```
## Phase ${PHASE_NUM} Execution Complete

**Status:** ${STATUS}
**Files changed:** ${FILE_COUNT} files
**Deviations:** ${DEVIATION_SUMMARY}

${NOTES_IF_ANY}

---
**Next:** /verify-phase ${PHASE_NUM}

All changes are unstaged. The verifier will check must_haves and stage files on pass.
```

List files changed (first 10):
```bash
git status --short | head -10
```

If more than 10 files: "... and ${EXTRA_COUNT} more files. Use \`git status\` to see all."
</step>

<step name="re_run_behavior">
**On re-run of failed phase:**

Executor replays from scratch:
- Does not detect or skip partially completed work
- Partial unstaged changes are overwritten
- Prior phases' staged work is untouched
- PROJECT-SUMMARY.md entry for the phase is overwritten (not duplicated)

This is intentional per SPEC section 4.
</step>

</process>

<removed_from_gsd>
This workflow removes from the GSD execute-phase.md:

**Removed:**
- Per-step commits (no git commit operations)
- STATE.md/ROADMAP.md updates
- Metadata commit
- Auto-advance to next phase
- Continuation agents
- Checkpoints
- Self-check / self-verification
- Staging (executor never stages — that's /verify-phase)
- Wave-based execution (one plan per phase)
- `execute-plan.md` references (no separate execute-plan workflow)
- Branching strategy logic
- `gsd-tools.cjs` commands

**Kept:**
- Deviation rules (Rules 1-4, scope boundary, fix attempt limit)
- TDD flow (RED/GREEN/REFACTOR) when plan type is `tdd`
- Authentication gates (dynamic, not pre-planned)
- Task execution logic
</removed_from_gsd>

<success_criteria>
- Phase plan executed
- PROJECT-SUMMARY.md updated (append or overwrite on re-run)
- All changes remain unstaged
- Deviation rules applied automatically
- TDD flow preserved for `type: tdd` plans
- Rule 4 termination documented clearly
</success_criteria>
