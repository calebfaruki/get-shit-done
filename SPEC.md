# Stateless Project PM — Fork Specification

## 1. Philosophy and Principles

The human drives. The AI is a skilled pair programmer, not a project manager. It understands the codebase, helps plan and execute a single project, verifies the result, and updates its understanding. The code is the only durable artifact.

A "project" is one commit's worth of work. That's the atomic unit. Everything the AI does serves the goal of producing a clean, verifiable diff that the human reviews, tests, and commits.

GSD's within-project PM rigor is valuable — research, structured planning, scope validation, verification against acceptance criteria. What changes is the **lifecycle of documents**, not their existence. Planning artifacts are scratch work that serve the current project and are discarded after the human commits.

### Vocabulary

| GSD Term | Our Term | Scope |
|----------|----------|-------|
| Project | Project | One commit's worth of work (GSD's "Project" was multi-milestone; ours is single-commit) |
| Phase | Phase | Still phases, just naturally fewer (typically 1-2, rarely more) |
| Plan | Phase plan | One plan per phase — the phase's execution details |
| Milestone | N/A | The commit is the milestone |

### Delta from GSD

**Removed**: ROADMAP.md, STATE.md, MILESTONES.md, REQUIREMENTS.md (persistent), config.json, resume/pause files, auto-advance between phases, all git operations (except `git add` for staging), multi-phase project orchestration, checkpoints.

**Reframed**: PROJECT.md is now ephemeral (scoped to one commit, created by `/new-project`, discarded after commit). Same filename as GSD's, completely different lifecycle.

**Namespace**: `/gsd:*` becomes bare commands (`/map`, `/new-project`, `/plan-project`, etc.).

---

## 2. Core Concepts

### Codebase Mapping

The map is a **versioned snapshot** tied to a specific git commit SHA.

- Map file stores the commit SHA it was generated at
- On new project, compare stored SHA against HEAD
- If they match: map is fresh, skip regeneration
- If they diverge: map is stale — AI reports staleness and recommends regenerating. Human decides.
- After project execution + human commits: regenerate to capture what changed
- Persists between sessions (gitignored) for speed
- The SHA is the single source of truth — handles external changes automatically

### Scope and Verifiability

Scope warnings are **soft**, not hard blocks. The metric isn't file count or lines of code — it's **verifiability**: can the human look at a single diff and confidently say "this works"?

Two factors determine verifiability:

- **Interaction density** — How many existing behaviors does this change touch or depend on?
- **Risk factor** — What's the cost of a subtle bug?

Three categories of work, each with different verifiability characteristics:

**Greenfield** — Building something new where nothing exists. Generally highly verifiable — the diff can be read in isolation.
- *One project:* Add a test suite for existing models — many files, but each test is independently verifiable.
- *One project:* Add a new CRUD resource — well-understood pattern, easy to trace through.

**Mechanical** — Repetitive changes following a single pattern. Highly verifiable — if one instance is correct, they're all correct.
- *One project:* Swap out a mailer gem — mechanical replacement across the codebase.
- *One project:* Rename a model and update all references — tedious but uniform.

**Brownfield** — Modifying or extending existing code. Verifiability depends on interaction density and risk.
- *One project:* Add a new field to an existing form with simple validation — low interaction density.
- *Too broad:* Add multi-currency pricing with tax calculations — many interacting rules, high risk.
- *Too broad:* Add authentication + authorization + user roles — three distinct systems.
- *Too broad:* Refactor the order pipeline + add a new payment provider — two unrelated concerns.

Greenfield and mechanical changes can be larger. Brownfield changes involving complex interactions should be smaller. When in doubt: "Can I read this diff and confidently say it's correct?"

If the project is too broad to verify cleanly, the AI recommends starting with the most foundational piece and defers the rest to todos.

**Scope ownership**: `/new-project` performs the initial scope gate. The plan-checker performs a secondary check during planning, using proxy signals — number of behavioral changes, number of systems touched, whether the project crosses architectural boundaries. These are examples as heuristic, not numeric rubrics.

### Todos

Todos are semi-durable state serving three purposes:

1. **Deferred scope** — When a project is scoped down, the deferred parts are captured so the human doesn't have to hold them in their head.
2. **Gotcha cache** — During planning, if the AI notices a future concern, it gets noted on a todo.
3. **Contextual memory** — During `/new-project` and `/discuss-project`, the AI surfaces relevant todos. If they fit within verifiability scope, they're folded into acceptance criteria. If not, they stay in the parking lot.

