const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PREREQS_HOOK_PATH, createTempProject, cleanup, runHook } = require('./helpers.cjs');

describe('gsd-prereqs hook', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('non-GSD passthrough', () => {
    it('exits 0 with no output for unrelated skills', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'some-other-skill' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, '');
    });
  });

  describe('phase number required', () => {
    it('exits 2 when phase command has no args', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('Phase number is required'));
    });

    it('exits 2 when phase command has empty args', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:plan-phase', args: '' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('Phase number is required'));
    });
  });

  describe('hard fail — missing file', () => {
    it('exits 2 when PHASE-N-PLAN.md is missing', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('PHASE-1-PLAN.md not found'));
    });
  });

  describe('hard fail — phase not in PROJECT-PLAN.md', () => {
    it('exits 2 when phase does not exist in plan', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), '### Phase 1: Setup\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:plan-phase', args: '2' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('Phase 2 not found'));
    });
  });

  describe('soft warning — missing optional file', () => {
    it('exits 0 with additionalContext when soft prereq missing', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('PROJECT.md not found'));
    });
  });

  describe('all prereqs met — silent pass', () => {
    it('exits 0 with no output when all files present', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, '');
    });
  });

  describe('skill without gsd: prefix', () => {
    it('matches rules when skill lacks gsd: prefix', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('PHASE-1-PLAN.md not found'));
    });
  });

  describe('verify-phase hard fail', () => {
    it('exits 2 when PROJECT-SUMMARY.md is missing', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:verify-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('PROJECT-SUMMARY.md not found'));
    });
  });

  describe('invalid JSON on stdin', () => {
    it('exits 0 on garbage input', () => {
      const result = runHook(PREREQS_HOOK_PATH, 'not valid json {{{', tmpDir);
      assert.equal(result.exitCode, 0);
    });
  });
});
