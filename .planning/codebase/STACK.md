# Technology Stack

**Analysis Date:** 2026-02-22

## Languages

**Primary:**
- JavaScript (Node.js) - Core CLI, tools, hooks, and all executable scripts

**Secondary:**
- Markdown - Agent definitions and command specifications
- CommonJS - Module system for all runtime code (`*.cjs` files)

## Runtime

**Environment:**
- Node.js >= 16.7.0

**Package Manager:**
- npm - Dependency and package management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- No external framework dependencies - Pure Node.js implementation

**Build/Dev:**
- esbuild ^0.24.0 - Hook bundling/transpilation for distribution

**CLI:**
- Native Node.js `readline` - Interactive prompts in installer
- Native Node.js `child_process` - Subprocess spawning for git, npm updates

## Key Dependencies

**None in production** - Package.json has empty `dependencies` object

**Development Only:**
- esbuild ^0.24.0 - For compiling hooks from source to `hooks/dist/`

## Configuration

**Environment:**
- Configurable via environment variables:
  - `CLAUDE_CONFIG_DIR` - Override Claude Code config location (default: `~/.claude`)
  - `GEMINI_CONFIG_DIR` - Override Gemini CLI config location (default: `~/.gemini`)
  - `OPENCODE_CONFIG_DIR` - Override OpenCode config location (default: `~/.config/opencode`)
  - `XDG_CONFIG_HOME` - XDG Base Directory spec (affects OpenCode)
  - `OPENCODE_CONFIG` - Explicit path to OpenCode config file

**Build:**
- Hooks compiled via `npm run build:hooks`
- Script: `scripts/build-hooks.js` - Simple file copying from `hooks/` to `hooks/dist/`

**Installation:**
- Installer: `bin/install.js` - Interactive/non-interactive setup to `~/.claude/`, `~/.gemini/`, or `~/.config/opencode/`

## Platform Requirements

**Development:**
- Node.js >= 16.7.0
- Git (for version checks and commits)
- npm (for package installation)

**Production (Installation Target):**
- Node.js >= 16.7.0 (on end-user machine)
- Supported IDEs/CLIs:
  - Claude Code (Anthropic)
  - OpenCode (open source alternative)
  - Gemini CLI (Google)

## File Distribution

**Published Package (`npm`):**
- Package name: `get-shit-done-cc`
- Current version: 1.20.5
- Distributes:
  - `bin/` - Installer and tools CLI
  - `commands/` - All `/gsd:*` command definitions
  - `agents/` - Agent prompts and workflows
  - `get-shit-done/` - Templates, workflows, and reference docs
  - `hooks/dist/` - Compiled hooks for installation
  - `scripts/` - Build scripts

## Workspace Locations

GSD installs to three possible locations depending on selection:

**Claude Code:**
- Global: `~/.claude/get-shit-done/` (commands, agents, hooks)
- Local: `./.claude/get-shit-done/` (project-specific)

**OpenCode:**
- Global: `~/.config/opencode/get-shit-done/` (XDG Base Directory)
- Local: `./.opencode/get-shit-done/`

**Gemini CLI:**
- Global: `~/.gemini/get-shit-done/`
- Local: `./.gemini/get-shit-done/`

## Module Architecture

**Entry Points:**
- `bin/install.js` - Installation binary (published as `get-shit-done-cc`)
- `get-shit-done/bin/gsd-tools.cjs` - Core CLI utility with subcommands
- `hooks/` - PostToolUse and statusLine hooks

**Core Modules** (`get-shit-done/bin/lib/*.cjs`):
- `core.cjs` - Error handling and utilities
- `state.cjs` - Project state (STATE.md) operations
- `phase.cjs` - Phase management
- `roadmap.cjs` - Roadmap parsing and updates
- `verify.cjs` - Verification logic
- `config.cjs` - Configuration and settings
- `template.cjs` - Template system
- `milestone.cjs` - Milestone operations
- `commands.cjs` - Command execution and external service calls
- `init.cjs` - Initialization for various workflows
- `frontmatter.cjs` - Markdown frontmatter parsing

---

*Stack analysis: 2026-02-22*
