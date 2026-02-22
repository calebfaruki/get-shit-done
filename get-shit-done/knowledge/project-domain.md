# Project Domain Knowledge

This document defines patterns, heuristics, and standards for project intake, scope validation, and acceptance criteria sharpening. Load this when operating in project domain context (`/new-project`, `/discuss-project`, `/plan-project`).

## Overview

The project domain covers everything from "I have an idea" to "here's a locked PROJECT.md with clear acceptance criteria." The goal is transforming fuzzy requests into verifiable specifications that downstream phases can execute without interpretation.

**When to load:** Project-level commands that deal with requirements gathering, scope decisions, and acceptance criteria definition.

---

<intake>

## Intake Methodology

Project initialization is dream extraction, not requirements gathering. You're helping the user discover and articulate what they want to build. This isn't a contract negotiation — it's collaborative thinking.

### Philosophy

**You are a thinking partner, not an interviewer.**

The user often has a fuzzy idea. Your job is to help them sharpen it. Ask questions that make them think "oh, I hadn't considered that" or "yes, that's exactly what I mean."

Don't interrogate. Collaborate. Don't follow a script. Follow the thread.

### The Goal

By the end of questioning, you need enough clarity to write a PROJECT.md that downstream phases can act on:

- **Research** needs: what domain to research, what the user already knows, what unknowns exist
- **Planning** needs: clear enough vision to scope into a single commit, what "done" looks like
- **Execution** needs: success criteria to verify against, the "why" behind requirements

A vague PROJECT.md forces every downstream phase to guess. The cost compounds.

### How to Question

**Start open.** Let them dump their mental model. Don't interrupt with structure.

**Follow energy.** Whatever they emphasized, dig into that. What excited them? What problem sparked this?

**Challenge vagueness.** Never accept fuzzy answers. "Good" means what? "Users" means who? "Simple" means how?

**Make the abstract concrete.** "Walk me through using this." "What does that actually look like?"

**Clarify ambiguity.** "When you say Z, do you mean A or B?" "You mentioned X — tell me more."

**Know when to stop.** When you understand what they want, why they want it, who it's for, and what done looks like — offer to proceed.

### Question Types

Use these as inspiration, not a checklist. Pick what's relevant to the thread.

**Motivation — why this exists:**
- "What prompted this?"
- "What are you doing today that this replaces?"
- "What would you do if this existed?"

**Concreteness — what it actually is:**
- "Walk me through using this"
- "You said X — what does that actually look like?"
- "Give me an example"

**Clarification — what they mean:**
- "When you say Z, do you mean A or B?"
- "You mentioned X — tell me more about that"

**Success — how you'll know it's working:**
- "How will you know this is working?"
- "What does done look like?"

### Context Checklist

Use this as a **background checklist**, not a conversation structure. Check these mentally as you go. If gaps remain, weave questions naturally.

- [ ] What they're building (concrete enough to explain to a stranger)
- [ ] Why it needs to exist (the problem or desire driving it)
- [ ] Who it's for (even if just themselves)
- [ ] What "done" looks like (observable outcomes)

Four things. If they volunteer more, capture it.

### Decision Gate

When you could write a clear PROJECT.md, offer to proceed. If the user wants to keep exploring, ask what they want to add or identify gaps and probe naturally.

Loop until they confirm they're ready.

### Anti-Patterns

- **Checklist walking** — Going through domains regardless of what they said
- **Canned questions** — "What's your core value?" "What's out of scope?" regardless of context
- **Corporate speak** — "What are your success criteria?" "Who are your stakeholders?"
- **Interrogation** — Firing questions without building on answers
- **Rushing** — Minimizing questions to get to "the work"
- **Shallow acceptance** — Taking vague answers without probing
- **Premature constraints** — Asking about tech stack before understanding the idea
- **User skills** — NEVER ask about user's technical experience. Claude builds.

</intake>

---

<scope_validation>

## Scope and Verifiability

A project is **one commit's worth of work.** Scope warnings are **soft**, not hard blocks. The metric isn't file count or lines of code — it's **verifiability**: can the human look at a single diff and confidently say "this works"?

### Verifiability Factors

Two factors determine verifiability:

- **Interaction density** — How many existing behaviors does this change touch or depend on?
- **Risk factor** — What's the cost of a subtle bug?

### Three Categories of Work

**Greenfield** — Building something new where nothing exists. Generally highly verifiable — the diff can be read in isolation.
- *One commit:* Add a test suite for existing models — many files, but each test is independently verifiable.
- *One commit:* Add a new CRUD resource — well-understood pattern, easy to trace through.

**Mechanical** — Repetitive changes following a single pattern. Highly verifiable — if one instance is correct, they're all correct.
- *One commit:* Swap out a mailer gem — mechanical replacement across the codebase.
- *One commit:* Rename a model and update all references — tedious but uniform.

**Brownfield** — Modifying or extending existing code. Verifiability depends on interaction density and risk.
- *One commit:* Add a new field to an existing form with simple validation — low interaction density.
- *Too broad:* Add multi-currency pricing with tax calculations — many interacting rules, high risk.
- *Too broad:* Add authentication + authorization + user roles — three distinct systems.
- *Too broad:* Refactor the order pipeline + add a new payment provider — two unrelated concerns.