**Format**: One file per todo in `.planning/todos/`. Minimal YAML frontmatter, freeform prose body.
```yaml
---
area: payments
created: 2026-02-22
---
Consider rate limiting on the webhook endpoint when we add Stripe integration.
```
`area` enables matching todos against a new project's domain. `created` enables staleness detection. No status, no priority, no assignee.

**Lifecycle**: AI creates todos during `/new-project` and `/plan-project` when scope is shaved (AI proposes, human confirms before write). AI surfaces relevant todos during `/new-project` and `/discuss-project`. Human manages lifecycle — no `todo complete` command.

---

## 3. Command Surface

Two levels: project commands own scope and requirements, phase commands own implementation discipline. All commands check prerequisites before running (e.g., `/plan-project` checks PROJECT.md exists). Missing prerequisites produce a short error naming the missing step.

### Project-Level Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/new-project` | 1 (required) | Sharpen vague idea into PROJECT.md with acceptance criteria. |
| `/research-project` | 2 (optional) | Strategic research — library choices, ecosystem patterns, architectural approaches. |
| `/discuss-project` | 3 (optional) | Deeper exploration — gray areas, edge cases, implementation preferences. |
| `/plan-project` | 4 (required) | Break project into phases (strategic). Produces PROJECT-PLAN.md. |
| `/verify-project` | after execution | Check result against project-level acceptance criteria. |

### Phase-Level Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/discuss-phase N` | 1 (optional) | Clarify implementation decisions for phase N. |
| `/research-phase N` | 2 (optional) | Tactical research — implementation details, gotchas, patterns. |
| `/plan-phase N` | 3 (required) | Produce detailed execution plan (`PHASE-{N}-PLAN.md`). |
| `/execute-phase N` | 4 (required) | Execute phase N. Changes remain unstaged. |
| `/verify-phase N` | 5 (required) | Verify against must_haves. On pass, stages changes. On fail, reports diagnostics. |

### Utility Commands

| Command | Purpose |
|---------|---------|
| `/map` | Analyze the codebase, anchored to current commit SHA. |
| `/todo` | View parking lot items. Lists all todos; optionally filter by area. |

### Execution Context

| Command | Context | Why |
|---------|---------|-----|
| `/new-project` | Main | Needs back-and-forth with human. |
| `/discuss-project` | Main | Conversational. |
| `/discuss-phase N` | Main | Conversational. |
| `/research-project` | Subagent | Reads PROJECT.md, writes PROJECT-RESEARCH.md. |
| `/research-phase N` | Subagent | Reads PROJECT-PLAN.md + codebase, writes PHASE-{N}-RESEARCH.md. |
| `/plan-project` | Subagent | Reads files, produces PROJECT-PLAN.md. |
| `/plan-phase N` | Subagent | Reads PROJECT-PLAN.md + codebase + phase context/research, produces PHASE-{N}-PLAN.md. |
| `/execute-phase N` | Subagent | Implements phase plan. |
| `/verify-phase N` | Subagent | Checks executor's work, stages on pass. |
| `/verify-project` | Subagent | Reads files, runs tests, writes report. |
| `/map` | Subagent | Codebase analysis. |
| `/todo` | Main | Lightweight. |

### Hierarchy

Projects are **strategic** — what to build, why, and in what order. Phases are **tactical** — how to implement each piece correctly. There is no `/execute-project`. The human walks through phases at their own pace. `/plan-project` ends with a handoff reminder:

```
Planning complete. 3 phases identified.

Phase 1: Create migration and model
Phase 2: Add controller and routes
Phase 3: Update views

Next: /discuss-phase 1, /research-phase 1, or /plan-phase 1
```

---

## 4. Command Specifications

### `/new-project`

Project intake, scope validation, and requirements sharpening.

**Input quality gate** (hard deflects — no override):
- **Trivial fix** (typo, single-line bug, simple rename): "This is a quick fix — just ask me directly, no project needed."
- **Vague one-liner** (no clear outcome, no describable scope): "This isn't clear enough to plan against. Talk it through with me first, then run `/new-project` when you can describe what you want."

**Input quality gate** (proceed with sharpening):
- **Moderate input** (describable goal, some gaps): 3-5 clarifying questions to sharpen scope and nail down acceptance criteria.
- **Detailed input** (clear goal, mostly complete criteria): 1-3 clarifying questions to confirm understanding and fill small gaps.

