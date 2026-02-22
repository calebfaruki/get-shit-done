---
phase: 03-knowledge-document-system
plan: 01
subsystem: knowledge-documents
tags: [documentation, domain-knowledge, reference-docs]
dependency_graph:
  requires: [questioning.md, SPEC.md, gsd-planner.md]
  provides: [project-domain.md, planning-domain.md]
  affects: [project-commands, planning-commands]
tech_stack:
  added: []
  patterns: [xml-sections, domain-separation, tool-guidance]
key_files:
  created:
    - get-shit-done/knowledge/project-domain.md
    - get-shit-done/knowledge/planning-domain.md
  modified: []
decisions:
  - "Extracted intake methodology from questioning.md nearly verbatim — already agent-oriented"
  - "Adapted for single-commit scope by removing multi-phase references"
  - "Removed AskUserQuestion references (GSD-specific tool)"
  - "Added explicit native tool guidance sections per locked decision"
  - "Used XML section tags (<intake>, <scope_validation>, etc.) for agent reference"
metrics:
  duration_minutes: 5
  completed_date: 2026-02-22
---

# Phase 03 Plan 01: Project and Planning Domain Knowledge Documents Summary

**One-liner:** Created project and planning domain knowledge documents extracting intake patterns, scope validation heuristics, goal-backward methodology, and context budgets from existing GSD artifacts.

## Overview

This plan created two foundational knowledge documents that agents will load based on their role instead of embedding domain knowledge in monolithic agent files. The project domain covers intake methodology, scope validation, and acceptance criteria sharpening. The planning domain covers single-commit scope philosophy, phase decomposition, goal-backward methodology, and context budgets.

## Tasks Completed

### Task 1: Create project domain knowledge document

**Status:** Complete
**Files:** `get-shit-done/knowledge/project-domain.md`

Extracted and adapted content from three sources:

1. **questioning.md** — Migrated intake methodology nearly verbatim (philosophy, how_to_question, question_types, context_checklist, decision_gate, anti_patterns). Removed AskUserQuestion references (GSD-specific tool). Adapted for single-commit scope by removing "downstream phases" references.

2. **SPEC.md sections 2 and 4** — Extracted scope validation heuristics (greenfield/mechanical/brownfield verifiability framework), acceptance criteria patterns, and scope ownership model.

3. **Tool guidance** — Added explicit section mapping project domain operations to native Claude Code tools (Read, Write, Glob, Grep, Bash). Included anti-patterns showing what NOT to do (bash cat/grep/find).

**Structure:**
- Overview (when to load this doc)
- `<intake>` section: questioning methodology adapted for single-commit scope
- `<scope_validation>` section: verifiability heuristics and scope ownership
- `<acceptance_criteria>` section: patterns for sharpening criteria
- `<tool_guidance>` section: native tool usage for project domain operations

**Metrics:**
- 1,765 words (~3K tokens)
- Well under 10K token limit
- All required sections present
- No orchestration leaks
- No bash anti-patterns outside "NEVER" examples

### Task 2: Create planning domain knowledge document

**Status:** Complete
**Files:** `get-shit-done/knowledge/planning-domain.md`

Extracted and adapted content from three sources:

1. **SPEC.md** — Single-commit scope philosophy ("A project is one commit's worth of work"), phase decomposition approach (projects are strategic, phases are tactical), planning artifact lifecycle (ephemeral, discarded after commit).

2. **gsd-planner.md** — Extracted planning principles that are domain knowledge (not orchestration): goal-backward methodology (truths → artifacts → wiring → key links), context budget rules (50% target, quality degradation curve), task sizing (15-60 min Claude execution), vertical slices vs horizontal layers preference.

3. **Tool guidance** — Native tool usage for planning operations (Read for context, Write for plans, Glob for finding files, Grep for searching patterns).

**Structure:**
- Overview (when to load this doc)
- `<single_commit_scope>` section: one commit = one project philosophy
- `<phase_decomposition>` section: how to break projects into phases
- `<goal_backward>` section: the verification methodology
- `<context_budget>` section: quality degradation curve and task sizing
- `<tool_guidance>` section: native tools for planning operations

**Metrics:**
- 1,661 words (~3K tokens)
- Well under 10K token limit
- All required sections present
- Single-commit philosophy present
- No orchestration leaks

## Verification Results

### Overall Phase Checks

- [x] Both knowledge files exist
- [x] `wc -w get-shit-done/knowledge/*.md` — each file under 7,500 words
  - project-domain.md: 1,765 words ✓
  - planning-domain.md: 1,661 words ✓
- [x] Both files have `<tool_guidance>` sections with explicit native tool references
- [x] No bash anti-patterns outside of "NEVER do this" examples
- [x] Content is knowledge (principles, patterns, standards), not orchestration (step-by-step process)

### Success Criteria

- [x] Project domain doc covers intake methodology, scope validation, and acceptance criteria sharpening
- [x] Planning domain doc covers single-commit scope, goal-backward methodology, and context budgets
- [x] Both docs include tool guidance sections
- [x] Both docs are well under 10K tokens (target 2-4K each)
- [x] No orchestration content leaked into knowledge docs

## Deviations from Plan

None. Plan executed exactly as written.

## Technical Notes

### Content Extraction Approach

**Intake methodology:** The questioning.md content was already agent-oriented, so minimal adaptation was needed. Main changes were:
- Removed references to "downstream phases" and reframed for single-commit scope
- Removed AskUserQuestion tool references (GSD-specific)
- Kept the core philosophy and question types intact

**Scope validation:** SPEC.md section 2 provided the verifiability framework cleanly. Key insight: greenfield/mechanical/brownfield categories determine how large a single-commit project can be.

**Goal-backward:** gsd-planner.md's goal_backward section was already well-structured. Extracted the five-step process (goal → truths → artifacts → wiring → key links) and the must_haves output format.

**Context budgets:** Extracted the quality degradation curve and task sizing rules from gsd-planner.md. These are empirical observations about Claude's behavior that should inform planning.

### Tool Guidance Design

Each domain doc includes explicit tool guidance mapping domain operations to native Claude Code tools:
- **Read tool** for loading files
- **Write tool** for creating files
- **Glob tool** for pattern matching
- **Grep tool** for content search
- **Bash tool** for structural checks only

Anti-patterns section shows what NOT to do (bash cat/grep/find) and explains why (native tools are optimized for Claude Code's environment).

### XML Section Tags

Used XML-style tags (`<intake>`, `<scope_validation>`, etc.) to enable agents to reference specific sections. This pattern carried forward from RESEARCH.md templates where it's already proven.

## Files Created

1. `get-shit-done/knowledge/project-domain.md` (1,765 words)
   - Provides: Intake patterns, scope validation heuristics, acceptance criteria sharpening
   - Contains: `<intake>`, `<scope_validation>`, `<acceptance_criteria>`, `<tool_guidance>`

2. `get-shit-done/knowledge/planning-domain.md` (1,661 words)
   - Provides: Single-commit scope philosophy, phase decomposition, goal-backward methodology, context budgets
   - Contains: `<single_commit_scope>`, `<phase_decomposition>`, `<goal_backward>`, `<context_budget>`, `<tool_guidance>`

## Next Steps

Plan 03-02 will create execution-domain.md and verification-domain.md, completing the knowledge document system.
