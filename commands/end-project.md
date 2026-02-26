---
name: end-project
description: Wipe project artifacts and start fresh
argument-hint: ""
allowed-tools:
  - Bash
  - Read
---

<objective>
End the current project by wiping all planning artifacts under `.planning/project/`.

CODEBASE.md and todos/ are preserved. Only project-specific artifacts are removed.
</objective>

<process>
1. Run the end-project script with `--yes` if the user has already confirmed they want to end the project, or without it to show what will be removed:
   ```bash
   node ~/.claude/bin/end-project.js --yes
   ```

3. Report the result to the user. If successful, suggest `/gsd:new-project` to start a new project.
</process>

<context>
!`node ~/.claude/bin/gsd-context.js`

The prereqs hook blocks this command when no project exists.
The bin/end-project.js script handles all wipe logic including safety warnings for incomplete projects.
</context>
