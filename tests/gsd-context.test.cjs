const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { GSD_CONTEXT_BIN_PATH, createTempProject, cleanup } = require('./helpers.cjs');

function setupFiles(tmpDir, files) {
  const projectDir = path.join(tmpDir, '.planning', 'project');
  fs.mkdirSync(projectDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectDir, name), content);
  }
}

function runContext(cwd, args = []) {
  try {
    const stdout = execSync(`node ${GSD_CONTEXT_BIN_PATH} ${args.join(' ')}`, {
      cwd,
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { exitCode: 0, stdout: stdout.toString(), stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status,
      stdout: (err.stdout || '').toString(),
      stderr: (err.stderr || '').toString()
    };
  }
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
  '',
  '## Phase 2: Build',
  '**Status:** Complete',
].join('\n');

describe('gsd-context', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it('no project: output contains "Project state: no-project" and next command', () => {
    const result = runContext(tmpDir);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('Project state: no-project'), 'should show no-project state');
    assert.ok(result.stdout.includes('Next suggested command: /new-project'), 'should suggest /new-project');
  });

  it('project defined: shows state and file presence/absence', () => {
    setupFiles(tmpDir, { 'PROJECT.md': '# My Project\n' });
    const result = runContext(tmpDir);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('Project state: project-defined'), 'should show project-defined state');
    assert.ok(result.stdout.includes('PROJECT.md'), 'should list PROJECT.md');
    assert.ok(result.stdout.includes('PROJECT-PLAN.md'), 'should mention PROJECT-PLAN.md');
  });

  it('phase 1 planned: shows current phase and total phases', () => {
    setupFiles(tmpDir, {
      'PROJECT.md': '# Project\n',
      'PROJECT-DISCUSSION.md': '---\nskipped: true\n---\n',
      'PROJECT-RESEARCH.md': '---\nskipped: true\n---\n',
      'PROJECT-PLAN.md': PLAN_2_PHASES,
      'PHASE-1-DISCUSSION.md': '---\nskipped: true\n---\n',
      'PHASE-1-RESEARCH.md': '---\nskipped: true\n---\n',
      'PHASE-1-PLAN.md': '# Phase 1\n',
    });
    const result = runContext(tmpDir);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('Current phase: 1 of 2'), 'should show phase 1 of 2');
    assert.ok(result.stdout.includes('Project state: phase-1-planned'), 'should show phase-1-planned');
  });

  it('project verified: no next command line', () => {
    setupFiles(tmpDir, {
      'PROJECT.md': '# Project\n',
      'PROJECT-PLAN.md': PLAN_2_PHASES,
      'PHASE-1-PLAN.md': '# Phase 1\n',
      'PHASE-2-PLAN.md': '# Phase 2\n',
      'PROJECT-SUMMARY.md': SUMMARY_PHASE_1_AND_2,
      'PHASE-1-VERIFICATION.md': '# Verified\n',
      'PHASE-2-VERIFICATION.md': '# Verified\n',
      'PROJECT-VERIFICATION.md': '# Project Verified\n',
    });
    const result = runContext(tmpDir);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('Project state: project-verified'), 'should show project-verified');
    assert.ok(!result.stdout.includes('Next suggested command'), 'should NOT have next command line');
  });

  it('error resilience: outputs unknown state on failure', () => {
    // Create a file where .planning/project/ should be a directory to force readdirSync to throw
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.planning', 'project'), 'not a directory');
    const result = runContext(tmpDir);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('Project state: unknown'), 'should show unknown state');
    assert.ok(result.stdout.includes('State resolution failed'), 'should mention failure');
  });

  it('output is not JSON', () => {
    const result = runContext(tmpDir);
    assert.equal(result.exitCode, 0);
    assert.ok(!result.stdout.trimStart().startsWith('{'), 'output should not start with {');
  });
});
