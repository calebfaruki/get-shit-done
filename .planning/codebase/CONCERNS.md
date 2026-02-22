# Codebase Concerns

**Analysis Date:** 2026-02-22

## Tech Debt

**Large installer script complexity:**
- Issue: `bin/install.js` is 1,865 lines with complex multi-runtime logic (Claude, OpenCode, Gemini)
- Files: `bin/install.js` (lines 1-1865)
- Impact: Hard to maintain, high risk for edge-case bugs during installation, difficult to test all path combinations
- Fix approach: Extract runtime-specific logic into separate modules (`install-claude.js`, `install-opencode.js`, `install-gemini.js`), create shared utils for common operations (path resolution, file copying, settings management). Add comprehensive test suite for each runtime path.

**Multiple path resolution strategies:**
- Issue: Different path expansion logic scattered across `bin/install.js` - `expandTilde()`, `getGlobalDir()`, `getOpencodeGlobalDir()`, `getConfigDirFromHome()` perform related but non-standardized operations
- Files: `bin/install.js` (lines 75-186, 100-165, 55-68, 142-165)
- Impact: Risk of path miscalculation across different runtimes, especially with custom `--config-dir` flags. Windows vs Unix path handling fragile.
- Fix approach: Create centralized PathResolver class with consistent interface. Add comprehensive path tests for Windows/Unix with env var overrides.

**Runtime detection and conversion logic:**
- Issue: Tool name mapping tables (`claudeToOpencodeTools`, `claudeToGeminiTools`) hardcoded in install.js with incomplete coverage and potential for divergence
- Files: `bin/install.js` (lines 309-372)
- Impact: New tools added to agents may not convert properly for OpenCode/Gemini, causing "tool not found" errors. Maintenance burden when Claude Code adds new built-in tools.
- Fix approach: Move to centralized `tool-mappings.json`, validate all agents against current mapping at build time, add CI check to ensure mapping completeness.

**JSONC parser inline implementation:**
- Issue: Custom JSONC parser at `bin/install.js` lines 1056-1110 could have edge cases
- Files: `bin/install.js` (lines 1056-1110)
- Impact: OpenCode permission failures if user has complex comment patterns or escape sequences in `opencode.json`
- Fix approach: Use battle-tested `jsonc-parser` npm package instead, or add comprehensive test suite for the inline parser with fuzzing against real OpenCode config files.

**Orphaned file cleanup patterns:**
- Issue: Multiple `cleanupOrphanedFiles()`, `cleanupOrphanedHooks()` functions maintain hardcoded lists of old files/hooks
- Files: `bin/install.js` (lines 737-807)
- Impact: Risk of missing orphaned files when deprecating hooks, manual updates required for each new version cleanup
- Fix approach: Create `deprecation-registry.json` with structured version → removed files mapping. Build cleanup dynamically from registry.

---

## Known Bugs

**Auto-advance chain fragile with skill resolution:**
- Symptoms: Skills don't resolve inside Task subagents spawned during auto-advance chains. Error: "Task subagents cannot see project skills"
- Files: `agents/gsd-executor.md`, `agents/gsd-planner.md` (subagent spawning logic)
- Trigger: Run `/gsd:new-project --auto` or enable `workflow.auto_advance` in config, then chain executes and hits a phase requiring Skills tool (mcp__context7__*)
- Workaround: Disable auto-advance (`/gsd:set-profile balanced` sets `workflow.auto_advance: false`), or manually execute phases sequentially with `/gsd:execute-phase`
- Status: Fixed in #669 but fix may need validation in multi-agent skill resolution patterns

