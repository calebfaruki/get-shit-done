<purpose>
Execute a phase plan. Single plan per phase. All changes remain unstaged for `/verify-phase N` to review and stage.
</purpose>

<core_principle>
The executor implements the plan, applies deviation rules when needed, tracks what happened in PROJECT-SUMMARY.md, but never commits, stages, or auto-advances. This is where actual work gets done.
</core_principle>

<required_reading>
@~/.claude/get-shit-done/knowledge/execution-domain.md (deviation rules, TDD flow, tool guidance)
</required_reading>

<process>

<step name="prerequisites">
Validate prerequisites with soft warnings — offer help rather than hard error.

**Parse phase number from arguments:**
```bash
PHASE="$1"
```

**Check plan file exists:**
```bash
PLAN_PATH=".planning/project/PHASE-${PHASE}-PLAN.md"

if [ ! -f "$PLAN_PATH" ]; then
  echo "PHASE-${PHASE}-PLAN.md not found in .planning/project/"
  echo ""
  echo "Run /plan-phase ${PHASE} first to create the execution plan."
  exit 1
fi
```

**Check PROJECT.md exists:**
```bash
if [ ! -f ".planning/project/PROJECT.md" ]; then
  echo "Warning: PROJECT.md not found."
  echo "Execution will continue, but executor won't have project context."
fi
```
</step>

<step name="bootstrap">
Load context files needed for execution. Collect paths to pass to executor subagent.

**Required files:**
```bash
PLAN_PATH=".planning/project/PHASE-${PHASE}-PLAN.md"
PROJECT_PATH=".planning/project/PROJECT.md"
```

**Optional context files:**
```bash
CODEBASE_PATH=".planning/CODEBASE.md"
CONTEXT_PATH=".planning/project/PHASE-${PHASE}-CONTEXT.md"
RESEARCH_PATH=".planning/project/PHASE-${PHASE}-RESEARCH.md"
CLAUDE_PATH="./CLAUDE.md"

# Check which optional files exist
[ -f "$CODEBASE_PATH" ] && HAS_CODEBASE=true || HAS_CODEBASE=false
[ -f "$CONTEXT_PATH" ] && HAS_CONTEXT=true || HAS_CONTEXT=false
[ -f "$RESEARCH_PATH" ] && HAS_RESEARCH=true || HAS_RESEARCH=false
[ -f "$CLAUDE_PATH" ] && HAS_CLAUDE=true || HAS_CLAUDE=false
```

**Read the plan to extract key metadata:**
```bash
# Extract phase name from plan objective
# Extract plan type from frontmatter (execute or tdd)
# Extract acceptance criteria from frontmatter
```

Use Read tool to load PHASE-${PHASE}-PLAN.md and parse:
- Frontmatter `type:` field (execute | tdd)
- Frontmatter `acceptance_criteria:` array
- `<objective>` section for phase name/description
- Task count from `<tasks>` section
</step>

<step name="spawn_executor">
Spawn a single executor subagent using Task tool. Pass explicit `<files_to_read>` block with all required context.

**Subagent prompt structure:**

