# Phase 3: Knowledge Document System - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Create domain-specific reference documents that GSD agents reason over instead of rigid workflow scripts. Produce an AGENTS.md root index and reference docs for four domains (project, planning, execution, verification). Each doc under 10,000 tokens. These are GSD system files in the GSD git repository — used across all codebases, not codebase-specific.

</domain>

<decisions>
## Implementation Decisions

### Knowledge extraction boundary
- Knowledge docs capture domain knowledge extracted from current workflow scripts
- Phase 3 extracts the knowledge (standards, patterns, criteria, lightweight how-to recipes where appropriate); Phase 4 rewires orchestration into command handlers
- Claude's discretion on whether content is pure principles or includes lightweight recipes (e.g., "TDD flow: red→green→refactor") — decide per domain based on what agents actually need

### Existing reference files
- Existing reference files (tdd.md, verification-patterns.md, model-profiles.md, questioning.md) may be folded into domain docs or kept separate at Claude's discretion
- Goal: proven methodologies (agents + knowledge base + mechanical procedures), not just preserving GSD's structure for its own sake
- Changes must support single verifiable commits as the atomic unit

### Tool guidance
- Knowledge docs MUST include explicit guidance on which native Claude Code tools to use for domain-specific operations (e.g., "use Glob not find, use Read not cat")
- This replaces the current gsd-tools.cjs calls that workflow scripts rely on

### Toolkit references
- Claude's discretion on whether/how to reference Phase 2's mechanical toolkit (atomic writes, SHA staleness, prerequisites, model resolution, todo CRUD) in knowledge docs

### Doc granularity
- Claude's discretion on one doc per domain vs split sub-docs — constrained by hard 10K token limit per doc
- If a domain's content exceeds 10K tokens, it must be split
- Claude's discretion on cross-referencing vs self-contained docs — optimize for agent context windows

### File location
- Knowledge docs live in a new `knowledge/` directory in the GSD installation, parallel to `agents/`, `commands/`, `references/`

### AGENTS.md design
- Root index, ~100 lines, pointing to domain-specific reference docs
- Claude's discretion on: who loads it (command handler vs agent self-serve), whether it's a pure routing table or includes brief agent descriptions, whether it maps commands→agents→docs or just agents→docs
- Claude's discretion on whether AGENTS.md lives at GSD root or inside `knowledge/`

### 10K token limit
- Hard constraint per doc (KNOW-06 success criterion). If exceeded, split the doc.

</decisions>

<specifics>
## Specific Ideas

- "GSD is our baseline and it does a lot well. But our goal is to solve two problems: keep changes to a single verifiable commit, and opt for proven methodologies (agents + knowledge base + mechanical procedures)"
- The SPEC (SPEC.md) is the source of truth for what the fork becomes — knowledge docs should align with its philosophy and command surface

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-knowledge-document-system*
*Context gathered: 2026-02-22*
