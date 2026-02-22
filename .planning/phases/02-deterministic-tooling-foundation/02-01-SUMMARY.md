---
phase: 02-deterministic-tooling-foundation
plan: 01
subsystem: core-utilities
tags: [tdd, toolkit, atomic-writes, git-integration, validators, model-resolution]
dependency_graph:
  requires: []
  provides: [toolkit-library, atomic-file-writes, staleness-detection, prerequisite-validators, model-resolution]
  affects: [future-todo-crud, future-commands]
tech_stack:
  added: [toolkit.cjs]
  patterns: [temp-file-then-rename, pure-validators, structured-returns]
key_files:
  created:
    - get-shit-done/bin/lib/toolkit.cjs
    - tests/toolkit.test.cjs
  modified: []
decisions:
  - title: "Single-file library with zero dependencies"
    rationale: "Node.js stdlib (fs, path, child_process) is sufficient for all requirements. Zero dependencies eliminates installation brittleness."
  - title: "Pure validator functions returning {passed, message} objects"
    rationale: "Separates deterministic checking from reasoning. Validators report facts only, never fix or exit."
  - title: "Temp file in same directory as target for atomic writes"
    rationale: "Guarantees same filesystem device, avoiding EXDEV errors. More reliable than os.tmpdir()."
  - title: "Convert 'opus' to 'inherit' in model resolution"
    rationale: "Claude Code convention: 'inherit' means use the host-provided model (Claude Opus 4.6 in Claude Code)."
metrics:
  duration_minutes: 2
  tasks_completed: 2
  tests_added: 28
  tests_passing: 28
  files_created: 2
  lines_added: 540
  commits: 2
  completed_date: 2026-02-22
---

# Phase 02 Plan 01: Core Toolkit Library — SUMMARY

**Built a zero-dependency toolkit library with atomic file writes, git SHA staleness detection, prerequisite validators, and model resolution.**

## Execution Flow

### Task 1: RED — Write failing tests (d05dfc5)
**Status:** ✓ Complete

Created `tests/toolkit.test.cjs` with comprehensive TDD tests:
- **atomicWrite**: 6 tests (new file, overwrite, nested dirs, error handling, temp cleanup)
- **getCurrentCommitSHA**: 2 tests (git repo success, non-git error)
- **isCodebaseMapStale**: 3 tests (matching SHA, differing SHA, non-git handling)
- **checkPlanningDirExists**: 3 tests (dir exists, missing, file-not-dir)
- **checkFileExists**: 3 tests (exists, missing, nested paths)
- **checkMapNotStale**: 4 tests (SHA match, SHA differ, missing map, frontmatter extraction)
- **resolveModel**: 7 tests (default profile, opus→inherit, unknown agents, config loading, fallbacks)

All tests failed with `Cannot find module` error (correct RED phase).

**Verification:** `node --test tests/toolkit.test.cjs` — all tests fail as expected.

### Task 2: GREEN — Implement toolkit.cjs (da1fe67)
**Status:** ✓ Complete

Created `get-shit-done/bin/lib/toolkit.cjs` with 7 exported functions:

**1. atomicWrite(targetPath, content)**
- Writes to temp file: `.${basename}.${process.pid}.${Date.now()}.tmp`
- Temp file in same directory as target (avoids EXDEV errors)
- Atomic rename: `fs.renameSync(tmpPath, targetPath)`
- Cleanup on failure
- Returns `{success: boolean, error?: string}`

**2. getCurrentCommitSHA(cwd)**
- Executes `git rev-parse HEAD` via `execSync`
- Returns `{success: boolean, sha?: string, error?: string}`
- Handles non-git directories gracefully

**3. isCodebaseMapStale(cwd, storedSHA)**
- Calls `getCurrentCommitSHA` internally
- Compares current HEAD with stored SHA
- Returns `{stale: boolean|null, currentSHA?, storedSHA?, message?, error?}`

**4. checkPlanningDirExists(cwd)**
- Validates `.planning/` directory exists and is a directory
- Returns `{passed: boolean, message: string}`
- No console.log, no process.exit — pure validator

**5. checkFileExists(cwd, relativePath)**
- Validates file exists at relative path
- Returns `{passed: boolean, message: string}`

**6. checkMapNotStale(cwd, mapPath)**
- Reads map file YAML frontmatter
- Extracts `sha:` field
- Compares with current HEAD
- Returns `{passed: boolean, message: string, currentSHA?, storedSHA?}`