**Flow** (after passing the input quality gate):
1. Human describes the project
2. AI checks codebase map staleness (see Codebase Mapping)
3. AI surfaces relevant todos from parking lot
4. AI analyzes the request for ambiguity, open questions, edge cases, missing context
5. Back-and-forth conversation until all questions are resolved. The AI is adversarial in a helpful way — poke holes, surface edge cases, flag scope creep. When the AI has no more questions and the scope passes the verifiability check, the project is well-defined enough to lock.
6. AI validates scope (see Scope and Verifiability). If too broad, recommends scoping down and defers the rest to todos.
7. AI summarizes the project and proposed acceptance criteria in conversation
8. Human confirms or adjusts
9. PROJECT.md is written only after confirmation

Acceptance criteria come from this conversation, not from a template. If the human brings detailed criteria, the AI mostly uses theirs. If the human brings a one-liner, the AI proposes criteria for approval. PROJECT.md is not written until the criteria are clear enough to verify against.

**Re-run**: If existing project artifacts are found, warns the human: "You have an existing project in progress: [name]. Planning artifacts will be wiped. Staged/unstaged code changes in your working tree are untouched. Continue?" On confirmation, wipes `.planning/project/` and starts fresh. On decline, stops.

**Cancellation**: Nothing was written. No cleanup needed.

**Output**: PROJECT.md

```markdown
# Project: [Short name]

## Problem
[What needs to happen and why]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Out of Scope
- [Deferred to todos if applicable]

## Decisions
- [Key decisions made during intake]
```

### `/research-project`

Optional strategic research — broad, exploratory.

**When to use**: When the project involves unfamiliar libraries, patterns, or ecosystem decisions. Research informs discussion — run this before `/discuss-project` so decisions are grounded in what's actually available.

**Agent**: `gsd-project-researcher.md` (modified). Consolidates GSD's 5-file parallel output into a single document. No synthesizer needed.

**Methodology**: Web search + codebase analysis. Investigates external libraries/patterns and how they'd fit into this codebase.

**Re-run**: Overwrites PROJECT-RESEARCH.md.

**Output**: PROJECT-RESEARCH.md

```markdown
# Project Research: [Short name]

**Domain:** [primary technology/problem domain]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Summary
[2-3 paragraph executive summary. Key recommendations.]
**Primary recommendation:** [one-liner]

## Recommended Stack
### Core
| Technology | Purpose | Why Recommended |
|------------|---------|-----------------|

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|

## Architecture Approach
[1-2 paragraphs. Key patterns. Anti-patterns to avoid.]

## Critical Pitfalls
### [Pitfall Name]
**What goes wrong:** / **How to avoid:** / **Warning signs:**

## Open Questions
[Unresolved items — how to handle during planning/execution]

## Sources
### Primary (HIGH confidence)
### Secondary (MEDIUM confidence)
```

### `/discuss-project`

Optional deeper exploration of an existing PROJECT.md.

**Difference from `/new-project`**: `/new-project` goes from zero to a defined project. `/discuss-project` takes an existing PROJECT.md and digs deeper — gray areas, edge cases, implementation preferences. Can reference PROJECT-RESEARCH.md if research was run.

**Output**: Updates PROJECT.md with additional decisions and context. AI summarizes proposed changes, human confirms before rewrite.

**After planning**: If PROJECT-PLAN.md already exists, warns that changes may invalidate the plan. Human decides whether to re-run `/plan-project`.

### `/plan-project`

Break project into phases (strategic).

**Reads**: PROJECT.md, CODEBASE.md, PROJECT-RESEARCH.md (if exists), relevant todos.

**Output**: PROJECT-PLAN.md. Phases, their order, acceptance criteria mapping. Does NOT produce phase-level plans.

```yaml
---
project: [short-name-slug]
phases: [total count]
acceptance_criteria_count: [total from PROJECT.md]
---
```

```markdown
# Project Plan: [Short name]

## Phases

### Phase 1: [Name]
**Goal**: [Outcome-shaped — what is true when this phase is done]
**Acceptance Criteria**: [AC-1, AC-2]
**Depends on**: Nothing

### Phase 2: [Name]
**Goal**: [Outcome]
**Acceptance Criteria**: [AC-3, AC-4]
**Depends on**: Phase 1

## Criteria Mapping

| Criterion | Phase | Description |
|-----------|-------|-------------|
| AC-1 | 1 | [Short description from PROJECT.md] |
| AC-2 | 1 | [Short description] |

**Coverage**: All [N] acceptance criteria mapped. No orphans.
```

