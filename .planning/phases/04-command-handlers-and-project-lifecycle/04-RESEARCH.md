# Phase 4: Command Handlers and Project Lifecycle - Research

**Researched:** 2026-02-22
**Domain:** Command orchestration, lifecycle management, agent spawning patterns
**Confidence:** HIGH

## Summary

Phase 4 implements the complete command surface for the stateless project PM fork. This phase wires up 12 slash commands (`/new-project`, `/research-project`, `/discuss-project`, `/plan-project`, `/verify-project`, `/discuss-phase`, `/research-phase`, `/plan-phase`, `/execute-phase`, `/verify-phase`, `/map`, `/todo`) that orchestrate the full project lifecycle from intake to verification.

The core architecture challenge is transforming GSD's persistent multi-milestone workflow into an ephemeral single-commit model while preserving the valuable PM discipline (research, structured planning, scope validation, verification). Commands must load appropriate knowledge docs, spawn agents with proper context, manage ephemeral state in `.planning/project/`, and guide humans through phase transitions without auto-advance.

**Primary recommendation:** Follow the workflow orchestration pattern established in `map-codebase.md` and `execute-phase.md` — commands are thin orchestrators that spawn focused agents with `<files_to_read>` blocks for self-contained context. Use gsd-tools.cjs for initialization and model resolution only; agents use native Claude Code tools (Read, Write, Glob, Grep, Bash) for all file operations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Command Surface:**
- Build all 12 commands in Phase 4: `/new-project`, `/research-project`, `/discuss-project`, `/plan-project`, `/verify-project`, `/discuss-phase`, `/research-phase`, `/plan-phase`, `/execute-phase`, `/verify-phase`, `/map`, `/todo`
- Follow SPEC.md as the source of truth for command behavior, execution context (main vs subagent), and output formats
- Bare namespace — no `gsd:` prefix. Use whatever directory structure works (flat `commands/` or `commands/pm/`) as long as it's consistent
- Delete old `gsd:*` commands as each replacement is built — no coexistence period
- Missing prerequisites: warn and offer to run the prerequisite command (not hard block)

**Project Intake Flow:**
- Efficient sharpener style: 1-2 rounds of questions max, propose acceptance criteria quickly, let human adjust
- Todo matching uses area tag matching (not semantic/AI judgment)
- Stale codebase map: warn and offer to run /map inline, then resume intake
- Todo creation: AI proposes, human confirms before write (per SPEC)

**Planning Artifacts:**
- New file structure immediately: `.planning/project/` with `PHASE-N-*.md` flat naming
- Follow SPEC exactly for all file formats:
  - PROJECT.md: plain markdown, no frontmatter
  - PROJECT-PLAN.md: YAML frontmatter + markdown
  - PHASE-N-PLAN.md: YAML frontmatter + XML-tagged body
  - PHASE-N-CONTEXT.md: "Locked Decisions", "Discretion Areas", "Deferred Ideas" sections
  - PHASE-N-RESEARCH.md: XML-tagged sections (<user_constraints>, <research_summary>, etc.)
- One plan per phase, no waves, no parallelization
- Plan-checker validates per SPEC: verifiability-based scope warnings using proxy signals (behavioral changes, systems touched, architectural boundaries)

**Ephemeral State Model:**
- No archive before wipe — /new-project does `rm -rf .planning/project/` after human confirmation, period
- Add `.planning/` to `.gitignore` in Phase 4 — new commands expect ephemeral state
- No session awareness — each command checks its own prerequisites, nothing more
- CODEBASE.md lives at `.planning/CODEBASE.md` (semi-durable, persists across projects)
- Todos live at `.planning/todos/*.md` (semi-durable, persists across projects)

### Claude's Discretion

- Command file organization (flat `commands/` or subfolder) — just be consistent
- Internal implementation patterns for command handlers
- How knowledge docs are loaded/referenced by commands

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

