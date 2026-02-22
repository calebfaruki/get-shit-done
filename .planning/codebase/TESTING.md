# Testing Patterns

**Analysis Date:** 2026-02-22

## Test Framework

**Runner:**
- Node.js built-in `node:test` module (no external test framework)
- Config: `package.json` defines script: `"test": "node --test tests/*.test.cjs"`
- Run all tests: `npm test`

**Assertion Library:**
- Node.js built-in `node:assert` module (`assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`)
- No external assertion library

**Run Commands:**
```bash
npm test                    # Run all tests in tests/*.test.cjs
node --test tests/file.test.cjs  # Run single test file
```

## Test File Organization

**Location:**
- All tests in `/Users/calebfaruki/get-shit-done/tests/` directory
- Co-located with source: test files are separate but mirror source domain naming

**Naming:**
- Format: `{domain}.test.cjs` (e.g., `commands.test.cjs`, `phase.test.cjs`, `state.test.cjs`)
- Test files: `commands.test.cjs`, `init.test.cjs`, `milestone.test.cjs`, `phase.test.cjs`, `roadmap.test.cjs`, `state.test.cjs`, `verify.test.cjs`

**Structure:**
```
tests/
├── helpers.cjs           # Shared test utilities
├── commands.test.cjs     # Tests for command operations
├── phase.test.cjs        # Tests for phase operations
├── verify.test.cjs       # Tests for verification suite
├── state.test.cjs        # Tests for state management
├── init.test.cjs         # Tests for initialization
├── roadmap.test.cjs      # Tests for roadmap operations
└── milestone.test.cjs    # Tests for milestone operations
```

## Test Structure

**Suite Organization:**
```javascript
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { runGsdTools, createTempProject, cleanup } = require('./helpers.cjs');

describe('history-digest command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('empty phases directory returns valid schema', () => {
    const result = runGsdTools('history-digest', tmpDir);
    assert.ok(result.success, `Command failed: ${result.error}`);

    const digest = JSON.parse(result.output);
    assert.deepStrictEqual(digest.phases, {}, 'phases should be empty object');
  });

  test('nested frontmatter fields extracted correctly', () => {
    // Test implementation
  });
});
```

**Patterns:**
- One `describe()` block per CLI command or feature group
- `beforeEach()` creates fresh temp directory for isolation
- `afterEach()` cleans up temp directory
- Each `test()` is single responsibility — tests one aspect of command behavior

## Mocking

**Framework:** None — tests use real file system and real CLI invocation

**Patterns:**
```javascript
// Real file system setup in beforeEach
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gsd-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

// Tests invoke CLI via execSync to actual tool
function runGsdTools(args, cwd = process.cwd()) {
  try {
    const result = execSync(`node "${TOOLS_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// Cleanup removes temp directory entirely
function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
```

**What to Mock:**
- Nothing — tests invoke real CLI tool via `execSync`
- Tests set up real file system state (ROADMAP.md, phase directories, etc.)

**What NOT to Mock:**
- File system — tests use real `fs` operations
- CLI tool — tests use real tool execution
- JSON parsing — output is real JSON from tool

## Fixtures and Factories

**Test Data:**
```javascript
// Example: Creating a phase with frontmatter
const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
fs.mkdirSync(phaseDir, { recursive: true });

fs.writeFileSync(
  path.join(phaseDir, '01-01-SUMMARY.md'),
  `---
phase: "01"
name: "Foundation Setup"
dependency-graph:
  provides:
    - "Database schema"
    - "Auth system"
  affects:
    - "API layer"
tech-stack:
  added:
    - "prisma"
    - "jose"
patterns-established:
  - "Repository pattern"
  - "JWT auth flow"
key-decisions:
  - "Use Prisma over Drizzle"
  - "JWT in httpOnly cookies"
---

# Summary content here
`
);
```

**Location:**
- Fixtures created inline in test functions
- No shared fixture files or factories
- Each test sets up exactly what it needs

## Coverage

**Requirements:** No enforced coverage requirements

**View Coverage:**
- Not configured — no coverage tooling present
- Tests are integration tests (invoke real tool with real files)

## Test Types

**Unit Tests:**
- Not strictly "unit" — tests are integration-level (invoke full CLI tool)
- Focus: test CLI command behavior end-to-end
- Scope: single command (e.g., `history-digest`, `phases list`, `verify summary`)
- Setup: minimal file system state needed for that command

**Integration Tests:**
- All tests are integration-level in practice
- Invoke full `gsd-tools` CLI tool via `execSync`
- Exercise file system and JSON parsing together
- Example: test command that reads ROADMAP.md, parses frontmatter, outputs JSON

**E2E Tests:**
- Not used
- Integration tests are sufficient (real tool, real files)

## Common Patterns

**Async Testing:**
- Tests are synchronous (no promises)
- CLI tool execution via `execSync` (blocks until complete)
- No async/await patterns in tests

**Error Testing:**
```javascript
test('fails for nonexistent todo', () => {
  const result = runGsdTools('todo complete nonexistent.md', tmpDir);
  assert.ok(!result.success, 'should fail');
  assert.ok(result.error.includes('not found'), 'error mentions not found');
});
```

**Assertion Patterns:**
```javascript
// Success check with error message
assert.ok(result.success, `Command failed: ${result.error}`);

