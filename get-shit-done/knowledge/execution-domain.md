# Execution Domain Knowledge

Agents load this document when executing plans. It covers TDD methodology, deviation handling, and tool usage for implementation work.

**When to load**: Executor agents read this before implementing tasks. Planners reference when creating execution plans.

---

<tdd_flow>

## TDD Methodology

TDD is about design quality, not coverage metrics. The red-green-refactor cycle forces you to think about behavior before implementation, producing cleaner interfaces and more testable code.

**Principle:** If you can describe the behavior as `expect(fn(input)).toBe(output)` before writing `fn`, TDD improves the result.

### When to Use TDD

**TDD candidates (create a TDD plan):**
- Business logic with defined inputs/outputs
- API endpoints with request/response contracts
- Data transformations, parsing, formatting
- Validation rules and constraints
- Algorithms with testable behavior
- State machines and workflows
- Utility functions with clear specifications

**Skip TDD (use standard plan with `type="auto"` tasks):**
- UI layout, styling, visual components
- Configuration changes
- Glue code connecting existing components
- One-off scripts and migrations
- Simple CRUD with no business logic
- Exploratory prototyping

**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
→ Yes: Create a TDD plan
→ No: Use standard plan, add tests after if needed

### Red-Green-Refactor Cycle

**RED - Write failing test:**
1. Create test file following project conventions
2. Write test describing expected behavior
3. Run test - it MUST fail
4. If test passes: feature exists or test is wrong. Investigate.

**GREEN - Implement to pass:**
1. Write minimal code to make test pass
2. No cleverness, no optimization - just make it work
3. Run test - it MUST pass

**REFACTOR (if needed):**
1. Clean up implementation if obvious improvements exist
2. Run tests - MUST still pass
3. Only refactor if changes improve code quality

**Important adaptation**: In the new workflow, the executor no longer commits after each phase. Changes remain unstaged throughout the TDD cycle. The verifier will stage all changes on successful verification.

### Test Quality

**Test behavior, not implementation:**
- Good: "returns formatted date string"
- Bad: "calls formatDate helper with correct params"
- Tests should survive refactors

**One concept per test:**
- Good: Separate tests for valid input, empty input, malformed input
- Bad: Single test checking all edge cases with multiple assertions

**Descriptive names:**
- Good: "should reject empty email", "returns null for invalid ID"
- Bad: "test1", "handles error", "works correctly"

**No implementation details:**
- Good: Test public API, observable behavior
- Bad: Mock internals, test private methods, assert on internal state

### Test Framework Setup

When executing a TDD plan but no test framework is configured, set it up as part of the RED phase:

**1. Detect project type:**
```bash
# JavaScript/TypeScript
if [ -f package.json ]; then echo "node"; fi

# Python
if [ -f requirements.txt ] || [ -f pyproject.toml ]; then echo "python"; fi

# Go
if [ -f go.mod ]; then echo "go"; fi

# Rust
if [ -f Cargo.toml ]; then echo "rust"; fi
```

**2. Install minimal framework:**

| Project | Framework | Install |
|---------|-----------|---------|
| Node.js | Jest | `npm install -D jest @types/jest ts-jest` |
| Node.js (Vite) | Vitest | `npm install -D vitest` |
| Python | pytest | `pip install pytest` |
| Go | testing | Built-in |
| Rust | cargo test | Built-in |

**3. Create config if needed:**
- Jest: `jest.config.js` with ts-jest preset
- Vitest: `vitest.config.ts` with test globals
- pytest: `pytest.ini` or `pyproject.toml` section

**4. Verify setup:**
```bash
# Run empty test suite - should pass with 0 tests
npm test  # Node
pytest    # Python
go test ./...  # Go
cargo test    # Rust
```

**5. Create first test file:**
Follow project conventions for test location:
- `*.test.ts` / `*.spec.ts` next to source
- `__tests__/` directory
- `tests/` directory at root

