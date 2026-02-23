# Stateless Project PM — Fork Design Notes

## Philosophy

The human drives. The AI is a skilled pair programmer, not a project manager. It understands the codebase, helps plan and execute a single project, verifies the result, and updates its understanding. The code is the only durable artifact.

A "project" is one commit's worth of work. That's the atomic unit. Everything the AI does serves the goal of producing a clean, verifiable diff that the human reviews, tests, and commits.

## Core Principle: Ephemeral Documents, Persistent Discipline

GSD's within-project PM rigor is valuable — research, structured planning, scope validation, verification against acceptance criteria. What changes is the **lifecycle of documents**, not their existence. Planning artifacts are scratch work that serve the current project and are discarded after the human commits.

## Vocabulary

| GSD Term | Our Term | Scope |
|----------|----------|-------|
| Project | Project | One commit's worth of work (GSD's "Project" was multi-milestone; ours is single-commit) |
| Phase | Phase | Still phases, just naturally fewer |
| Plan | Phase plan | One plan per phase — the phase's execution details |
| Milestone | N/A | The commit is the milestone |

## What We Keep

| Capability | Why |
|-----------|-----|
| Codebase mapping | AI needs to understand what exists before touching anything |
| Project intake / requirements conversation | Sharpen vague ideas into implementable projects with clear acceptance criteria |
| Project research | Investigating libraries, patterns, and approaches before planning |
| Structured planning (PROJECT-PLAN.md) | Requirements, phases, acceptance criteria for the current project |
| Scope validation | "This is too big to verify in one commit" warnings |
| Execution with ordered steps | Executing phases in dependency order |
| Verification | Checking the result against the project's acceptance criteria |
| Todos (as a parking lot) | Semi-durable state for deferred scope and gotchas |

## What We Remove

