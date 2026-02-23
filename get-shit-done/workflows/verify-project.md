# Verify Project Workflow

Project-level verification workflow. Checks final result against acceptance criteria from PROJECT.md.

## Prerequisites

Check that required files exist:

```bash
[ -f .planning/project/PROJECT.md ] && echo "PROJECT.md exists" || echo "PROJECT.md missing"
[ -f .planning/project/PROJECT-SUMMARY.md ] && echo "PROJECT-SUMMARY.md exists" || echo "PROJECT-SUMMARY.md missing"
```

**If PROJECT.md missing:** Soft warning. Suggest running `/new-project` first.

**If PROJECT-SUMMARY.md missing:** Soft warning. Suggest running phase execution first. Verification without execution context is limited.

## Flow

### 1. Check for existing verification

```bash
[ -f .planning/project/PROJECT-VERIFICATION.md ] && echo "exists" || echo "missing"
```

If exists: Inform user that re-running will overwrite existing verification. Confirm before proceeding.

### 2. Read context files

**Required:**
- `.planning/project/PROJECT.md` (acceptance criteria)

**Recommended:**
- `.planning/project/PROJECT-SUMMARY.md` (execution history)

**Optional:**
- `.planning/project/PROJECT-PLAN.md` (phase structure)

### 3. Spawn verifier subagent

Agent: Use `resolve-model` for model selection (typically verifier profile)

**Files to read** (`<files_to_read>` block in subagent spawn):
- `.planning/project/PROJECT.md`
- `.planning/project/PROJECT-SUMMARY.md`
- `get-shit-done/knowledge/verification-domain.md`

**Agent task:**

Perform three-layer verification for each acceptance criterion:

**Layer 1: Diff Analysis**
```bash
git diff HEAD
```
- What files changed?
- What code was added/modified/deleted?
- Does the diff align with what the criterion requires?

**Layer 2: Code Reasoning**
- Read implementation files
- Trace logic flow
- Does the implementation actually satisfy the criterion?
- Are there stub patterns (TODO, FIXME, placeholders)?
- Is implementation substantive (not just empty functions)?

**Layer 3: Test Execution**
- Identify relevant test suite
- Run tests for the criterion's domain
- Do tests pass?
- Are tests substantive (not just smoke tests)?

**Per criterion, determine:**
- ✓ PASS: All three layers confirm criterion is met
- ✗ FAIL: One or more layers show criterion not met
- ? UNCERTAIN: Can't verify programmatically (needs human judgment)

### 4. Output format

PROJECT-VERIFICATION.md structure per SPEC:

```markdown
# Project Verification Report

**Verified:** [date]
**Result:** [PASS | PARTIAL | FAIL]

## Summary

[1-2 paragraph overview. How many criteria passed/failed. Overall assessment.]

## Acceptance Criteria Verification

### AC-1: [Criterion description from PROJECT.md]

**Status:** [✓ PASS | ✗ FAIL | ? UNCERTAIN]

**Diff Analysis:**
- Files changed: [list]
- Relevant changes: [description]

**Code Reasoning:**
- Implementation: [where to find it]
- Logic check: [does it work?]
- Stub check: [any placeholders?]

**Test Execution:**
- Tests run: [which tests]
- Result: [pass/fail]
- Coverage: [adequate?]

**Verdict:** [Why pass/fail, what convinced you]

**Diagnostics (if FAIL):**
- What's wrong: [specific issue]
- Why it failed: [root cause]
- Where to look: [specific files and line numbers]
- Suggested fix: [what needs to happen]

### AC-2: [Criterion description]

[Same structure as AC-1]

## Overall Assessment

**Result:** [PASS | PARTIAL | FAIL]

**Pass:** [N] of [M] criteria verified
**Fail:** [N] of [M] criteria failed
**Uncertain:** [N] of [M] criteria need human judgment

## Next Steps

[Recommendations based on result]

**If PASS:** All criteria verified. Ready to commit.

**If PARTIAL:** Some criteria passed. Review failures:
- [List failed criteria with file locations]
- Human decides: fix manually, re-run phases, adjust plan, or accept as-is

**If FAIL:** Major gaps found. Review diagnostics above.
- [List all failures with specific file locations]
- Human decides: fix manually, re-run phases, or adjust project scope
```

### 5. Failure path

**On verification failure:**

1. Write PROJECT-VERIFICATION.md with full diagnostics
2. Do NOT attempt automated fixes
3. Report results to user
4. Suggest possible actions:
   - Fix issues manually
   - Re-run specific phases
   - Adjust project plan
   - Accept current state and adjust acceptance criteria

**Never auto-fix.** Verification reports and stops. Human decides next steps.

### 6. Handoff

**If all criteria pass:**

```
Verification complete. All [N] acceptance criteria verified.

✓ All diff analysis checks passed
✓ All code reasoning checks passed
✓ All test execution checks passed

The project meets its acceptance criteria. Consider reviewing the changes:

git diff HEAD

When satisfied, commit the changes.

Verification report: .planning/project/PROJECT-VERIFICATION.md
```

**If failures exist:**

```
Verification complete. [N] of [M] criteria FAILED.

Failed criteria:
- AC-1: [description] — [file:line]
- AC-3: [description] — [file:line]

See .planning/project/PROJECT-VERIFICATION.md for full diagnostics including:
- What's wrong
- Why it failed
- Where to look (specific files and line numbers)
- Suggested fixes

Next steps (you decide):
1. Fix issues manually and re-run /verify-project
2. Re-run specific phases: /execute-phase N
3. Adjust project plan if scope changed
4. Accept current state and update acceptance criteria
```

**Never auto-fix. Always defer to human decision.**

## Success Criteria

- [ ] PROJECT.md acceptance criteria were read
- [ ] PROJECT-SUMMARY.md execution history was reviewed (if exists)
- [ ] Diff analysis performed via `git diff HEAD`
- [ ] Code reasoning performed on implementation files
- [ ] Test execution performed on relevant test suite
- [ ] PROJECT-VERIFICATION.md written with per-criterion diagnostics
- [ ] Each failed criterion includes: what's wrong, why, where to look (files and line numbers)
- [ ] No automated fix attempted
- [ ] Handoff message clearly states pass/fail and suggests next steps
