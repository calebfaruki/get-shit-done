# Architecture

**Analysis Date:** 2026-02-22

## Pattern Overview

**Overall:** Distributed agent-driven CLI system with file-based state management and modular task orchestration.

**Key Characteristics:**
- Layered CLI architecture with CommonJS modules for Node.js runtime
- File-based state machine (planning directory structure) to track workflow progress
- Multi-model orchestration system that dispatches tasks to specialized AI agents
- Extensible command system with bootstrap/init patterns for workflow initialization
- Integration point for external systems (git, Claude Code, OpenCode, Gemini)

## Layers

**CLI Entry Layer (`bin/install.js`):**
- Purpose: Installation bootstrap and runtime management for multiple IDE environments
- Location: `bin/install.js`
- Contains: Interactive installer, path templating, format conversion (Claude→OpenCode→Gemini)
- Depends on: fs, path, child_process (Node.js builtins)
- Used by: Package installation flow; installed into IDE config directories

**Core Library Layer (`get-shit-done/bin/lib/*.cjs`):**
- Purpose: Shared utilities, state models, and command implementations
- Location: `get-shit-done/bin/lib/`
- Contains: Commands for phase/milestone/state/config management; model resolution; git integration
- Depends on: fs, path, child_process; internal modules within lib/
- Used by: All workflow commands; defines reusable patterns for other modules

**Module Layer (Specialized Libraries):**
- `core.cjs` - Shared utilities: config loading, model resolution, slug generation, git execution
- `state.cjs` - STATE.md operations and workflow progression engine
- `phase.cjs` - Phase CRUD, queries, and lifecycle operations
- `milestone.cjs` - Milestone operations and archival
- `commands.cjs` - Standalone utility commands (slug generation, todos, timestamps)
- `config.cjs` - Planning config CRUD operations
- `init.cjs` - Compound init commands for workflow bootstrapping
- `verify.cjs` - Verification suite and consistency validation
- `frontmatter.cjs` - YAML frontmatter extraction and parsing
- `roadmap.cjs` - Roadmap operations and phase routing
- `template.cjs` - Template resolution and substitution

**Agent Layer (`agents/*.md`):**
- Purpose: Specialized AI agents for specific planning and execution tasks
- Location: `agents/` (11 agents defined)
- Contains: `gsd-planner.md`, `gsd-executor.md`, `gsd-debugger.md`, etc.
- Depends on: Agent execution environment (Claude Code, OpenCode, Gemini); references to `.planning/` structure
- Used by: Workflow commands that spawn agents; agents orchestrate complex tasks

**Workflow Layer (`get-shit-done/workflows/*.md`):**
- Purpose: User-facing workflows that compose commands and agents into sequences
- Location: `get-shit-done/workflows/`
- Contains: 30+ workflows (new-project.md, plan-phase.md, execute-phase.md, etc.)
- Depends on: Commands in `commands/gsd/` and agents
- Used by: End users via CLI commands; agents reference workflows to perform tasks

**Command Layer (`commands/gsd/*.md`):**
- Purpose: CLI command definitions and help text
- Location: `commands/gsd/` (30+ commands organized in subdirectories)
- Contains: Help, planning, execution, debugging, and utility commands
- Depends on: Underlying agents and workflows
- Used by: IDE CLI systems; invoked by users to initiate workflows

**Planning State Directory (`<project>/.planning/`):**
- Purpose: File-based state repository for all workflow progress
- Location: `.planning/` (created in each project)
- Contains:
  - `config.json` - Workflow configuration (model profile, git strategy, feature flags)
  - `STATE.md` - Current workflow state (phase progress, completion status)
  - `ROADMAP.md` - Project roadmap definition
  - `phases/*/` - Phase directories with PLAN.md, SUMMARY.md, and supporting docs
  - `todos/pending/` - Todo items
  - `codebase/` - Codebase analysis documents (STACK.md, ARCHITECTURE.md, etc.)
  - `<module>-file-manifest.json` - File hash manifest for local patch detection
  - `gsd-local-patches/` - User modifications to GSD files before update

## Data Flow

**Project Initialization:**

1. User invokes `/gsd:new-project` command
2. Command triggers `gsd-project-researcher` agent
3. Agent researches project structure and writes initial ROADMAP.md
4. `new-project.md` workflow calls init commands to create `.planning/` structure
5. `config.json` is created with defaults; agent writes ROADMAP.md

**Phase Planning:**

1. User invokes `/gsd:plan-phase N` command
2. `init-plan-phase` reads STATE.md, loads config, resolves models
3. Planner agent is spawned with codebase analysis (loads ARCHITECTURE.md, STACK.md, TESTING.md)
4. Agent writes PLAN.md to `.planning/phases/N/`
5. Plan checker validates PLAN.md structure
6. Verifier checks references and consistency
7. STATE.md updates to reflect phase planning completion

**Phase Execution:**

1. User invokes `/gsd:execute-phase N` command
2. Executor reads current phase's PLAN.md and STATE.md
3. Executor agent spawns with context about existing conventions (CONVENTIONS.md)
4. Agent implements code incrementally, creating commits after each stage
5. Executor writes SUMMARY.md documenting what was implemented
6. Verifier validates outputs against PLAN requirements
7. STATE.md progresses to next phase or marks complete

**Code Quality Analysis (Triggered via `/gsd:map-codebase`):**

