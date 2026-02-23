<purpose>
Verify phase results against PHASE-N-PLAN.md must_haves. Spawns a verifier subagent that checks artifacts, stages files on pass, reports diagnostics on fail.
</purpose>

<core_principle>
The verifier is separate from the executor. It checks must_haves from PHASE-N-PLAN.md and stages the executor's changed files on pass. Report-only — never attempts fixes.

**From SPEC section 4:** Executor implements, verifier checks, human commits. The verifier uses goal-backward methodology to verify goal achievement, not just task completion.
</core_principle>

<required_reading>
@~/.claude/get-shit-done/knowledge/verification-domain.md
</required_reading>

<process>

<step name="check_prerequisites" priority="first">
Soft prerequisite checks (warn and offer help, not hard error):

```bash
PHASE_ARG="${ARGUMENTS[0]}"
PHASE_PLAN=".planning/project/PHASE-${PHASE_ARG}-PLAN.md"
PROJECT_SUMMARY=".planning/project/PROJECT-SUMMARY.md"
PROJECT_PLAN=".planning/project/PROJECT-PLAN.md"

if [ ! -f "$PHASE_PLAN" ]; then
  echo "⚠️  Phase plan not found: $PHASE_PLAN"
  echo "Run: /plan-phase ${PHASE_ARG}"
  exit 1
fi

if [ ! -f "$PROJECT_SUMMARY" ]; then
  echo "⚠️  Execution summary not found: $PROJECT_SUMMARY"
  echo "Run: /execute-phase ${PHASE_ARG}"
  exit 1
fi
```
</step>

<step name="bootstrap">
Load phase context using Read tool:

```bash
PHASE_NUM="${ARGUMENTS[0]}"
PHASE_PLAN=".planning/project/PHASE-${PHASE_NUM}-PLAN.md"
PROJECT_PLAN=".planning/project/PROJECT-PLAN.md"
PROJECT_SUMMARY=".planning/project/PROJECT-SUMMARY.md"
PROJECT_FILE=".planning/project/PROJECT.md"
```

