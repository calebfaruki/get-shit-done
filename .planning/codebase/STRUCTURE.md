# Codebase Structure

**Analysis Date:** 2026-02-22

## Directory Layout

```
get-shit-done/
├── bin/                           # Installation and entry point
│   └── install.js                 # npm install entrypoint; multi-runtime installer
├── get-shit-done/                 # Core GSD skill/module (installed to IDE)
│   ├── bin/
│   │   └── lib/                   # CommonJS library modules (state, phase, planning)
│   │       ├── core.cjs           # Shared utilities and core functions
│   │       ├── state.cjs          # STATE.md operations
│   │       ├── phase.cjs          # Phase CRUD operations
│   │       ├── milestone.cjs      # Milestone operations
│   │       ├── commands.cjs       # Utility commands
│   │       ├── config.cjs         # Config CRUD
│   │       ├── init.cjs           # Initialization compounds
│   │       ├── verify.cjs         # Verification and validation
│   │       ├── frontmatter.cjs    # YAML parsing
│   │       ├── roadmap.cjs        # Roadmap operations
│   │       └── template.cjs       # Template substitution
│   ├── references/                # Reference documentation
│   │   ├── model-profiles.md      # Model tier definitions
│   │   ├── planning-config.md     # Config schema documentation
│   │   ├── git-integration.md     # Git workflow integration
│   │   ├── verification-patterns.md # Validation patterns
│   │   └── ... (11 reference files)
│   ├── templates/                 # Project templates
│   │   ├── codebase/              # Template markdown files
│   │   │   ├── architecture.md    # Template for ARCHITECTURE.md
│   │   │   ├── conventions.md     # Template for CONVENTIONS.md
│   │   │   ├── stack.md           # Template for STACK.md
│   │   │   ├── structure.md       # Template for STRUCTURE.md
│   │   │   ├── testing.md         # Template for TESTING.md
│   │   │   ├── integrations.md    # Template for INTEGRATIONS.md
│   │   │   ├── concerns.md        # Template for CONCERNS.md
│   │   │   └── ... (7 templates total)
│   │   └── research-project/      # Research templates
│   └── workflows/                 # User-facing workflows
│       ├── new-project.md         # Bootstrap new project
│       ├── plan-phase.md          # Plan a phase
│       ├── execute-phase.md       # Execute a phase
│       ├── complete-milestone.md  # Archive phases and create milestone
│       ├── discover-phase.md      # Discovery phase workflow
│       └── ... (30+ workflow files)
├── commands/                      # IDE command definitions
│   └── gsd/                       # GSD command namespace
│       ├── help.md                # /gsd:help command
│       ├── new-project.md         # /gsd:new-project
│       ├── plan-phase.md          # /gsd:plan-phase
│       ├── execute-phase.md       # /gsd:execute-phase
│       └── ... (30+ commands in subdirectories)
├── agents/                        # Specialized AI agents
│   ├── gsd-planner.md            # Planning specialist
│   ├── gsd-executor.md           # Implementation specialist
│   ├── gsd-debugger.md           # Debugging specialist
│   ├── gsd-codebase-mapper.md    # Codebase analysis
│   ├── gsd-verifier.md           # Verification specialist
│   ├── gsd-phase-researcher.md   # Phase research
│   ├── gsd-project-researcher.md # Project research
│   └── ... (11 agents total)
├── hooks/                         # IDE integration hooks
│   ├── gsd-statusline.js         # Status display hook
│   ├── gsd-check-update.js       # Update checker
│   ├── gsd-context-monitor.js    # Context window monitoring
│   ├── gsd-intel-*.js            # (Removed in v1.9.2)
│   └── dist/                      # Bundled hooks (esbuild output)
├── scripts/                       # Build and utility scripts
│   └── build-hooks.js            # esbuild bundler for hooks
├── assets/                        # Static assets
│   └── ... (logos, images)
├── tests/                         # Test suite
│   ├── *.test.cjs                # CommonJS tests for each module
│   ├── helpers.cjs               # Test utilities
│   └── run: npm test
├── docs/                          # User documentation
│   └── ...
├── .planning/                     # Project planning
│   ├── codebase/                 # Codebase analysis outputs
│   │   ├── ARCHITECTURE.md       # (this file)
│   │   ├── STACK.md
│   │   ├── TESTING.md
│   │   └── ...
│   └── ...
├── .github/                       # GitHub integration
│   ├── workflows/                # CI/CD pipelines
│   └── ISSUE_TEMPLATE/           # Issue templates
├── package.json                   # npm configuration
├── package-lock.json             # Dependency lock
├── README.md                      # User guide
├── CHANGELOG.md                   # Version history
├── LICENSE                        # MIT license
└── SECURITY.md                    # Security policy
```