**Gemini template variable escaping edge cases:**
- Symptoms: Gemini agents fail validation with "Template validation failed: Missing required input parameters" when agent bodies contain shell variables
- Files: `bin/install.js` (lines 459-468 - `escapedBody = body.replace(/\$\{(\w+)\}/g, '$$$1')`)
- Trigger: Agent has bash code block with `${VARIABLE}` patterns, install for Gemini runtime
- Workaround: None - installation fails. User must install for Claude Code instead.
- Status: Partially fixed (#687) - strips `${VAR}` to `$VAR` but may fail with complex patterns like `${VAR:-default}` or nested variables

**Plan metadata corruption with special characters:**
- Symptoms: YAML frontmatter parsing may silently corrupt quoted strings in plan metadata
- Files: `agents/gsd-planner.md`, any code processing plan frontmatter
- Trigger: Plan contains apostrophes or quotes in task descriptions: `description: "It's a test"` may become malformed
- Workaround: Escape quotes in action descriptions: `It\'s a test`
- Status: Potential issue - full extent unknown without testing real data

---

## Security Considerations

**Arbitrary code execution in hooks:**
- Risk: `bin/install.js` spawns child processes with `execSync` for version checking (line 1043), could be leveraged if hook paths are manipulated
- Files: `hooks/gsd-check-update.js` (uses `execSync`), `bin/install.js` (spawns subprocess)
- Current mitigation: Paths come from `process.env` or hardcoded, input validation on `--config-dir` argument (lines 147-164)
- Recommendations: (1) Validate `--config-dir` is within `/home` or `/Users` (block `/` or `~` escapes), (2) Use `spawn()` instead of `execSync` for version checking with timeout, (3) Implement hook signature verification before execution.

**API key exposure in settings.json:**
- Risk: Users may paste credentials into `settings.json` or agent frontmatter, which could be accidentally committed or included in `.planning/` files
- Files: Settings written to config directory, not enforced as .gitignore
- Current mitigation: Documentation recommends `.env` for secrets, but no technical enforcement
- Recommendations: (1) Add `.gitignore` template to GSD config directory auto-creation, (2) Scan plan/summary files before commit for common secret patterns (API_KEY=, Bearer token, etc.), (3) Document mandatory `.env` usage in agent context.

**Command injection in git commit messages:**
- Risk: User-supplied content in SUMMARY.md or task descriptions could be embedded in commit messages, potentially with shell metacharacters
- Files: `agents/gsd-executor.md` (commits with SUMMARY content), anywhere git commits are built
- Current mitigation: Commit messages passed via git commit -m, not shell interpolation
- Recommendations: (1) Audit all git commit construction, (2) Never shell-interpolate user content, (3) Add integration tests with quotes/backticks in task descriptions.

**Insufficient `.planning/` directory permissions validation:**
- Risk: If `.planning/` directory is world-readable/writable, sensitive phase data could be exposed or corrupted
- Files: Directory created during `/gsd:new-project`, no permission checks
- Current mitigation: None
- Recommendations: (1) Create `.planning/` with `0700` (user-only), (2) Check permissions on startup and warn if overly permissive, (3) Document security implications in README.

---

## Performance Bottlenecks

**Context window explosion in multi-phase projects:**
- Problem: Executor agents receive full history of all completed phases, causing context to balloon on large projects (20+ phases)
- Files: `agents/gsd-executor.md` (loads entire STATE.md and phase history), Phase research agents load all previous SUMMARY files
- Cause: Token usage grows linearly with project size. 100-phase project could be 50KB+ of history in each agent's context.
- Improvement path: (1) Implement history compression via `gsd-tools history-digest` (already in place for planners, extend to executors), (2) Archive completed milestone summaries separately and reference by link, (3) Implement summary pruning - keep last 10 phases in context, archive rest, (4) Add token counting to agents to proactively warn at 150k threshold.

**Recursive dependency resolution in large codebases:**
- Problem: Plan checker validates dependency graphs recursively (task A depends on B, B depends on C...). Large projects with 50+ tasks can see exponential validation time
- Files: `agents/gsd-plan-checker.md` (dependency validation logic)
- Cause: No memoization of cycle detection or path validation
- Improvement path: (1) Use topological sort instead of recursive validation, (2) Detect cycles in O(n) with DFS, (3) Add cycle detection test suite with varying graph shapes.

**Inefficient phase directory enumeration:**
- Problem: Multiple commands list phase directories with `ls | sort -V` patterns, fragile and slow on projects with 20+ phases
- Files: Commands using phase enumeration, though `gsd-tools phases list` mitigates this
- Cause: Reliance on filesystem ordering, no caching
- Improvement path: (1) Centralize phase discovery in gsd-tools (already done), (2) Add optional caching in config, (3) Pre-compute phase list at project init and update incrementally.

**Verifier cross-reference performance:**
- Problem: Verification reports cross-reference three independent sources (VERIFICATION.md, SUMMARY frontmatter, REQUIREMENTS.md) for each requirement. Large milestones (50+ requirements) could be slow
- Files: `agents/gsd-verifier.md`
- Cause: Triple-pass requirement checking with multiple file reads
- Improvement path: (1) Pre-index all requirements in STATE.md during plan completion, (2) Aggregate sources in single verifier pass, (3) Add benchmarks for N=50, 100, 200 requirements.

---

## Fragile Areas

**YAML frontmatter parsing across agents:**
- Files: `agents/gsd-planner.md`, `agents/gsd-executor.md`, `agents/gsd-verifier.md` (all parse plan/summary YAML)
- Why fragile: Manual regex-based parsing, no schema validation, inconsistent behavior across agents. Changes to PLAN template format require updates in multiple files.
- Safe modification: (1) Centralize frontmatter parsing in gsd-tools with schema validation, (2) Create unit tests for each agent's expected frontmatter format, (3) Update agents to use gsd-tools frontmatter get/set/validate (already partially done in 1.17.0), (4) Add pre-commit hook to validate frontmatter in all generated plans.
- Test coverage: Planner has limited tests, executor has none for frontmatter edge cases, plan-checker missing validation tests.

**Decimal phase numbering system:**
- Files: `agents/gsd-planner.md`, `bin/gsd-tools.cjs`, `get-shit-done/references/decimal-phase-calculation.md`
- Why fragile: Phase numbers are floats (1.0, 1.1, 1.2, 2.0). Floating-point comparison and string sorting can diverge. Inserting phase between 1.9 and 2.0 requires complex calculation.
- Safe modification: Test phase insertion extensively with edge cases (insert between 1.99-2.0, renumber 50+ phases, handle phase 10.1+ spacing). Add deterministic comparison function, never rely on float equality.
- Test coverage: Decimal calculation has reference doc but no comprehensive test suite.

**State machine transitions in phase workflow:**
- Files: All workflows (discuss-phase, plan-phase, execute-phase, verify-phase), STATE.md tracking
- Why fragile: Complex state transitions (research → planning → execution → verification → gap closure → archive). User cancellations, retries, and milestone jumps can leave STATE.md in inconsistent states.
- Safe modification: (1) Add state transition validator to gsd-tools, (2) Create state machine diagram in docs, (3) Extensive testing of cancel/retry scenarios, (4) Consider adding state machine library to enforce valid transitions.
- Test coverage: Limited testing of interrupted workflows.

**Commit message generation and git integration:**
- Files: `agents/gsd-executor.md` (builds commit messages), anywhere phase completion commits
- Why fragile: Commit messages embed SUMMARY content. If user cancels execution mid-way, commit message may reference incomplete work. Git history can become confusing with partial commits.
- Safe modification: Validate SUMMARY exists before committing, ensure all tasks marked done before git operations. Add abort-on-git-error to prevent partial state.
- Test coverage: No tests for git error scenarios or incomplete SUMMARY handling.

**Requirement traceability across phase completion:**
- Files: `agents/gsd-executor.md`, `agents/gsd-verifier.md`, `commands/gsd/complete-milestone.md`
- Why fragile: Requirements marked complete when phase completes, but manual reapply-patches or project edits can orphan requirement mappings (req in REQUIREMENTS.md but no plan claims it)
- Safe modification: Add requirement validation to `/gsd:health --repair`, detect orphaned requirements, offer user choice to remove or reassign.
- Test coverage: Some coverage added in 1.20.3 but edge cases around milestone boundaries remain untested.

---

## Scaling Limits

**Parallel execution wave limits:**
- Current capacity: Execute up to 10 agent waves in parallel (orchestrator spawns agents without explicit parallelism limit)
- Limit: Beyond 10 parallel agents, context overhead becomes significant. Model API may rate-limit or return slower responses.
- Scaling path: (1) Implement explicit wave size configuration (default 5-10, max 20), (2) Add monitoring to detect when waves exceed capacity, (3) Auto-split large waves into smaller batches, (4) Document recommended wave size by model (Opus = 10, Sonnet = 5).

**Phase numbering precision:**
- Current capacity: Supports phase 999.99 (3-digit major, 2-digit minor)
- Limit: Projects with >100 phases or >10 decimal sub-phases per major phase lose numbering precision. Sorting breaks after 99 phases.
- Scaling path: (1) Switch to semantic versioning (1.0.0, 1.0.1, 1.1.0 format) for unlimited precision, (2) Migrate existing projects with `gsd-tools phase-renumber` command, (3) Add validation to prevent >2-level nesting.

**Requirement ID generation:**
- Current capacity: REQ-01 through REQ-99 (hardcoded 2-digit limit in some places)
- Limit: Projects with >99 requirements fail or truncate IDs
- Scaling path: (1) Remove digit limit, switch to REQ-001, REQ-002 format, (2) Add tests for 3-digit requirement numbers, (3) Validate traceability table handles >99 entries.

**Milestone archival folder structure:**
- Current capacity: All milestones archived in `.planning/milestones/` flat structure
- Limit: With 20+ milestones, folder becomes cluttered. Git operations slow down with large `.planning/` history.
- Scaling path: (1) Implement hierarchical archival: `.planning/milestones/v1/`, `.planning/milestones/v2/`, (2) Add option to prune old milestone archives, (3) Document archive cleanup process.

---

## Dependencies at Risk

**execSync in version checking hook:**
- Risk: `hooks/gsd-check-update.js` uses `execSync` to run `npm view get-shit-done-cc version`. If npm registry is slow/down, it blocks all Claude Code sessions (10-second timeout, but timeout could be exceeded)
- Impact: User's editor hangs if npm is unreachable
- Migration plan: (1) Switch to async version checking with timeout, (2) Cache version locally for 24 hours, (3) Fail silently if check times out (don't block user), (4) Consider using GitHub API instead of npm registry for faster response.

**OpenCode JSONC parsing without schema:**
- Risk: Custom JSONC parser has no schema validation. Complex real-world OpenCode configs might have patterns the parser doesn't handle
- Impact: Silent corruption of `opencode.json`, permission setup fails
- Migration plan: (1) Replace with `jsonc-parser` npm package, (2) Add schema validation for opencode.json structure, (3) Write comprehensive tests against real OpenCode configs, (4) Add validation to installer before writing.

---

## Missing Critical Features

**No automatic recovery from failed executions:**
- Problem: If executor crashes mid-way through a plan, project is left in limbo with some tasks done, some not. User must manually run `/gsd:execute-phase` again, executor will retry all tasks, risk double-execution of completed tasks.
- Blocks: Truly reliable long-running milestone execution. Users avoid large phases due to reliability concern.

**No configurable executor retry strategy:**
- Problem: Executor has hard-coded attempt limits and backoff. Projects with flaky tests or slow builds can't configure higher retry counts.
- Blocks: Reliable execution in CI/CD contexts, projects with external service calls.

**No built-in refactoring or debt-reduction phase type:**
- Problem: Tech debt phases are treated like feature phases. There's no first-class "refactoring" phase with special handling for complexity validation or test coverage checks.
- Blocks: Systemic improvement of codebases, enforcing quality gates on legacy code.

---

## Test Coverage Gaps

**Untested area: Windows path handling:**
- What's not tested: Path expansion, backslash conversion, git commands with spaces in paths, hook template path substitution on Windows
- Files: `bin/install.js` (path handling), `hooks/gsd-*.js` (Windows-specific spawning), any git command construction
- Risk: Installation or hooks fail silently on Windows, users unaware until they try to use GSD
- Priority: High - multiple Windows issues in CHANGELOG (ESM conflicts, HEREDOC, path escaping), indicates fragile platform support

**Untested area: Gemini CLI agent compatibility:**
- What's not tested: Gemini CLI parses agent YAML differently than Claude Code. Conversion from Claude → Gemini format may have edge cases.
- Files: `bin/install.js` (`convertClaudeToGeminiAgent()` lines 392-469), Gemini agent files after install
- Risk: Gemini agents fail to load or execute, users can't use GSD with Gemini
- Priority: High - Gemini is officially supported but test coverage is minimal

**Untested area: OpenCode permission system:**
- What's not tested: Permission config generation, permission validation, interaction with JSONC parsing
- Files: `bin/install.js` (`configureOpencodePermissions()` lines 1117-1182)
- Risk: Permissions not correctly set, OpenCode prompts users constantly or blocks GSD access
- Priority: Medium - feature is less critical than Claude Code

**Untested area: Multi-runtime installation scenarios:**
- What's not tested: Installing for 2+ runtimes simultaneously, handling conflicts in settings.json merging
- Files: `bin/install.js` (multi-runtime install logic)
- Risk: Settings from one runtime override another, users confused
- Priority: Medium - edge case but growing as users adopt multiple tools

**Untested area: Executor continuation after interruption:**
- What's not tested: Executor resumes from checkpoint, verifies previous tasks completed, avoids double-execution
- Files: `agents/gsd-executor.md` (continuation logic lines 78-79)
- Risk: Executor redoes completed tasks on resume, creating duplicate commits or side effects
- Priority: High - core reliability concern for long-running execution

**Untested area: Requirement orphan detection:**
- What's not tested: Verifier correctly identifies requirements in REQUIREMENTS.md that no phase claims, audit properly flags for user action
- Files: `agents/gsd-verifier.md`, `commands/gsd/complete-milestone.md`
- Risk: Orphaned requirements silently ignored, milestone marked complete with uncovered requirements
- Priority: High - data integrity concern

---

## Monitoring & Observability

**Missing context window usage warnings:**
- Current state: Agents have manual token counting but no alerting mechanism
- Recommendation: Add `/gsd:context-monitor` hook output to statusline, warn when approaching 150k, recommend `/clear` at 170k+

**Missing execution performance metrics:**
- Current state: No tracking of plan execution time, agent startup time, or phase completion duration
- Recommendation: Log timing to STATE.md, generate performance report in `/gsd:progress`, help identify slow phases

**Missing error categorization:**
- Current state: Errors are generic, hard to debug root cause
- Recommendation: Implement error taxonomy (auth, timeout, syntax, API, git, file not found), include category in STATE.md blocker entries

---

*Concerns audit: 2026-02-22*
