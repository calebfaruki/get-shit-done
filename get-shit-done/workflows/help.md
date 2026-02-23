<purpose>
Display the complete command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# GSD Command Reference

**GSD** (Get Shit Done) helps plan and execute single-commit projects with Claude Code.

## Quick Start

1. `/new-project` — Define what you're building
2. `/plan-project` — Break it into phases
3. `/plan-phase 1` — Create detailed execution plan
4. `/execute-phase 1` — Execute the phase
5. `/verify-phase 1` — Verify and stage changes

Repeat steps 3-5 for each phase. When done, review `git diff --cached` and commit.

## Project Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/new-project` | 1 (required) | Sharpen idea into PROJECT.md with acceptance criteria |
| `/research-project` | 2 (optional) | Strategic research — libraries, patterns, approaches |
| `/discuss-project` | 3 (optional) | Deeper exploration — gray areas, edge cases, preferences |
| `/plan-project` | 4 (required) | Break project into phases → PROJECT-PLAN.md |
| `/verify-project` | after execution | Check result against project-level acceptance criteria |

## Phase Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/discuss-phase N` | 1 (optional) | Clarify implementation decisions for phase N |
| `/research-phase N` | 2 (optional) | Tactical research — implementation details, gotchas |
| `/plan-phase N` | 3 (required) | Produce detailed execution plan → PHASE-{N}-PLAN.md |
| `/execute-phase N` | 4 (required) | Execute the phase plan |
| `/verify-phase N` | 5 (required) | Verify against must_haves; stage changes on pass |

## Utility Commands

| Command | Purpose |
|---------|---------|
| `/map` | Analyze codebase, anchored to current commit SHA |
| `/todo` | View parking lot items (filter by area) |
| `/debug` | Systematic debugging with persistent state across `/clear` |
| `/health` | Diagnose planning directory health |
| `/help` | Show this command reference |

## Files & Structure

```
.planning/
├── CODEBASE.md              # Semi-durable — codebase map with commit SHA
├── todos/                   # Semi-durable — parking lot items
│   └── *.md
└── project/                 # Ephemeral — current project artifacts
    ├── PROJECT.md
    ├── PROJECT-PLAN.md
    ├── PROJECT-SUMMARY.md
    ├── PROJECT-VERIFICATION.md
    ├── PROJECT-RESEARCH.md
    ├── PHASE-{N}-CONTEXT.md
    ├── PHASE-{N}-RESEARCH.md
    └── PHASE-{N}-PLAN.md
```

**Lifecycle:** `todos/` and `CODEBASE.md` persist across projects. `project/` is ephemeral — `/new-project` wipes it (after confirmation) and starts fresh.

## Common Workflows

**Starting a new project:**

```
/new-project              # Define scope and acceptance criteria
/plan-project             # Break into phases
/plan-phase 1             # Plan first phase
/execute-phase 1          # Execute
/verify-phase 1           # Verify and stage
```

**With optional research/discussion:**

```
/new-project
/research-project         # Investigate libraries and patterns
/discuss-project          # Explore edge cases and preferences
/plan-project
/plan-phase 1
/execute-phase 1
/verify-phase 1
```

**Resuming after a break:**

Just run the next command in sequence. Planning files and staged changes persist on disk.

**Debugging an issue:**

```
/debug "form submission fails silently"   # Start debug session
/clear
/debug                                     # Resume from where you left off
```

## Key Concepts

- A **project** is one commit's worth of work
- Projects are **strategic** (what to build), phases are **tactical** (how to build it)
- The AI never commits — you review `git diff --cached` and commit when ready
- `/verify-phase` stages changes on pass; `/verify-project` checks the final result
- Todos capture deferred scope so nothing gets lost

## Staying Updated

```bash
npx get-shit-done-cc@latest
```
</reference>
