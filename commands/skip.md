---
name: skip
description: Skip a discussion or research step
argument-hint: "<discuss-phase|research-phase> N or <discuss-project|research-project>"
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
Skip a discussion or research step by writing a minimal artifact with `skipped: true` YAML frontmatter. This satisfies the prereqs gate so the user can proceed to the next step without running the full discuss/research workflow.

Only discuss and research steps can be skipped. Plan, execute, and verify steps cannot be skipped.
</objective>

<process>
Follow these steps in order:

1. **Parse arguments.** The user provides the step type and optional phase number as a string after `/gsd:skip`. Parse into step type (e.g., `discuss-phase`) and phase number (e.g., `1`).

2. **Validate step type.** Only accept these exact values:
   - `discuss-project`
   - `research-project`
   - `discuss-phase`
   - `research-phase`

   If the step type is anything else (including `plan-phase`, `execute-phase`, `verify-phase`, `plan-project`, `verify-project`, or any unrecognized value), respond with this error and stop:
   > Only discuss and research steps can be skipped. Usage: /gsd:skip <discuss-phase|research-phase> N or /gsd:skip <discuss-project|research-project>

3. **Validate phase number.** For `discuss-phase` and `research-phase`, a phase number N is required. If missing, respond with:
   > Phase number required. Usage: /gsd:skip <discuss-phase|research-phase> N

   For `discuss-project` and `research-project`, no phase number is needed.

4. **Validate phase exists (phase commands only).** For `discuss-phase N` and `research-phase N`, read `.planning/project/PROJECT-PLAN.md` and count `### Phase N:` headings to determine the total phase count. If `PROJECT-PLAN.md` does not exist, respond with:
   > No PROJECT-PLAN.md found. Run /gsd:plan-project first.

   If the requested phase N exceeds the count, respond with:
   > Phase N does not exist. PROJECT-PLAN.md has M phases.

5. **Validate project exists (project-level commands only).** For `discuss-project` and `research-project`, check that `.planning/project/PROJECT.md` exists. If not, respond with:
   > No project found. Run /gsd:new-project first.

6. **Map argument to artifact filename** using this exact mapping:
   - `discuss-project` -> `PROJECT-DISCUSSION.md`
   - `research-project` -> `PROJECT-RESEARCH.md`
   - `discuss-phase N` -> `PHASE-N-DISCUSSION.md`
   - `research-phase N` -> `PHASE-N-RESEARCH.md`

7. **Check if artifact already exists.** Read the target file at `.planning/project/{filename}`:
   - If it exists and contains `skipped: true` in its YAML frontmatter: this is a no-op. Display "Already skipped." and proceed to step 9.
   - If it exists and does NOT contain `skipped: true` (real content): use AskUserQuestion to ask the user: `"{filename} already exists with real content. Overwrite with skip artifact?"` If the user declines, display "Cancelled." and proceed to step 9.
   - If it does not exist: proceed to step 8.

8. **Write skip artifact.** Ensure `.planning/project/` directory exists (create with `mkdir -p` via Bash if needed). Write the file at `.planning/project/{filename}` with exactly this content (Unix line endings, no trailing whitespace):
   ```
   ---
   skipped: true
   ---
   # {Step Name} (skipped)

   Skipped by user via /gsd:skip.
   ```
   Where `{Step Name}` is a human-readable label:
   - `discuss-project` -> "Project Discussion"
   - `research-project` -> "Project Research"
   - `discuss-phase N` -> "Phase N Discussion"
   - `research-phase N` -> "Phase N Research"

9. **Run GSD output pattern.** Run `node ~/.claude/bin/gsd-context.js` via Bash. Parse its text output. Display `Next: [next command]` with context and add a `/clear` hint. Apply this pattern to ALL outcomes: success write, no-op ("Already skipped."), and cancel (user declined overwrite).
</process>

<context>
!`node ~/.claude/bin/gsd-context.js`
</context>
