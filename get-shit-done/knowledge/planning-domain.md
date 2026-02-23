# Planning Domain Knowledge

This document defines standards, methodologies, and constraints for breaking projects into phases and creating execution plans. Load this when operating in planning domain context (`/plan-project`, `/plan-phase N`).

## Overview

The planning domain covers the transformation from "here's what to build" (PROJECT.md) to "here's exactly how to build it" (PLAN.md files). The goal is creating executable specifications that Claude can implement without interpretation.

**When to load:** Planning commands that decompose projects into phases or create detailed execution plans.

---

<single_commit_scope>

## Single-Commit Scope Philosophy

A project is **one commit's worth of work.** That's the atomic unit. Everything AI planning does serves the goal of producing a clean, verifiable diff that the human reviews, tests, and commits.

### Vocabulary Mapping

| GSD Term | Single-Commit Term | Scope |
|----------|-------------------|-------|
| Project | Project | One commit's worth of work |
| Phase | Phase | Tactical subdivision of the project |
| Plan | Phase plan | Execution details for one phase |
| Milestone | N/A | The commit IS the milestone |

### What Changes from GSD

**Removed:**
- ROADMAP.md, STATE.md, MILESTONES.md (persistent tracking)
- config.json (runtime configuration)
- Resume/pause files (cross-session state)
- Auto-advance between phases
- Multi-phase project orchestration
- Checkpoints (decisions belong in `/discuss-project` and `/discuss-phase`)

**Reframed:**
- PROJECT.md is now ephemeral (scoped to one commit, created by `/new-project`, discarded after commit)
- Same filename as GSD, completely different lifecycle

**Philosophy:**
- Projects are **strategic** — what to build, why, and in what order
- Phases are **tactical** — how to implement each piece correctly
- Human drives all phase transitions; no auto-advance exists
- Planning artifacts are scratch work that serve the current project and are discarded after the human commits

### Project Scope

A project should be verifiable in a single diff review. The human should be able to look at the changes and confidently say "this works."

Typically 1-2 phases, rarely more. If decomposition yields 5+ phases, the project is likely too broad — recommend scoping down.

</single_commit_scope>

---

<phase_decomposition>

## Phase Decomposition

Phases are tactical subdivisions of a project. Each phase produces a coherent, verifiable unit of functionality.

### Strategic vs Tactical

**Strategic (project-level):**
- What to build
- Why it matters
- In what order
- What "done" looks like

**Tactical (phase-level):**
- How to implement
- What files to change
- What tests to write
- How to verify it works

### Phase Goals

Phase goals are **outcome-shaped**, not **task-shaped**.

| BAD (task-shaped) | GOOD (outcome-shaped) |
|-------------------|----------------------|
| "Build chat components" | "Working chat interface" |
| "Create database schema" | "User data persists across sessions" |
| "Add authentication" | "Users can securely log in and out" |

Outcome-shaped goals make verification obvious: either the outcome is true or it isn't.

### Vertical Slices vs Horizontal Layers

**Vertical slices (PREFER):**
Build complete features end-to-end.

```
Phase 1: User authentication (model + API + UI)
Phase 2: User profile (model + API + UI)
```

Result: Each phase is independently verifiable and shippable.

**Horizontal layers (AVOID unless necessary):**
Build across all features at once.

```
Phase 1: All database models
Phase 2: All API endpoints
Phase 3: All UI components
```

Result: Nothing works until all phases complete. High coupling, delayed verification.

**When horizontal layers are necessary:**
- Shared foundation required (auth before protected features)
- Genuine type dependencies across features
- Infrastructure setup (database, deployment config)

### Phase Sizing

Each phase should complete within a single execution session. Target 2-3 tasks per phase, 15-60 minutes Claude execution time per task.

If a phase requires 5+ tasks, split it into multiple phases.

</phase_decomposition>

---

<goal_backward>

## Goal-Backward Methodology

Traditional planning goes forward: "What should we build?" Goal-backward planning goes backward: "What must be TRUE for the goal to be achieved?"

### The Process

**Step 1: State the Goal**
Take phase goal from project plan. Must be outcome-shaped, not task-shaped.
- Good: "Working chat interface" (outcome)
- Bad: "Build chat components" (task)

**Step 2: Derive Observable Truths**
"What must be TRUE for this goal to be achieved?" List 3-7 truths from USER's perspective.

For "working chat interface":
- User can see existing messages
- User can type a new message
- User can send the message
- Sent message appears in the list
- Messages persist across page refresh

Test: Each truth verifiable by a human using the application.

**Step 3: Derive Required Artifacts**
For each truth: "What must EXIST for this to be true?"

"User can see existing messages" requires:
- Message list component (renders Message[])
- Messages state (loaded from somewhere)
- API route or data source (provides messages)
- Message type definition (shapes the data)

Test: Each artifact = a specific file or database object.

**Step 4: Derive Required Wiring**
For each artifact: "What must be CONNECTED for this to function?"

Message list component wiring:
- Imports Message type (not using `any`)
- Receives messages prop or fetches from API
- Maps over messages to render (not hardcoded)
- Handles empty state (not just crashes)

**Step 5: Identify Key Links**
"Where is this most likely to break?" Key links = critical connections where breakage causes cascading failures.