`AC-N` identifiers are assigned by `/plan-project` based on PROJECT.md acceptance criteria. Local to this project.

### `/discuss-phase N`

Optional — clarify implementation decisions before planning a phase.

**Output**: PHASE-{N}-CONTEXT.md with three decision categories (carried forward from GSD): **Locked Decisions** (executor must follow), **Deferred Ideas** (fed into todos), **Discretion Areas** (executor can choose).

### `/research-phase N`

Optional tactical research — narrow, prescriptive, implementation-focused. Honors locked decisions from PHASE-{N}-CONTEXT.md if `/discuss-phase` was run.

**Re-run**: Overwrites PHASE-{N}-RESEARCH.md.

**Output**: PHASE-{N}-RESEARCH.md. XML-tagged sections enable the planner to reference specific content (e.g., `<user_constraints>` feeds into plan constraints, `<standard_stack>` informs library choices). The phase researcher populates `<user_constraints>` from PHASE-{N}-CONTEXT.md if it exists — this is how `/discuss-phase` decisions flow through to the plan without the planner needing to read the context file directly.

```markdown
# Phase [N]: [Name] — Research

**Domain:** [primary technology/problem area]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

<user_constraints>
## User Constraints (from PHASE-{N}-CONTEXT.md)

### Locked Decisions
[Copy from CONTEXT.md — these are NON-NEGOTIABLE for the planner/executor]

### Discretion Areas
[Copy from CONTEXT.md — areas where planner/executor can choose]

### Deferred Ideas (OUT OF SCOPE)
[Copy from CONTEXT.md — do NOT research or plan these]

**If no CONTEXT.md exists:** "No user constraints — all decisions at researcher's discretion"
</user_constraints>

<research_summary>
## Summary

[1-2 paragraph summary. What was researched, key recommendation, main risk.]

**Primary recommendation:** [one-liner actionable guidance for the planner]
</research_summary>

<standard_stack>
## Standard Stack

| Library | Purpose | Why Standard |
|---------|---------|--------------|
| [name] | [what it does] | [why experts use it] |

### Don't Hand-Roll
| Problem | Use Instead | Why |
|---------|-------------|-----|
| [problem] | [library/pattern] | [edge cases, complexity] |
</standard_stack>

<implementation_patterns>
## Implementation Patterns

### [Pattern Name]
**What:** [description]
**When to use:** [conditions]
**Example:**
```[language]
// [code example from official docs]
```

### Anti-Patterns to Avoid
- **[Anti-pattern]:** [why it's bad, what to do instead]
</implementation_patterns>

<common_pitfalls>
## Common Pitfalls

### [Pitfall Name]
**What goes wrong:** [description]
**How to avoid:** [prevention strategy]
**Warning signs:** [early detection]
</common_pitfalls>

<open_questions>
## Open Questions

[Things that couldn't be resolved — recommendation for how to handle during execution]
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [Official docs, verified sources]

### Secondary (MEDIUM confidence)
- [Community consensus]
</sources>
```

### `/plan-phase N`

Produce detailed execution plan for phase N.

**Reads**: PROJECT-PLAN.md, CODEBASE.md, PHASE-{N}-CONTEXT.md and PHASE-{N}-RESEARCH.md if they exist, relevant source files.

**Output**: PHASE-{N}-PLAN.md — the executor's instruction set.

```yaml
---
phase: [N]
type: execute | tdd
acceptance_criteria: [AC-1, AC-2]
files_modified: []
must_haves:
  truths: []     # Observable behaviors that must be true when phase is done
  artifacts: []  # Files that must exist with substantive implementation
---
```

```markdown
<objective>
[What this phase accomplishes — one paragraph.]
</objective>

<context>
@.planning/project/PROJECT.md
@.planning/CODEBASE.md
@src/relevant/file.rb
</context>

<tasks>
<task>
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[What to do, how, what to avoid and WHY]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria for this task]</done>
</task>
</tasks>

<verification>
- [ ] [Specific test command that must pass]
- [ ] [Build/lint/typecheck that must pass]
- [ ] [Behavioral check]
</verification>
```

