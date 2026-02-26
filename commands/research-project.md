---
name: research-project
description: Strategic research — library choices, ecosystem patterns, architectural approaches
argument-hint: ""
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
  - Task
  - WebFetch
  - WebSearch
---

<objective>
Strategic research for the current project — investigate library choices, ecosystem patterns, and architectural approaches.

Spawns a research subagent that reads PROJECT.md, performs web search and codebase analysis, and produces a single PROJECT-RESEARCH.md document.

Output: .planning/project/PROJECT-RESEARCH.md
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/research-project.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

**This command runs after /new-project**, before planning or discussion.

Use when:
- Project involves unfamiliar libraries or patterns
- Ecosystem decisions need to be grounded in what's available
- Technical unknowns need investigation before planning

Research informs discussion — run this before `/discuss-project` so decisions are grounded in what's actually available.
</context>

<process>
1. Spawn research subagent with project context
2. Agent writes PROJECT-RESEARCH.md
3. Suggest /discuss-project or /plan-project as next steps
</process>

<success_criteria>
- [ ] PROJECT.md exists and was read
- [ ] Research subagent completed
- [ ] PROJECT-RESEARCH.md written to .planning/project/
- [ ] User knows next steps (suggest /discuss-project or /plan-project)
</success_criteria>