| Capability | Why It Goes |
|-----------|-------------|
| ROADMAP.md | Human owns the roadmap |
| STATE.md | No cross-session memory — each session starts fresh |
| MILESTONES.md | Human tracks milestones |
| PROJECT.md (GSD's persistent version) | GSD's PROJECT.md was persistent project metadata maintained across sessions. Our PROJECT.md is ephemeral — scoped to one commit, created by `/new-project`, discarded after commit. Same filename, completely different lifecycle. |
| REQUIREMENTS.md (persistent) | Requirements are defined per-project during intake, not maintained in a living doc |
| config.json | No persistent workflow configuration |
| Resume/pause files | Sessions are self-contained |
| Auto-advance between phases | Human decides what's next |
| All git operations | Human reviews, stages, and commits |
| Multi-phase project orchestration | One project at a time, human-scoped |

## Codebase Mapping — Commit-Anchored

The map is a **versioned snapshot** tied to a specific git commit SHA.

- Map file stores the commit SHA it was generated at
- On new project, compare stored SHA against HEAD
- If they match: map is fresh, skip regeneration
- If they diverge: map is stale — AI reports staleness and recommends regenerating before planning. Human decides.
- After project execution + human commits: regenerate to capture what changed
- Persists between sessions (gitignored) for speed
- Handles external changes (manual edits, other contributors) automatically — the SHA is the single source of truth

## Project Intake — Requirements Conversation

Before any planning happens, the AI sharpens the project:

1. Human describes the project (however loosely — "add a way for users to save stuff")
2. AI checks codebase map staleness — if stale, asks human whether to regenerate before proceeding. Human decides.
3. AI evaluates whether this is a trivial fix (if so, deflects — see Quick Resolutions)
4. AI analyzes the request for ambiguity, open questions, edge cases, missing context
5. Back-and-forth conversation until all questions are resolved
6. AI validates scope against the verifiability principle — is this one commit's worth of work? Considers interaction density, risk factor, and change category (greenfield/mechanical/brownfield). If too broad, recommends scoping down and defers the rest to todos.
7. AI summarizes the project and proposed acceptance criteria in conversation
8. Human confirms or adjusts
9. Only after confirmation: PROJECT.md is written

The AI's role here is adversarial in a helpful way — poke holes, surface edge cases, ask "what happens when X," flag scope creep. The human answers. When the AI has no more questions and the scope passes the verifiability check, the project is well-defined enough to lock.

Acceptance criteria come from this conversation, not from a template. If the human brings detailed criteria, the AI mostly uses theirs. If the human brings a one-liner, the AI proposes criteria for approval.

## Scope Warnings — Verifiability-Based

Scope warnings are **soft**, not hard blocks. The metric isn't file count or lines of code — it's **verifiability**: can the human look at a single diff and confidently say "this works"?

Two factors determine verifiability:

- **Interaction density** — How many existing behaviors does this change touch or depend on? Isolated additions are easy to verify. Changes to interacting business rules compound in ways that are hard to trace in a diff.
- **Risk factor** — What's the cost of a subtle bug? A broken test helper is low-risk. Incorrect pricing logic costs money.

Three categories of work, each with different verifiability characteristics:

**Greenfield** — Building something new where nothing exists. No existing code to conflict with. Generally highly verifiable — the diff can be read in isolation.
- *One project:* Add a test suite for existing models — many files, but each test is independently verifiable.
- *One project:* Add a new CRUD resource (migration, model, controller, routes, views) — well-understood pattern, easy to trace through.

**Mechanical** — Repetitive changes following a single pattern. Highly verifiable — if one instance is correct, they're all correct.
- *One project:* Swap out a mailer gem — mechanical replacement across the codebase, verify it sends.
- *One project:* Rename a model and update all references — tedious but uniform.

**Brownfield** — Modifying or extending existing code. Verifiability depends on interaction density and risk. This is where scope discipline matters most.
- *One project:* Add a new field to an existing form with simple validation — low interaction density, extends an existing pattern.
- *Too broad:* Add multi-currency pricing with tax calculations — many interacting rules, edge cases compound, high risk. Scope down to one currency first.
- *Too broad:* Add authentication + authorization + user roles — three distinct behavioral systems, each needs its own verification pass.
- *Too broad:* Refactor the order pipeline + add a new payment provider — two unrelated concerns bundled together.

Greenfield and mechanical changes can be larger projects. Brownfield changes involving complex interactions should be smaller. When in doubt, ask: "Can I read this diff and confidently say it's correct without running every edge case in my head?"

If the project is too broad to verify cleanly:
- AI recommends starting with the most foundational piece
- Remaining pieces become todos (the human's parking lot, not the AI's backlog)
- Example: "Build an app that does X, Y, Z" → "Let's start with X. I've added todos for Y and Z."

## Todos — The Human's Parking Lot

Todos are semi-durable state. They serve three purposes:

1. **Deferred scope** — When a project is scoped down, the deferred parts don't disappear. "Y and Z" get captured so the human doesn't have to hold them in their head.
2. **Gotcha cache** — During planning, if the AI notices "when we build X, we'll need to account for Y later, so let's structure this interface accordingly" — that gets noted on the Y todo.
3. **Contextual memory** — During `/new-project` and `/discuss-project`, the AI surfaces relevant todos that overlap with the new project. If they fit within the project's verifiability scope, they're folded into acceptance criteria. If they'd push past verifiability, they stay in the parking lot — the AI notes the overlap but doesn't expand scope.

**Format**: Minimal frontmatter for searchability, freeform prose body.
```yaml
---
area: payments
created: 2026-02-22
---
Consider rate limiting on the webhook endpoint when we add Stripe integration.
```
`area` enables matching todos against a new project's domain. `created` enables staleness detection. No status, no priority, no assignee.

Todos are:
- Created by the AI during `/new-project` and `/plan-project` when scope is shaved to maintain verifiability. AI proposes the todo, human confirms before it's written.
- Surfaced by the AI during `/new-project` and `/discuss-project` when relevant to the current project
- **Not lifecycle-managed by the AI** — human decides what to pick up, delete, or ignore. No `todo complete` command.
- One file per todo in `.planning/todos/`

## Command Surface

Two levels: project commands own scope and requirements, phase commands own implementation discipline.

### Project-Level Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/new-project` | 1 (required) | Describe what you want. AI validates scope, sharpens into PROJECT.md with acceptance criteria. Human confirms before write. |
| `/research-project` | 2 (optional) | Deep research before discussion/planning. Library choices, ecosystem patterns. Research informs discussion. |
| `/discuss-project` | 3 (optional) | Deeper exploration. Gray areas, edge cases, implementation preferences. Can reference PROJECT-RESEARCH.md. |
| `/plan-project` | 4 (required) | Break project into phases (strategic). Ends with handoff reminder to start phase 1. |
| `/verify-project` | after execution | Check result against project-level acceptance criteria. |

### Phase-Level Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/discuss-phase N` | 1 (optional) | Clarify implementation decisions for phase N. |
| `/research-phase N` | 2 (optional) | Tactical research — implementation details, gotchas, patterns specific to this phase. |
| `/plan-phase N` | 3 (required) | Produce detailed execution plan for phase N (`PHASE-{N}-PLAN.md`). |
| `/execute-phase N` | 4 (required) | Execute phase N. Changes remain unstaged. No commits — ever. |
| `/verify-phase N` | 5 (required) | Verify phase N against must_haves. On pass, stages the executor's changes (`git add`). On fail, reports diagnostics — human decides next step. |

### Utility Commands

| Command | Purpose |
|---------|---------|
| `/map` | Analyze the codebase, anchored to current commit SHA. |
| `/todo` | View parking lot items. |

### Execution Context

Each command runs either in the **main conversation** (can interact with the human) or as a **subagent** (reads from files, writes to files, no mid-execution interaction).

| Command | Context | Why |
|---------|---------|-----|
| `/new-project` | Main | Needs back-and-forth with human to sharpen requirements. |
| `/discuss-project` | Main | Conversational by nature. |
| `/discuss-phase N` | Main | Conversational by nature. |
| `/research-project` | Subagent | No human interaction needed. Reads PROJECT.md, writes PROJECT-RESEARCH.md. |
| `/plan-project` | Subagent | Reads files, produces project-level plan (PROJECT-PLAN.md). Human approves the output, not the process. |
| `/research-phase N` | Subagent | Tactical research for a specific phase. Reads PROJECT-PLAN.md, codebase. Writes `PHASE-{N}-RESEARCH.md`. |
| `/plan-phase N` | Subagent | Reads PROJECT-PLAN.md, codebase, and phase research/context if they exist. Produces `PHASE-{N}-PLAN.md`. |
| `/execute-phase N` | Subagent | Reads phase plan, implements. Changes remain unstaged. On Rule 4 (architectural change): writes completed work to PROJECT-SUMMARY.md with status "Stopped (Rule 4)" and the architectural concern, then returns a message describing the problem. Human decides, then re-runs `/execute-phase N` (replays from scratch) or adjusts the plan. |
| `/verify-phase N` | Subagent | Reads PHASE-{N}-PLAN.md must_haves, checks the executor's work. On pass, stages the executor's changed files (`git add`). On fail, writes diagnostics — human decides. |
| `/verify-project` | Subagent | Reads files, runs tests, writes report. No interaction needed. |
| `/map` | Subagent | Codebase analysis. No interaction needed. |
| `/todo` | Main | Lightweight, conversational. |

### Hierarchy

Projects are **strategic** — what to build, why, and in what order. Phases are **tactical** — how to implement each piece correctly.

The **project** layer determines what to build and sorts work into phases (PROJECT-PLAN.md). The **phase** layer focuses on doing each implementation step correctly — detailed planning, following codebase conventions, applying best practices, or deliberately deviating where current conventions are inappropriate.

There is no `/execute-project`. The human walks through phases at their own pace. `/plan-project` ends with a handoff reminder:

```
Planning complete. 3 phases identified.

Phase 1: Create migration and model
Phase 2: Add controller and routes
Phase 3: Update views

Next: /discuss-phase 1, /research-phase 1, or /plan-phase 1
```

## Session Lifecycle

```
Human describes what they want to do
  → /new-project "add bookmarking for users"
      → Checks codebase map staleness (stale? asks human whether to regenerate)
      → Surfaces relevant todos from parking lot
      → AI asks clarifying questions
      → Back-and-forth until no open questions remain
      → Scope check: is this verifiable in one commit? (interaction density, risk, category)
      → If too broad: recommend scoping down, defer rest to /todo
      → AI summarizes project and proposed acceptance criteria
      → Human confirms
      → PROJECT.md written
  → /research-project (optional, if unfamiliar libraries/patterns)
  → /discuss-project (optional, if project needs deeper exploration — can reference PROJECT-RESEARCH.md)
  → /plan-project
      → AI produces phased implementation plan (strategic)
      → Human approves or adjusts
      → Ends with: "Planning complete. Next: /discuss-phase 1, /research-phase 1, or /plan-phase 1"
  → For each phase:
      → /discuss-phase N (optional, clarify implementation decisions)
      → /research-phase N (optional, tactical research — implementation details, gotchas)
      → /plan-phase N
          → AI produces detailed execution plan for this phase
          → Reads PROJECT-PLAN.md, codebase map, PHASE-{N}-CONTEXT.md and PHASE-{N}-RESEARCH.md if they exist
          → Outputs PHASE-{N}-PLAN.md with tasks, steps, expected outputs
      → /execute-phase N
          → AI implements according to phase plan
          → On success: PROJECT-SUMMARY.md updated, changes remain unstaged
          → On failure: unstaged partial changes; re-run replays from scratch
          → No commits — ever.
      → /verify-phase N
          → Separate agent checks executor's work against must_haves
          → On pass: stages the executor's changed files (git add)
          → On fail: reports diagnostics, human decides next step
      → Human can review: git diff (current phase) vs git diff --cached (prior phases)
      → Human decides: next phase, or pause and review
  → /verify-project
      → AI checks result against PROJECT.md acceptance criteria
      → Reports pass/fail with diagnostics per criterion
      → If failures: points you to specific files/lines, then stops
  → Human reviews diff, tests, commits
  → /map (regenerate post-commit to update codebase understanding)
```

## Files That Exist

All in `.planning/` (gitignored). Two subdirectories separate durable state from ephemeral project work.

```
.planning/
├── CODEBASE.md              # semi-durable — codebase map with commit SHA anchor
├── todos/                   # semi-durable — parking lot items, one file per todo
│   └── *.md
└── project/                 # ephemeral — everything for the current project
    ├── PROJECT.md           # sharpened description and acceptance criteria (from /new-project)
    ├── PROJECT-PLAN.md      # phased implementation plan (from /plan-project)
    ├── PROJECT-SUMMARY.md   # running log of what the executor did (from /execute-phase)
    ├── PROJECT-VERIFICATION.md  # pass/fail per criterion (from /verify-project)
    ├── PROJECT-RESEARCH.md  # research notes (from /research-project, optional)
    ├── PHASE-{N}-CONTEXT.md # implementation decisions (from /discuss-phase N)
    ├── PHASE-{N}-RESEARCH.md # tactical research notes (from /research-phase N)
    └── PHASE-{N}-PLAN.md    # phase execution details (from /plan-phase N)
```

**Directory lifecycle**: `todos/` and `CODEBASE.md` persist across projects. `project/` is ephemeral — `/new-project` wipes it with `rm -rf .planning/project/` and recreates it. No file-by-file cleanup, no stale artifact risk. Between projects, the directory either doesn't exist or contains leftovers from the last project — either way, `/new-project` handles it.

**Naming convention**: All project-level files are prefixed `PROJECT-`. All phase-level files are prefixed `PHASE-{N}-`. No ambiguity about scope.

**Frontmatter rule**: Files consumed programmatically by agents (PROJECT-PLAN.md, PHASE-{N}-PLAN.md) use YAML frontmatter for structured metadata. Files that are human-facing conversation output (PROJECT.md, PROJECT-SUMMARY.md, PROJECT-VERIFICATION.md) use plain markdown, no frontmatter. Phase context and research files (PHASE-{N}-CONTEXT.md, PHASE-{N}-RESEARCH.md) use section headings and XML tags for structure, not frontmatter.

`PROJECT-PLAN.md` is the project-level (strategic) plan — phases, their order, acceptance criteria mapping. `PHASE-{N}-PLAN.md` files are phase-level (tactical) plans — tasks, steps, expected outputs. The executor reads the phase-level plan; `/verify-project` reads the project-level plan.

### Format: PROJECT.md (human-facing, plain markdown)

PROJECT.md is conversation output — the result of `/new-project` sharpening a vague idea into a defined project. It is not parsed by agents. Agents read it as prose context, the same way they read source code comments. No frontmatter, no XML tags, no structured fields. Format shown in Gap 3.

### Format: PROJECT-PLAN.md (agent-consumed, structured)

Produced by `/plan-project`. Consumed by `/plan-phase N` (to understand phase scope and ordering), `/verify-project` (to map acceptance criteria to phases), and the human (to decide which phase to work on next).

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
**Goal**: [Outcome-shaped, not task-shaped — what is true when this phase is done]
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
| AC-3 | 2 | [Short description] |
| AC-4 | 2 | [Short description] |

**Coverage**: All [N] acceptance criteria mapped. No orphans.
```

Frontmatter is minimal — just enough for tooling to validate structure without reading the full document. The criteria mapping table is the key structural element: it lets the verifier check coverage (every criterion appears in at least one phase) and lets `/plan-phase N` know exactly which criteria it's responsible for.

`AC-N` identifiers are assigned by `/plan-project` based on the acceptance criteria listed in PROJECT.md. They are local to this project — not persistent IDs.

### Format: PHASE-{N}-PLAN.md (agent-consumed, structured)

Produced by `/plan-phase N`. Consumed by `/execute-phase N`. This is the executor's instruction set.

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
[What this phase accomplishes — one paragraph. References the phase goal from PROJECT-PLAN.md.]
</objective>

<context>
@.planning/project/PROJECT.md
@.planning/CODEBASE.md
@src/relevant/file.rb
</context>

<tasks>

<task>
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext, another/file.ext</files>
  <action>[Specific implementation — what to do, how to do it, what to avoid and WHY]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria for this task]</done>
</task>

<task>
  <name>Task 2: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[Specific implementation details]</action>
  <verify>[Command or check]</verify>
  <done>[Measurable acceptance criteria]</done>
</task>

</tasks>

<verification>
- [ ] [Specific test command that must pass]
- [ ] [Build/lint/typecheck that must pass]
- [ ] [Behavioral check — "visiting /path shows X"]
</verification>
```

Frontmatter fields:
- `phase` — phase number, matches PROJECT-PLAN.md
- `type` — `execute` for standard implementation, `tdd` for test-driven (RED/GREEN/REFACTOR cycle)
- `acceptance_criteria` — which AC-N items from PROJECT-PLAN.md this phase addresses
- `files_modified` — expected files to be touched (for the human's awareness, not for parallelization — one plan per phase)
- `must_haves.truths` — observable behaviors the verifier checks after execution
- `must_haves.artifacts` — files that must exist with real implementation (not stubs)

Body structure:
- `<objective>` — what and why, tied to PROJECT-PLAN.md phase goal
- `<context>` — @file references the executor should read before starting. Includes PROJECT.md (for acceptance criteria prose), CODEBASE.md (for codebase understanding), and relevant source files
- `<tasks>` — ordered list of implementation steps. Each task has: name (action-oriented), files (what it touches), action (how to implement), verify (how to check), done (when this task is complete)
- `<verification>` — phase-level checks run after all tasks complete. These validate the phase as a whole, not individual tasks.

No checkpoint tasks — decisions belong in `/discuss-phase`, not mid-execution. No `wave` or `depends_on` — one plan per phase, no parallelization. No `<execution_context>` or `<output>` sections — the executor knows its own workflow.

### Format: PHASE-{N}-RESEARCH.md (agent-consumed, XML-tagged sections)

Produced by `/research-phase N`. Consumed by `/plan-phase N`. Tactical research — narrow, prescriptive, implementation-focused. Honors locked decisions from PHASE-{N}-CONTEXT.md if `/discuss-phase` was run. Adapted from GSD's phase research template with lighter touch for smaller phase scope.

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

XML tags enable the planner to reference specific sections (e.g., `<user_constraints>` feeds directly into plan constraints, `<standard_stack>` informs library choices in task actions). The phase researcher populates `<user_constraints>` from PHASE-{N}-CONTEXT.md if it exists — this is how `/discuss-phase` decisions flow through to the plan without the planner needing to read the context file directly.

## Implementation Approach

Work within the existing fork. Three categories of work:

### 1. Build new (project commands)
- Create `/new-project` command + workflow — conversational requirements sharpening (see Gap 3)
- Create `/discuss-project` command + workflow — deeper project exploration
- Create `/plan-project` command + workflow — break project into phases, scope check, handoff reminder
- Create `/verify-project` command + workflow — diagnostic verification against acceptance criteria
- Create `/research-project` command + workflow — optional deep research before planning

### 2. Modify surviving files (6 agents, ~11 commands/workflows, references, templates)
- **Executor** (`gsd-executor.md`, `execute-phase.md`) — strip git, state, continuation agents, checkpoints; single project-level PROJECT-SUMMARY.md (see Gap 2)
- **Planner** (`gsd-planner.md`, `plan-phase.md`) — reframe for task-phase planning; fewer/smaller phases as units of implementation discipline
- **Plan checker** (`gsd-plan-checker.md`) — scope warnings based on verifiability; recommend scope reduction, defer to todos
- **Verifier** (`gsd-verifier.md`) — strip gap-closure loop; report + diagnostics only (see Gap 4)
- **Codebase mapper** (`gsd-codebase-mapper.md`, `map-codebase.md`) — add commit SHA anchoring
- **Phase discussion** (`discuss-phase.md`) — strip roadmap/state dependencies
- **Checkpoints reference** (`checkpoints.md`) — delete (checkpoints removed)
- **Templates** — simplify summary template, adapt verification report for project scope
- **All surviving agents** — strip `gsd-tools.cjs` calls; use native tools (Read, Write, Glob, Grep, Bash). Add `gsd-tools.cjs` commands only if an agent genuinely needs them (see Gap 1).

### 3. Delete (~55 files)
- 4 agents: `gsd-project-researcher`, `gsd-research-synthesizer`, `gsd-roadmapper`, `gsd-integration-checker`
- 19 commands + their corresponding workflows: everything tied to projects, milestones, roadmap lifecycle, resume/pause, auto-advance, settings
- 5 references: git integration, continuation format, decimal phases, planning config, git planning commit
- ~10 templates: project, requirements, roadmap, state, milestones, config, continue-here, research-project

See Gap 5 for the complete file-level disposition table.

## Open Gaps — To Resolve Before Implementation

### Gap 1: `gsd-tools.cjs` Dependency

**Decision**: Don't pre-spec `gsd-tools.cjs`. Build the agents first using Claude's native tools (Read, Write, Glob, Grep, Bash, WebSearch). Add tool commands to `gsd-tools.cjs` only when an agent genuinely can't do something with native tools.

GSD's original `gsd-tools.cjs` was ~5,000 lines across 11 modules because GSD was complex — state management, roadmap parsing, milestone tracking, cross-session context assembly. Our model has 1-2 phases, flat files, no state, and no cross-session concerns. Most of what the old tool did is either removed (state, roadmap, milestones) or trivially handled by an agent reading files it can already read (frontmatter parsing, phase listing, todo searching).

**Hard cutover**: The original `gsd-tools.cjs` is renamed (e.g., `gsd-tools.cjs.old`) during development as a read-only reference, then deleted when implementation is complete. If `gsd-tools.cjs` is needed, it's written from scratch with only the commands that agents actually require. It may end up small or may not exist at all.

**Likely survivors** (commands that might earn their keep):
- `resolve-model` — agent model selection logic is fiddly and shared across commands
- Project scaffolding — `rm -rf .planning/project/ && mkdir -p .planning/project/ .planning/todos/` could live in a tool or in a bash one-liner; TBD

Everything else — frontmatter parsing, template filling, plan validation, phase listing, todo searching — is an agent reading files it can already read. Don't build tools for things Claude does natively.

**Status**: Resolved

### Gap 2: Executor Flow After Gutting

**Decision**: Simplified executor retains step execution, deviation handling, and summary generation. Removes all git operations (including staging), state management, roadmap updates, and continuation agent handoffs. The executor never verifies or stages its own work — a separate verify-phase agent handles that.

**Simplified executor flow**:

1. **Bootstrap** — read PROJECT.md (acceptance criteria from `/new-project`), load the phase plan from `/plan-phase N`, read codebase map for context, read `PHASE-{N}-CONTEXT.md` if `/discuss-phase` was run
2. **Load phase plan** — parse frontmatter, enumerate tasks in execution order
3. **For each task in the phase plan**:
   - Execute tasks in order
   - Apply deviation rules (unchanged from GSD):
     - Rule 1: Auto-fix bugs
     - Rule 2: Auto-add missing critical functionality (security, validation)
     - Rule 3: Auto-fix blocking issues
     - Rule 4: Architectural change needed — stop (see below)
   - Track what was done, what deviated, what decisions were made
   - **Rule 4 termination**: When Rule 4 fires, the executor stops immediately. It writes completed work to PROJECT-SUMMARY.md with status "Stopped (Rule 4)" documenting: what task triggered it, what architectural concern was found, what's already done. Then it returns a message to the outer conversation describing the problem. No continuation, no resume — re-running `/execute-phase N` replays from scratch.
4. **Update PROJECT-SUMMARY.md** — single project-level document. Each `/execute-phase` appends to this file (overwrites on re-run of same phase). Running log of completed phases, files changed, deviations, decisions. Serves as the AI's accounting of "here's what I changed and why" for the human reviewing the diff.
5. **Report completion** — tell the human what was done, list files touched. All changes remain unstaged. The executor does not verify or stage its own work — that's the verify-phase agent's job.

**What transfers from GSD executor unchanged**:
- Deviation rules (Rules 1-4, scope boundary, fix attempt limit)
- Authentication gates (stop for human action)
- TDD flow (RED/GREEN/REFACTOR — same cycle, no commits between steps)
- Step execution logic

**What is removed from GSD executor**:
- `task_commit_protocol` — no per-step commits
- `state_updates` — no STATE.md, no ROADMAP.md, no requirements marking
- `final_commit` — no metadata commit
- `auto_mode_detection` — no auto-advance
- `continuation_handling` — no continuation agents
- `checkpoint_handling` — no checkpoints; decisions belong in discuss steps, not mid-execution
- Self-check and staging — moved to verify-phase agent
- Commit hash tracking in summaries and self-checks
- Per-phase PROJECT-SUMMARY.md — replaced by single project-level PROJECT-SUMMARY.md

**Why context rot is less of a risk**: The executor runs within a single session against a scope bounded to one commit's worth of work. There are fewer phases, they're smaller, and nothing is lost between sessions. The summary aids verification and diff review, not future-agent context loading.

**Status**: Resolved

### Gap 3: Project Commands — Mechanical Spec

**Decision**: The original single `/task` concept is replaced by a proper project-level command surface: `/new-project`, `/research-project`, `/discuss-project`, `/plan-project`, `/verify-project`. The canonical order is: new → research → discuss → plan. These are modeled after GSD's existing phase commands but scoped to project-level concerns (what and why) rather than phase-level concerns (how and how well).

**`/new-project`** — Project intake, scope validation, and requirements sharpening
- **Ancestor**: No direct GSD equivalent. Closest is `/gsd:new-project` but much simpler.
- **Conversation style**: Main conversation context (not subagent). The human describes what they want, the AI asks clarifying questions, back-and-forth until no open questions remain. Freeform conversation, not structured multiple-choice — better for articulating fuzzy problems.
- **Scope gate**: Before writing PROJECT.md, the AI validates scope against the verifiability principle — interaction density, risk factor, change category (greenfield/mechanical/brownfield). If too broad, recommends scoping down and defers the rest to todos.
- **Handoff**: When the AI has no remaining questions and scope passes, it summarizes the project and proposed acceptance criteria in conversation. The human confirms or adjusts. PROJECT.md is written only after confirmation.
- **Output**: PROJECT.md written to `.planning/project/`.
- **"Locked" means**: PROJECT.md exists and `/plan-project` reads it. No enforcement mechanism. To change the project, run `/new-project` again — it overwrites. The AI won't proceed to planning until this document exists.
- **Cancellation**: Nothing was written. No cleanup needed. Human just stops and does something else.
- **Re-run**: If existing project artifacts are found, warns the human: "You have an existing project in progress: [name]. Planning artifacts will be wiped. Staged/unstaged code changes in your working tree are untouched. Continue?" On confirmation, wipes `.planning/project/` and starts fresh. On decline, stops — human can finish the existing project first.

**PROJECT.md format**:
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

No frontmatter, no metadata, no phase numbering. Just the output of the conversation.

**`/research-project`** — Optional deep research
- **Agent**: `gsd-project-researcher.md` (modified). Strategic research — broad, exploratory. Separate agent from phase researcher to keep prompts focused and reliable.
- **Ancestor**: GSD's `gsd-project-researcher.md`, rewritten. GSD's version output 5 parallel files fed into a synthesizer agent. Ours outputs a single `PROJECT-RESEARCH.md` directly — no synthesizer needed.
- **When to use**: After `/new-project`, before `/discuss-project`. When the project involves unfamiliar libraries, patterns, or ecosystem decisions. Research informs discussion — do this first so decisions are grounded in what's actually available.
- **Methodology**: Web search + codebase analysis. Investigates external libraries/patterns and how they'd fit into this codebase.
- **Output**: `.planning/project/PROJECT-RESEARCH.md`. Strategic research — what libraries/patterns exist, how they compare, which fit this codebase, what to watch out for. Consolidates GSD's 5-file parallel output (SUMMARY, STACK, ARCHITECTURE, PITFALLS, FEATURES) into a single document.
- **Consumption**: `/discuss-project` and `/plan-project` read PROJECT-RESEARCH.md as additional context alongside PROJECT.md and CODEBASE.md.

**PROJECT-RESEARCH.md format** (no frontmatter — human-facing research output):
```markdown
# Project Research: [Short name]

**Domain:** [primary technology/problem domain]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Summary

[2-3 paragraph executive summary. What was researched, what the standard approach is, key recommendations.]

**Primary recommendation:** [one-liner actionable guidance]

## Recommended Stack

### Core
| Technology | Purpose | Why Recommended |
|------------|---------|-----------------|
| [name] | [what it does] | [why experts use it] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| [standard] | [alternative] | [when alternative makes sense] |

## Architecture Approach

[1-2 paragraphs on standard architecture for this domain]

### Key Patterns
- **[Pattern]:** [what, when, why]

### Anti-Patterns to Avoid
- **[Anti-pattern]:** [why it's bad, what to do instead]

## Critical Pitfalls

### [Pitfall Name]
**What goes wrong:** [description]
**How to avoid:** [prevention strategy]
**Warning signs:** [early detection]

[Repeat for each major pitfall]

## Open Questions

[Things that couldn't be fully resolved — how to handle during planning/execution]

## Sources

### Primary (HIGH confidence)
- [Official docs, verified sources]

### Secondary (MEDIUM confidence)
- [Community consensus, multiple sources agree]
```

**`/discuss-project`** — Optional deeper exploration
- **Ancestor**: `/gsd:discuss-phase` adapted for project-level scope.
- **When to use**: After `/new-project` (and optionally `/research-project`). When the project needs more exploration — gray areas, edge cases, implementation preferences. Can reference PROJECT-RESEARCH.md if research was run.
- **Difference from `/new-project`**: `/new-project` goes from zero to a defined project. `/discuss-project` takes an existing PROJECT.md and digs deeper.
- **Output**: Updates PROJECT.md with additional decisions and context. AI summarizes proposed changes, human confirms before PROJECT.md is rewritten.
- **After planning**: If PROJECT-PLAN.md already exists, `/discuss-project` warns that changes may invalidate the plan. PROJECT.md is updated; the human decides whether to re-run `/plan-project`.

**`/plan-project`** — Break project into phases (strategic)
- **Ancestor**: `/gsd:plan-phase` adapted for project-level scope.
- **Reads**: PROJECT.md, codebase map, PROJECT-RESEARCH.md if it exists, todos for context.
- **Output**: PROJECT-PLAN.md — phases, their order, acceptance criteria mapping. Does NOT produce phase-level plans. Phase-level planning is tactical and handled by `/plan-phase N`.
- **Scope**: Scope validation already happened in `/new-project`. The planner trusts that PROJECT.md describes a verifiable commit.
- **Ends with**: Handoff reminder to start phase 1. Does NOT auto-advance.
- **No `/execute-project`**: The human walks through phases at their own pace using `/discuss-phase N`, `/plan-phase N`, and `/execute-phase N`.

**`/verify-project`** — Check result against acceptance criteria
- **Ancestor**: `/gsd:verify-work` adapted for project-level scope.
- **Methodology**: Three-layer verification:
  1. **Diff analysis** — Run `git diff` against HEAD to see exactly what changed. Verify changes align with acceptance criteria (no missing pieces, no unrelated changes).
  2. **Code reasoning** — Read the changed files and reason about whether the implementation satisfies each criterion. Check for correctness, edge cases, and consistency with codebase conventions.
  3. **Test suite** — Run the project's test suite. Test results feed into criterion assessment (a criterion that depends on behavior validated by tests inherits the test result).
- **Reads**: PROJECT.md acceptance criteria, PROJECT-SUMMARY.md, actual code via `git diff HEAD`.
- **Output**: PROJECT-VERIFICATION.md with pass/fail per criterion, including which layer surfaced each finding.
- **Runs after**: All phases complete, before human commits.

**Status**: Resolved

### Gap 4: `/verify` Failure Path

**Decision**: Verify reports and points you in the right direction. No automated fix loop. No re-execution.

When `/verify-project` finds failures:
- PROJECT-VERIFICATION.md lists pass/fail per acceptance criterion
- For each failure: what's wrong, why it's wrong, and where to look (specific files, line numbers, diagnostic context)
- Example: "Criterion 3 fails because the route isn't registered in the router. Check `config/routes.rb` line 42."
- The verifier then **stops**

The human decides what to do next:
- Fix it manually
- Re-run `/execute-phase N` for a specific phase
- Adjust the plan and re-execute
- Accept it as-is and commit anyway

GSD's automated gap-closure flow (identify failures → create fix plans → feed back into execution → re-verify) is removed entirely. The verifier is a diagnostic tool, not a fix-it loop.

**Status**: Resolved

### Gap 5: File-Level Disposition Table

**Decision**: Audit completed. High-level dispositions assigned. Detailed per-file modifications are implementation work — each file will be reviewed against the decisions in this document when it's time to modify it.

#### Agents (11 existing)

| File | Disposition | Notes |
|------|------------|-------|
| `gsd-executor.md` | **Modify** | Rewrite per Gap 2: strip git, state, continuation agents, checkpoints. Keep deviation rules, TDD minus commits. |
| `gsd-planner.md` | **Modify** | Reframe from GSD's project-phase to single-commit project-phase planning. Fewer/smaller phases as units of implementation discipline. |
| `gsd-plan-checker.md` | **Modify** | Scope warnings based on verifiability ("can you verify this in one diff?"), not file counts. Recommend scope reduction, defer to todos. |
| `gsd-verifier.md` | **Modify** | Strip gap-closure loop. Report pass/fail with diagnostics only (Gap 4). |
| `gsd-codebase-mapper.md` | **Modify** | Add commit SHA anchoring. Otherwise mostly intact. |
| `gsd-phase-researcher.md` | **Modify** | Tactical research agent for `/research-phase N`. Narrow, prescriptive — honors locked decisions from CONTEXT.md, produces task-ready output for the planner. Lighter touch for smaller phase scope. |
| `gsd-project-researcher.md` | **Modify** | Strategic research agent for `/research-project`. Rewrite from GSD's 5-file parallel output to single-file `PROJECT-RESEARCH.md`. Broad, exploratory — library choices, ecosystem patterns, architectural approaches. No locked decisions to honor (PROJECT.md is prose, not constraints). No synthesizer needed. |
| `gsd-debugger.md` | **Keep** | Useful when things go wrong. Orthogonal to our changes. |
| `gsd-research-synthesizer.md` | **Delete** | Synthesizes parallel project researchers. Project researcher now produces a single file directly. |
| `gsd-roadmapper.md` | **Delete** | Creates roadmaps. No roadmaps. |
| `gsd-integration-checker.md` | **Delete** | Cross-phase integration for multi-phase projects. Project-level verify handles this. |
| ~~project intake agent~~ | **N/A** | `/new-project` and `/discuss-project` behavior is defined in their command/workflow files, not a standalone agent. |

#### Commands (30 existing → ~15 kept/modified + 4 new)

**Keep and modify:**

| File | Becomes | Changes |
|------|---------|---------|
| `map-codebase.md` | `/map` | Add commit SHA staleness check |
| `discuss-phase.md` | `/discuss-phase N` | Strip roadmap/state dependencies |
| `execute-phase.md` | `/execute-phase N` | Strip git, state, auto-advance |
| `plan-phase.md` | `/plan-phase N` | Keep as standalone command. Tactical phase planning — produces `PHASE-{N}-PLAN.md`. |
| `research-phase.md` | `/research-phase N` | Keep as standalone command. Tactical phase-level research — implementation details, gotchas. Mirrors `/research-project` at phase level. |
| `check-todos.md` | `/todo` | Simplify — view parking lot items |
| `add-todo.md` | **Delete** | Todos are created by the AI during `/new-project` and `/plan-project` when scope is shaved. AI proposes, human confirms. No manual add command. |
| `debug.md` | `/debug` | Keep, orthogonal |
| `health.md` | `/health` | Adapt for simpler file structure |
| `cleanup.md` | **Delete** | Removed from scope |
| `help.md` | `/help` | Rewrite for new command surface |

**New commands:**

| Command | Purpose |
|---------|---------|
| `/new-project` | Project intake — sharpen vague idea into PROJECT.md |
| `/research-project` | Strategic research — library choices, ecosystem patterns, architectural approaches. Broad and exploratory. |
| `/discuss-project` | Deeper project exploration |
| `/plan-project` | Break project into phases, produce plan |
| `/verify-project` | Check result against project acceptance criteria |

**Delete (19 files):** `new-project`, `new-milestone`, `complete-milestone`, `audit-milestone`, `plan-milestone-gaps`, `add-phase`, `insert-phase`, `remove-phase`, `progress`, `pause-work`, `resume-work`, `quick`, `settings`, `set-profile`, `list-phase-assumptions`, `reapply-patches`, `update`, `join-discord`, `verify-work` (replaced by `/verify-project`)

**Note — command/workflow name mismatches**: Command and workflow filenames don't always correspond 1:1. Known mismatches: `debug.md` (command) → `diagnose-issues.md` (workflow), `resume-work.md` (command) → `resume-project.md` (workflow). `reapply-patches.md` and `join-discord.md` are commands with no workflow counterpart.

#### Workflows (32 existing — mirrors commands plus internal workflows)

Same disposition as corresponding commands, plus:

| File | Disposition | Notes |
|------|------------|-------|
| `execute-plan.md` | **Delete** | Multi-plan-per-phase inner loop. One plan per phase now — executor handles directly. |
| `transition.md` | **Delete** | Auto-advances between phases. Human drives transitions. |
| `verify-phase.md` | **Modify** | Required step after `/execute-phase N`. Separate agent verifies the executor's work against must_haves from PHASE-{N}-PLAN.md. On pass, stages the executor's changed files. On fail, reports diagnostics. The executor never verifies or stages its own work. |
| `discovery-phase.md` | **Keep/modify** | Lightweight research during planning. |
| `diagnose-issues.md` | **Keep** | Debugging support. |
| `resume-project.md` | **Delete** | No cross-session resume. |

#### References (13 files)

| File | Disposition | Notes |
|------|------------|-------|
| `checkpoints.md` | **Delete** | Checkpoints removed — decisions belong in discuss steps |
| `tdd.md` | **Keep** | TDD flow unchanged minus commits |
| `model-profile-resolution.md` | **Keep** | Agent model selection |
| `model-profiles.md` | **Keep** | Model configuration |
| `questioning.md` | **Keep** | Question design patterns for discuss steps |
| `verification-patterns.md` | **Keep** | Verification approach still applies |
| `phase-argument-parsing.md` | **Keep/simplify** | Still need to parse phase arguments |
| `ui-brand.md` | **Replace** | GSD branding → fork's own branding |
| `git-integration.md` | **Delete** | No git operations |
| `git-planning-commit.md` | **Delete** | No git operations |
| `continuation-format.md` | **Delete** | No continuation agents |
| `decimal-phase-calculation.md` | **Delete** | No inserting phases into roadmaps |
| `planning-config.md` | **Delete** | No persistent config |

#### Templates (25 files)

| File | Disposition | Notes |
|------|------------|-------|
| `summary.md` + variants | **Modify** | Single project-level summary, simpler format |
| `context.md` | **Keep** | discuss-phase still produces context |
| `codebase/` | **Keep** | Codebase mapping templates |
| `research.md` | **Replace** | GSD's phase-level research template. Replace with new tactical research template for `/research-phase N`. |
| `discovery.md` | **Keep** | Discovery output template |
| ~~`research-project/`~~ | **Replace** | GSD's project-level research template (5-file parallel output). Replace with new strategic research template for `/research-project`. Single file, not a directory. |
| `VALIDATION.md` | **Keep/modify** | Adapt for project scope |
| `user-setup.md` | **Keep** | Auth gates still need human setup docs |
| `verification-report.md` | **Modify** | Adapt for project-level verification |
| `DEBUG.md`, `UAT.md` | **Keep** | Debugging and testing templates |
| `phase-prompt.md` | **Review** | Subagent prompt — check applicability |
| `planner-subagent-prompt.md` | **Review** | Subagent prompt — check applicability |
| `debug-subagent-prompt.md` | **Review** | Subagent prompt — check applicability |
| `config.json` | **Delete** | No persistent config |
| `project.md` (GSD template) | **Delete** | GSD's persistent project template. Our PROJECT.md is ephemeral, generated by `/new-project`. |
| `requirements.md` | **Delete** | No persistent REQUIREMENTS.md |
| `roadmap.md` | **Delete** | No ROADMAP.md |
| `state.md` | **Delete** | No STATE.md |
| `milestone.md` + `milestone-archive.md` | **Delete** | No milestones |
| `continue-here.md` | **Delete** | No resume |

**Status**: Resolved — detailed per-file modifications happen during implementation, guided by this disposition table and the decisions in this document

## Quick Resolutions (Confirmed During Review)

- **Phases within a project**: Typically 1-2 phases, rarely more. One plan per phase. Planner should calibrate accordingly.
- **Research**: `/research-project` exists as an optional command. Not folded into `/plan-project` — kept separate so it can be skipped for familiar territory.
- **`/map` triggering**: Manual. "Auto-checks staleness" means it reports staleness, not that it silently regenerates.
- **Todo format**: One file per todo in `.planning/todos/`. Minimal YAML frontmatter (`area`, `created`) for searchability during `/new-project`. Freeform prose body. No status, priority, or assignee. AI creates and reads them; human manages lifecycle.
- **Namespace**: `/gsd:*` becomes bare commands (`/map`, `/new-project`, `/plan-project`, etc.).
- **Ephemeral file cleanup**: No cleanup command. `/new-project` wipes `.planning/project/` and recreates it. Between projects, the directory either doesn't exist or contains leftovers — either way, `/new-project` handles it.
- **Working tree safety**: The pipeline manages `.planning/` files only. It never commits, resets, checks out, stashes, or discards working tree content. The sole git operation allowed is `git add` (staging completed phase work). `/new-project` wipes planning artifacts but never touches code. If the human wants to discard code from a failed project, they do it themselves.
- **Git staging as checkpoints**: The executor never stages its own work. After execution, `/verify-phase N` checks the work against must_haves from the phase plan. On pass, the verifier stages the executor's changed files (`git add`). On fail, nothing is staged — the human decides what to do. This gives the human two views: `git diff` (current phase, unstaged) and `git diff --cached` (all verified phases). No commits ever — the human commits when ready, all staged work goes in one commit.
- **Changing direction mid-project**: Start over with `/new-project`. Planning artifacts are wiped; code in the working tree is untouched. To keep code from completed phases, commit first, then start a new project. To discard, reset the working tree yourself.
- **Phase re-run on failure**: Re-running `/execute-phase N` replays the entire phase from scratch. The executor does not attempt to detect or skip partially completed work. Partial unstaged changes from the failed run are overwritten. Prior phases' staged work is untouched. PROJECT-SUMMARY.md entry for the phase is overwritten, not duplicated.
- **PROJECT-SUMMARY.md format**: No frontmatter. Plain markdown. Each `/execute-phase` appends (or overwrites on re-run) a block per phase:
  ```
  ## Phase N: [Name]
  **Status:** Complete | Failed (step X)
  **Files changed:** [list]
  **Deviations:** [list or "None"]
  **Decisions:** [any runtime decisions made]
  **Notes:** [anything the human should know when reviewing the diff]
  ```
  The verifier reads this as prose context alongside `git diff` — no structured parsing needed.
- **Mid-execution plan change**: Start over. It's one commit's worth of work.
- **`/new-project` input quality gates**: `/new-project` evaluates input quality and responds accordingly. Garbage in, garbage out — the pipeline deserves disciplined input.
  - **Trivial fix** (typo, single-line bug, simple rename): Deflect. "This looks like a quick fix — just ask me directly, no project needed." Human can override.
  - **Vague one-liner** (no clear outcome, no describable scope): Deflect. "This isn't clear enough to plan against. Talk it through with me directly first, then run `/new-project` when you can describe what you want." The pipeline starts when the human has clarity, not before.
  - **Moderate input** (describable goal, some gaps): 3-5 clarifying questions. Sharpen scope, nail down acceptance criteria.
  - **Detailed input** (clear goal, mostly complete criteria): 1-3 clarifying questions. Confirm understanding, fill small gaps.
  - **No "just go with it"**: If the human tries to skip past unclear acceptance criteria, hold the line. PROJECT.md is not written until the criteria are clear enough to verify against. The entire pipeline depends on this — vague criteria produce vague plans, vague execution, and unverifiable results. Deflect: "I need clearer acceptance criteria before we can proceed. What specifically should be true when this is done?"
- **Command preconditions**: Each command checks prerequisites (e.g., `/plan-project` checks PROJECT.md exists, `/execute-phase N` checks PHASE-{N}-PLAN.md exists). Missing prerequisites → short error naming the missing step, not silent failure.
- **`/discuss-phase` output format**: `PHASE-{N}-CONTEXT.md` carries forward GSD's three decision categories unchanged: **Locked Decisions** (executor must follow), **Deferred Ideas** (fed into todos), **Discretion Areas** (executor can choose). These directly serve the executor by distinguishing what's fixed, what's flexible, and what to punt.
- **Scope signals**: The plan-checker uses proxy signals — number of behavioral changes, number of systems touched, whether the project crosses architectural boundaries — not file counts or line estimates. Soft heuristics, not hard limits.

## Open Questions

*None currently.*

## Resolved Questions

- **Checkpoints removed**: GSD's checkpoint system (human-verify, decision, human-action) is removed entirely. Decisions belong in `/discuss-project` and `/discuss-phase`, not mid-execution. If the executor needs to stop and ask the human, the project wasn't sufficiently scoped or discussed — that's the failure mode this fork exists to prevent. The executor runs the plan as written. If it hits something genuinely unexpected, deviation Rule 4 (architectural changes) already covers stopping and asking.