This phase addresses 22 requirements from REQUIREMENTS.md:

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLN-04 | Strip `gsd:` prefix from commands | Bare namespace implementation pattern from existing workflows |
| CMD-01 | `/new-project` — conversational intake, scope validation, writes PROJECT.md | Intake patterns from `project-domain.md`, orchestration from workflow templates |
| CMD-02 | `/research-project` — strategic research via subagent | Modified `gsd-project-researcher` agent, single-file output pattern |
| CMD-03 | `/discuss-project` — deeper exploration in main context | Main conversation pattern for freeform exploration |
| CMD-04 | `/plan-project` — break project into phases via subagent | Phase decomposition from `planning-domain.md`, subagent spawn pattern |
| CMD-05 | `/verify-project` — check result against acceptance criteria | Three-layer verification methodology (diff analysis, code reasoning, test suite) |
| CMD-06 | `/execute-phase N` — no per-step commits, no auto-advance | Modified `gsd-executor` agent, deviation rules unchanged |
| CMD-08 | `/plan-phase N` — single-commit scope planning | Modified `gsd-planner` agent, goal-backward methodology |
| CMD-09 | `/research-phase N` — tactical research with XML tags | Modified `gsd-phase-researcher` agent, lighter touch for smaller scope |
| CMD-10 | `/discuss-phase N` — clarify decisions before planning | Three-category output (Locked/Discretion/Deferred) from existing pattern |
| CMD-11 | `/map` — codebase mapping with SHA anchoring | Modified `gsd-codebase-mapper` agent, staleness detection |
| CMD-12 | `/todo` — view and manage parking lot items | Lightweight main conversation command, area-based filtering |
| STATE-01 | Ephemeral `.planning/project/` wiped on new project | `rm -rf` with human confirmation, no archive |
| STATE-02 | PROJECT-PLAN.md replaces ROADMAP/STATE/MILESTONES | New file format from SPEC.md, single source of truth |
| STATE-03 | PROJECT-SUMMARY.md tracks phase execution | Executor appends phase blocks, overwrites on re-run |
| STATE-05 | Files on disk are the state | No cross-session resume, prerequisite checking only |
| SCOPE-01 | Verifiability assessment during intake | Greenfield/mechanical/brownfield heuristics from `project-domain.md` |
| SCOPE-02 | Scope warnings for brownfield without criteria | Proxy signals (behavioral changes, systems touched, boundaries) |
| SCOPE-03 | Must-have / nice-to-have split enforced | Todo creation with AI proposal, human confirmation |
| SAFE-03 | Human-in-the-loop for phase transitions | No auto-advance, handoff reminders after each command |

**Coverage:** All 20 Phase 4 requirements mapped to research findings. Additional 2 requirements (SCOPE-01, SCOPE-02) addressed by intake patterns.

</phase_requirements>

<research_summary>

## Command Architecture Patterns

### Established Orchestration Pattern

The codebase demonstrates a proven orchestration pattern in `map-codebase.md` and `execute-phase.md`:

**Thin orchestrator + focused agents:**
1. **Initialize context** — `gsd-tools.cjs init <workflow>` provides structured JSON with paths, models, flags
2. **Check prerequisites** — Verify required files exist, warn if missing
3. **Spawn agents** — Use Task tool with `<files_to_read>` blocks for self-contained context
4. **Collect results** — Agents write files directly, orchestrator verifies completion
5. **Report to human** — Structured output with next steps

**Key pattern:** Orchestrator stays at ~10-15% context by passing file paths to agents, not file contents. Agents load their own context fresh using `<files_to_read>`.

### Main vs Subagent Execution

Commands split cleanly by interaction needs (from SPEC.md):

**Main conversation context** (human interaction required):
- `/new-project` — conversational intake with back-and-forth questions
- `/discuss-project` — freeform exploration of PROJECT.md
- `/discuss-phase N` — clarify implementation decisions
- `/todo` — lightweight viewing and filtering

**Subagent context** (batch processing):
- `/research-project`, `/research-phase N` — web search + codebase analysis
- `/plan-project`, `/plan-phase N` — structured planning from files
- `/execute-phase N` — implementation against plan
- `/verify-phase N`, `/verify-project` — checking work against criteria
- `/map` — codebase analysis

### Knowledge Doc Loading Strategy

From `AGENTS.md` and domain docs:

**Agent-to-domain mapping:**
- Project researchers → `project-domain.md`
- Planners → `planning-domain.md` + `project-domain.md`
- Plan checkers → `planning-domain.md`
- Executors → `execution-domain.md`
- Verifiers → `verification-domain.md`
- Debuggers → `execution-domain.md`
- Codebase mappers → None (mechanical)

**Loading pattern:** Commands include knowledge doc paths in `<files_to_read>` blocks when spawning agents. Agents load only what they need (~3-6K tokens typical).

</research_summary>

<standard_stack>

## Standard Stack

### Core Infrastructure

| Component | Purpose | Why Standard |
|-----------|---------|--------------|
| `gsd-tools.cjs` | Workflow initialization, model resolution | Centralized config and model profile logic used by all workflows |
| Native Claude Code tools | File operations (Read, Write, Edit, Glob, Grep, Bash) | Phase 2 decision: agents use native tools, not custom tooling |
| Task tool | Subagent spawning | Built-in Claude Code mechanism for parallel agent execution |
| YAML frontmatter | Structured metadata in plans | Machine-parseable configuration for executor/verifier |
| XML tags | Structured sections in research | Enables planner to reference specific sections without parsing full docs |

