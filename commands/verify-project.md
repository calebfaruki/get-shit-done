---
name: verify-project
description: Check result against project-level acceptance criteria
argument-hint: ""
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
---

<objective>
Verify final project result against acceptance criteria from PROJECT.md.

Spawns a verifier subagent that performs diff analysis, code reasoning, and test execution to check each acceptance criterion. Writes PROJECT-VERIFICATION.md with per-criterion pass/fail diagnostics.

Output: .planning/project/PROJECT-VERIFICATION.md
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/verify-project.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

**This command runs after all phases complete**, before the human commits.

Verification methodology:
- Diff analysis: What changed vs. what should have
- Code reasoning: Does implementation satisfy each criterion
- Test suite execution: Run relevant tests

On failure: Reports diagnostics and stops. No automated fix loop. Human decides next steps.
</context>

<process>
1. Spawn verifier subagent with project context
2. Agent performs three-layer verification per criterion
3. Agent writes PROJECT-VERIFICATION.md with pass/fail results
4. Report verification outcome to user
</process>

<success_criteria>
- [ ] PROJECT.md exists and acceptance criteria were read
- [ ] PROJECT-SUMMARY.md exists and execution history was reviewed
- [ ] Verifier subagent completed
- [ ] PROJECT-VERIFICATION.md written with per-criterion diagnostics
- [ ] On failure: diagnostics include what's wrong, why, where to look (files and line numbers)
- [ ] No automated fix attempted (report-only)
</success_criteria>