## Directory Purposes

**`bin/`:**
- Purpose: Distribution entry point
- Contains: `install.js` - the main NPM-installed executable
- Key files: `install.js` (1800+ lines of installation logic)

**`get-shit-done/bin/lib/`:**
- Purpose: Core command implementation libraries
- Contains: 11 `.cjs` (CommonJS) modules that implement workflow commands
- Key patterns: Each module exports `cmd*` functions (e.g., `cmdPhasesList`)

**`get-shit-done/references/`:**
- Purpose: Internal documentation for developers and agents
- Contains: Implementation guides for model selection, git integration, verification patterns
- Used by: Agents reference these when implementing complex tasks

**`get-shit-done/templates/codebase/`:**
- Purpose: Template markdown files for codebase analysis output
- Contains: Template versions of ARCHITECTURE.md, STACK.md, etc.
- Used by: `gsd-codebase-mapper` agent fills these templates based on focus area

**`get-shit-done/workflows/`:**
- Purpose: Compound workflows that orchestrate commands and agents
- Contains: 30+ .md files defining multi-step workflows
- Pattern: Each workflow uses markdown sections to organize steps, calls to commands/agents

**`commands/gsd/`:**
- Purpose: CLI command definitions for IDE integration
- Contains: 30+ markdown files defining user-facing commands
- Pattern: Each file has YAML frontmatter (name, description, allowed-tools) + markdown body

**`agents/`:**
- Purpose: Specialized AI agents with domain expertise
- Contains: 11 markdown agents with system prompts and tool access lists
- Key agents:
  - `gsd-planner.md` - Phase planning and specification
  - `gsd-executor.md` - Code implementation
  - `gsd-debugger.md` - Problem diagnosis
  - `gsd-codebase-mapper.md` - Code analysis

**`hooks/`:**
- Purpose: Integration points with IDE (Claude Code, OpenCode, Gemini)
- Contains: Post-session and post-tool hooks written in JavaScript
- Key hooks:
  - `gsd-statusline.js` - Displays current task and context window
  - `gsd-check-update.js` - Notifies about GSD updates
  - `gsd-context-monitor.js` - Warns about context window usage
- Compiled to: `hooks/dist/` (esbuild output)

**`tests/`:**
- Purpose: Test suite for core library modules
- Contains: CommonJS test files mirroring `get-shit-done/bin/lib/`
- Files:
  - `phase.test.cjs` (1000+ lines, most comprehensive)
  - `commands.test.cjs`, `state.test.cjs`, `roadmap.test.cjs`, etc.
- Run: `npm test` (uses Node.js `--test` runner)

## Key File Locations

**Entry Points:**

| File | Purpose |
|------|---------|
| `bin/install.js` | NPM package entry; installs GSD to IDE config directory |
| `get-shit-done/workflows/new-project.md` | First workflow when initializing project |
| `commands/gsd/help.md` | Help command explaining GSD usage |

**Configuration:**

| File | Purpose |
|------|---------|
| `package.json` | npm package metadata; version 1.20.5 |
| `get-shit-done/bin/lib/core.cjs` | Hardcoded defaults for model profiles, templates |
| `~/.gsd/defaults.json` (user-level) | User overrides for project config defaults |

**Core Logic:**

| File | Purpose |
|------|---------|
| `get-shit-done/bin/lib/state.cjs` | STATE.md operations; workflow progression |
| `get-shit-done/bin/lib/phase.cjs` | Phase lifecycle; CRUD and queries |
| `get-shit-done/bin/lib/init.cjs` | Bootstrap commands for workflows |
| `get-shit-done/bin/lib/verify.cjs` | Validation and consistency checking |

**Testing:**

| File | Purpose |
|------|---------|
| `tests/phase.test.cjs` | Comprehensive phase operations tests |
| `tests/commands.test.cjs` | Utility command tests |
| `tests/state.test.cjs` | State progression tests |

## Naming Conventions

**Files:**

- **Commands**: `{command-name}.md` - kebab-case in `commands/gsd/`
- **Workflows**: `{workflow-name}.md` - kebab-case in `get-shit-done/workflows/`
- **Agents**: `gsd-{agent-name}.md` - always prefixed with `gsd-`
- **Planning state**: UPPERCASE.md - `STATE.md`, `ROADMAP.md`, `PLAN.md`, `SUMMARY.md`
- **Codebase analysis**: UPPERCASE.md - `ARCHITECTURE.md`, `STACK.md`, `CONVENTIONS.md`, `TESTING.md`
- **Library modules**: `{module-name}.cjs` - CommonJS explicit extension
- **Test files**: `{module-name}.test.cjs` - mirrors library name