### File Structure Standards

| File Type | Location | Format | Purpose |
|-----------|----------|--------|---------|
| PROJECT.md | `.planning/project/` | Plain markdown, no frontmatter | Human-facing project definition from `/new-project` |
| PROJECT-PLAN.md | `.planning/project/` | YAML frontmatter + markdown | Machine + human readable phase breakdown |
| PHASE-N-PLAN.md | `.planning/project/` | YAML frontmatter + XML body | Executor instruction set |
| PHASE-N-CONTEXT.md | `.planning/project/` | Section headings | Three-category decisions (Locked/Discretion/Deferred) |
| PHASE-N-RESEARCH.md | `.planning/project/` | XML-tagged sections | Planner-consumable research findings |
| CODEBASE.md | `.planning/` | Markdown with commit SHA | Semi-durable codebase understanding |
| Todos | `.planning/todos/*.md` | YAML frontmatter + prose | Semi-durable parking lot items |

### Agent Patterns

| Agent | Modifications from GSD | Key Deletions |
|-------|------------------------|---------------|
| `gsd-executor` | Strip git operations, state updates, checkpoints | Per-step commits, STATE.md updates, continuation agents, self-check |
| `gsd-planner` | Single-commit scope framing, fewer phases | Wave parallelization, multi-plan-per-phase |
| `gsd-plan-checker` | Verifiability-based warnings (proxy signals) | File count limits, line estimate checks |
| `gsd-verifier` | Report-only, stage on pass | Gap-closure loop, automated fixes |
| `gsd-codebase-mapper` | Add commit SHA anchoring | None (mostly unchanged) |
| `gsd-phase-researcher` | Lighter touch, XML-tagged output | Heavy multi-file research |
| `gsd-project-researcher` | Single-file output, no synthesizer | 5-file parallel output, synthesizer agent |

### Don't Hand-Roll

| Problem | Use Instead | Why |
|---------|-------------|-----|
| Agent spawning | Task tool with `<files_to_read>` | Built-in parallel execution, fresh context per agent |
| Model resolution | `gsd-tools.cjs resolve-model` | Existing profile-based logic (quality/balanced/budget) |
| Workflow initialization | `gsd-tools.cjs init <workflow>` | Centralized config reading, consistent JSON output |
| File frontmatter parsing | Native Read + manual YAML parse | Simple enough, no library needed |
| Prerequisite checking | File existence checks via Bash/Read | Simple conditionals, no framework needed |
| Progress tracking | File-based state (files created = progress) | No databases, no persistence layer |

</standard_stack>

<implementation_patterns>

## Implementation Patterns

### Pattern 1: Command Workflow Structure

**What:** XML-tagged workflow document that orchestrates agent spawns

**Structure:**
```markdown
<purpose>
One-paragraph description of what this command does and outputs
</purpose>

<philosophy>
Why this command exists, design principles
</philosophy>

<process>

<step name="initialize" priority="first">
Load context via gsd-tools.cjs init
</step>

<step name="check_prerequisites">
Verify required files exist, warn if missing
</step>

<step name="spawn_agent">
Use Task tool to spawn agent with <files_to_read>
</step>

<step name="collect_results">
Read agent output, verify completion
</step>

<step name="offer_next">
Structured handoff to human with next steps
</step>

</process>

<success_criteria>
Checklist of what must be true when workflow completes
</success_criteria>
```

**When to use:** Every command needs a workflow document in `get-shit-done/workflows/`

**Example from map-codebase.md:**
```xml
<step name="spawn_agents">
Spawn 4 parallel gsd-codebase-mapper agents.

Use Task tool with `subagent_type="gsd-codebase-mapper"`,
`model="{mapper_model}"`, and `run_in_background=true`.

Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="Map codebase tech stack",
  prompt="Focus: tech

  Analyze this codebase for technology stack.
  Write STACK.md and INTEGRATIONS.md to .planning/codebase/

  <files_to_read>
  - package.json
  - .env.example
  </files_to_read>"
)
```

### Pattern 2: Agent Context Loading

**What:** Self-contained context via `<files_to_read>` blocks in agent prompts

**Why:** Keeps orchestrator context lean (~10-15%). Agents load fresh 200K context for deep work.

**Example from execute-phase.md:**
```markdown
<files_to_read>
Read these files at execution start using the Read tool:
- {phase_dir}/{plan_file} (Plan)
- .planning/STATE.md (State)
- .planning/config.json (Config, if exists)
- ./CLAUDE.md (Project instructions, if exists)
- .agents/skills/ (Project skills, if exists)
</files_to_read>
```

