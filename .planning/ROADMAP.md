# Roadmap: Stateless Project PM -- GSD Fork

## Overview

A strangler fig migration of get-shit-done-cc (v1.20.5) from rigid workflow scripts to a knowledge-first architecture. Each phase delivers a coherent, testable capability while keeping the existing system functional. The migration moves bottom-up: establish test safety net, build deterministic tooling, create knowledge documents, wire up commands and agents, then verify the whole thing works end-to-end. Seven phases, sequential, human-driven transitions.

## Phases

- [x] **Phase 1: Characterization Tests and Safe Deletion** - Establish behavioral baseline tests, then incrementally delete ~55 dead files ✓ 2026-02-22
- [x] **Phase 2: Deterministic Tooling Foundation** - Build the mechanical operations layer (file management, SHA checks, prerequisites, model resolution, todo CRUD) (completed 2026-02-22)
- [x] **Phase 3: Knowledge Document System** - Create AGENTS.md index and domain-specific reference docs that agents reason over ✓ 2026-02-22
- [ ] **Phase 4: Command Handlers and Project Lifecycle** - Wire up all slash commands as thin triggers that load knowledge docs and spawn agents
- [ ] **Phase 5: Agent Spawning and Handoff Protocols** - Modify agents for single-commit scope with self-contained context propagation
- [ ] **Phase 6: Verification and Git Staging** - Report-only verification, explicit file staging, working tree safety enforcement
- [ ] **Phase 7: Integration Testing and Migration Cleanup** - End-to-end lifecycle tests, remove remaining legacy artifacts, validate full pipeline

## Phase Details

### Phase 1: Characterization Tests and Safe Deletion
**Goal**: The codebase is clean of dead GSD artifacts while the existing test suite and installation remain fully functional
**Depends on**: Nothing (first phase)
**Requirements**: CLN-01, CLN-02, CLN-03, STATE-04
**Success Criteria** (what must be TRUE):
  1. ~55 identified dead files are deleted from the repository
  2. Existing test suite passes after each deletion wave (strangler fig, not big bang)
  3. Installation works across Claude Code, OpenCode, and Gemini after cleanup
  4. config.json workflow configuration is removed (STATE-04)
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Characterization tests and low-risk file deletions (~40 files in 3 waves) ✓ 2026-02-22
- [x] 01-02-PLAN.md — Config.json removal, high-risk deletions, and installation verification (~19 files) ✓ 2026-02-22
- [x] 01-03-PLAN.md — Gap closure: fix incomplete loadConfig removal in commands.cjs (STATE-04) ✓ 2026-02-22

### Phase 2: Deterministic Tooling Foundation
**Goal**: A tested utility library handles all mechanical operations so agents never need to implement file management, staleness checks, or prerequisite validation themselves
**Depends on**: Phase 1
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-05
**Success Criteria** (what must be TRUE):
  1. File management utilities perform atomic writes using temp file + rename pattern
  2. Codebase map staleness is detectable by comparing stored commit SHA against current HEAD
  3. Commands can check prerequisites (e.g., `.planning/` exists, map not stale) before executing
  4. `resolve-model` returns correct model for quality/balanced/budget profiles
  5. Todo CRUD creates, lists, completes, and deletes area-tagged files in `.planning/todos/`
**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md — Core toolkit: atomic writes, SHA staleness, prerequisite checks, model resolution (TDD) ✓ 2026-02-22
- [x] 02-02-PLAN.md — Todo CRUD: create, list, complete, delete area-tagged files (TDD) ✓ 2026-02-22

### Phase 3: Knowledge Document System
**Goal**: Agents have domain-specific reference documents to reason over instead of rigid workflow scripts
**Depends on**: Phase 2
**Requirements**: KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05, KNOW-06
**Success Criteria** (what must be TRUE):
  1. AGENTS.md root index exists (~100 lines) and points to all domain-specific reference docs
  2. Reference docs exist for project domain (intake patterns, scope validation, acceptance criteria)
  3. Reference docs exist for planning domain (phase planning standards, single-commit scope)
  4. Reference docs exist for execution domain (TDD flow, deviation rules)
  5. Reference docs exist for verification domain (verification standards, staging rules)
  6. Every reference doc is under 10,000 tokens to prevent context degradation
**Plans**: 3 plans
Plans:
- [x] 03-01-PLAN.md — Project and planning domain knowledge documents ✓ 2026-02-22
- [x] 03-02-PLAN.md — Execution and verification domain knowledge documents ✓ 2026-02-22
- [x] 03-03-PLAN.md — AGENTS.md root index and token limit validation ✓ 2026-02-22