// Equality checks
assert.strictEqual(output.current_phase, '03', 'current phase extracted');

// Deep equality for objects/arrays
assert.deepStrictEqual(digest.phases, {}, 'phases should be empty object');
assert.deepStrictEqual(
  digest.phases['01'].provides.sort(),
  ['Auth system', 'Database schema'],
  'provides should contain nested values'
);

// Array checks
assert.ok(
  digest.decisions.some(d => d.decision === 'Use Prisma over Drizzle'),
  'Should contain first decision'
);
assert.ok(
  !fs.existsSync(path.join(tmpDir, '.planning', 'todos', 'pending', 'add-dark-mode.md')),
  'should be removed from pending'
);
```

## Test Examples

**Example: Testing command success with JSON output**
```javascript
test('extracts phase section from ROADMAP.md', () => {
  fs.writeFileSync(
    path.join(tmpDir, '.planning', 'ROADMAP.md'),
    `# Roadmap v1.0

## Phases

### Phase 1: Foundation
**Goal:** Set up project infrastructure
**Plans:** 2 plans

### Phase 2: API
**Goal:** Build REST API
**Plans:** 3 plans
`
  );

  const result = runGsdTools('roadmap get-phase 1', tmpDir);
  assert.ok(result.success, `Command failed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.strictEqual(output.found, true, 'phase should be found');
  assert.strictEqual(output.phase_number, '1', 'phase number correct');
  assert.strictEqual(output.phase_name, 'Foundation', 'phase name extracted');
});
```

**Example: Testing with multiple files**
```javascript
test('multiple phases merged into single digest', () => {
  // Create phase 01
  const phase01Dir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
  fs.mkdirSync(phase01Dir, { recursive: true });
  fs.writeFileSync(
    path.join(phase01Dir, '01-01-SUMMARY.md'),
    `---
phase: "01"
provides:
  - "Database"
---
`
  );

  // Create phase 02
  const phase02Dir = path.join(tmpDir, '.planning', 'phases', '02-api');
  fs.mkdirSync(phase02Dir, { recursive: true });
  fs.writeFileSync(
    path.join(phase02Dir, '02-01-SUMMARY.md'),
    `---
phase: "02"
provides:
  - "REST endpoints"
---
`
  );

  const result = runGsdTools('history-digest', tmpDir);
  assert.ok(result.success, `Command failed: ${result.error}`);

  const digest = JSON.parse(result.output);
  assert.ok(digest.phases['01'], 'Phase 01 should exist');
  assert.ok(digest.phases['02'], 'Phase 02 should exist');
});
```

**Example: Testing file system changes**
```javascript
test('moves todo from pending to completed', () => {
  const pendingDir = path.join(tmpDir, '.planning', 'todos', 'pending');
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.writeFileSync(
    path.join(pendingDir, 'add-dark-mode.md'),
    `title: Add dark mode\narea: ui\ncreated: 2025-01-01\n`
  );

  const result = runGsdTools('todo complete add-dark-mode.md', tmpDir);
  assert.ok(result.success, `Command failed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.strictEqual(output.completed, true);

  // Verify moved
  assert.ok(
    !fs.existsSync(path.join(tmpDir, '.planning', 'todos', 'pending', 'add-dark-mode.md')),
    'should be removed from pending'
  );
  assert.ok(
    fs.existsSync(path.join(tmpDir, '.planning', 'todos', 'completed', 'add-dark-mode.md')),
    'should be in completed'
  );
});
```

## Test Helpers

**Helper Functions in `tests/helpers.cjs`:**

```javascript
// Run gsd-tools command in isolated context
function runGsdTools(args, cwd = process.cwd()) {
  try {
    const result = execSync(`node "${TOOLS_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// Create isolated temp project structure
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gsd-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

// Clean up temp directory
function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
```

## Test Execution Notes

**Isolation:**
- Each test gets fresh temp directory via `createTempProject()`
- No shared state between tests
- Cleanup runs after each test via `afterEach()`

**Determinism:**
- Tests use real file system — timing dependent but generally deterministic
- No randomization or flakiness observed
- File operations ordered (no concurrency)

**Debugging:**
- Run single test file: `node --test tests/phase.test.cjs`
- Add console.log to test; output appears on test failure
- Check `tmpDir` contents on failure (though cleanup still runs)

---

*Testing analysis: 2026-02-22*