**Pattern:**
1. Orchestrator includes `<files_to_read>` in agent prompt
2. Agent's first action: Read all listed files
3. Agent operates with full context, orchestrator stays lean

### Pattern 3: Prerequisite Checking

**What:** Soft warnings with helpful offers, not hard blocks

**From CONTEXT.md decision:** "Missing prerequisites: warn and offer to run the prerequisite command (not hard block)"

**Example:**
```javascript
// Check if PROJECT.md exists before running /plan-project
const projectFile = '.planning/project/PROJECT.md';
if (!fs.existsSync(projectFile)) {
  console.log(`
⚠️  PROJECT.md not found

/plan-project requires a defined project.

Run /new-project first to create PROJECT.md, or would you like me to run it now?
  `);
  // Wait for human decision
}
```

**NOT this:**
```javascript
if (!fs.existsSync(projectFile)) {
  throw new Error('PROJECT.md required');
}
```

### Pattern 4: Ephemeral State Management

**What:** `.planning/project/` directory lifecycle

**From CONTEXT.md:** "No archive before wipe — /new-project does `rm -rf .planning/project/` after human confirmation, period"

**Example:**
```bash
# Check for existing project
if [ -d ".planning/project" ]; then
  echo "Existing project found. Planning artifacts will be wiped."
  echo "Staged/unstaged code changes are untouched."
  echo "Continue? (y/n)"
  read -r response
  if [ "$response" = "y" ]; then
    rm -rf .planning/project/
    mkdir -p .planning/project/
  else
    echo "Cancelled. Finish existing project first."
    exit 0
  fi
fi
```

**Key points:**
- No archiving (SPEC decision)
- Human confirmation required
- Code changes never touched
- Only `.planning/project/` affected

### Pattern 5: Handoff Messages

**What:** Structured completion messages with clear next steps

**From map-codebase.md:**
```markdown
Codebase mapping complete.

Created .planning/codebase/:
- STACK.md (127 lines) - Technologies and dependencies
- ARCHITECTURE.md (89 lines) - System design and patterns
...

---

## ▶ Next Up

**Initialize project** — use codebase context for planning

`/new-project`

<sub>`/clear` first → fresh context window</sub>

---
```

**Pattern elements:**
1. Confirm completion
2. List what was created (with line counts)
3. Clear "Next Up" section
4. Specific command to run
5. Optional tips (e.g., clear context first)

### Pattern 6: File Format Compliance

**What:** Follow SPEC.md exactly for file formats

**PROJECT.md (plain markdown, no frontmatter):**
```markdown
# Project: Add user bookmarking

## Problem
Users can't save content for later. Need bookmarking...

## Acceptance Criteria
- [ ] Users can bookmark items
- [ ] Bookmarks persist across sessions

## Out of Scope
- Bookmark sharing (deferred to todos)

## Decisions
- Use localStorage for MVP (database later)
```

**PROJECT-PLAN.md (YAML frontmatter + markdown):**
```yaml
---
project: add-user-bookmarking
phases: 2
acceptance_criteria_count: 2
---
```
```markdown
# Project Plan: Add user bookmarking

## Phases

### Phase 1: Local storage implementation
**Goal**: Users can bookmark and retrieve items in current session
**Acceptance Criteria**: AC-1
**Depends on**: Nothing
```

**PHASE-N-PLAN.md (YAML frontmatter + XML body):**
```yaml
---
phase: 1
type: tdd
acceptance_criteria: [AC-1]
files_modified: []
must_haves:
  truths:
    - "Clicking bookmark icon saves item to localStorage"
  artifacts:
    - "src/services/bookmark.ts exists with save/load methods"
---
```
```xml
<objective>
Implement localStorage-based bookmarking service
</objective>

<context>
@.planning/project/PROJECT.md
@src/services/
</context>

<tasks>
<task>
  <name>Create bookmark service</name>
  <files>src/services/bookmark.ts</files>
  <action>...</action>
  <verify>npm test bookmark.test.ts</verify>
  <done>Tests pass</done>
</task>
</tasks>
```

### Anti-Patterns to Avoid

