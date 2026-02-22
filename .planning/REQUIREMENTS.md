# Requirements: Stateless Project PM — GSD Fork

**Defined:** 2026-02-22
**Core Value:** The human can describe what they want to build, get it sharpened into verifiable acceptance criteria, and have the AI execute it as a clean, reviewable diff — without the AI managing its own lifecycle.

## v1 Requirements

### Cleanup

- [x] **CLN-01**: ~55 dead GSD files deleted (workflow scripts, milestone commands, state management files that don't survive the fork) — 59 files deleted total (40 in 01-01, 19 in 01-02) ✓ 2026-02-22
- [x] **CLN-02**: Existing test suite passes after each deletion wave (strangler fig, not big bang) — 90/90 tests + 9/9 characterization tests pass after all deletions ✓ 2026-02-22
- [x] **CLN-03**: Installation works across Claude Code, OpenCode, and Gemini after cleanup — Verified for Claude Code (full cross-platform deferred to Phase 7) ✓ 2026-02-22
- [ ] **CLN-04**: `gsd:` command prefix stripped; bare namespace (`/new-project` not `/gsd:new-project`)

### Deterministic Tooling

- [x] **TOOL-01**: File management utilities using atomic writes (temp file + rename pattern)
- [x] **TOOL-02**: Codebase map staleness detection via commit SHA comparison
- [x] **TOOL-03**: Prerequisite checking for commands (e.g., `.planning/` exists, map not stale)
- [x] **TOOL-04**: `resolve-model` retained for multi-model profile resolution (quality/balanced/budget)
- [ ] **TOOL-05**: Todo CRUD operations (create, list, complete, delete) with area-tagged files in `.planning/todos/`
- [ ] **TOOL-06**: `gsd-tools.cjs` calls stripped from all agents; agents use native tools (Read, Write, Glob, Grep, Bash)

### Knowledge Documents

- [x] **KNOW-01**: AGENTS.md root index (~100 lines) pointing to domain-specific reference docs
- [x] **KNOW-02**: Reference docs for project domain (intake patterns, scope validation, acceptance criteria)
- [x] **KNOW-03**: Reference docs for planning domain (phase planning standards, single-commit scope)
- [x] **KNOW-04**: Reference docs for execution domain (TDD flow, deviation rules)
- [x] **KNOW-05**: Reference docs for verification domain (verification standards, staging rules)
- [x] **KNOW-06**: Each reference doc under 10,000 tokens to prevent context degradation

### Commands — Project Level

- [ ] **CMD-01**: `/new-project` — conversational intake, scope validation, acceptance criteria sharpening; writes PROJECT.md
- [ ] **CMD-02**: `/research-project` — strategic research via subagent, single-file output
- [ ] **CMD-03**: `/discuss-project` — deeper exploration of existing PROJECT.md in main context
- [ ] **CMD-04**: `/plan-project` — break project into phases, produce PROJECT-PLAN.md via subagent
- [ ] **CMD-05**: `/verify-project` — check result against project-level acceptance criteria via subagent

### Commands — Phase Level

- [ ] **CMD-06**: `/execute-phase N` — no per-step commits, no STATE.md updates, no auto-advance, no continuation agents
- [ ] **CMD-07**: `/verify-phase N` — report-only verification, stages files on pass via explicit `git add <file>`, reports diagnostics on fail
- [ ] **CMD-08**: `/plan-phase N` — single-commit scope, one plan per phase
- [ ] **CMD-09**: `/research-phase N` — tactical research with XML-tagged sections for planner consumption
- [ ] **CMD-10**: `/discuss-phase N` — clarify decisions before planning, no roadmap/state dependencies

### Commands — Utility

- [ ] **CMD-11**: `/map` — codebase mapping with commit SHA anchoring and staleness detection
- [ ] **CMD-12**: `/todo` — view and manage parking lot items

### Agent Modifications

- [ ] **AGT-01**: Modified executor: no per-step commits, no STATE.md updates, no auto-advance, no continuation agents, no checkpoints
- [ ] **AGT-02**: Modified verifier: report-only (no gap-closure loop), stages on pass, stops on fail
- [ ] **AGT-03**: Modified planner: single-commit scope framing, fewer phases
- [ ] **AGT-04**: Modified plan checker: verifiability-based scope warnings (greenfield/mechanical/brownfield)
- [ ] **AGT-05**: Modified project researcher: single-file output, no synthesizer agent
- [ ] **AGT-06**: Modified phase researcher: lighter touch, XML-tagged output sections
- [ ] **AGT-07**: All subagent spawns use `<files_to_read>` blocks for self-contained context

### State Management

- [ ] **STATE-01**: Ephemeral project directory (`.planning/project/`) wiped on new project with archive-before-wipe safety
- [ ] **STATE-02**: PROJECT-PLAN.md replaces ROADMAP.md, STATE.md, MILESTONES.md
- [ ] **STATE-03**: PROJECT-SUMMARY.md: executor appends phase blocks, overwrites on re-run
- [x] **STATE-04**: No config.json — workflow configuration removed — config.cjs deleted, all code paths removed, hardcoded defaults in core.cjs ✓ 2026-02-22
- [ ] **STATE-05**: Files on disk are the state; no cross-session resume/pause mechanism

### Scope Validation

- [ ] **SCOPE-01**: Verifiability assessment during `/new-project` (greenfield/mechanical/brownfield heuristics)
- [ ] **SCOPE-02**: Scope warnings for brownfield requests that lack verifiable acceptance criteria
- [ ] **SCOPE-03**: Must-have / nice-to-have split enforced; nice-to-haves parked as todos

### Safety

- [ ] **SAFE-01**: Working tree safety: pipeline manages `.planning/` files only; never commits, resets, checks out, stashes, or discards working tree content
- [ ] **SAFE-02**: Git staging uses explicit `git add <file>` (never `git add -A` or `git add .`)
- [ ] **SAFE-03**: Human-in-the-loop: human drives all phase transitions; no auto-advance
- [ ] **SAFE-04**: No automated fix loops: verifier reports and stops

## v2 Requirements

### Advanced Context

- **CTX-01**: Context window monitoring with proactive compaction at 40-60% usage
- **CTX-02**: SKILL.md progressive disclosure (YAML frontmatter at startup, body on-demand)
- **CTX-03**: Multi-model orchestration profiles (quality for planning, balanced for execution, budget for research)

### Enhanced Research

- **RES-01**: Phase-specific research agents with XML-tagged output for planner consumption
- **RES-02**: Research caching to avoid redundant web searches across phases

### Enhanced Todos

- **TODO-01**: Todo area tag registry with validation and autocomplete
- **TODO-02**: Todo migration warnings when nice-to-haves are promoted to must-haves

### MCP Integration

- **MCP-01**: Model Context Protocol adoption when external service integrations are needed

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-milestone lifecycle | One commit = one project; milestones are the human's commits |
| ROADMAP.md, STATE.md, MILESTONES.md | Replaced by ephemeral PROJECT-PLAN.md |
| Persistent REQUIREMENTS.md | Acceptance criteria live in PROJECT.md |
| config.json workflow configuration | No workflow config file; commands work directly |
| Auto-advance between phases | Human drives transitions explicitly |
| Cross-session resume/pause | Files on disk are the state |
| Checkpoints mid-execution | Decisions belong in `/discuss-phase`, not mid-execution |
| Automated fix loops | Verifier reports and stops; human decides |
| `gsd-tools.cjs` as primary interface | Agents use native tools; only `resolve-model` survives |
| RAG/vector search layer | Not needed for single-commit scope |
| Skill library for mechanical patterns | Knowledge docs + deterministic code is the architecture |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLN-01 | Phase 1 | Complete |
| CLN-02 | Phase 1 | Complete |
| CLN-03 | Phase 1 | Complete |
| CLN-04 | Phase 4 | Pending |
| TOOL-01 | Phase 2 | Complete |
| TOOL-02 | Phase 2 | Complete |
| TOOL-03 | Phase 2 | Complete |
| TOOL-04 | Phase 2 | Complete |
| TOOL-05 | Phase 2 | Pending |
| TOOL-06 | Phase 5 | Pending |
| KNOW-01 | Phase 3 | Complete |
| KNOW-02 | Phase 3 | Complete |
| KNOW-03 | Phase 3 | Complete |
| KNOW-04 | Phase 3 | Complete |
| KNOW-05 | Phase 3 | Complete |
| KNOW-06 | Phase 3 | Complete |
| CMD-01 | Phase 4 | Pending |
| CMD-02 | Phase 4 | Pending |
| CMD-03 | Phase 4 | Pending |
| CMD-04 | Phase 4 | Pending |
| CMD-05 | Phase 4 | Pending |
| CMD-06 | Phase 4 | Pending |
| CMD-07 | Phase 6 | Pending |
| CMD-08 | Phase 4 | Pending |
| CMD-09 | Phase 4 | Pending |
| CMD-10 | Phase 4 | Pending |
| CMD-11 | Phase 4 | Pending |
| CMD-12 | Phase 4 | Pending |
| AGT-01 | Phase 5 | Pending |
| AGT-02 | Phase 6 | Pending |
| AGT-03 | Phase 5 | Pending |
| AGT-04 | Phase 5 | Pending |
| AGT-05 | Phase 5 | Pending |
| AGT-06 | Phase 5 | Pending |
| AGT-07 | Phase 5 | Pending |
| STATE-01 | Phase 4 | Pending |
| STATE-02 | Phase 4 | Pending |
| STATE-03 | Phase 4 | Pending |
| STATE-04 | Phase 1 | Complete |
| STATE-05 | Phase 4 | Pending |
| SCOPE-01 | Phase 4 | Pending |
| SCOPE-02 | Phase 4 | Pending |
| SCOPE-03 | Phase 4 | Pending |
| SAFE-01 | Phase 6 | Pending |
| SAFE-02 | Phase 6 | Pending |
| SAFE-03 | Phase 4 | Pending |
| SAFE-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Mapped to phases: 46
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after research synthesis*
