# Stateless Project PM — GSD Fork

## What This Is

A fork of GSD that reframes "project" as one commit's worth of work. The human drives; the AI is a skilled pair programmer. Planning artifacts are ephemeral scratch work that serve the current project and are discarded after the human commits. The fork replaces GSD's rigid workflow scripts with a knowledge-first architecture: deterministic code for mechanical operations, reference documents for agent reasoning.

## Core Value

The human can describe what they want to build, get it sharpened into verifiable acceptance criteria, and have the AI execute it as a clean, reviewable diff — without the AI managing its own lifecycle.

## Requirements

### Validated

- ✓ Multi-model agent orchestration (quality/balanced/budget profiles) — existing
- ✓ Codebase mapping with parallel mapper agents — existing
- ✓ Phase planning with specialized planner agent — existing
- ✓ Phase execution with deviation rules (Rules 1-4) and TDD flow — existing
- ✓ Phase research (tactical, implementation-focused) — existing
- ✓ Phase discussion (clarify decisions before planning) — existing
- ✓ Plan checking (verify plans achieve goals) — existing
- ✓ Debugging support (orthogonal, unchanged) — existing
- ✓ Node.js CLI tooling with CommonJS modules — existing
- ✓ Multi-IDE installation (Claude Code, OpenCode, Gemini) — existing
- ✓ Test suite with Node.js native test runner — existing

### Active

- [ ] Delete ~55 dead files (GSD artifacts that don't survive the fork)
- [ ] Knowledge-first architecture: replace workflow scripts with reference docs agents reason over
- [ ] Deterministic tooling layer for mechanical operations (file management, staleness checks, prerequisites, git staging, todo CRUD)
- [ ] Codebase map anchored to commit SHA with staleness detection
- [ ] `/new-project` — project intake, scope validation, acceptance criteria sharpening (main context, conversational)
- [ ] `/research-project` — strategic research, single-file output (subagent)
- [ ] `/discuss-project` — deeper exploration of existing PROJECT.md (main context)
- [ ] `/plan-project` — break project into phases, produce PROJECT-PLAN.md (subagent)
- [ ] `/verify-project` — check result against project-level acceptance criteria (subagent)
- [ ] `/execute-phase N` — strip git commits, state updates, auto-advance, continuation agents, checkpoints, self-check, staging
- [ ] `/verify-phase N` — separate agent checks must_haves, stages files on pass, reports diagnostics on fail
- [ ] `/plan-phase N` — reframe for single-commit scope, one plan per phase
- [ ] `/research-phase N` — tactical research with XML-tagged sections for planner consumption
- [ ] `/discuss-phase N` — strip roadmap/state dependencies
- [ ] `/map` — codebase mapping with commit SHA anchoring
- [ ] `/todo` — view parking lot items
- [ ] Todo system (semi-durable, area-tagged, one file per todo in `.planning/todos/`)
- [ ] Scope validation based on verifiability (greenfield/mechanical/brownfield heuristics)
- [ ] Ephemeral project directory (`.planning/project/`) wiped on new project
- [ ] Bare command namespace (strip `gsd:` prefix)
- [ ] Modified executor: no per-step commits, no STATE.md updates, no auto-advance, no continuation agents
- [ ] Modified verifier: report-only (no gap-closure loop), stages on pass
- [ ] Modified planner: single-commit scope, fewer phases
- [ ] Modified plan checker: verifiability-based scope warnings
- [ ] Modified project researcher: single-file output, no synthesizer
- [ ] Modified phase researcher: lighter touch, XML-tagged output
- [ ] Strip `gsd-tools.cjs` calls from all agents; use native tools (Read, Write, Glob, Grep, Bash)
- [ ] PROJECT-SUMMARY.md: executor appends phase blocks, overwrites on re-run

### Out of Scope

- Multi-milestone lifecycle — the commit is the milestone
- ROADMAP.md, STATE.md, MILESTONES.md — replaced by ephemeral PROJECT-PLAN.md
- Persistent REQUIREMENTS.md — acceptance criteria live in PROJECT.md
- config.json — no workflow configuration file
- Auto-advance between phases — human drives transitions
- Cross-session resume/pause — files on disk are the state
- Checkpoints — decisions belong in `/discuss-phase`, not mid-execution
- Automated fix loops — verifier reports and stops
- `gsd-tools.cjs` as primary tool interface — agents use native tools; only `resolve-model` likely survives
- RAG/vector search layer — not needed for single-commit scope
- Skill library for mechanical patterns — build later if needed

## Context

This is a fork of GSD (get-shit-done-cc, v1.20.5), an AI project management framework installed as a CLI tool for Claude Code, OpenCode, and Gemini. The existing codebase has ~70 files across agents, workflows, commands, templates, references, and a Node.js core library.

The fork is motivated by two insights:
1. **Scope**: GSD's multi-milestone lifecycle is overkill for how the author actually works — one commit at a time.
2. **Architecture**: Research shows knowledge retrieval (reference docs the agent reasons over) outperforms rigid skill/workflow scripts for context-dependent decisions. Vercel's empirical testing showed 100% pass rate with docs-based context vs 79% with explicit skill instructions.

The architecture has two layers:
- **Deterministic tooling**: File management, staleness checks, prerequisites, git staging, todo CRUD. Same behavior every time.
- **Knowledge docs**: What a well-defined project looks like, how to assess scope, what good phase plans contain, verification standards. The agent reasons over these.

Commands remain human-driven triggers. The human types `/new-project`, deterministic code checks prerequisites, then the agent reasons over knowledge docs to conduct the intake conversation.

## Constraints

- **Working tree safety**: Pipeline manages `.planning/` files only. Never commits, resets, checks out, stashes, or discards working tree content. Sole git write is `git add` by `/verify-phase N` on pass.
- **Compatibility**: Must continue to install and work across Claude Code, OpenCode, and Gemini CLI.
- **No external dependencies**: Production code uses only Node.js builtins (existing constraint).
- **Existing tests**: Must not break existing test suite during transition.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Knowledge-first over workflow scripts | Research shows 100% vs 79% pass rate; agents reason better over reference docs than rigid step sequences | — Pending |
| Deterministic code for mechanical ops | Knowledge retrieval isn't appropriate for file management, SHA comparison, prerequisite checks | — Pending |
| Delete dead files first | Clean house before building new — reduces confusion during development | — Pending |
| One commit = one project | Matches actual workflow; removes multi-milestone complexity | — Pending |
| Strip `gsd-tools.cjs` from agents | Agents can read/write files natively; tool abstraction adds complexity without value | — Pending |
| Keep `resolve-model` in tooling | Model selection logic is shared across commands, genuinely needs code | — Pending |

---
*Last updated: 2026-02-22 after initialization*