**❌ Don't: Pre-load file contents in orchestrator**
```javascript
// Bad: Loads full content into orchestrator context
const planContent = fs.readFileSync(planPath, 'utf-8');
spawnAgent(`Here's the plan:\n\n${planContent}\n\nExecute it.`);
```

**✅ Do: Pass file paths, let agent load**
```javascript
// Good: Agent loads with fresh context
spawnAgent(`
  <files_to_read>
  - ${planPath}
  </files_to_read>

  Execute the plan.
`);
```

**❌ Don't: Create persistent session state**
```javascript
// Bad: Trying to track session across commands
fs.writeFileSync('.planning/.session', JSON.stringify({
  lastCommand: 'plan-project',
  timestamp: Date.now()
}));
```

**✅ Do: Files on disk ARE the state**
```javascript
// Good: Check what exists
const hasProject = fs.existsSync('.planning/project/PROJECT.md');
const hasPlans = glob('.planning/project/PHASE-*-PLAN.md').length > 0;
```

**❌ Don't: Auto-advance to next command**
```javascript
// Bad: Running next command automatically
if (planComplete) {
  spawnCommand('/execute-phase 1');
}
```

**✅ Do: Offer next step to human**
```javascript
// Good: Human drives transitions
console.log(`
Planning complete.

Next: /execute-phase 1
`);
```

</implementation_patterns>

<common_pitfalls>

### Pitfall 1: Context Contamination in Orchestrator

**What goes wrong:** Orchestrator loads full plan contents, summaries, codebase maps into its own context. By the time it spawns agents, orchestrator is at 60%+ context and provides degraded coordination.

**Why it happens:** Natural inclination to "validate" or "understand" files before passing to agents.

**How to avoid:**
- Initialize with `gsd-tools.cjs init` (structured JSON only)
- Check file existence via `fs.existsSync()` (boolean result)
- Pass file paths to agents, not contents
- Read only for prerequisite checks (PROJECT.md exists? Y/N)

**Warning signs:**
- Orchestrator needs to read plan files
- String concatenation of file contents in prompts
- Context usage > 30% before spawning agents

### Pitfall 2: Breaking File Format Contracts

**What goes wrong:** Commands write files in wrong format (frontmatter when shouldn't, XML tags missing, etc.). Downstream commands fail to parse, agents can't find expected sections.

**Why it happens:** Not following SPEC.md format specifications exactly.

**How to avoid:**
- Reference SPEC.md section 4 for each file type
- Human-facing files (PROJECT.md, PROJECT-SUMMARY.md) = plain markdown, NO frontmatter
- Agent-consumed files (PROJECT-PLAN.md, PHASE-N-PLAN.md) = YAML frontmatter
- Research files (PHASE-N-RESEARCH.md) = XML-tagged sections
- Context files (PHASE-N-CONTEXT.md) = section headings

**Warning signs:**
- Planner can't find `<user_constraints>` section in research
- Executor can't parse frontmatter from plan
- Verifier expects YAML in PROJECT.md

### Pitfall 3: Coexistence of Old and New Commands

**What goes wrong:** Both `/gsd:new-project` and `/new-project` exist. Human uses wrong one, gets old behavior with persistent state model.

**Why it happens:** Incremental replacement without cleanup.

**From CONTEXT.md:** "Delete old `gsd:*` commands as each replacement is built — no coexistence period"

**How to avoid:**
- Delete old command file immediately after new one works
- Test new command thoroughly before deleting old
- No "deprecated but still works" phase

**Warning signs:**
- Both command files exist in filesystem
- Confusion about which command to use
- Old state files (STATE.md, ROADMAP.md) being created

### Pitfall 4: Hardcoded Model Choices

**What goes wrong:** Command directly spawns agent with `model="claude-opus-4"` instead of using profile system. Different users can't configure quality/balanced/budget profiles.

**Why it happens:** Convenience over flexibility.

**How to avoid:**
- Always use `gsd-tools.cjs resolve-model <agent-type>`
- Extract model from init JSON: `{mapper_model}`, `{executor_model}`, etc.
- Never hardcode model strings

**Warning signs:**
- Model strings like "claude-opus-4" in workflow files
- No call to resolve-model in initialization
- Profile configuration ignored

### Pitfall 5: Todos Without Human Confirmation

**What goes wrong:** Command creates todos automatically when scope is reduced. Human accumulates unwanted parking lot items.

**Why it happens:** Trying to be helpful, but violating SPEC contract.

**From CONTEXT.md:** "Todo creation: AI proposes, human confirms before write (per SPEC)"

**How to avoid:**
```markdown
AI: "This scope is too broad. I recommend focusing on X first and
     deferring Y and Z to todos. Would you like me to create:

     - Todo: Implement Y (area: features)
     - Todo: Implement Z (area: features)

     Confirm to create these todos, or adjust scope differently."
