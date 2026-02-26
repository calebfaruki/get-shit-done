---
name: verify-phase
description: Verify phase results against must_haves and stage files on pass
argument-hint: "N (phase number)"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
---

<objective>
Verify phase N results against PHASE-N-PLAN.md must_haves. Spawns a verifier subagent that checks artifacts via goal-backward methodology, stages files on pass via explicit `git add <file>`, reports diagnostics on fail. Report-only — never attempts fixes.

Output: `.planning/project/PHASE-N-VERIFICATION.md`
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/verify-phase.md
@~/.claude/get-shit-done/knowledge/verification-domain.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

This command runs after `/execute-phase N`. The executor leaves changes unstaged; the verifier checks must_haves and stages files on pass. Two views for human: `git diff` (unstaged current phase) and `git diff --cached` (all verified phases).

On failure: Reports diagnostics and stops. No automated fix loop. Human decides next steps (fix manually, re-run phase, adjust plan, accept as-is).
</context>

<process>
1. Parse phase number from arguments
2. Load verify-phase workflow
3. Execute workflow (spawns verifier subagent)
4. Report verification outcome to user
</process>

<success_criteria>
- [ ] PHASE-N-PLAN.md exists and must_haves were read
- [ ] PROJECT-SUMMARY.md exists and executor's work was reviewed
- [ ] Verifier subagent completed
- [ ] PHASE-N-VERIFICATION.md written with per-truth diagnostics
- [ ] On pass: files staged via explicit `git add <file>` (never bulk)
- [ ] On fail: diagnostics with specific file locations and line numbers
- [ ] No automated fix attempted (report-only)
</success_criteria>