Framework setup is a one-time cost included in the first TDD plan's RED phase.

### Error Handling

**Test doesn't fail in RED phase:**
- Feature may already exist - investigate
- Test may be wrong (not testing what you think)
- Fix before proceeding

**Test doesn't pass in GREEN phase:**
- Debug implementation
- Don't skip to refactor
- Keep iterating until green

**Tests fail in REFACTOR phase:**
- Undo refactor
- Refactor in smaller steps

**Unrelated tests break:**
- Stop and investigate
- May indicate coupling issue
- Fix before proceeding

### Context Budget

TDD plans target **~40% context usage** (lower than standard plans' ~50%).

Why lower:
- RED phase: write test, run test, potentially debug why it didn't fail
- GREEN phase: implement, run test, potentially iterate on failures
- REFACTOR phase: modify code, run tests, verify no regressions

Each phase involves reading files, running commands, analyzing output. The back-and-forth is inherently heavier than linear task execution.

Single feature focus ensures full quality throughout the cycle.

</tdd_flow>

---

<deviation_rules>

## Deviation Rules

While executing, you WILL discover work not in the plan. Apply these rules automatically. Track all deviations for summary documentation.

**Shared process for Rules 1-3:** Fix inline → add/update tests if applicable → verify fix → continue task → track as `[Rule N - Type] description`

No user permission needed for Rules 1-3.

---

### RULE 1: Auto-fix bugs

**Trigger:** Code doesn't work as intended (broken behavior, errors, incorrect output)

**Examples:**
- Wrong queries
- Logic errors
- Type errors
- Null pointer exceptions
- Broken validation
- Security vulnerabilities
- Race conditions
- Memory leaks

**Process:**
1. Identify the bug
2. Fix the implementation
3. Add or update tests to cover the bug
4. Verify the fix works
5. Continue with the current task
6. Track the deviation in summary

---

### RULE 2: Auto-add missing critical functionality

**Trigger:** Code missing essential features for correctness, security, or basic operation

**Examples:**
- Missing error handling
- No input validation
- Missing null checks
- No auth on protected routes
- Missing authorization
- No CSRF/CORS protection
- No rate limiting
- Missing DB indexes
- No error logging

**Critical = required for correct/secure/performant operation.** These aren't "features" — they're correctness requirements.

**Process:**
1. Identify the missing critical functionality
2. Add the implementation
3. Add tests if applicable
4. Verify it works
5. Continue with the current task
6. Track the deviation in summary

---

### RULE 3: Auto-fix blocking issues

**Trigger:** Something prevents completing current task

**Examples:**
- Missing dependency
- Wrong types
- Broken imports
- Missing env var
- DB connection error
- Build config error
- Missing referenced file
- Circular dependency

**Process:**
1. Identify the blocker
2. Fix the issue
3. Verify the fix unblocks progress
4. Continue with the current task
5. Track the deviation in summary

---

### RULE 4: Ask about architectural changes

**Trigger:** Fix requires significant structural modification

**Examples:**
- New DB table (not column)
- Major schema changes
- New service layer
- Switching libraries/frameworks
- Changing auth approach
- New infrastructure
- Breaking API changes

**Action:** STOP → report to user with: what found, proposed change, why needed, impact, alternatives. **User decision required.**

**Process:**
1. Identify the architectural change needed
2. STOP execution immediately
3. Document the finding and proposed change
4. Return to user with a clear report
5. Wait for user decision

---

### Rule Priority

1. Rule 4 applies → STOP (architectural decision)
2. Rules 1-3 apply → Fix automatically
3. Genuinely unsure → Rule 4 (ask)

**Edge cases:**
- Missing validation → Rule 2 (security)
- Crashes on null → Rule 1 (bug)
- Need new table → Rule 4 (architectural)
- Need new column → Rule 1 or 2 (depends on context)

**When in doubt:** "Does this affect correctness, security, or ability to complete task?"
- YES → Rules 1-3
- MAYBE → Rule 4

---

### Scope Boundary

Only auto-fix issues DIRECTLY caused by the current task's changes. Pre-existing warnings, linting errors, or failures in unrelated files are out of scope.

- Log out-of-scope discoveries as todos in `.planning/todos/`
- Do NOT fix them
- Do NOT re-run builds hoping they resolve themselves

**The scope boundary ensures deviations stay within the planned work.** Rules 1-2 do not justify expanding beyond what was planned.

---

### Fix Attempt Limit

Track auto-fix attempts per task. After 3 auto-fix attempts on a single task:

1. STOP fixing — document remaining issues in summary under "Deferred Issues"
2. Continue to the next task (or stop and report if blocked)
3. Do NOT restart the build to find more issues

**The fix attempt limit prevents infinite loops.** If 3 attempts haven't solved it, the issue is either out of scope or needs architectural reconsideration.

</deviation_rules>

---

<tool_guidance>

## Tool Guidance for Execution

Executors use native Claude Code tools for all operations. NEVER use `gsd-tools.cjs` commands.

### Running Tests

Use **Bash** to run test commands. Always set a timeout on the Bash tool call to prevent hangs — test suites that hold open connections (database, server) can block indefinitely without one.

**Timeout:** Set the Bash tool `timeout` parameter appropriate to the suite size. Most test suites complete in under 2 minutes.

**If a test command hangs or times out:**
1. Do NOT re-run the same command hoping it works
2. Check for cleanup flags appropriate to the project's test runner (e.g., force-exit flags, open handle detection)
3. Kill orphaned processes if tests fail with port conflicts: `lsof -ti :<port> | xargs kill 2>/dev/null`
4. After 2 failed attempts at the same test command, document in PROJECT-SUMMARY.md Notes and continue to next task

**Mechanical batching:** When applying the same transformation across many files (SPEC: "if one instance is correct, they're all correct"), batch 3-5 changes and test once per batch. Reserve per-change testing for independent, non-mechanical modifications. The goal is catching regressions, not maximizing test runs.

### Loading Context

Use **Read** to load plan files and context:

```bash
# Read the plan
Read: .planning/project/PHASE-N-PLAN.md

# Read context files
Read: src/components/Chat.tsx
Read: src/api/messages.ts
```

### Creating/Modifying Files

Use **Write** to create new files:

```bash
# Create new file
Write: src/components/NewComponent.tsx
```

Use **Edit** to modify existing files:

```bash
# Edit existing file
Edit: src/components/ExistingComponent.tsx
```

### Finding Patterns

Use **Grep** to search for patterns in code:

```bash
# Find imports
Grep: pattern="^import.*Component" path="src/"

# Find TODO comments
Grep: pattern="TODO|FIXME" path="src/" output_mode="content"

# Find function definitions
Grep: pattern="function.*handleSubmit" path="src/" output_mode="content"
```

### Finding Files

Use **Glob** to find files by pattern:

```bash
# Find all test files
Glob: pattern="**/*.test.ts"

# Find all components
Glob: pattern="src/components/**/*.tsx"
```

### Git Operations

The executor does NOT stage or commit. All changes remain unstaged for the verifier.

**NEVER use these git commands:**
- `git add`
- `git commit`
- `git checkout`
- `git reset`
- `git stash`

The verifier will stage verified changes using `git add <file>` (explicit files only).

### Running Commands

Use **Bash** for general command execution:

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Build
npm run build
cargo build

# Lint
npm run lint
eslint src/

# Type check
npm run typecheck
tsc --noEmit
```

### Tool Usage Principles

1. **Read first**: Always read files before editing
2. **Explicit paths**: Use absolute paths, never relative
3. **Native tools only**: Never shell out to grep/find when Grep/Glob exist
4. **No git operations**: Changes stay unstaged for verifier
5. **Test strategically**: Run tests after each meaningful change. For mechanical changes across many files, batch and test per batch — not per file.

</tool_guidance>