```

**Warning signs:**
- Todos appear without human seeing proposal
- No confirmation prompt before todo creation
- Human surprised by parking lot contents

### Pitfall 6: Missing Knowledge Doc References

**What goes wrong:** Agent spawned without loading appropriate domain knowledge. Implements patterns that violate domain principles (e.g., planner creates phases without goal-backward methodology).

**Why it happens:** Forgetting to include knowledge docs in `<files_to_read>` blocks.

**How to avoid:**
- Reference `AGENTS.md` for agent-to-domain mapping
- Include relevant domain docs in every agent spawn
- Planner → `planning-domain.md` + `project-domain.md`
- Executor → `execution-domain.md`
- Verifier → `verification-domain.md`

**Warning signs:**
- Agent asks "how should I structure this?"
- Patterns inconsistent with domain docs
- Agent reinvents wheels (e.g., custom scope validation instead of using greenfield/mechanical/brownfield heuristics)

</common_pitfalls>

<code_examples>

## Verified Patterns from Codebase

### Example 1: Workflow Initialization

**Source:** `map-codebase.md` step "init_context"

```bash
# Load all context in one call
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init map-codebase)

# Extract from init JSON
mapper_model=$(echo "$INIT" | jq -r '.mapper_model')
commit_docs=$(echo "$INIT" | jq -r '.commit_docs')
codebase_dir=$(echo "$INIT" | jq -r '.codebase_dir')
```

**Pattern:** Single init call returns structured JSON with all workflow needs.

### Example 2: Agent Spawn with Files-to-Read

**Source:** `execute-phase.md` step "execute_waves"

```javascript
Task(
  subagent_type="gsd-executor",
  model="{executor_model}",
  prompt="
    <objective>
    Execute plan {plan_number} of phase {phase_number}.
    </objective>

    <execution_context>
    @~/.claude/get-shit-done/workflows/execute-plan.md
    @~/.claude/get-shit-done/references/tdd.md
    </execution_context>

    <files_to_read>
    Read these files at execution start using the Read tool:
    - {phase_dir}/{plan_file} (Plan)
    - .planning/STATE.md (State)
    - ./CLAUDE.md (Project instructions, if exists)
    </files_to_read>

    <success_criteria>
    - [ ] All tasks executed
    - [ ] SUMMARY.md created in plan directory
    </success_criteria>
  "
)
```

**Pattern:** Orchestrator passes paths, agent loads with fresh context.

### Example 3: Prerequisite Check with Soft Warning

**Source:** Adapted from workflow patterns

```bash
# Check for PROJECT.md
if [ ! -f ".planning/project/PROJECT.md" ]; then
  echo ""
  echo "⚠️  PROJECT.md not found"
  echo ""
  echo "/plan-project requires a defined project."
  echo ""
  echo "Run /new-project first to create PROJECT.md,"
  echo "or would you like me to run it now?"
  echo ""
  # Await human response, don't hard exit
  exit 0
