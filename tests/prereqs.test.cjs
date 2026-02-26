const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PREREQS_HOOK_PATH, createTempProject, cleanup, runHook } = require('./helpers.cjs');

const PLAN_2_PHASES = '### Phase 1: Setup\n### Phase 2: Build\n';
const PLAN_1_PHASE = '### Phase 1: Setup\n';

describe('gsd-prereqs hook', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('utility commands passthrough', () => {
    for (const cmd of ['help', 'health', 'todo', 'map', 'debug']) {
      it(`exits 0 with no output for gsd:${cmd}`, () => {
        const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: `gsd:${cmd}` } }, tmpDir);
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout, '');
      });
    }

    it('exits 0 for utility commands even without .planning dir', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:help' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, '');
    });
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

    it('exits 2 for discuss-phase without args', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:discuss-phase' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('Phase number is required'));
    });

    it('exits 2 for research-phase without args', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:research-phase' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('Phase number is required'));
    });

    it('exits 2 for verify-phase without args', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:verify-phase' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('Phase number is required'));
    });
  });

  describe('new-project always allowed', () => {
    it('exits 0 with no .planning dir', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:new-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
    });

    it('exits 0 with existing project', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:new-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
    });
  });

  describe('project commands blocked when no project', () => {
    for (const cmd of ['discuss-project', 'research-project', 'plan-project']) {
      it(`exits 2 for ${cmd} when no project exists`, () => {
        const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: `gsd:${cmd}` } }, tmpDir);
        assert.equal(result.exitCode, 2);
        assert.ok(result.stderr.includes('No project defined'));
      });
    }

    for (const cmd of ['discuss-project', 'research-project', 'plan-project']) {
      it(`exits 0 for ${cmd} when PROJECT.md exists`, () => {
        const planDir = path.join(tmpDir, '.planning', 'project');
        fs.mkdirSync(planDir, { recursive: true });
        fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

        const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: `gsd:${cmd}` } }, tmpDir);
        assert.equal(result.exitCode, 0);
      });
    }
  });

  describe('phase commands blocked without project plan', () => {
    for (const cmd of ['discuss-phase', 'research-phase', 'plan-phase']) {
      it(`exits 2 for ${cmd} 1 when no PROJECT-PLAN.md exists`, () => {
        const planDir = path.join(tmpDir, '.planning', 'project');
        fs.mkdirSync(planDir, { recursive: true });
        fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

        const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: `gsd:${cmd}`, args: '1' } }, tmpDir);
        assert.equal(result.exitCode, 2);
        assert.ok(result.stderr.includes('No project plan found'));
      });
    }

    for (const cmd of ['discuss-phase', 'research-phase', 'plan-phase']) {
      it(`exits 0 for ${cmd} 1 when PROJECT-PLAN.md with Phase 1 exists`, () => {
        const planDir = path.join(tmpDir, '.planning', 'project');
        fs.mkdirSync(planDir, { recursive: true });
        fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
        fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_1_PHASE);

        const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: `gsd:${cmd}`, args: '1' } }, tmpDir);
        assert.equal(result.exitCode, 0);
      });
    }

    it('exits 2 when requesting phase beyond what exists in plan', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_1_PHASE);

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:plan-phase', args: '2' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('Phase 2 not found'));
    });
  });

  describe('execute-phase blocked without phase plan', () => {
    it('exits 2 when PHASE-N-PLAN.md is missing', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('PHASE-1-PLAN.md not found'));
    });

    it('exits 0 when PHASE-N-PLAN.md exists', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_1_PHASE);
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
    });
  });

  describe('verify-phase blocked without plan or summary', () => {
    it('exits 2 when PHASE-N-PLAN.md is missing', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:verify-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('PHASE-1-PLAN.md not found'));
    });

    it('exits 2 when PHASE-N-PLAN.md exists but PROJECT-SUMMARY.md missing', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:verify-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('PROJECT-SUMMARY.md not found'));
    });

    it('exits 0 when both PHASE-N-PLAN.md and PROJECT-SUMMARY.md exist', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_1_PHASE);
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-SUMMARY.md'), '## Phase 1: Setup\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:verify-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
    });
  });

  describe('verify-project always allowed', () => {
    it('exits 0 even with no project files', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:verify-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
    });

    it('exits 0 with project files present', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:verify-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
    });
  });

  describe('end-project blocked when no project', () => {
    it('exits 2 when no .planning/project dir', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:end-project' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('No project to end'));
    });

    it('exits 0 when PROJECT.md exists', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:end-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
    });
  });

  describe('soft warnings', () => {
    it('warns when codebase map missing for new-project', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:new-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
    });

    it('warns when codebase map missing for research-project', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:research-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
    });

    it('warns when codebase map missing for plan-project', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:plan-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
    });

    it('warns when codebase map missing for discuss-project', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:discuss-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
    });

    it('no codebase warning when codebase directory exists', () => {
      const codebaseDir = path.join(tmpDir, '.planning', 'codebase');
      fs.mkdirSync(codebaseDir, { recursive: true });
      fs.writeFileSync(path.join(codebaseDir, 'tech-stack.md'), '# Tech Stack\n');
      const projectDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:research-project' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      if (result.stdout) {
        const output = JSON.parse(result.stdout);
        assert.ok(!output.hookSpecificOutput.additionalContext.includes('No codebase map found'));
      }
    });

    it('warns when PROJECT.md missing for execute-phase', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      assert.ok(output.hookSpecificOutput.additionalContext.includes('PROJECT.md not found'));
    });

    it('no execute-phase soft warning when PROJECT.md exists', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_1_PHASE);
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'gsd:execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      // May have sequence warning but not the PROJECT.md soft warning
      if (result.stdout) {
        const output = JSON.parse(result.stdout);
        assert.ok(!output.hookSpecificOutput.additionalContext.includes('PROJECT.md not found'));
      }
    });
  });

  describe('out-of-sequence detection', () => {
    it('injects out-of-sequence warning when running ahead', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_2_PHASES);
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

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
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_1_PHASE);

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'plan-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stdout, '');
    });

    it('out-of-sequence warning combines with existing soft warning', () => {
      const planDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'PROJECT-PLAN.md'), PLAN_1_PHASE);
      fs.writeFileSync(path.join(planDir, 'PHASE-1-PLAN.md'), '# Phase 1 Plan\n');

      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'expected stdout output');
      const output = JSON.parse(result.stdout);
      const ctx = output.hookSpecificOutput.additionalContext;
      assert.ok(ctx.includes('PROJECT.md not found'), 'should have soft warning');
      assert.ok(ctx.includes('Out of sequence'), 'should have sequence warning');
    });
  });

  describe('skill without gsd: prefix', () => {
    it('matches rules when skill lacks gsd: prefix', () => {
      const result = runHook(PREREQS_HOOK_PATH, { tool_input: { skill: 'execute-phase', args: '1' } }, tmpDir);
      assert.equal(result.exitCode, 2);
      assert.ok(result.stderr.includes('PHASE-1-PLAN.md not found'));
    });
  });

  describe('invalid JSON on stdin', () => {
    it('exits 0 on garbage input', () => {
      const result = runHook(PREREQS_HOOK_PATH, 'not valid json {{{', tmpDir);
      assert.equal(result.exitCode, 0);
    });
  });
});
