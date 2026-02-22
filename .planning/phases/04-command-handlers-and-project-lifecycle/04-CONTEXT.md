# Phase 4: Command Handlers and Project Lifecycle - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire up all 12 slash commands as bare-namespace triggers that load knowledge docs and spawn agents. Implement the full project lifecycle: intake, research, discussion, planning, execution, verification. Replace the current `gsd:`-prefixed multi-milestone system with the single-commit ephemeral model defined in SPEC.md. All 12 commands in this phase — nothing deferred to later phases.

</domain>

<decisions>
## Implementation Decisions

### Command Surface
- Build all 12 commands in Phase 4: /new-project, /research-project, /discuss-project, /plan-project, /verify-project, /discuss-phase, /research-phase, /plan-phase, /execute-phase, /verify-phase, /map, /todo
- Follow SPEC.md as the source of truth for command behavior, execution context (main vs subagent), and output formats
- Bare namespace — no `gsd:` prefix. Use whatever directory structure works (flat `commands/` or `commands/pm/`) as long as it's consistent
- Delete old `gsd:*` commands as each replacement is built — no coexistence period
- Missing prerequisites: warn and offer to run the prerequisite command (not hard block)

### Project Intake Flow
- Efficient sharpener style: 1-2 rounds of questions max, propose acceptance criteria quickly, let human adjust
- Todo matching uses area tag matching (not semantic/AI judgment)
- Stale codebase map: warn and offer to run /map inline, then resume intake
- Todo creation: AI proposes, human confirms before write (per SPEC)

### Planning Artifacts
- New file structure immediately: `.planning/project/` with `PHASE-N-*.md` flat naming
- Follow SPEC exactly for all file formats:
  - PROJECT.md: plain markdown, no frontmatter
  - PROJECT-PLAN.md: YAML frontmatter + markdown
  - PHASE-N-PLAN.md: YAML frontmatter + XML-tagged body
  - PHASE-N-CONTEXT.md: "Locked Decisions", "Discretion Areas", "Deferred Ideas" sections
  - PHASE-N-RESEARCH.md: XML-tagged sections (<user_constraints>, <research_summary>, etc.)
- One plan per phase, no waves, no parallelization
- Plan-checker validates per SPEC: verifiability-based scope warnings using proxy signals (behavioral changes, systems touched, architectural boundaries)

### Ephemeral State Model
- No archive before wipe — /new-project does `rm -rf .planning/project/` after human confirmation, period
- Add `.planning/` to `.gitignore` in Phase 4 — new commands expect ephemeral state
- No session awareness — each command checks its own prerequisites, nothing more
- CODEBASE.md lives at `.planning/CODEBASE.md` (semi-durable, persists across projects)
- Todos live at `.planning/todos/*.md` (semi-durable, persists across projects)

### Claude's Discretion
- Command file organization (flat `commands/` or subfolder) — just be consistent
- Internal implementation patterns for command handlers
- How knowledge docs are loaded/referenced by commands

</decisions>

<specifics>
## Specific Ideas

- "Follow my spec unless absolutely necessary" — SPEC.md is the authoritative source for all command behavior, file formats, execution context, and lifecycle decisions
- SCRATCH.md contains the design evolution and resolved gaps — useful reference for implementation rationale
- The SPEC's file-level disposition table (Gap 5) maps every existing file to its fate (keep/modify/delete)
- gsd-tools.cjs approach: "Don't pre-spec. Build agents using native tools first. Add tool commands only when genuinely needed."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-command-handlers-and-project-lifecycle*
*Context gathered: 2026-02-22*
