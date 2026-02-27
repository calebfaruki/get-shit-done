---
name: research-phase
description: Tactical research for a phase — implementation details, gotchas, patterns
argument-hint: "N (phase number)"
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
Research how to implement a phase. Spawns researcher subagent with phase context.

**Note:** This is tactical research for a single phase. For strategic project-level research, use `/research-project`.

**Use this command when:**
- You want to research implementation details before planning
- You want to re-research after context is gathered
- You need to investigate specific technical approaches

**Orchestrator role:** Parse phase, validate against PROJECT-PLAN.md, check existing research, gather context, spawn researcher subagent, present results.

**Why subagent:** Research burns context fast (WebSearch queries, source verification). Fresh context for investigation.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/research-phase.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

Phase number: $ARGUMENTS (required)
</context>

<process>
Execute the research-phase workflow end-to-end:

1. Parse phase number and validate against PROJECT-PLAN.md
3. Check for existing PHASE-N-RESEARCH.md (offer update/view/skip if exists)
4. Gather phase context from PROJECT-PLAN.md and PHASE-N-DISCUSSION.md (if exists)
5. Spawn researcher subagent with context
6. Handle subagent return (complete/blocked)
7. Present results and suggest next steps

**Output:** PHASE-{N}-RESEARCH.md in `.planning/project/` with XML-tagged sections per SPEC.
</process>

<success_criteria>
- Phase validated against PROJECT-PLAN.md
- Existing research checked
- Researcher spawned with proper context
- PHASE-N-RESEARCH.md uses XML-tagged sections
- User knows next steps (suggest /plan-phase N)
</success_criteria>