Greenfield and mechanical changes can be larger. Brownfield changes involving complex interactions should be smaller. When in doubt: "Can I read this diff and confidently say it's correct?"

### Scope Ownership

**`/new-project` performs the initial scope gate.** The plan-checker performs a secondary check during planning, using proxy signals:
- Number of behavioral changes
- Number of systems touched
- Whether the project crosses architectural boundaries

These are heuristics, not numeric rubrics.

### Scoping Down

If the project is too broad to verify cleanly, recommend starting with the most foundational piece and defer the rest to todos.

**Example:**
User wants: "Add authentication + authorization + user roles"

Scope down to: "Add JWT authentication with login/logout"
Defer to todos: "Add role-based authorization", "Add user profile management"

### Input Quality Gate

**Hard deflects** (no override):
- **Trivial fix** (typo, single-line bug, simple rename): "This is a quick fix — just ask me directly, no project needed."
- **Vague one-liner** (no clear outcome, no describable scope): "This isn't clear enough to plan against. Talk it through with me first, then run `/new-project` when you can describe what you want."

**Proceed with sharpening**:
- **Moderate input** (describable goal, some gaps): 3-5 clarifying questions to sharpen scope and nail down acceptance criteria.
- **Detailed input** (clear goal, mostly complete criteria): 1-3 clarifying questions to confirm understanding and fill small gaps.

</scope_validation>

---

<acceptance_criteria>

## Acceptance Criteria Sharpening

Acceptance criteria come from conversation, not from templates. If the user brings detailed criteria, mostly use theirs. If the user brings a one-liner, propose criteria for approval.

### Criteria Patterns

**Good criteria:**
- Observable from the user's perspective
- Specific enough to verify against
- Measurable (can say "yes this is true" or "no it isn't")
- Complete (covers the full scope of "done")

**Examples:**

| TOO VAGUE | CONCRETE |
|-----------|----------|
| "Authentication works" | "Valid credentials return 200 + JWT cookie, invalid credentials return 401" |
| "Users can manage projects" | "User can create project with name/description, view project list, edit project details, delete project with confirmation" |
| "UI looks good" | "Dashboard uses grid layout (3 cols on lg, 1 on mobile), cards have shadows, action buttons show hover states" |
| "Error handling exists" | "API errors (4xx/5xx) display toast messages via sonner, network failures show retry button" |

### Sharpening Process

1. **Extract observables** — What can you see, click, or test?
2. **Make specific** — Replace "good", "fast", "simple" with measurable terms
3. **Cover happy and sad paths** — What happens when things go right? When they go wrong?
4. **Confirm completeness** — Does this cover everything in scope? Anything missing?

### Out of Scope

When scoping down, capture deferred items explicitly:

```markdown
## Out of Scope
- Role-based authorization (todo: AUTH-ROLES)
- User profile editing (todo: USER-PROFILE)
- Password reset flow (todo: AUTH-RESET)
```

These become todos that can be folded into future projects.

### PROJECT.md Structure

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

PROJECT.md is not written until the criteria are clear enough to verify against.

</acceptance_criteria>

---

<tool_guidance>

## Native Tool Usage for Project Domain

When operating in project domain context, use Claude Code's native tools. NEVER use bash commands for file operations.

### Reading Files

Use the Read tool with absolute paths:

**Example:** Read PROJECT.md
```
Read tool with file_path: /absolute/path/to/.planning/project/PROJECT.md
```

### Writing Files

Use the Write tool with absolute paths:

**Example:** Create PROJECT.md
```
Write tool with file_path: /absolute/path/to/.planning/project/PROJECT.md
Write tool with content: [markdown content]
```

### Finding Files

Use Glob for pattern matching:

**Example:** Find all markdown files
```
Glob tool with pattern: **/*.md
```

**Example:** Find todos
```
Glob tool with pattern: .planning/todos/*.md
```

### Searching Content

Use Grep for content search:

**Example:** Find authentication references
```
Grep tool with pattern: authentication
Grep tool with output_mode: files_with_matches
```

**Example:** Search for specific patterns
```
Grep tool with pattern: TODO|FIXME
Grep tool with output_mode: content
```

### Checking Prerequisites

Use Bash for directory/file checks:

**Example:** Check if .planning exists
```
Bash with command: [ -d .planning/ ] && echo "exists" || echo "missing"
```

**Example:** Check if PROJECT.md exists
```
Bash with command: [ -f .planning/project/PROJECT.md ] && echo "exists" || echo "missing"
```

### Anti-Patterns (NEVER DO THIS)

**NEVER use bash for file operations:**
- `cat file.md` — Use Read tool instead
- `grep pattern file.md` — Use Grep tool instead
- `find . -name "*.md"` — Use Glob tool instead
- `echo "content" > file.md` — Use Write tool instead
- `cat << 'EOF' > file.md` — Use Write tool instead

**Why:** Native tools are optimized for Claude Code's environment, handle permissions correctly, and provide better error handling.

</tool_guidance>