`<context>` lists file paths the executor must read into context before executing tasks. No checkpoint tasks — decisions belong in `/discuss-phase`. No `wave` or `depends_on` — one plan per phase, no parallelization.

### `/execute-phase N`

Execute phase N according to the phase plan.

**Flow**:
1. **Bootstrap** — read PROJECT.md, phase plan, CODEBASE.md, PHASE-{N}-CONTEXT.md if it exists
2. **Load phase plan** — parse frontmatter, enumerate tasks in execution order
3. **Execute tasks** — apply deviation rules (carried forward from GSD unchanged):
   - Rule 1: Auto-fix bugs encountered during implementation
   - Rule 2: Auto-add missing critical functionality (security, validation)
   - Rule 3: Auto-fix blocking issues
   - Rule 4: Architectural change needed — **stop immediately**
   - **Fix attempt limit**: Max 3 attempts per issue, then stop and report
   - **Scope boundary**: Deviations must stay within the phase's planned scope — Rules 1-2 do not justify expanding beyond what was planned
4. **Track** what was done, what deviated, what decisions were made
5. **Update PROJECT-SUMMARY.md** — append phase block (overwrite on re-run of same phase)
6. **Report completion** — list files touched. All changes remain unstaged.

**Rule 4 termination**: Executor writes completed work to PROJECT-SUMMARY.md with status "Stopped (Rule 4)", documenting the architectural concern. Returns a message to the human. Re-running `/execute-phase N` replays the entire phase from scratch.

**Re-run on failure**: Replays from scratch. Does not detect or skip partially completed work. Partial unstaged changes are overwritten. Prior phases' staged work is untouched. PROJECT-SUMMARY.md entry for the phase is overwritten, not duplicated.

**The executor never verifies or stages its own work** — that's `/verify-phase N`.

**Transfers from GSD unchanged**: Deviation rules (Rules 1-4, scope boundary, fix attempt limit), authentication gates, TDD flow (RED/GREEN/REFACTOR), step execution logic.

**Removed from GSD executor**: Per-step commits, STATE.md/ROADMAP.md updates, metadata commit, auto-advance, continuation agents, checkpoints, self-check, staging.

### `/verify-phase N`

Verify the executor's work against the phase plan's must_haves. Separate agent — the executor implementing and grading its own work is a conflict of interest.

**Flow**:
1. Read PHASE-{N}-PLAN.md must_haves (truths and artifacts)
2. Check the executor's work against those criteria
3. **On pass**: stage the executor's changed files (`git add`). The executor tracks files it writes; the verifier stages exactly those.
4. **On fail**: write diagnostics — what failed, why, where to look. Nothing is staged.

This creates two views for the human: `git diff` (current phase, unstaged) and `git diff --cached` (all verified phases). No commits ever — the human commits when ready.

### `/verify-project`

Check the final result against project-level acceptance criteria. Runs after all phases complete, before the human commits.

**Methodology**: Diff analysis (what changed vs. what should have), code reasoning (does the implementation satisfy each criterion), and test suite execution.

**Reads**: PROJECT.md acceptance criteria, PROJECT-SUMMARY.md, actual code via `git diff HEAD`.