fi
```

**Pattern:** Explain what's missing, why it's needed, offer helpful next step.

### Example 4: Handoff Message

**Source:** `map-codebase.md` step "offer_next"

```bash
# Get line counts
wc -l .planning/codebase/*.md

# Present completion summary
cat << 'EOF'
Codebase mapping complete.

Created .planning/codebase/:
- STACK.md (127 lines) - Technologies and dependencies
- ARCHITECTURE.md (89 lines) - System design and patterns
- STRUCTURE.md (156 lines) - Directory layout and organization
- CONVENTIONS.md (201 lines) - Code style and patterns
- TESTING.md (93 lines) - Test structure and practices
- INTEGRATIONS.md (45 lines) - External services and APIs
- CONCERNS.md (67 lines) - Technical debt and issues


---

## ▶ Next Up

**Initialize project** — use codebase context for planning

`/new-project`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Re-run mapping: `/map`
- Review specific file: `cat .planning/codebase/STACK.md`

---
EOF
```

**Pattern:** Completion + artifacts + clear next step + alternatives.

### Example 5: Ephemeral State Wipe

**Source:** SPEC.md section on /new-project

```bash
# Check for existing project
PROJECT_DIR=".planning/project"

if [ -d "$PROJECT_DIR" ]; then
  # Get project name from existing PROJECT.md if it exists
  PROJECT_NAME="unnamed"
  if [ -f "$PROJECT_DIR/PROJECT.md" ]; then
    PROJECT_NAME=$(grep "^# Project:" "$PROJECT_DIR/PROJECT.md" | sed 's/^# Project: //')
  fi

  echo ""
  echo "You have an existing project in progress: $PROJECT_NAME"
  echo ""
  echo "Planning artifacts will be wiped."
  echo "Staged/unstaged code changes in your working tree are untouched."
  echo ""
  echo "Continue? (y/n)"
  read -r response

  if [ "$response" != "y" ]; then
    echo "Cancelled. Finish existing project first."
    exit 0
  fi

  # No archive — direct wipe
  rm -rf "$PROJECT_DIR"
fi

# Create fresh directory
mkdir -p "$PROJECT_DIR"
```

**Pattern:** Human confirmation, clear messaging about what's affected, direct wipe.

</code_examples>

<state_of_art>

## Current vs Target State

| Aspect | Current GSD | Target Fork | Impact |
|--------|-------------|-------------|---------|
| Command namespace | `/gsd:*` | Bare (`/new-project`) | Simpler UX, less typing |
| Project scope | Multi-milestone, persistent | Single-commit, ephemeral | Simpler mental model |
| State management | STATE.md, ROADMAP.md, MILESTONES.md | PROJECT-PLAN.md only | 3 files → 1 file |
| Planning artifacts | Persistent across sessions | Ephemeral, wiped per project | No stale artifact accumulation |
| Git operations | Per-step commits, metadata commits | Staging only, no commits | Human owns commit timing |
| Phase transitions | Auto-advance possible | Human-driven only | Explicit control |
| Codebase map | Static or manual refresh | SHA-anchored staleness detection | Automatic staleness awareness |
| Todos | Manual add command | AI proposes, human confirms | Intentional parking lot |
| Agent context | Mixed (some native, some gsd-tools) | Pure native tools | Simpler, no custom tooling dependency |
| Knowledge system | Scattered across agent files | Centralized domain docs | Reusable, modular |

**Deprecated/Removed:**
- `gsd:` prefix on all commands → bare namespace
- STATE.md, ROADMAP.md, MILESTONES.md → PROJECT-PLAN.md
- config.json → removed (hardcoded defaults)
- Resume/pause files → removed (session-agnostic)
- Auto-advance between phases → removed (human drives)
- Per-step git commits → removed (staging only)
- Checkpoints → removed (decisions in /discuss-phase)
- Wave parallelization → removed (one plan per phase)

</state_of_art>

<open_questions>

## Open Questions

### 1. Command File Organization

**What we know:** CONTEXT.md says "flat `commands/` or subfolder — just be consistent"

**What's unclear:** Current codebase has no `commands/` directory, only `workflows/`. Do we:
- Create `get-shit-done/commands/` with one file per command (12 files)?
- Keep everything in `get-shit-done/workflows/` (simpler)?
- Use hybrid (commands that spawn workflows)?

**Recommendation:** Use `get-shit-done/workflows/` exclusively for Phase 4. It's simpler, matches existing pattern (`map-codebase.md`, `execute-phase.md`), and avoids creating new directory structure. Commands and workflows are 1:1, so separating them adds no value. Consolidate in Phase 5 if needed.

### 2. gsd-tools.cjs Survival Scope

**What we know:** SPEC says "Don't pre-spec. Build agents using native tools first. Add tool commands only when genuinely needed."

**What's unclear:** Which gsd-tools.cjs commands survive for Phase 4?

**Known survivors:**
- `resolve-model` — Profile-based model selection, shared across commands
- `init <workflow>` — Workflow initialization with structured JSON
- `commit` — Git commit helper (used by map-codebase.md)

**Likely dead:**
- `state update/get/patch` — No STATE.md in fork
- `roadmap *` — No ROADMAP.md in fork
- `milestone *` — No MILESTONES.md in fork
- `phase add/insert/remove` — No persistent roadmap
- `requirements mark-complete` — No REQUIREMENTS.md in fork

**Recommendation:** Phase 4 uses `resolve-model`, `init`, `commit` only. Phase 5 will strip everything else from gsd-tools.cjs. Don't delete yet (agents still reference), but new commands should NOT use dead functions.

### 3. Namespace Transition Timing

**What we know:** CONTEXT says "Delete old `gsd:*` commands as each replacement is built — no coexistence period"

**What's unclear:** Do we:
- Build all 12 new commands, then delete all old ones (big bang)?
- Delete each old command immediately after new one is verified (incremental)?
- Use feature flags during transition?

**Recommendation:** Incremental deletion per command. Build `/new-project`, test thoroughly, delete old `gsd:new-project.md` immediately. Repeat for each command. Minimizes transition risk, allows iterative testing, matches strangler fig pattern from Phase 1.

### 4. .gitignore Addition Timing

**What we know:** CONTEXT says "Add `.planning/` to `.gitignore` in Phase 4 — new commands expect ephemeral state"

**What's unclear:** When exactly in Phase 4?

**Recommendation:** Add `.planning/` to `.gitignore` in first plan of Phase 4, before building any commands. This prevents accidental commits of ephemeral state during development and testing.

</open_questions>

<sources>

### Primary (HIGH confidence)

**Codebase files (direct analysis):**
- `.planning/phases/04-command-handlers-and-project-lifecycle/04-CONTEXT.md` — User decisions and locked constraints
- `/Users/calebfaruki/get-shit-done/SPEC.md` — Complete fork specification, file formats, command specs
- `/Users/calebfaruki/get-shit-done/SCRATCH.md` — Design evolution and rationale
- `.planning/REQUIREMENTS.md` — All 22 Phase 4 requirements
- `get-shit-done/workflows/map-codebase.md` — Proven orchestration pattern
- `get-shit-done/workflows/execute-phase.md` — Agent spawn pattern with `<files_to_read>`
- `get-shit-done/knowledge/AGENTS.md` — Agent-to-domain mapping
- `get-shit-done/knowledge/project-domain.md` — Intake methodology, scope validation
- `get-shit-done/knowledge/planning-domain.md` — Phase decomposition, goal-backward
- `get-shit-done/knowledge/execution-domain.md` — TDD flow, deviation rules
- `get-shit-done/knowledge/verification-domain.md` — Verification methodology
- `get-shit-done/bin/gsd-tools.cjs` — Existing toolkit (537 lines, functions inventoried)
- `agents/gsd-planner.md` — Existing planner agent structure
- `.planning/STATE.md` — Current project state and decisions

**Total primary sources:** 14 files, all from working codebase

### Secondary (MEDIUM confidence)

**Inferred patterns:**
- Command prerequisite checking (pattern inferred from workflow error handling)
- Handoff message format (pattern observed across map-codebase.md, execute-phase.md)
- Knowledge doc loading strategy (derived from AGENTS.md mapping + existing workflow patterns)

</sources>

## Metadata

**Confidence breakdown:**
- Command surface architecture: HIGH — SPEC.md is explicit, CONTEXT.md locked decisions are clear
- Orchestration patterns: HIGH — map-codebase.md and execute-phase.md provide working examples
- File formats: HIGH — SPEC.md section 4 is comprehensive, examples exist
- Agent modifications: MEDIUM-HIGH — SPEC section 6 describes changes, agents exist but need analysis
- Knowledge doc usage: HIGH — AGENTS.md defines mapping, domain docs exist and validated

**Research date:** 2026-02-22
**Valid until:** ~30 days (stable domain, no external dependencies)

**Research scope:** 12 slash commands, 6 modified agents, file structure, state management, orchestration patterns. Focused on "what do I need to know to PLAN this phase well?" — implementation details deferred to planning phase.

---

## RESEARCH COMPLETE

**Phase:** 04 - Command Handlers and Project Lifecycle
**Confidence:** HIGH

### Key Findings

1. **Proven orchestration pattern exists** — `map-codebase.md` and `execute-phase.md` demonstrate thin orchestrator + focused agents with `<files_to_read>` blocks
2. **Knowledge system ready** — 4 domain docs (project, planning, execution, verification) + AGENTS.md mapping provides agent context
3. **File formats specified** — SPEC.md section 4 defines exact structure for all 7 file types in `.planning/project/`
4. **Agent modifications scoped** — 6 agents need changes (executor, planner, verifier, researchers, mapper), changes documented in SPEC
5. **Ephemeral state model clear** — `rm -rf .planning/project/` with human confirmation, no archive, no session awareness

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Command architecture | HIGH | SPEC + CONTEXT provide complete specification |
| Orchestration patterns | HIGH | Working examples in codebase (map-codebase, execute-phase) |
| File formats | HIGH | SPEC section 4 comprehensive, examples exist |
| Agent modifications | MEDIUM-HIGH | SPEC describes changes, agents exist but need detailed analysis |
| State management | HIGH | CONTEXT explicit, pattern simple (file existence checks) |

### Open Questions

1. Command file organization — use `workflows/` exclusively or create `commands/`? (Recommendation: `workflows/` only)
2. gsd-tools.cjs survival scope — which functions survive Phase 4? (Recommendation: `resolve-model`, `init`, `commit` only)
3. Namespace transition timing — big bang or incremental deletion? (Recommendation: incremental per command)
4. .gitignore timing — when to add `.planning/`? (Recommendation: first plan of Phase 4)

### Ready for Planning

Research complete. All architectural patterns identified, file formats specified, agent modifications scoped. Open questions have recommendations that planner can adopt or adjust. Planner can now create detailed PLAN.md files for Phase 4 implementation.