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

  describe('soft warning — missing codebase map', () => {
    it('warns when CODEBASE.md missing for research-project', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:research-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
    });

    it('warns when CODEBASE.md missing for plan-project', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:plan-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
    });

    it('warns when CODEBASE.md missing for discuss-project', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:discuss-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
    });

    it('no codebase warning when CODEBASE.md exists', () => {
      const planDir = path.join(tmpDir, '.planning');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'CODEBASE.md'), '# Codebase\n');
      const projectDir = path.join(planDir, 'project');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:research-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      if (result.stdout) {
        const output = JSON.parse(result.stdout);
        assert.ok(!output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
      }
    });
  });

  describe('all prereqs met — silent pass', () => {
    it('exits 0 with no output when all files present and in sequence', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), '### Phase 1: Setup\n');
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

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

  describe('out-of-sequence detection', () => {
    it('injects out-of-sequence warning when running ahead', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), '### Phase 1: Setup\n### Phase 2: Build\n');
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');
      // No PROJECT-SUMMARY.md — resolver says /execute-phase 1

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'plan-phase', args: '2' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('Out of sequence'));
      assert.ok(output.hookSpecificOutput.additionalContext.includes('/execute-phase 1'));
    });

    it('no warning when running in sequence', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), '### Phase 1: Setup\n');
      // No PHASE-1-PLAN.md — resolver says /plan-phase 1

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'plan-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, '');
    });

    it('out-of-sequence warning combines with existing soft warning', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), '### Phase 1: Setup\n');
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');
      // No PROJECT.md — soft warning for execute-phase + resolver says /new-project

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      const ctx = output.hookSpecificOutput.additionalContext;
      assert.ok(ctx.includes('PROJECT.md not found'), 'should have soft warning');
      assert.ok(ctx.includes('Out of sequence'), 'should have sequence warning');
    });
  });
});