For chat interface:
- Input onSubmit -> API call (if broken: typing works but sending doesn't)
- API save -> database (if broken: appears to send but doesn't persist)
- Component -> real data (if broken: shows placeholder, not messages)

### Must-Haves Output Format

```yaml
must_haves:
  truths:
    - "User can see existing messages"
    - "User can send a message"
    - "Messages persist across refresh"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "Message list rendering"
      min_lines: 30
    - path: "src/app/api/chat/route.ts"
      provides: "Message CRUD operations"
      exports: ["GET", "POST"]
    - path: "prisma/schema.prisma"
      provides: "Message model"
      contains: "model Message"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/chat"
      via: "fetch in useEffect"
      pattern: "fetch.*api/chat"
    - from: "src/app/api/chat/route.ts"
      to: "prisma.message"
      via: "database query"
      pattern: "prisma\\.message\\.(find|create)"
```

### Common Failures

**Truths too vague:**
- Bad: "User can use chat"
- Good: "User can see messages", "User can send message", "Messages persist"

**Artifacts too abstract:**
- Bad: "Chat system", "Auth module"
- Good: "src/components/Chat.tsx", "src/app/api/auth/login/route.ts"

**Missing wiring:**
- Bad: Listing components without how they connect
- Good: "Chat.tsx fetches from /api/chat via useEffect on mount"

</goal_backward>

---

<context_budget>

## Context Budget and Quality

Plans should complete within ~50% context usage (not 80%). This prevents context anxiety and maintains quality from start to finish.

### Quality Degradation Curve

| Context Usage | Quality | Claude's State |
|---------------|---------|----------------|
| 0-30% | PEAK | Thorough, comprehensive |
| 30-50% | GOOD | Confident, solid work |
| 50-70% | DEGRADING | Efficiency mode begins |
| 70%+ | POOR | Rushed, minimal |

**Rule:** Plans should complete within ~50% context. More plans, smaller scope, consistent quality.

### One Plan Per Phase

**Each phase has exactly one plan (PHASE-{N}-PLAN.md).**
**Each plan: 2-5 tasks.**

| Phase Complexity | Tasks | Context/Task | Total |
|------------------|-------|--------------|-------|
| Simple (CRUD, config) | 2-3 | ~10-15% | ~30-45% |
| Complex (auth, payments) | 3-4 | ~15-20% | ~45-50% |
| Very complex (migrations) | 4-5 | ~10-15% | ~40-50% |

### Task Sizing

Each task: **15-60 minutes** Claude execution time.

| Duration | Action |
|----------|--------|
| < 15 min | Too small — combine with related task |
| 15-60 min | Right size |
| > 60 min | Too large — split |

**Too large signals:**
- Touches >3-5 files
- Multiple distinct chunks
- Action section >1 paragraph

**Combine signals:**
- One task sets up for the next
- Separate tasks touch same file
- Neither meaningful alone

### Context Per Task Estimates

| Files Modified | Context Impact |
|----------------|----------------|
| 0-3 files | ~10-15% (small) |
| 4-6 files | ~20-30% (medium) |
| 7+ files | ~40%+ (split) |

| Complexity | Context/Task |
|------------|--------------|
| Simple CRUD | ~15% |
| Business logic | ~25% |
| Complex algorithms | ~40% |
| Domain modeling | ~35% |

### TDD Context Budget

TDD plans target ~40% context (lower than standard 50%). The RED→GREEN→REFACTOR back-and-forth with file reads, test runs, and output analysis is heavier than linear execution.

</context_budget>

---

<tool_guidance>

## Native Tool Usage for Planning Domain

When operating in planning domain context, use Claude Code's native tools. NEVER use bash commands for file operations.

### Reading Context Files

Use the Read tool with absolute paths:

**Example:** Read PROJECT.md
```
Read tool with file_path: /absolute/path/to/.planning/project/PROJECT.md
```

**Example:** Read PROJECT-PLAN.md
```
Read tool with file_path: /absolute/path/to/.planning/project/PROJECT-PLAN.md
```

**Example:** Read prior phase research
```
Read tool with file_path: /absolute/path/to/.planning/project/PHASE-1-RESEARCH.md
```

### Writing Plan Files

Use the Write tool with absolute paths:

**Example:** Create phase plan
```
Write tool with file_path: /absolute/path/to/.planning/project/PHASE-1-PLAN.md
Write tool with content: [plan markdown with frontmatter]
```

### Finding Phase Files

Use Glob for pattern matching:

**Example:** Find all plan files
```
Glob tool with pattern: .planning/project/PHASE-*-PLAN.md
```

**Example:** Find summary files for a phase
```
Glob tool with pattern: .planning/project/PROJECT-SUMMARY.md
```

### Searching Codebase Patterns

Use Grep for content search:

**Example:** Find existing authentication patterns
```
Grep tool with pattern: authentication|auth
Grep tool with output_mode: files_with_matches
Grep tool with type: js
```

**Example:** Check for existing implementations
```
Grep tool with pattern: class UserModel
Grep tool with output_mode: content
```

### Checking Directory Structure

Use Bash for structural checks:

**Example:** Check if phase directory exists
```
Bash with command: [ -d .planning/project ] && echo "exists" || echo "missing"
```

**Example:** List phase directories
```
Bash with command: ls -1 .planning/project/
```

### Anti-Patterns (NEVER DO THIS)

**NEVER use bash for file operations:**
- `cat PLAN.md` — Use Read tool instead
- `grep pattern PLAN.md` — Use Grep tool instead
- `find . -name "*-PLAN.md"` — Use Glob tool instead
- `cat << 'EOF' > PLAN.md` — Use Write tool instead

**Why:** Native tools are optimized for Claude Code's environment, handle permissions correctly, and provide better error handling.

</tool_guidance>