### Phase 4: Command Handlers and Project Lifecycle
**Goal**: Users can drive the full project lifecycle through slash commands that load relevant knowledge docs and manage ephemeral project state
**Depends on**: Phase 3
**Requirements**: CLN-04, CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06, CMD-08, CMD-09, CMD-10, CMD-11, CMD-12, STATE-01, STATE-02, STATE-03, STATE-05, SCOPE-01, SCOPE-02, SCOPE-03, SAFE-03
**Success Criteria** (what must be TRUE):
  1. All commands use bare namespace (`/new-project` not `/gsd:new-project`)
  2. `/new-project` conducts conversational intake, validates scope, sharpens acceptance criteria, and writes PROJECT.md
  3. `/plan-project` produces PROJECT-PLAN.md with phased breakdown via subagent
  4. `/execute-phase N` runs without per-step commits, STATE.md updates, auto-advance, or continuation agents
  5. `/map` produces codebase map anchored to commit SHA with staleness detection
  6. `/todo` creates, lists, and manages parking lot items
  7. `.planning/project/` is wiped (with archive safety) when `/new-project` starts a new project
  8. PROJECT-PLAN.md replaces ROADMAP.md, STATE.md, and MILESTONES.md as the sole planning artifact
  9. Human drives all phase transitions; no auto-advance exists
**Plans**: 6 plans
Plans:
- [x] 04-01-PLAN.md — Infrastructure: .gitignore, bare-namespace /map and /todo commands ✓ 2026-02-22
- [x] 04-02-PLAN.md — Project intake: /new-project and /discuss-project with scope validation ✓ 2026-02-22
- [ ] 04-03-PLAN.md — Project lifecycle: /research-project, /plan-project, /verify-project
- [ ] 04-04-PLAN.md — Phase commands: /discuss-phase, /research-phase, /plan-phase
- [ ] 04-05-PLAN.md — Execution: /execute-phase with PROJECT-SUMMARY.md tracking, gsd:* cleanup
- [ ] 04-06-PLAN.md — Gap closure: rewrite execute-phase workflow for SPEC compliance

### Phase 5: Agent Spawning and Handoff Protocols
**Goal**: All subagents operate with single-commit scope framing and receive self-contained context through explicit file references
**Depends on**: Phase 4
**Requirements**: TOOL-06, AGT-01, AGT-03, AGT-04, AGT-05, AGT-06, AGT-07
**Success Criteria** (what must be TRUE):
  1. `gsd-tools.cjs` calls are stripped from all agents; agents use native tools (Read, Write, Glob, Grep, Bash)
  2. Executor agent produces diffs without per-step commits, STATE.md updates, auto-advance, continuation agents, or checkpoints
  3. Planner agent frames plans for single-commit scope with fewer phases
  4. Plan checker warns when scope is not verifiable (greenfield/mechanical/brownfield heuristics)
  5. All subagent spawns include `<files_to_read>` blocks for self-contained context
**Plans**: TBD

### Phase 6: Verification and Git Staging
**Goal**: The verification pipeline checks results against acceptance criteria and stages files safely without touching the working tree
**Depends on**: Phase 5
**Requirements**: CMD-07, AGT-02, SAFE-01, SAFE-02, SAFE-04
**Success Criteria** (what must be TRUE):
  1. `/verify-phase N` checks results against acceptance criteria and reports diagnostics
  2. Verifier stages files on pass using explicit `git add <file>` (never `git add -A` or `git add .`)
  3. Verifier reports and stops on fail (no automated gap-closure loop)
  4. Pipeline manages `.planning/` files only; never commits, resets, checks out, stashes, or discards working tree content
**Plans**: TBD

### Phase 7: Integration Testing and Migration Cleanup
**Goal**: The full project lifecycle works end-to-end and no legacy GSD artifacts remain
**Depends on**: Phase 6
**Requirements**: (cross-cutting validation of all prior phases)
**Success Criteria** (what must be TRUE):
  1. A project can be taken from `/new-project` through `/plan-project`, `/execute-phase`, and `/verify-phase` successfully
  2. No legacy GSD workflow scripts, state management files, or milestone commands remain in the codebase
  3. All existing tests pass plus new integration tests cover the full lifecycle
  4. Installation works across Claude Code, OpenCode, and Gemini CLI
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Characterization Tests and Safe Deletion | 3/3 | Complete | 2026-02-22 |
| 2. Deterministic Tooling Foundation | 2/2 | Complete | 2026-02-22 |
| 3. Knowledge Document System | 3/3 | Complete | 2026-02-22 |
| 4. Command Handlers and Project Lifecycle | 2/5 | In Progress|  |
| 5. Agent Spawning and Handoff Protocols | 0/TBD | Not started | - |
| 6. Verification and Git Staging | 0/TBD | Not started | - |
| 7. Integration Testing and Migration Cleanup | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-22*
