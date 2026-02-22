# External Integrations

**Analysis Date:** 2026-02-22

## APIs & External Services

**Web Search:**
- Brave Search API - Optional integration for ecosystem research
  - Usage: `node gsd-tools.cjs websearch <query> [--limit N] [--freshness day|week|month]`
  - Env config: Checked in agent initialization (optional)
  - Purpose: Research phase can query current web documentation if configured
  - Client: Direct HTTP calls (implementation in `get-shit-done/bin/lib/commands.cjs`)

**npm Registry:**
- npm publish integration for package distribution
  - Usage: `npm publish` (via `prepublishOnly` hook runs `npm run build:hooks`)
  - Purpose: Publishes `get-shit-done-cc` package to npmjs.com
  - Authentication: npm credentials in `~/.npmrc` (standard npm auth)

**GitHub API:**
- Version checking (update detection)
  - Source: `hooks/gsd-check-update.js` spawns subprocess to fetch latest version
  - Endpoint: Uses `npm view get-shit-done-cc version` command
  - Purpose: Notifies user in statusline when update available
  - No authentication required (public API)

## Data Storage

**No External Databases:**
- All project data stored locally in `.planning/` directory structure
- State persisted in:
  - `PROJECT.md` - Project definition
  - `REQUIREMENTS.md` - Feature requirements
  - `ROADMAP.md` - Phase structure
  - `STATE.md` - Execution state
  - `.planning/phases/` - Phase-specific plans, research, and verification

**File System Only:**
- No cloud storage integration
- No database connections
- Caching:
  - Update check cache: `~/.claude/cache/gsd-update-check.json` (simple JSON)
  - Session metrics: `/tmp/claude-ctx-{session_id}.json` (temporary, context monitoring)
  - Todo state: `~/.claude/todos/` (session-specific task state)

## Authentication & Identity

**No Built-in Auth Provider:**
- GSD itself has no authentication layer
- Works with Claude Code, OpenCode, and Gemini CLI session auth (external)
- No identity management, OAuth, or JWT implementation

**IDE Integration:**
- Integrates with host IDE's existing authentication
- Claude Code: Uses IDE's API key/session
- OpenCode: Uses IDE's configuration
- Gemini CLI: Uses IDE's authentication

## Monitoring & Observability

**Error Tracking:**
- None - Silent error handling in hooks (fail-safe design)

**Context Window Monitoring:**
- PostToolUse hook (`hooks/gsd-context-monitor.js`):
  - Reads metrics from `/tmp/claude-ctx-{session_id}.json` (written by statusline)
  - Injects warnings when context usage exceeds thresholds
  - WARNING: remaining <= 35%
  - CRITICAL: remaining <= 25%
  - Debounced (5 tool uses between warnings)

**Logging:**
- Statusline hook (`hooks/gsd-statusline.js`):
  - Reads from stdin (JSON from IDE)
  - Writes metrics to bridge file for context monitor
  - Displays: model, current task, directory, context usage
  - Output via stdout

**Metrics Tracked:**
- Context window usage (percentage)
- Session ID for correlation
- Current task from todo state
- Timestamp for staleness detection

## CI/CD & Deployment

**Hosting:**
- Published to npm registry (npmjs.com)
- Source: GitHub repository (github.com/glittercowboy/get-shit-done)

**CI Pipeline:**
- GitHub Actions (minimal):
  - Auto-labeling issues (workflow: `auto-label-issues.yml`)
  - No build/test pipeline enforced on main branch

**Distribution:**
- npm package: `get-shit-done-cc`
- Installation: Interactive or non-interactive via `npx`

## Environment Configuration

**Required env vars:**
- None strictly required (all optional)

**Optional env vars:**
- `CLAUDE_CONFIG_DIR` - Custom Claude config path
- `GEMINI_CONFIG_DIR` - Custom Gemini config path
- `OPENCODE_CONFIG_DIR` - Custom OpenCode config path
- `XDG_CONFIG_HOME` - XDG Base Directory (OpenCode only)
- `OPENCODE_CONFIG` - Explicit OpenCode config file path
- `BRAVE_API_KEY` - For web search in research agents (optional)

**Secrets location:**
- `.env` files: Not used by GSD itself (GSD has no env file)
- IDE credentials: Managed by Claude Code, OpenCode, or Gemini CLI
- npm auth: `~/.npmrc` (standard npm authentication)
- Cache: `~/.claude/cache/`, `~/.gemini/`, `~/.config/opencode/`

## Webhooks & Callbacks

**Incoming:**
- None - GSD is a CLI tool, not a server

**Outgoing:**
- Git commits: Via subprocess (git command)
- npm publish: Via subprocess (npm command)
- subprocess spawns for:
  - Update checks: `npm view get-shit-done-cc version`
  - Git operations: `git add`, `git commit`, `git status`, `git log`, `git diff`

## IDE-Specific Integrations

**Claude Code Integration:**
- Statusline hook: Reads context window JSON, outputs formatted status bar
- PostToolUse hook: Reads context metrics, injects warnings to agent
- Settings: Registered in `~/.claude/settings.json`:
  ```json
  {
    "statusLine": {
      "type": "command",
      "command": "node ~/.claude/hooks/gsd-statusline.js"
    },
    "hooks": {
      "PostToolUse": [
        {
          "hooks": [
            {
              "type": "command",
              "command": "node ~/.claude/hooks/gsd-context-monitor.js"
            }
          ]
        }
      ]
    }
  }
  ```

**OpenCode Integration:**
- Same hook system as Claude Code
- Settings path: `~/.config/opencode/settings.json`

**Gemini CLI Integration:**
- Same hook system
- Settings path: `~/.gemini/settings.json`

## Command Invocation Flow

**User Input:**
```
/gsd:new-project  (typed in IDE)
           ↓
IDE recognizes /gsd: prefix
           ↓
IDE invokes command file: ~/.claude/commands/gsd/new-project.md
           ↓
Command orchestrates agents and tools
           ↓
Agents use Read, Write, Bash, Grep, Glob tools (IDE-provided)
           ↓
Results written back to project
```

**External Process Execution:**
- `gsd-tools.cjs commit` → spawns `git add`, `git commit`
- `gsd-tools.cjs websearch` → calls Brave API (if configured)
- Hooks invoked by IDE via stdin/stdout (JSON payloads)

---

*Integration audit: 2026-02-22*
