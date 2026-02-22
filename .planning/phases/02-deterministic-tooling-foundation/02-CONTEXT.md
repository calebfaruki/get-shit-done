# Phase 2: Deterministic Tooling Foundation - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

A tested utility library that handles all mechanical operations: file management (atomic writes), codebase map staleness detection (SHA comparison), prerequisite validation, model profile resolution, and todo CRUD. Agents never implement these operations themselves — they call deterministic functions. Knowledge documents and agent reasoning are separate phases (3+).

</domain>

<decisions>
## Implementation Decisions

### Module structure
- Single file replacing the current `bin/gsd-tools.cjs`
- Library with importable functions (not a CLI tool invoked via Bash)
- Zero external dependencies — pure Node.js stdlib only
- Consumers `require()` the file and call exported functions directly

### Todo file format
- One file per todo in `.planning/todos/`
- YAML frontmatter with two fields: `area` (free-form string) and `created` (date)
- Markdown body for the todo description
- Filenames are slugified titles (e.g., `add-caching-to-api.md`)
- Collisions resolved by appending number (`add-caching-2.md`)
- Completing a todo deletes the file from disk (git history preserves it)

### Prerequisite checks
- Pure deterministic functions that return structured objects: `{ passed: bool, message: string }`
- No printing, no process.exit, no decision-making — just check and report
- Fix/remediation mapping lives entirely in knowledge docs (Phase 3), not in the tooling code
- Checkable conditions: directory/file existence, staleness (SHA comparison), state consistency (phase dependencies, orphaned files)
- The calling agent or command handler (informed by knowledge docs) decides how to respond to failures

### Model profile resolution
- Config file lives in `.planning/` — set during `/new-project`, wiped when project directory is cleaned
- Hardcoded sensible defaults when no config exists: quality=opus, balanced=sonnet, budget=haiku
- Returns Claude model IDs only — Claude Code is the only supported host for now
- Host-awareness deferred until multi-host support is needed

### Claude's Discretion
- Internal function naming and organization within the single file
- Atomic write implementation details (temp file + rename pattern specifics)
- SHA comparison implementation for staleness detection
- Test structure and organization

</decisions>

<specifics>
## Specific Ideas

- Architecture principle: deterministic code for mechanical decisions, agents with knowledge docs for reasoning — this boundary must be clean
- Prereq functions are "dumb reporters" — they check state and return facts. The intelligence about what to do with failures belongs in knowledge docs that agents read
- Model config follows the existing GSD pattern: decided at project creation, scoped to `.planning/`, ephemeral

</specifics>

<deferred>
## Deferred Ideas

- Multi-host model resolution (OpenCode, Gemini CLI) — revisit when multi-host support is needed
- Todo area tag registry with validation and autocomplete — v2 requirement (TODO-01)
- Todo migration warnings for promoted nice-to-haves — v2 requirement (TODO-02)

</deferred>

---

*Phase: 02-deterministic-tooling-foundation*
*Context gathered: 2026-02-22*