1. User invokes `/gsd:map-codebase --focus {tech|arch|quality|concerns}`
2. `gsd-codebase-mapper` agent is spawned in appropriate mode
3. Agent explores repo structure, reads sample files, identifies patterns
4. Agent writes to `.planning/codebase/` (ARCHITECTURE.md, STACK.md, etc.)
5. Subsequent planner/executor calls load these docs to follow conventions

**State Management:**

- All progress is persisted in `.planning/` directory structure
- STATE.md is the source of truth for workflow position
- ROADMAP.md defines project structure and phases
- Phase directories contain plans, summaries, and supporting documentation
- config.json centralizes settings affecting all workflow commands
- File manifests detect user modifications for patch persistence on upgrades

## Key Abstractions

**Phase Model:**
- Purpose: Represents atomic units of work in project workflow
- Examples: `1-setup`, `2-core-features`, `2.1-user-auth`, `3-testing`
- Pattern: Stored as directories with numeric prefixes; supports decimal subphases
- Operations: Create (add-phase), update (insert-phase), list (phase:list), archive (complete-milestone)

**Milestone Model:**
- Purpose: Groups multiple phases; marks completion checkpoints
- Examples: `v1.0` (initial release), `v1.1` (patch)
- Pattern: Associated with archived phases; stored in roadmap
- Operations: Create (new-milestone), list, query, complete (complete-milestone)

**Plan Model:**
- Purpose: Specification for phase execution; written by planner agent
- Examples: `1-PLAN.md`, `integration-PLAN.md`
- Pattern: YAML frontmatter + markdown spec sections; must-haves block
- Operations: Parse (frontmatter.cjs), verify (verify.cjs), query (phase.cjs)

**Summary Model:**
- Purpose: Record of completed phase work; written by executor
- Examples: `1-SUMMARY.md`
- Pattern: Markdown with commit references, file list, self-check section
- Operations: Parse, verify against file existence

**Command Model:**
- Purpose: User-facing CLI entries that trigger workflows
- Pattern: Markdown files in `commands/gsd/` with frontmatter specifying tools, description
- Dispatch: IDE loads command definitions and invokes via subagent tool
- Examples: `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:add-phase`

**Agent Model:**
- Purpose: Specialized AI agents for specific domain tasks
- Pattern: Markdown files in `agents/` with tool allowlist and system prompt
- Dispatch: Triggered via SubAgent/Skill tool from commands
- Model selection: Config-driven (quality/balanced/budget profiles)

## Entry Points

**Installation Entry (`bin/install.js`):**
- Location: `bin/install.js`
- Triggers: `npm install get-shit-done-cc` / `npx get-shit-done-cc [options]`
- Responsibilities:
  - Interactively select runtime (Claude Code, OpenCode, Gemini)
  - Choose install scope (global vs. local)
  - Copy GSD files with path templating
  - Register hooks in IDE settings
  - Handle uninstallation cleanup

**Workflow Commands (`commands/gsd/*.md`):**
- Location: `commands/gsd/` (flattened as `gsd-*.md` in IDE)
- Invoked by: User via IDE CLI (e.g., `/gsd:plan-phase`)
- Each command:
  - Specifies tool allowlist (Read, Bash, Grep, Glob, Write)
  - Defines entry workflow (points to `get-shit-done/workflows/`)
  - Loads planning context dynamically

**Agent Entry Points:**
- Location: `agents/gsd-*.md`
- Triggered by: Commands via SubAgent tool
- Each agent has specialized prompt and tool set
- Example: `gsd-planner.md` focuses on planning; `gsd-executor.md` on implementation

## Error Handling

**Strategy:** Fail-fast with descriptive JSON responses; let upstream handlers decide recovery

**Patterns:**

- **Core module errors** (`error()` function in core.cjs): Write to stderr, exit code 1
  - Triggers: Missing required args, file not found, invalid JSON
  - Example: `error('phase required for init execute-phase')`

- **Validation errors** (in verify.cjs): Return structured validation result
  - Fields: `passed` (boolean), `checks` (object), `errors` (array)
  - Consumer: Verifier agent displays issues to user with remediation steps

- **State errors** (in state.cjs): Return state with `error` field
  - Fields: `state_exists`, `config_exists`, context about missing files
  - Recovery: Upstream commands guide users to reinitialize

- **Git errors** (execGit wrapper): Return `{ exitCode, stdout, stderr }`
  - Caller decides whether error is fatal or recoverable
  - Example: Checking if commit hash exists doesn't fail workflow if not found

## Cross-Cutting Concerns

**Logging:** No centralized logger; modules use `process.stdout.write()` and `process.stderr.write()`
- UI handled by agents (display formatted output to user)
- Libraries return structured JSON; let callers format

**Validation:** Multi-pass approach
- Structural: Does PLAN.md have required sections? (frontmatter.cjs)
- Semantic: Are mentioned files real? (verify.cjs)
- Consistency: Do phase numbers make sense? Do commits exist? (verify.cjs)

**Configuration:** Centralized in `config.json`, loaded once per command
- Supports nested structure (workflow.research, git.branching_strategy)
- User-level defaults in `~/.gsd/defaults.json` override project-level
- Per-command overrides via frontmatter in workflow files

**Model Resolution:** Three-tier fallback
1. Explicit model specified in command/workflow
2. Model profile (quality/balanced/budget) from config
3. Hardcoded defaults in MODEL_PROFILES table (core.cjs)

---

*Architecture analysis: 2026-02-22*
