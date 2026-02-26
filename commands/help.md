---
name: help
description: Show available commands and usage guide
---
<objective>
Display the complete command reference.

Output ONLY the reference content below. Do NOT add:
- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
</objective>

<process>

## Command Reference

All commands use bare namespace (no `/gsd:` prefix).

### Project Commands

Create and manage single-commit projects:

| Command | Purpose |
|---------|---------|
| `/new-project` | Sharpen vague idea into PROJECT.md with acceptance criteria |
| `/research-project` | Strategic research — library choices, ecosystem patterns, architectural approaches |
| `/discuss-project` | Deeper exploration — gray areas, edge cases, implementation preferences |
| `/plan-project` | Break project into phases (strategic). Produces PROJECT-PLAN.md |
| `/verify-project` | Check result against project-level acceptance criteria |

**Flow:** `/new-project` → `/research-project` (optional) → `/discuss-project` (optional) → `/plan-project` → execute phases → `/verify-project`

### Phase Commands

Implement individual phases within a project:

| Command | Purpose |
|---------|---------|
| `/discuss-phase N` | Clarify implementation decisions for phase N |
| `/research-phase N` | Tactical research — implementation details, gotchas, patterns |
| `/plan-phase N` | Produce detailed execution plan (PHASE-N-PLAN.md) |
| `/execute-phase N` | Execute phase N. Changes remain unstaged |
| `/verify-phase N` | Verify against must_haves. On pass, stages changes |

**Flow per phase:** `/discuss-phase N` (optional) → `/research-phase N` (optional) → `/plan-phase N` → `/execute-phase N` → `/verify-phase N`

### Utility Commands

Supporting tools for project work:

| Command | Purpose |
|---------|---------|
| `/map` | Analyze the codebase, anchored to current commit SHA |
| `/todo` | View parking lot items. Lists all todos; optionally filter by area |
| `/debug` | Systematic debugging with persistent state across context resets |
| `/health` | Diagnose planning directory health and optionally repair issues |
| `/help` | Show this command reference |

### Command Order

1. **Project Setup** (once per commit):
   - `/new-project` (required)
   - `/research-project` (optional)
   - `/discuss-project` (optional)
   - `/plan-project` (required)

2. **Phase Cycle** (repeat for each phase):
   - `/discuss-phase N` (optional)
   - `/research-phase N` (optional)
   - `/plan-phase N` (required)
   - `/execute-phase N` (required)
   - `/verify-phase N` (required)

3. **Project Completion**:
   - `/verify-project` (check all acceptance criteria)
   - Review `git diff --cached` (all verified changes staged)
   - Commit manually when ready

### File Structure

All in `.planning/` (gitignored):

```
.planning/
├── codebase/                # semi-durable — codebase map with commit SHA anchor
│   ├── tech-stack.md
│   ├── architecture.md
│   ├── conventions.md
│   └── concerns.md
├── todos/                   # semi-durable — parking lot items
│   └── *.md
└── project/                 # ephemeral — current project only
    ├── PROJECT.md
    ├── PROJECT-PLAN.md
    ├── PROJECT-SUMMARY.md
    ├── PROJECT-VERIFICATION.md
    ├── PROJECT-RESEARCH.md
    ├── PHASE-{N}-CONTEXT.md
    ├── PHASE-{N}-RESEARCH.md
    └── PHASE-{N}-PLAN.md
```

**Lifecycle:**
- `codebase/` and `todos/` persist across projects
- `project/` is ephemeral — `/new-project` wipes it (with confirmation)
- Working tree code is never touched — only `.planning/` files

### Philosophy

The human drives. The AI helps plan and execute a single commit's worth of work. Planning artifacts are scratch work discarded after commit.

**Scope:** One commit = one project. Verifiable in a single diff review.

**Phases:** Tactical subdivisions within the project. Each phase is coherent and verifiable.

**Git operations:** Only `/verify-phase N` stages files (`git add`). Never commits — human commits when ready.

</process>