```
<objective>
Execute Phase ${PHASE}: [Name from plan objective].

Implement all tasks in PHASE-${PHASE}-PLAN.md according to execution-domain.md rules.
Track what was done, deviations from plan, and decisions made.
Update PROJECT-SUMMARY.md with phase execution block.
All changes remain unstaged — never run git add, git commit, git checkout, git reset, or git stash.
</objective>

<execution_context>
@~/.claude/get-shit-done/knowledge/execution-domain.md
</execution_context>

<files_to_read>
Read these files at execution start using the Read tool:
- .planning/project/PHASE-${PHASE}-PLAN.md (the plan to execute)
- .planning/project/PROJECT.md (project context)
${HAS_CODEBASE ? "- .planning/CODEBASE.md (codebase understanding)" : ""}
${HAS_CONTEXT ? "- .planning/project/PHASE-${PHASE}-CONTEXT.md (locked decisions from /discuss-phase)" : ""}
${HAS_RESEARCH ? "- .planning/project/PHASE-${PHASE}-RESEARCH.md (tactical research)" : ""}
${HAS_CLAUDE ? "- ./CLAUDE.md (project-specific instructions and conventions)" : ""}
- get-shit-done/knowledge/execution-domain.md (deviation rules, TDD flow, tool guidance)
</files_to_read>

<process>

1. **Load all files from `<files_to_read>`** — full context for fresh 200k budget

2. **Parse PHASE-${PHASE}-PLAN.md:**
   - Read frontmatter: `type`, `acceptance_criteria`, `must_haves`
   - Extract `<objective>` — what this phase accomplishes
   - Extract `<context>` — additional files to load
   - Enumerate tasks from `<tasks>` section

3. **Load context files:**
   - Read all files listed in plan's `<context>` section
   - These are source files needed for implementation

4. **Execute tasks in order:**

   For each task:

   a. **Read task details:**
      - `<name>` — task description
      - `<files>` — files to create/modify
      - `<action>` — implementation instructions
      - `<verify>` — how to confirm it worked
      - `<done>` — acceptance criteria for this task

   b. **Apply execution methodology:**

      **If plan type is `tdd`:**
      - Follow RED/GREEN/REFACTOR cycle per execution-domain.md `<tdd_flow>`
      - RED: Write failing test, run (must fail)
      - GREEN: Implement to pass, run (must pass)
      - REFACTOR: Clean up if needed, tests must still pass
      - Track each phase's work for summary

      **If plan type is `execute`:**
      - Implement task according to `<action>` instructions
      - Run `<verify>` command to confirm it worked
      - Check `<done>` criteria are met

   c. **Apply deviation rules from execution-domain.md `<deviation_rules>`:**

      While implementing, you WILL discover work not in the plan:

      - **Rule 1 (Auto-fix bugs):** Code doesn't work as intended → fix inline, add tests, continue
      - **Rule 2 (Auto-add missing critical functionality):** Missing security/validation/error handling → add inline, continue
      - **Rule 3 (Auto-fix blocking issues):** Something prevents completing task → fix blocker, continue
      - **Rule 4 (Ask about architectural changes):** Needs new DB table, service layer, framework change → STOP and return

      **Scope boundary:** Only fix issues DIRECTLY caused by current task's changes. Pre-existing issues are noted in the summary as out-of-scope.

      **Fix attempt limit:** Max 3 attempts per issue. After 3 failures, document in summary and move on.

   d. **Track deviations:**
      - Each Rule 1-3 application: `[Rule N - Type] description`
      - Rule 4 termination: Document architectural concern in summary

   e. **Continue to next task**

5. **Rule 4 termination handling:**

   If Rule 4 triggers during execution:
   - Write completed work to PROJECT-SUMMARY.md with status "Stopped (Rule 4)"
   - Document: what was found, why it's architectural, what tasks completed, what remains
   - Return to orchestrator with termination message
   - Executor does NOT attempt to solve architectural issues — user decides

6. **Track execution metadata:**
   - Files created or modified (with paths)
   - Deviations from plan (Rules 1-3 applied)
   - Decisions made during implementation
   - Any issues hit the fix attempt limit

7. **Update PROJECT-SUMMARY.md:**

   Location: `.planning/project/PROJECT-SUMMARY.md`

   **Overwrite-on-re-run logic:**
   - Check if PROJECT-SUMMARY.md exists
   - If it contains `## Phase ${PHASE}:` block already:
     - Replace entire block (from `## Phase ${PHASE}:` to next `## Phase` or EOF)
   - If no matching phase block:
     - Append new block at end
   - If file doesn't exist:
     - Create with first phase block

   **Phase block format (plain markdown per SPEC section 5):**
   ```
   ## Phase ${PHASE}: [Name from plan objective]
   **Status:** Complete | Failed (step X) | Stopped (Rule 4)
   **Files changed:** [list of files created/modified]
   **Deviations:** [list of Rule 1-3 applications, or "None"]
   **Decisions:** [any runtime decisions made]
   **Notes:** [anything the human should know when reviewing the diff]
   ```

   **Status values:**
   - `Complete` — all tasks finished successfully
   - `Failed (step X)` — execution failed at task X
   - `Stopped (Rule 4)` — architectural change needed, user decision required

   **Deviations format:**
   - `[Rule 1 - Bug] Fixed null pointer in validation`
   - `[Rule 2 - Security] Added CSRF protection to form endpoint`
   - `[Rule 3 - Blocker] Installed missing @types/node dependency`
   - `None` if no deviations occurred

8. **Return completion report:**

   Report to orchestrator:
   - Phase number and name
   - Status (Complete | Failed | Stopped)
   - Files touched (created + modified)
   - Deviation count
   - Notes for human review

</process>

<critical_reminders>
- NEVER run `git add`, `git commit`, `git checkout`, `git reset`, `git stash`
- All changes remain unstaged — verifier will stage them on pass
- Deviation rules apply automatically — no user permission needed for Rules 1-3
- Rule 4 (architectural) requires STOP and user decision
- Fix attempt limit is 3 per issue — document and move on after 3 failures
- Scope boundary: only fix issues from current task's changes
- TDD plans follow RED/GREEN/REFACTOR — no commits between phases
- Re-run replays from scratch — partial work is overwritten
- PROJECT-SUMMARY.md entry is overwritten on re-run, not duplicated
</critical_reminders>

<success_criteria>
- [ ] All tasks executed (or stopped at Rule 4)
- [ ] Deviations tracked with rule numbers
- [ ] PROJECT-SUMMARY.md updated with phase block
- [ ] Files touched reported to orchestrator
- [ ] Zero git operations performed
- [ ] All changes remain unstaged
</success_criteria>
```

Use Task tool with `subagent_type="executor"` and model from model resolution.
</step>

<step name="report_completion">
After executor returns, read PROJECT-SUMMARY.md to extract phase status and details.

**Report to user:**

```
## Phase ${PHASE} Execution Complete