Use **Read** to load:
- `$PHASE_PLAN` (must_haves)
- `$PROJECT_PLAN` (phase goal and acceptance criteria)
- `$PROJECT_SUMMARY` (executor's file list)
- `$PROJECT_FILE` (project context)

Parse must_haves from PHASE-N-PLAN.md frontmatter:
- `must_haves.truths`: Observable behaviors that must be verified
- `must_haves.artifacts`: Files that must exist with substantive implementation
- `must_haves.key_links`: Critical connections between artifacts

Report what will be verified:
```
## Verifying Phase ${PHASE_NUM}

**Truths:** ${TRUTH_COUNT}
**Artifacts:** ${ARTIFACT_COUNT}
**Key Links:** ${LINK_COUNT}

Starting verifier...
```
</step>

<step name="spawn_verifier">
Spawn verifier subagent with explicit context via `<files_to_read>`:

```
Task(
  subagent_type="gsd-verifier",
  model="sonnet",
  prompt="
    <objective>
    Verify phase ${PHASE_NUM} against PHASE-${PHASE_NUM}-PLAN.md must_haves.

    On pass, stage files. On fail, report diagnostics. Never attempt fixes.
    </objective>

    <execution_context>
    @~/.claude/get-shit-done/knowledge/verification-domain.md
    </execution_context>

    <files_to_read>
    Read these files at verification start using the Read tool:
    - .planning/project/PHASE-${PHASE_NUM}-PLAN.md (must_haves)
    - .planning/project/PROJECT.md (project context)
    - .planning/project/PROJECT-PLAN.md (phase goal and acceptance criteria)
    - .planning/project/PROJECT-SUMMARY.md (executor's work)
    - ./CLAUDE.md (if exists — project instructions)
    </files_to_read>

    <verification_rules>
    Check each truth in must_haves against codebase:
    1. **Truths:** Determine if codebase enables the behavior
    2. **Artifacts:** Three-level check (exists, substantive, wired)
    3. **Key Links:** Verify connections exist via pattern matching

    **Three-level artifact checks:**
    - Level 1 (Exists): File present at expected path
    - Level 2 (Substantive): Real implementation, not placeholder/stub
    - Level 3 (Wired): Connected to rest of system, not orphaned

    **Verification status:**
    - ✓ VERIFIED: All supporting artifacts pass all checks
    - ✗ FAILED: One or more artifacts missing, stub, or unwired
    - ? UNCERTAIN: Can't verify programmatically (note for human)
    </verification_rules>

    <staging_rules>
    On PASS (all truths verified):
    1. Read PROJECT-SUMMARY.md "Files changed" section to get file list
    2. Filter out any .planning/ paths (ephemeral, never staged)
    3. Stage each remaining file individually via \`git add <file>\`
    4. Verify staging via \`git diff --cached --name-only\`
    5. Write PHASE-${PHASE_NUM}-VERIFICATION.md with PASSED status

    On FAIL (any truth failed):
    1. Write diagnostics with specific truth, artifact, issue, file, line numbers
    2. Do NOT stage any files
    3. Write PHASE-${PHASE_NUM}-VERIFICATION.md with FAILED status
    4. Return to orchestrator

    **Staging protocol:**
    - Always \`git add <file>\` (explicit paths only)
    - NEVER \`git add .\` or \`git add -A\`
    - Filter out \`.planning/\` paths before staging
    - Stage all files atomically (only if ALL checks pass)

    **Report-only:** Never attempt fixes. Diagnostics only.
    </staging_rules>

    <output>
    Write .planning/project/PHASE-${PHASE_NUM}-VERIFICATION.md with:
    - Status: PASSED | FAILED
    - Per-truth verification results (✓ VERIFIED | ✗ FAILED | ? UNCERTAIN)
    - Per-artifact checks (exists, substantive, wired)
    - If PASSED: list of staged files
    - If FAILED: diagnostics with file paths, line numbers, suggested fixes
    - Score: N/M truths verified
    </output>

    <success_criteria>
    - [ ] All must_haves checked (truths, artifacts, key_links)
    - [ ] Truths verified or failures documented
    - [ ] On pass: files staged via explicit \`git add <file>\` (never bulk)
    - [ ] On pass: .planning/ files filtered out before staging
    - [ ] On fail: diagnostics with specific file locations and line numbers
    - [ ] No automated fix attempted (report-only)
    - [ ] PHASE-${PHASE_NUM}-VERIFICATION.md written
    </success_criteria>
  "
)
```

**Wait for subagent to complete.**
</step>

<step name="report_results">
Read PHASE-${PHASE_NUM}-VERIFICATION.md to get results.

If **PASSED**:
```
## Phase ${PHASE_NUM} Verification: PASSED

All must_haves verified. ${FILE_COUNT} files staged.

**Staged files:**
${FILE_LIST}

Use \`git diff --cached\` to review staged changes.

---
**Next:** /verify-phase ${PHASE_NUM + 1} or /verify-project
```

If **FAILED**:
```
## Phase ${PHASE_NUM} Verification: FAILED

${FAILED_COUNT} of ${TOTAL_COUNT} truths failed:
${FAILURE_LIST}

Nothing staged. See .planning/project/PHASE-${PHASE_NUM}-VERIFICATION.md for diagnostics.

---
**Next steps (you decide):**
1. Fix issues manually and re-run /execute-phase ${PHASE_NUM}
2. Adjust phase plan to match reality
3. Accept current state as-is

The verifier does not auto-fix. You decide how to proceed.
```

**Never auto-fix.** Always defer to human decision.
</step>

</process>

<removed_from_gsd>
This workflow removes from the GSD verify-phase.md:

**Removed:**
- Gap-closure loop (verifier no longer generates fix plans)
- ROADMAP.md/REQUIREMENTS.md references (replaced by PROJECT-PLAN.md/PHASE-N-PLAN.md)
- Fix plan generation and re-verification routing
- `gsd-tools.cjs` commands
- VERIFICATION.md in .planning/phases/ directory (now .planning/project/PHASE-N-VERIFICATION.md)
- `verify_requirements` step
- `generate_fix_plans` step
- `gaps_found` and `human_needed` states (now only `passed` or `failed`)
- Multi-file output (now single PHASE-N-VERIFICATION.md)

**Kept:**
- Goal-backward verification principle
- Three-level artifact checks (exists, substantive, wired)
- Stub detection and antipattern scanning
- Report-only verification (no automated fixes)
- Explicit per-file staging on pass
</removed_from_gsd>

<success_criteria>
- Phase plan must_haves checked against codebase
- On pass: files staged via explicit `git add <file>`
- On fail: diagnostics provided with file locations
- Report-only — no automated fixes
- verification-domain.md loaded via execution_context
</success_criteria>
