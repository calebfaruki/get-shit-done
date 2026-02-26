const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { END_PROJECT_BIN_PATH, createTempProject, cleanup } = require('./helpers.cjs');

function setupFiles(tmpDir, files) {
  const projectDir = path.join(tmpDir, '.planning', 'project');
  fs.mkdirSync(projectDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectDir, name), content);
  }
}

function runEndProject(tmpDir, args = []) {
  return spawnSync('node', [END_PROJECT_BIN_PATH, ...args], {
    cwd: tmpDir,
    timeout: 5000,
    env: { ...process.env, FORCE_COLOR: '0' }
  });
}

const PLAN_2_PHASES = [
  '---',
  'phase_count: 2',
  '---',
  '# Project Plan',
  '',
  '### Phase 1: Setup',
  'Build the foundation.',
  '',
  '### Phase 2: Build',
  'Build the feature.',
].join('\n');

const SUMMARY_PHASE_1_AND_2 = [
  '## Phase 1: Setup',
  '**Status:** Complete',
  '**Files changed:** file1.js',
  '',
  '## Phase 2: Build',
  '**Status:** Complete',
  '**Files changed:** file2.js',
].join('\n');

describe('end-project', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it('no-project: exits 0, prints "No project to clean up"', () => {
    const result = runEndProject(tmpDir);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.toString().includes('No project to clean up'));
  });

  it('unverified project: prints warning with incomplete steps', () => {
    setupFiles(tmpDir, {
      'PROJECT.md': '# Project: Test\n',
      'PROJECT-PLAN.md': PLAN_2_PHASES,
      'PHASE-1-PLAN.md': '# Phase 1\n',
    });
    const result = runEndProject(tmpDir, ['--yes']);
    const stdout = result.stdout.toString();
    assert.equal(result.status, 0);
    assert.ok(stdout.includes('WARNING'), 'should contain WARNING');
    assert.ok(stdout.includes('not fully verified'), 'should mention not fully verified');
    assert.ok(stdout.includes('phase-1-executed'), 'should list incomplete step');
  });

  it('verified project: no warning printed', () => {
    setupFiles(tmpDir, {
      'PROJECT.md': '# Project: Test\n',
      'PROJECT-PLAN.md': PLAN_2_PHASES,
      'PHASE-1-PLAN.md': '# Phase 1\n',
      'PHASE-2-PLAN.md': '# Phase 2\n',
      'PROJECT-SUMMARY.md': SUMMARY_PHASE_1_AND_2,
      'PHASE-1-VERIFICATION.md': '# Verified\n',
      'PHASE-2-VERIFICATION.md': '# Verified\n',
      'PROJECT-VERIFICATION.md': '# Project Verified\n',
    });
    const result = runEndProject(tmpDir, ['--yes']);
    const stdout = result.stdout.toString();
    assert.equal(result.status, 0);
    assert.ok(!stdout.includes('WARNING'), 'should NOT contain WARNING');
  });

  it('--yes flag wipes without prompt', () => {
    setupFiles(tmpDir, {
      'PROJECT.md': '# Project: Test\n',
      'PROJECT-PLAN.md': PLAN_2_PHASES,
      'PHASE-1-PLAN.md': '# Phase 1\n',
      'PHASE-2-PLAN.md': '# Phase 2\n',
      'PROJECT-SUMMARY.md': SUMMARY_PHASE_1_AND_2,
      'PHASE-1-VERIFICATION.md': '# Verified\n',
      'PHASE-2-VERIFICATION.md': '# Verified\n',
      'PROJECT-VERIFICATION.md': '# Project Verified\n',
    });
    const result = runEndProject(tmpDir, ['--yes']);
    const stdout = result.stdout.toString();
    assert.equal(result.status, 0);
    assert.ok(stdout.includes('wiped'), 'should confirm wipe');
    const projectDir = path.join(tmpDir, '.planning', 'project');
    assert.ok(!fs.existsSync(projectDir), '.planning/project/ should be removed');
  });

  it('warning still prints with --yes on unverified project', () => {
    setupFiles(tmpDir, {
      'PROJECT.md': '# Project: Test\n',
      'PROJECT-PLAN.md': PLAN_2_PHASES,
      'PHASE-1-PLAN.md': '# Phase 1\n',
    });
    const result = runEndProject(tmpDir, ['--yes']);
    const stdout = result.stdout.toString();
    assert.equal(result.status, 0);
    assert.ok(stdout.includes('WARNING'), 'should show warning');
    assert.ok(stdout.includes('wiped'), 'should still wipe');
  });
});