**7. resolveModel(cwd, agentType)**
- Reads `.planning/model-config.json` for `model_profile` (quality/balanced/budget)
- Defaults to 'balanced' when config missing or invalid
- Uses MODEL_PROFILES table for agent-specific models
- Converts 'opus' to 'inherit' (Claude Code convention)
- Returns model ID string

**Implementation details:**
- Zero external dependencies (fs, path, child_process only)
- No console.log or process.exit calls
- Pure functions with structured return objects
- Copied MODEL_PROFILES table from core.cjs (toolkit is standalone)

**Verification:**
- `node --test tests/toolkit.test.cjs` — all 28 tests pass
- `node --test tests/deletion-safety.test.cjs` — all 9 tests pass (no regressions)
- `node -e "..."` — verified all 7 functions exported
- `grep` — confirmed no console.log/process.exit, only stdlib requires

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

**1. Temp file placement strategy**
- **Decision:** Place temp file in same directory as target (not os.tmpdir())
- **Rationale:** Guarantees same filesystem device, making fs.renameSync atomic. Avoids EXDEV errors in Docker/network mounts.
- **Impact:** More reliable atomic writes across deployment environments.

**2. Pure validator pattern**
- **Decision:** Validators return `{passed, message}` objects, never fix or exit
- **Rationale:** Separates deterministic code (library) from reasoning (agents with knowledge docs). Follows Phase 2 architectural principle.
- **Impact:** Validators are testable, reusable, and composable. Fix logic belongs in Phase 3 knowledge docs.

**3. Model resolution config handling**
- **Decision:** Fall back to 'balanced' profile on any config error
- **Rationale:** Graceful degradation. Missing/invalid config shouldn't break commands.
- **Impact:** Robust behavior in edge cases (malformed JSON, missing file).

## Must-Have Truths Verified

- ✓ atomicWrite writes file content atomically using temp-file-then-rename
- ✓ atomicWrite cleans up temp file on failure
- ✓ getCurrentCommitSHA returns the current git HEAD SHA
- ✓ isCodebaseMapStale compares stored SHA against current HEAD and reports staleness
- ✓ checkPlanningDirExists returns {passed, message} for .planning directory presence
- ✓ checkFileExists returns {passed, message} for arbitrary file existence
- ✓ checkMapNotStale returns {passed, message} for codebase map freshness
- ✓ resolveModel returns correct model ID for agent type and profile
- ✓ resolveModel falls back to hardcoded defaults when no config exists

## Key Links Verified

- ✓ toolkit.cjs → fs.renameSync (atomicWrite uses temp-file-then-rename)
- ✓ toolkit.cjs → child_process.execSync (git rev-parse HEAD for SHA retrieval)
- ✓ toolkit.cjs → .planning/model-config.json (resolveModel config lookup)

## Artifacts Delivered

| Path | Lines | Provides |
|------|-------|----------|
| get-shit-done/bin/lib/toolkit.cjs | 286 | Core utility functions library (7 exports) |
| tests/toolkit.test.cjs | 254 | TDD tests (28 test cases, 7 suites) |

## Test Coverage

- **Total tests:** 28
- **Passing:** 28
- **Coverage areas:**
  - File I/O (atomic writes, cleanup, error handling)
  - Git integration (SHA retrieval, staleness detection)
  - Validators (directory/file existence, map freshness)
  - Model resolution (config loading, fallbacks, profile handling)

## Performance

- **Duration:** 2 minutes
- **Tasks:** 2 of 2 completed
- **Commits:** 2 (RED: d05dfc5, GREEN: da1fe67)
- **TDD cycle:** RED → GREEN (no refactor needed)

## Next Steps

Plan 02 (Todo CRUD) will consume toolkit functions:
- Use `atomicWrite` for todo file creation/updates
- Use validators for prerequisite checking
- Use frontmatter extraction patterns (demonstrated in checkMapNotStale)

## Self-Check: PASSED

**Files created:**
- ✓ get-shit-done/bin/lib/toolkit.cjs exists
- ✓ tests/toolkit.test.cjs exists

**Commits exist:**
- ✓ d05dfc5 (test: add failing tests)
- ✓ da1fe67 (feat: implement toolkit library)

**Verification commands passed:**
- ✓ All 28 toolkit tests pass
- ✓ All 9 deletion-safety tests pass (no regressions)
- ✓ All 7 functions exported
- ✓ No console.log or process.exit in library code
- ✓ Only stdlib requires (fs, path, child_process)