**Directories:**

- **Top-level packages**: kebab-case - `get-shit-done/`, `commands/`, `agents/`
- **Phase directories**: `{number}-{optional-slug}` - e.g., `01-setup`, `02-core`, `02.1-users`
- **Milestone archive**: `archive/{milestone}/{phase-dir}` - organized by version

## Where to Add New Code

**New Workflow (Multi-step sequence):**
- Location: `get-shit-done/workflows/{workflow-name}.md`
- Structure:
  - YAML frontmatter (description, tools, color)
  - Markdown sections (## Step 1, ## Step 2, etc.)
  - References to commands and agents
- Example: See `get-shit-done/workflows/plan-phase.md` (~180 lines)

**New Command (User-facing CLI entry):**
- Location: `commands/gsd/{category}/{command-name}.md`
- Structure:
  - YAML frontmatter (name, description, allowed-tools list)
  - Markdown body with usage instructions
  - Reference to associated workflow in `get-shit-done/workflows/`
- Example: See `commands/gsd/plan-phase.md`

**New Agent (Specialized task handler):**
- Location: `agents/gsd-{agent-name}.md`
- Structure:
  - YAML frontmatter (description, allowed-tools, color)
  - System prompt (detailed instructions)
  - Can reference other agents for composition
- Key agents to study: `agents/gsd-planner.md`, `agents/gsd-executor.md`

**New Library Module (Reusable utilities):**
- Location: `get-shit-done/bin/lib/{module-name}.cjs`
- Pattern:
  - CommonJS module (require/module.exports)
  - Export `cmd*` functions for commands
  - Import shared utilities from `core.cjs`
  - Add corresponding test file `tests/{module-name}.test.cjs`
- Dependencies: Use only Node.js builtins (fs, path, child_process)

**New Reference Documentation:**
- Location: `get-shit-done/references/{topic}.md`
- Purpose: Internal guidance for agents implementing complex features
- Examples: `model-profile-resolution.md`, `verification-patterns.md`

**Tests (For new modules):**
- Location: `tests/{module-name}.test.cjs`
- Run: `npm test`
- Framework: Node.js native `test` module (no external test runner)
- Pattern: Use `assert` for validations; see `tests/phase.test.cjs` for structure

## Special Directories

**`.planning/`:**
- Purpose: Project planning state (created in user projects, not in GSD repo)
- Generated: Yes (created by `new-project` workflow)
- Committed: Yes (user projects commit this)
- Contains:
  - `config.json` - Workflow configuration
  - `STATE.md` - Progress tracking
  - `ROADMAP.md` - Project roadmap
  - `phases/*/` - Phase plans and summaries
  - `codebase/` - Codebase analysis (ARCHITECTURE.md, STACK.md, etc.)
  - `todos/pending/` - Todo items
  - File manifests and patch directories for update handling

**`hooks/dist/`:**
- Purpose: Bundled hook scripts for IDE integration
- Generated: Yes (by `npm run build:hooks`)
- Committed: Yes (bundled for distribution)
- Created by: `scripts/build-hooks.js` runs esbuild
- Deploy: Copied to IDE config by installer

**`get-shit-done/templates/codebase/`:**
- Purpose: Template markdown for codebase analysis output
- Generated: No (static templates)
- Committed: Yes
- Usage: `gsd-codebase-mapper` fills these based on findings

**`.github/`:**
- Purpose: GitHub integration and CI/CD
- Generated: No (manually maintained)
- Committed: Yes
- Contains: Workflow definitions for automated testing/release

## File Organization Strategy

**By Responsibility:**
- Commands are organized first by responsibility (plan-*, execute-*, etc.)
- Agents are named by domain (planner, executor, debugger)
- Library modules named by entity (phase, milestone, state)

**By Dependency Flow:**
- `core.cjs` → shared utilities imported by all
- `{specific}.cjs` → domain modules
- `init.cjs` → compounds that orchestrate other modules
- Workflows → compose commands and agents

**By Installation Scope:**
- Files in `bin/` → shipped with npm package, installed globally
- Files in `get-shit-done/` → installed to IDE config dir (Claude: `~/.claude/get-shit-done/`)
- Files in `commands/` → installed to IDE config dir (Claude: `~/.claude/commands/gsd/`)
- Files in `agents/` → installed to IDE config dir (Claude: `~/.claude/agents/`)

---

*Structure analysis: 2026-02-22*