**Status:** [Complete | Failed | Stopped]
**Files touched:** [count] files changed
**Deviations:** [count from summary, or "None"]

### What was built
[Extract from summary Notes section]

### Files changed
[List from summary]

${DEVIATIONS_EXIST ? "### Deviations from plan\n[List from summary]" : ""}

---

**Next step:** /verify-phase ${PHASE}

This will check the executor's work against the plan's must_haves.
On pass, changes are staged. On fail, diagnostics are provided.
```

**Never auto-advance to another command.** The user decides when to verify.

**If status is "Stopped (Rule 4)":**

```
## Phase ${PHASE} Stopped — Architectural Decision Needed

**Completed:** [tasks finished before stop]
**Stopped at:** [task that triggered Rule 4]

### Architectural Concern
[What was found, why it's architectural]

### Options
1. Adjust the plan to work within current architecture
2. Run /discuss-phase ${PHASE} to explore architectural change
3. Manual implementation for this piece

Current work is saved in PROJECT-SUMMARY.md.
All changes remain unstaged.
```

**If status is "Stopped (Hung Process)":**

Extract the hung process details from PROJECT-SUMMARY.md Notes, then spawn the debugger:

```
Task(
  subagent_type="gsd-debugger",
  model="sonnet",
  description="Debug hung process",
  prompt=`
<objective>
Investigate hung process. A Bash command produced no output for 60 seconds
and was killed by the idle timeout monitor.

Determine root cause: is this a command/environment problem (wrong command,
missing dependency, port conflict, locked resource, missing env var) or an
application bug (deadlock, infinite loop, unresolved promise, blocking I/O,
database lock, test that never resolves)?
</objective>

<symptoms>
expected: Command completes or produces continuous output within 60 seconds
actual: No stdout or stderr for 60 seconds; killed by idle timeout
errors: GSD IDLE TIMEOUT after 60s of silence
reproduction: Re-run the command
timeline: During phase ${PHASE} execution, just now
</symptoms>

<hung_command>
\`\`\`
${command from executor return}
\`\`\`
</hung_command>

<executor_context>
task: ${task from executor return}
goal: ${context from executor return}
</executor_context>

<last_output>
\`\`\`
${last_output from executor return}
\`\`\`
</last_output>

<files_to_read>
- .planning/project/PROJECT-SUMMARY.md
- .planning/project/PHASE-${PHASE}-PLAN.md
- .planning/project/PROJECT.md
</files_to_read>

<mode>
symptoms_prefilled: true
goal: find_and_fix
</mode>
`
)
```

Report debugger results to user:
```
## Phase ${PHASE} Stopped — Hung Process Investigated

**Hung command:** ${command}
**Task:** ${task}

### Debugger Findings
${debugger return summary}

### Options
1. Fix the issue and re-execute: /execute-phase ${PHASE}
2. Adjust the plan: /plan-phase ${PHASE}
3. Debug further: /gsd:debug ${description}
4. Manual investigation
```
</step>

</process>

<re_run_behavior>
Running `/execute-phase N` when execution has already occurred:

**What happens:**
- Executor replays entire phase from scratch
- Partial unstaged changes from previous run are overwritten
- PROJECT-SUMMARY.md entry for Phase N is replaced (not duplicated)
- Prior phases' staged work (from successful `/verify-phase`) is untouched

**When to re-run:**
- Execution failed partway through
- Rule 4 architectural concern was resolved
- Plan was updated and needs fresh execution
- Testing uncovered issues in implementation

**What's preserved:**
- Staged changes from other phases
- PROJECT.md, PROJECT-PLAN.md, and other planning docs
- Todos and codebase map

**What's lost:**
- Unstaged changes from current phase's previous run
- Previous execution notes (replaced in PROJECT-SUMMARY.md)
</re_run_behavior>

<context_efficiency>
Orchestrator loads minimal context (plan metadata, file paths). Executor subagent gets fresh 200k context with execution-domain.md loaded. No context bleed between runs.
</context_efficiency>

<failure_handling>
- **Executor returns failure status:** Report diagnostics, suggest manual review or plan adjustment
- **Rule 4 termination:** Normal flow, not a failure — user decision required
- **Fix attempt limit hit:** Documented in summary, execution continues
- **Unrelated test failures:** Out of scope per scope boundary — noted in summary
- **Hung process (Stopped):** Executor returned "HUNG PROCESS — DEBUGGER REQUIRED". Spawn gsd-debugger to investigate:
  1. Extract command, task, context, last_output from executor return message
  2. Spawn gsd-debugger with pre-filled symptoms (see hung process template in report_completion)
  3. Report debugger findings to user
  4. User decides: fix and re-execute, adjust plan, or manual investigation
</failure_handling>

</purpose>
