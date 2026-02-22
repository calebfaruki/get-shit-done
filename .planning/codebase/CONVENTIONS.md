# Coding Conventions

**Analysis Date:** 2026-02-22

## Naming Patterns

**Files:**
- Module files: kebab-case with `.cjs` extension for CommonJS (e.g., `gsd-tools.cjs`, `frontmatter.cjs`, `phase.cjs`)
- Test files: descriptive name with `.test.cjs` suffix (e.g., `commands.test.cjs`, `phase.test.cjs`)
- Template/helper files follow lowercase conventions (e.g., `helpers.cjs`)

**Functions:**
- Command handlers: `cmd[CamelCase]` pattern (e.g., `cmdStateLoad`, `cmdPhasesList`, `cmdVerifySummary`)
- Internal/exported functions: camelCase (e.g., `extractFrontmatter`, `reconstructFrontmatter`, `normalizePhaseName`)
- Single-letter variables acceptable for loop iterators (`e`, `m`, `a`, `b`)

**Variables:**
- camelCase for local variables and parameters (e.g., `tmpDir`, `filePath`, `mentionedFiles`, `basePhase`)
- CONSTANT_CASE for configuration objects (e.g., `MODEL_PROFILES`)
- snake_case for object keys in output/API contracts (e.g., `state_path`, `summary_exists`, `files_created`)
- Prefix boolean variables with descriptive verbs: `isPassed`, `hasWarnings`, `fileExists` — or use verb-subject pattern like `passedCheck`, `existsFile`

**Types:**
- JavaScript uses dynamic typing; destructuring pattern used extensively in function parameters
- When documenting object shapes, use camelCase keys for internal objects, snake_case for output

## Code Style

**Formatting:**
- No linter/formatter configured in project
- Use standard spacing conventions: 2-space indentation (observed in all .cjs files)
- Line length: practical limit around 100-120 characters (not enforced)

**Linting:**
- No ESLint/Biome configuration present — no automated linting enforced
- Standard Node.js conventions apply (require at top, exports at bottom)

## Import Organization

**Order:**
1. Built-in Node.js modules first: `const fs = require('fs')`, `const path = require('path')`
2. Internal library modules: `const { output, error } = require('./core.cjs')`
3. No external npm dependencies in this codebase (only Node.js built-ins and internal modules)

**Path Aliases:**
- No path aliases configured
- Explicit relative paths used throughout: `require('./core.cjs')`, `require('./helpers.cjs')`

**Module exports:**
- Explicit function exports: `module.exports = { functionName, anotherFunction }`
- Barrel files not used
- Each module exports a set of related functions (e.g., `state.cjs` exports `cmdStateLoad`, `cmdStateGet`, `cmdStatePatch`)

## Error Handling

**Patterns:**
- Centralized error utility: `error(message)` from `core.cjs` — writes to stderr and exits with code 1
- Try-catch blocks used for file operations and JSON parsing: `try { ... } catch { ... }`
- Empty catch blocks common for optional file reads: `try { stateRaw = fs.readFileSync(...) } catch {}`
- Two-pronged success checks in tests: `assert.ok(result.success, \`Command failed: ${result.error}\`)`
- Result objects always include `success` boolean and often include `error` field

**Graceful degradation:**
- Malformed files skipped rather than stopping entire operation (e.g., malformed SUMMARY.md in history-digest)
- Validation returns warnings array alongside pass/fail boolean
- File not found returns structured error objects, not exceptions

## Logging

**Framework:** console (no logging library)

**Patterns:**
- No debug logging visible in code
- Output via centralized `output(result, raw, rawValue)` function from `core.cjs`
- Raw output mode (`--raw` flag) outputs plain text/values instead of JSON
- stderr used only for fatal errors via `error()` function

## Comments

**When to Comment:**
- Minimal comments — most functions have docblock header describing purpose
- Comments added for non-obvious logic: regex patterns, state machine transitions, file format parsing
- Section separators used for readability: `// ─── Section Name ───...` pattern

**JSDoc/TSDoc:**
- Standard block comment format: `/** ... */` at function level
- Describes what module does, not individual functions usually
- Example: `/** Phase — Phase CRUD, query, and lifecycle operations */`

## Function Design

**Size:**
- Functions range from 20-200 lines
- Larger functions handle complex CLI command parsing or multi-step verification
- Smaller utility functions handle single concerns (e.g., `safeReadFile`, `isGitIgnored`)

**Parameters:**
- CLI commands: `(cwd, ...args, raw)` pattern where `cwd` is working directory, `raw` is output flag
- Typically 2-4 parameters; destructuring used for options objects
- Raw flag always optional final boolean parameter for output formatting

**Return Values:**
- Command handlers: call `output(result, raw, rawValue)` and exit — no explicit returns
- Utility functions: return values directly (strings, booleans, objects, arrays)
- No null returns — use empty strings, empty arrays, or error objects instead

## Module Design

**Exports:**
- Each module exports specific command functions (not factory functions)
- `core.cjs` provides shared utilities (`output`, `error`, `safeReadFile`, `loadConfig`)
- Modules import only dependencies they need: `const { functionA, functionB } = require('./core.cjs')`

**Barrel Files:**
- Not used; main entry point `gsd-tools.cjs` imports each module explicitly

**Scope:**
- Module files in `lib/` handle specific domains: state, phase, roadmap, verify, etc.
- `gsd-tools.cjs` is the router that dispatches to correct module
- Shared logic extracted to `core.cjs` (file ops, git, config loading)

## CLI Argument Parsing

**Pattern:**
- Manual parsing via `process.argv` manipulation
- `--raw` flag detected and removed before command dispatch
- `--field`, `--phase`, `--type` style flags detected by `indexOf` and `splice`
- No argument parser library used

**Conventions:**
- Flags always after command and positional args
- Boolean flags use presence detection: `const raw = args.includes('--raw')`
- Value flags use adjacent element: `const phase = args[++i]` or similar manual parsing

## Phase Numbering

**Convention:**
- Phases use format: `01-foundation`, `02-api`, `03-ui` (two-digit-prefix-slug)
- Decimal phases supported: `02.1-hotfix`, `02.2-patch` (for emergency work)
- Numeric sorting handles both whole and decimal: `01 < 02 < 02.1 < 02.2 < 03`
- Normalization: removes leading zeros in comparisons but preserves in file paths

## Object Key Naming

**External/API Output:**
- snake_case for JSON output keys (e.g., `summary_exists`, `files_created`, `current_phase`)
- Facilitates parsing by external tools and agents

**Internal JavaScript:**
- camelCase for in-memory objects during processing
- Converted to snake_case before output via `output()` function

---

*Convention analysis: 2026-02-22*