**Output**: PROJECT-VERIFICATION.md with pass/fail per criterion, including diagnostics per failure (what's wrong, why, where to look — specific files and line numbers).

**Failure path**: The verifier reports and stops. No automated fix loop, no re-execution. The human decides: fix manually, re-run a phase, adjust the plan, or accept as-is.

### `/map`

Analyze the codebase. Anchored to current commit SHA (see Codebase Mapping).

### `/todo`

View parking lot items. Lists all files in `.planning/todos/` showing area and summary.

---

## 5. File Structure

All in `.planning/` (gitignored).

```
.planning/
├── CODEBASE.md              # semi-durable — codebase map with commit SHA anchor
├── todos/                   # semi-durable — parking lot items, one file per todo
│   └── *.md
└── project/                 # ephemeral — everything for the current project
    ├── PROJECT.md
    ├── PROJECT-PLAN.md
    ├── PROJECT-SUMMARY.md
    ├── PROJECT-VERIFICATION.md
    ├── PROJECT-RESEARCH.md
    ├── PHASE-{N}-CONTEXT.md
    ├── PHASE-{N}-RESEARCH.md
    └── PHASE-{N}-PLAN.md
```

**Directory lifecycle**: `todos/` and `CODEBASE.md` persist across projects. `project/` is ephemeral — `/new-project` wipes it (after human confirmation) and recreates it.

**Naming convention**: Project-level files prefixed `PROJECT-`. Phase-level files prefixed `PHASE-{N}-`.

**Frontmatter rule**: Files consumed programmatically by agents (PROJECT-PLAN.md, PHASE-{N}-PLAN.md) use YAML frontmatter. Human-facing files (PROJECT.md, PROJECT-SUMMARY.md, PROJECT-VERIFICATION.md) use plain markdown. Phase context and research files use section headings and XML tags.

**Working tree safety**: The pipeline manages `.planning/` files only. It never commits, resets, checks out, stashes, or discards working tree content. The sole git write operation is `git add` (by `/verify-phase N` on pass). `/new-project` wipes planning artifacts but never touches code.

**PROJECT-SUMMARY.md format**: Plain markdown. Each `/execute-phase` appends (or overwrites on re-run) a block:
```
## Phase N: [Name]
**Status:** Complete | Failed (step X) | Stopped (Rule 4)
**Files changed:** [list]
**Deviations:** [list or "None"]
**Decisions:** [any runtime decisions made]
**Notes:** [anything the human should know when reviewing the diff]
```

**Session-agnostic**: If you close your terminal and return, the planning files and staged changes are still on disk. Resume by running the next command in sequence.

---

## 6. Implementation Plan

Work within the existing fork. Three categories of work:

### Build new
- `/new-project`, `/research-project`, `/discuss-project`, `/plan-project`, `/verify-project` — command + workflow files for each

### Modify surviving files
- **Executor** (`gsd-executor.md`, `execute-phase.md`) — strip git, state, continuation agents, checkpoints, self-check, staging
- **Planner** (`gsd-planner.md`, `plan-phase.md`) — reframe for single-commit scope, fewer phases
- **Plan checker** (`gsd-plan-checker.md`) — verifiability-based scope warnings
- **Verifier** (`gsd-verifier.md`) — strip gap-closure loop, report-only
- **Codebase mapper** (`gsd-codebase-mapper.md`, `map-codebase.md`) — add commit SHA anchoring
- **Phase researcher** (`gsd-phase-researcher.md`) — lighter touch for smaller scope
- **Project researcher** (`gsd-project-researcher.md`) — single-file output, no synthesizer
- **Phase discussion** (`discuss-phase.md`) — strip roadmap/state dependencies
- **All surviving agents** — strip `gsd-tools.cjs` calls; use native tools (Read, Write, Glob, Grep, Bash)

### `gsd-tools.cjs` approach

Don't pre-spec. Build agents using native tools first. Add tool commands only when genuinely needed. The original is renamed as read-only reference during development, then deleted.

Likely survivors: `resolve-model` (agent model selection logic, shared across commands). Everything else — frontmatter parsing, template filling, plan validation, todo searching — is an agent reading files it can already read.

### Delete (~55 files)

See disposition table below.

---

## 7. File-Level Disposition Table

### Agents (11 existing)

| File | Disposition | Notes |
|------|------------|-------|
| `gsd-executor.md` | **Modify** | Strip git, state, continuation, checkpoints. Keep deviation rules, TDD minus commits. |
| `gsd-planner.md` | **Modify** | Single-commit scope. Fewer/smaller phases. |
| `gsd-plan-checker.md` | **Modify** | Verifiability-based scope warnings. |
| `gsd-verifier.md` | **Modify** | Strip gap-closure loop. Report-only. |
| `gsd-codebase-mapper.md` | **Modify** | Add commit SHA anchoring. |
| `gsd-phase-researcher.md` | **Modify** | Tactical research, lighter touch. |
| `gsd-project-researcher.md` | **Modify** | Single-file output, no synthesizer. |
| `gsd-debugger.md` | **Keep** | Orthogonal. |
| `gsd-research-synthesizer.md` | **Delete** | Project researcher now produces single file. |
| `gsd-roadmapper.md` | **Delete** | No roadmaps. |
| `gsd-integration-checker.md` | **Delete** | Project-level verify handles this. |

### Commands (30 existing → ~15 kept/modified + 5 new)

**Keep and modify:**

| File | Becomes | Changes |
|------|---------|---------|
| `map-codebase.md` | `/map` | Add commit SHA staleness check |
| `discuss-phase.md` | `/discuss-phase N` | Strip roadmap/state dependencies |
| `execute-phase.md` | `/execute-phase N` | Strip git, state, auto-advance |
| `plan-phase.md` | `/plan-phase N` | Tactical phase planning |
| `research-phase.md` | `/research-phase N` | Tactical phase-level research |
| `check-todos.md` | `/todo` | Simplify — view parking lot |
| `debug.md` | `/debug` | Keep, orthogonal |
| `health.md` | `/health` | Adapt for simpler file structure |
| `help.md` | `/help` | Rewrite for new command surface |

**New commands:** `/new-project`, `/research-project`, `/discuss-project`, `/plan-project`, `/verify-project`

**Delete:** `add-todo` (todos are created by the AI during `/new-project` and `/plan-project` when scope is shaved — AI proposes, human confirms; no manual add command needed), `cleanup`, `new-project` (GSD's), `new-milestone`, `complete-milestone`, `audit-milestone`, `plan-milestone-gaps`, `add-phase`, `insert-phase`, `remove-phase`, `progress`, `pause-work`, `resume-work`, `quick`, `settings`, `set-profile`, `list-phase-assumptions`, `reapply-patches`, `update`, `join-discord`, `verify-work`

**Note**: Command and workflow filenames don't always correspond 1:1. Known mismatches: `debug.md` → `diagnose-issues.md`, `resume-work.md` → `resume-project.md`. `reapply-patches.md` and `join-discord.md` have no workflow counterpart.

### Workflows (32 existing)

Same disposition as corresponding commands, plus:

| File | Disposition | Notes |
|------|------------|-------|
| `execute-plan.md` | **Delete** | One plan per phase now — executor handles directly. |
| `transition.md` | **Delete** | Human drives transitions. |
| `verify-phase.md` | **Modify** | Required step after `/execute-phase N`. Separate agent checks must_haves, stages on pass. |
| `discovery-phase.md` | **Keep/modify** | Lightweight research during planning. |
| `diagnose-issues.md` | **Keep** | Debugging support. |
| `resume-project.md` | **Delete** | No cross-session resume. |

### References (13 files)

| File | Disposition |
|------|------------|
| `tdd.md` | **Keep** |
| `model-profile-resolution.md` | **Keep** |
| `model-profiles.md` | **Keep** |
| `questioning.md` | **Keep** |
| `verification-patterns.md` | **Keep** |
| `phase-argument-parsing.md` | **Keep/simplify** |
| `ui-brand.md` | **Replace** (fork's own branding) |
| `checkpoints.md` | **Delete** |
| `git-integration.md` | **Delete** |
| `git-planning-commit.md` | **Delete** |
| `continuation-format.md` | **Delete** |
| `decimal-phase-calculation.md` | **Delete** |
| `planning-config.md` | **Delete** |

### Templates (25 files)

| File | Disposition |
|------|------------|
| `summary.md` + variants | **Modify** (single project-level summary) |
| `context.md` | **Keep** |
| `codebase/` | **Keep** |
| `research.md` | **Replace** (new tactical template for `/research-phase N`) |
| `discovery.md` | **Keep** |
| `research-project/` | **Replace** (new strategic template, single file) |
| `VALIDATION.md` | **Keep/modify** |
| `user-setup.md` | **Keep** |
| `verification-report.md` | **Modify** (project-level verification) |
| `DEBUG.md`, `UAT.md` | **Keep** |
| `phase-prompt.md` | **Review** |
| `planner-subagent-prompt.md` | **Review** |
| `debug-subagent-prompt.md` | **Review** |
| `config.json` | **Delete** |
| `project.md` (GSD template) | **Delete** |
| `requirements.md` | **Delete** |
| `roadmap.md` | **Delete** |
| `state.md` | **Delete** |
| `milestone.md` + `milestone-archive.md` | **Delete** |
| `continue-here.md` | **Delete** |

---

## 8. Resolved Decisions

- **Checkpoints removed**: Decisions belong in `/discuss-project` and `/discuss-phase`, not mid-execution. Rule 4 covers genuinely unexpected stops.
- **No automated fix loops**: Verification reports diagnostics and stops. Human decides next steps.
- **No cross-session resume**: The pipeline is session-agnostic. Files on disk are the state.
- **Mid-execution plan change**: Start over. It's one commit's worth of work.
- **Changing direction mid-project**: Run `/new-project`. Planning artifacts are wiped; code in the working tree is untouched.
