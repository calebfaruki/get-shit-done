# GSD User Guide

A detailed reference for workflows, troubleshooting, and configuration. For quick-start setup, see the [README](../README.md).

---

## Table of Contents

- [Workflow Diagrams](#workflow-diagrams)
- [Command Reference](#command-reference)
- [Configuration Reference](#configuration-reference)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Recovery Quick Reference](#recovery-quick-reference)

---

## Workflow Diagrams

### Full Project Lifecycle

```
  ┌──────────────────────────────────────────────────┐
  │                   NEW PROJECT                    │
  │  /new-project                                    │
  │  Questions -> PROJECT.md with acceptance criteria│
  └─────────────────────────┬────────────────────────┘
                            │
             ┌──────────────▼─────────────┐
             │  [Optional]                │
             │  /research-project         │  <- Strategic research
             │  /discuss-project          │  <- Edge cases, preferences
             └──────────────┬─────────────┘
                            │
             ┌──────────────▼─────────────┐
             │  /plan-project             │
             │  -> PROJECT-PLAN.md        │
             └──────────────┬─────────────┘
                            │
             ┌──────────────▼─────────────┐
             │      FOR EACH PHASE:       │
             │                            │
             │  ┌────────────────────┐    │
             │  │ /discuss-phase N   │    │  <- Optional: lock in preferences
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /research-phase N  │    │  <- Optional: tactical research
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /plan-phase N      │    │  <- Detailed execution plan
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /execute-phase N   │    │  <- Execute the plan
             │  └──────────┬─────────┘    │
             │             │              │
             │  ┌──────────▼─────────┐    │
             │  │ /verify-phase N    │    │  <- Verify + stage on pass
             │  └──────────┬─────────┘    │
             │             │              │
             │     Next Phase?────────────┘
             │             │ No
             └─────────────┼──────────────┘
                            │
            ┌───────────────▼──────────────┐
            │  /verify-project             │
            │  Check against acceptance    │
            │  criteria                    │
            └───────────────┬──────────────┘
                            │
            Review git diff --cached -> commit
```

### Planning Agent Coordination

```
  /plan-phase N
         │
         ├── Phase Researcher (optional)
         │     └── PHASE-{N}-RESEARCH.md
         │
         ├── Planner
         │     │  Reads PROJECT.md, PROJECT-PLAN.md,
         │     │  PHASE-{N}-CONTEXT.md, PHASE-{N}-RESEARCH.md
         │     │
         │     ▼
         │  ┌──────────────────┐     ┌────────┐
         │  │   Plan Checker   │────>│ PASS?  │
         │  └──────────────────┘     └───┬────┘
         │                               │
         │                          Yes  │  No
         │                           │   │   │
         │                           │   └───┘  (loop, up to 3x)
         │                           │
         │                     ┌─────▼────────────┐
         │                     │ PHASE-{N}-PLAN.md│
         │                     └──────────────────┘
         └── Done
```

### Execution Flow

```
  /execute-phase N
         │
         ├── Read PHASE-{N}-PLAN.md
         │
         ├── Executor (fresh context)
         │     └── Implements all tasks from the plan
         │
         └── Changes left unstaged for verification
```

### Brownfield Workflow (Existing Codebase)

```
  /map
         │
         ├── Stack Mapper     ─┐
         ├── Arch Mapper       ├── .planning/codebase/ (anchored to commit SHA)
         ├── Convention Mapper ─┤   (tech-stack.md, architecture.md,
         └── Concern Mapper   ─┘    conventions.md, concerns.md)
                │
        ┌───────▼──────────┐
        │ /new-project     │  <- Questions focus on what you're ADDING
        └──────────────────┘
```

---

## Command Reference

### Project Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/new-project` | 1 (required) | Sharpen idea into PROJECT.md with acceptance criteria |
| `/research-project` | 2 (optional) | Strategic research -- libraries, patterns, approaches |
| `/discuss-project` | 3 (optional) | Deeper exploration -- gray areas, edge cases, preferences |
| `/plan-project` | 4 (required) | Break project into phases -> PROJECT-PLAN.md |
| `/verify-project` | after execution | Check result against project-level acceptance criteria |

### Phase Commands

| Command | Order | Purpose |
|---------|-------|---------|
| `/discuss-phase N` | 1 (optional) | Clarify implementation decisions for phase N |
| `/research-phase N` | 2 (optional) | Tactical research -- implementation details, gotchas |
| `/plan-phase N` | 3 (required) | Produce detailed execution plan -> PHASE-{N}-PLAN.md |
| `/execute-phase N` | 4 (required) | Execute the phase plan |
| `/verify-phase N` | 5 (required) | Verify against must_haves; stage changes on pass |

### Utility Commands

| Command | Purpose |
|---------|---------|
| `/map` | Analyze codebase, anchored to current commit SHA |
| `/todo` | View parking lot items (filter by area) |
| `/debug` | Systematic debugging with persistent state across `/clear` |
| `/health` | Diagnose planning directory health |
| `/help` | Show command reference |

---

## Configuration Reference

### Model Profiles

GSD uses model profiles to control which Claude model each agent uses, balancing quality vs token spend. Configure in `.planning/model-config.json`.

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| gsd-planner | opus | opus | sonnet |
| gsd-executor | opus | sonnet | sonnet |
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-project-researcher | opus | sonnet | haiku |
| gsd-debugger | opus | sonnet | sonnet |
| gsd-codebase-mapper | sonnet | haiku | haiku |
| gsd-verifier | sonnet | sonnet | haiku |
| gsd-plan-checker | sonnet | sonnet | haiku |

**Profile philosophy:**
- **quality** -- Opus for all decision-making agents, Sonnet for read-only verification. Use when quota is available and the work is critical.
- **balanced** (default) -- Opus only for planning (where architecture decisions happen), Sonnet for everything else.
- **budget** -- Sonnet for anything that writes code, Haiku for research and verification. Use for high-volume work or less critical phases.

### Per-Agent Overrides

Override specific agents without changing the entire profile:

```json
{
  "model_profile": "balanced",
  "model_overrides": {
    "gsd-executor": "opus"
  }
}
```

See reference documentation for full model profile resolution logic.

---

## Usage Examples

### New Project (Full Cycle)

```bash
claude --dangerously-skip-permissions
/new-project              # Define scope and acceptance criteria
/plan-project             # Break into phases -> PROJECT-PLAN.md
/clear
/plan-phase 1             # Detailed execution plan
/execute-phase 1          # Execute
/verify-phase 1           # Verify and stage changes
/clear
/plan-phase 2             # Repeat for each phase
/execute-phase 2
/verify-phase 2
...
/verify-project           # Check against acceptance criteria
git diff --cached         # Review staged changes
git commit                # Single atomic commit
```

### With Optional Research and Discussion

```bash
/new-project
/research-project         # Investigate libraries and patterns
/discuss-project          # Explore edge cases and preferences
/plan-project
/plan-phase 1
/execute-phase 1
/verify-phase 1
```

### Existing Codebase

```bash
/map                      # Analyze what exists -> .planning/codebase/
/new-project              # Questions focus on what you're ADDING
# (normal phase workflow from here)
```

### Debugging an Issue

```bash
/debug "form submission fails silently"   # Start debug session
/clear
/debug                                     # Resume from where you left off
```

### Resuming After a Break

Just run the next command in sequence. Planning files and staged changes persist on disk -- no special restore command needed.

---

## Troubleshooting

### "Project already initialized"

You ran `/new-project` but `.planning/project/PROJECT.md` already exists. This is a safety check. If you want to start over, `/new-project` will prompt for confirmation before wiping the `project/` directory.

### Context Degradation During Long Sessions

Clear your context window between major commands: `/clear` in Claude Code. GSD is designed around fresh contexts -- every subagent gets a clean 200K window. Planning files persist on disk, so no context is lost.

### Plans Seem Wrong or Misaligned

Run `/discuss-phase N` before planning. Most plan quality issues come from Claude making assumptions that a PHASE-{N}-CONTEXT.md would have prevented.

### Execution Fails or Produces Stubs

Check that the plan was not too ambitious. Plans should target single-commit scope. If tasks are too large, they exceed what a single context window can produce reliably. Re-plan with smaller scope.

### Need to Change Something After Execution

Run `/verify-phase N` to identify issues. For targeted fixes, work directly with Claude. The verification step will re-check and stage changes on pass.

### Model Costs Too High

Switch to budget profile by updating `.planning/model-config.json`:
```json
{ "model_profile": "budget" }
```

### Working on a Sensitive/Private Project

Add `.planning/` to your `.gitignore`. Planning artifacts stay local and never touch git.

### GSD Update Overwrote My Local Changes

Since v1.17, the installer backs up locally modified files to `gsd-local-patches/`. Run `/reapply-patches` to merge your changes back.

### Subagent Appears to Fail but Work Was Done

A known workaround exists for a Claude Code classification bug. GSD's orchestrators spot-check actual output before reporting failure. If you see a failure message but changes were made, check the working directory -- the work may have succeeded.

---

## Recovery Quick Reference

| Problem | Solution |
|---------|----------|
| New session / lost context | Run the next command in sequence -- files persist on disk |
| Phase went wrong | `git checkout` the affected files, then re-plan |
| Something broke | `/debug "description"` |
| Plan doesn't match your vision | `/discuss-phase N` then re-plan |
| Costs running high | Set `"model_profile": "budget"` in `.planning/model-config.json` |
| Update broke local changes | `/reapply-patches` |

---

## Project File Structure

For reference, here is what GSD creates in your project:

```
.planning/
├── codebase/                # Semi-durable — codebase map with commit SHA
│   ├── tech-stack.md
│   ├── architecture.md
│   ├── conventions.md
│   └── concerns.md
├── todos/                   # Semi-durable — parking lot items
│   └── *.md
└── project/                 # Ephemeral — current project artifacts
    ├── PROJECT.md           # Project vision, scope, acceptance criteria
    ├── PROJECT-PLAN.md      # Phase breakdown (strategic)
    ├── PROJECT-SUMMARY.md   # Execution outcomes
    ├── PROJECT-VERIFICATION.md  # Project-level verification results
    ├── PROJECT-RESEARCH.md  # Strategic research findings
    ├── PHASE-{N}-CONTEXT.md # Implementation preferences for phase N
    ├── PHASE-{N}-RESEARCH.md # Tactical research for phase N
    └── PHASE-{N}-PLAN.md   # Detailed execution plan for phase N
```

**Lifecycle:** `codebase/` and `todos/` persist across projects. `project/` is ephemeral -- `/new-project` wipes it (after confirmation) and starts fresh.
