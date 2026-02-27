const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { STATE_RESOLVER_HOOK_PATH, createTempProject, cleanup, runHook } = require('./helpers.cjs');

function setupFiles(tmpDir, files) {
  const projectDir = path.join(tmpDir, '.planning', 'project');
  fs.mkdirSync(projectDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectDir, name), content);
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

const PLAN_3_PHASES = [
  '---',
  'phase_count: 3',
  '---',
  '# Project Plan',
  '',
  '### Phase 1: Setup',
  'Build the foundation.',
  '',
  '### Phase 2: Build',
  'Build the feature.',
  '',
  '### Phase 3: Polish',
  'Final touches.',
].join('\n');

const PLAN_DOUBLE_HASH = [
  '# Project Plan',
  '',
  '## Phase 1: Setup',
  'Build the foundation.',
  '',
  '## Phase 2: Build',
  'Build the feature.',
].join('\n');

const PLAN_MIXED_HASH = [
  '# Project Plan',
  '',
  '## Phase 1: Setup',
  'Build the foundation.',
  '',
  '### Phase 2: Build',
  'Build the feature.',
].join('\n');

const SUMMARY_PHASE_1 = [
  '## Phase 1: Setup',
  '**Status:** Complete',
  '**Files changed:** file1.js',
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

const SUMMARY_ALL_3 = [
  '## Phase 1: Setup',
  '**Status:** Complete',
  '',
  '## Phase 2: Build',
  '**Status:** Complete',
  '',
  '## Phase 3: Polish',
  '**Status:** Complete',
].join('\n');

const DISC_DONE = '---\nskipped: false\n---\n# Discussion\n';
const DISC_SKIPPED = '---\nskipped: true\n---\n';
const RESEARCH_DONE = '---\nskipped: false\n---\n# Research\n';
const RESEARCH_SKIPPED = '---\nskipped: true\n---\n';

describe('gsd-state-resolver', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('resolveState() unit tests', () => {
    function resolveState(dir) {
      const { resolveState } = require(STATE_RESOLVER_HOOK_PATH);
      return resolveState(dir);
    }

    describe('no-project state', () => {
      it('returns no-project when .planning/project/ does not exist', () => {
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'no-project');
        assert.equal(result.nextCommand, '/new-project');
        assert.equal(result.context, 'No project found.');
      });

      it('returns no-project when .planning/ exists but project/ does not', () => {
        fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'no-project');
        assert.equal(result.nextCommand, '/new-project');
      });

      it('returns no-project when .planning/project/ is empty', () => {
        fs.mkdirSync(path.join(tmpDir, '.planning', 'project'), { recursive: true });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'no-project');
        assert.equal(result.nextCommand, '/new-project');
      });
    });

    describe('project-defined state', () => {
      it('returns project-defined when PROJECT.md exists but PROJECT-PLAN.md does not', () => {
        setupFiles(tmpDir, { 'PROJECT.md': '# My Project\n' });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'project-defined');
        assert.equal(result.nextCommand, '/discuss-project');
        assert.ok(result.context.includes('(skip: /plan-project)'));
      });
    });

    describe('phase-N-unplanned state', () => {
      it('returns phase-1-unplanned when plan exists but PHASE-1-PLAN.md missing', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-1-unplanned');
        assert.equal(result.nextCommand, '/discuss-phase 1');
      });

      it('returns phase-2-unplanned when phase 1 verified but phase 2 plan missing', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-PLAN.md': '# Phase 1\n',
          'PROJECT-SUMMARY.md': SUMMARY_PHASE_1,
          'PHASE-1-VERIFICATION.md': '# Verified\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-2-unplanned');
        assert.equal(result.nextCommand, '/discuss-phase 2');
      });
    });

    describe('phase-N-planned state', () => {
      it('returns phase-1-planned when PHASE-1-PLAN.md exists but not in summary', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-PLAN.md': '# Phase 1\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-1-planned');
        assert.equal(result.nextCommand, '/execute-phase 1');
      });

      it('returns phase-1-planned when PROJECT-SUMMARY.md does not exist', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-PLAN.md': '# Phase 1\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-1-planned');
        assert.equal(result.nextCommand, '/execute-phase 1');
      });
    });

    describe('phase-N-executed state', () => {
      it('returns phase-1-executed when summary has Phase 1 but no verification', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-PLAN.md': '# Phase 1\n',
          'PROJECT-SUMMARY.md': SUMMARY_PHASE_1,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-1-executed');
        assert.equal(result.nextCommand, '/verify-phase 1');
      });
    });

    describe('all-phases-verified state', () => {
      it('returns all-phases-verified when all phases verified but project not', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-PLAN.md': '# Phase 1\n',
          'PHASE-2-PLAN.md': '# Phase 2\n',
          'PROJECT-SUMMARY.md': SUMMARY_PHASE_1_AND_2,
          'PHASE-1-VERIFICATION.md': '# Verified\n',
          'PHASE-2-VERIFICATION.md': '# Verified\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'all-phases-verified');
        assert.equal(result.nextCommand, '/verify-project');
      });
    });

    describe('project-verified state', () => {
      it('returns project-verified when PROJECT-VERIFICATION.md exists', () => {
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
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'project-verified');
        assert.equal(result.nextCommand, null);
        assert.ok(result.context.includes('complete'));
      });
    });

    describe('edge cases', () => {
      it('parses ## Phase N: headers (double-hash variant)', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_DOUBLE_HASH,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-1-unplanned');
        assert.equal(result.nextCommand, '/discuss-phase 1');
      });

      it('parses mixed ## and ### phase headers', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_MIXED_HASH,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-1-unplanned');
        assert.equal(result.nextCommand, '/discuss-phase 1');
      });

      it('routes to plan when research exists with frontmatter but discussion does not', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PROJECT-RESEARCH.md': RESEARCH_DONE,
          'PHASE-1-DISCUSSION.md': DISC_DONE,
          'PHASE-1-RESEARCH.md': RESEARCH_DONE,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-1-unplanned');
        assert.equal(result.nextCommand, '/plan-phase 1');
      });

      it('returns identical results for identical inputs (determinism)', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-PLAN.md': '# Phase 1\n',
        });
        const r1 = resolveState(tmpDir);
        const r2 = resolveState(tmpDir);
        assert.equal(JSON.stringify(r1), JSON.stringify(r2));
      });

      it('multi-phase progression: 3 phases, 1-2 verified, 3 planned', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_3_PHASES,
          'PHASE-1-PLAN.md': '# Phase 1\n',
          'PHASE-2-PLAN.md': '# Phase 2\n',
          'PHASE-3-PLAN.md': '# Phase 3\n',
          'PROJECT-SUMMARY.md': SUMMARY_PHASE_1_AND_2,
          'PHASE-1-VERIFICATION.md': '# Verified\n',
          'PHASE-2-VERIFICATION.md': '# Verified\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'phase-3-planned');
        assert.equal(result.nextCommand, '/execute-phase 3');
      });

      it('treats plan with no phase headers as needing planning', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': '# Plan\nSome content without phase headers.\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.state, 'project-defined');
        assert.equal(result.nextCommand, '/plan-project');
      });
    });

    describe('discuss/research routing', () => {
      it('returns /discuss-project when PROJECT.md exists, no discussion or research', () => {
        setupFiles(tmpDir, { 'PROJECT.md': '# Project\n' });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/discuss-project');
        assert.ok(result.context.includes('(skip: /plan-project)'));
        assert.equal(result.state, 'project-defined');
      });

      it('returns /research-project when discussion exists but no research', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-DISCUSSION.md': DISC_DONE,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/research-project');
        assert.ok(result.context.includes('(skip: /plan-project)'));
      });

      it('returns /plan-project when research exists, no plan', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-DISCUSSION.md': DISC_DONE,
          'PROJECT-RESEARCH.md': RESEARCH_DONE,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/plan-project');
        assert.ok(!result.context.includes('(skip:'));
      });

      it('returns /plan-project when research exists but discussion does not (project-level skip-forward)', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-RESEARCH.md': '# Research\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/plan-project');
      });

      it('returns /discuss-phase 1 when no discussion, research, or plan for phase', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/discuss-phase 1');
        assert.ok(result.context.includes('(skip: /plan-phase 1)'));
      });

      it('returns /research-phase 1 when discussion exists but no research', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-DISCUSSION.md': DISC_DONE,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/research-phase 1');
        assert.ok(result.context.includes('(skip: /plan-phase 1)'));
      });

      it('returns /plan-phase 1 when research exists, no plan', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': PLAN_2_PHASES,
          'PHASE-1-DISCUSSION.md': DISC_DONE,
          'PHASE-1-RESEARCH.md': RESEARCH_DONE,
        });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/plan-phase 1');
      });

      it('plan with no phase headers still routes to /plan-project (no discuss routing)', () => {
        setupFiles(tmpDir, {
          'PROJECT.md': '# Project\n',
          'PROJECT-PLAN.md': '# Plan\nNo phases.\n',
        });
        const result = resolveState(tmpDir);
        assert.equal(result.nextCommand, '/plan-project');
      });
    });
  });

  describe('steps array', () => {
    function resolveState(dir) {
      const { resolveState } = require(STATE_RESOLVER_HOOK_PATH);
      return resolveState(dir);
    }

    it('no-project returns empty steps array', () => {
      const result = resolveState(tmpDir);
      assert.deepEqual(result.steps, []);
      assert.equal(result.totalPhases, null);
      assert.equal(result.currentPhase, null);
    });

    it('project-defined returns 4 project steps with defined=done, discussed=active, rest pending', () => {
      setupFiles(tmpDir, { 'PROJECT.md': '# Project\n' });
      const result = resolveState(tmpDir);
      assert.equal(result.steps.length, 4);
      assert.equal(result.steps[0].id, 'project-defined');
      assert.equal(result.steps[0].status, 'done');
      assert.equal(result.steps[1].id, 'project-discussed');
      assert.equal(result.steps[1].status, 'active');
      assert.equal(result.steps[2].status, 'pending');
      assert.equal(result.steps[3].status, 'pending');
    });

    it('project with discussion (frontmatter) returns discussed=done, defined=done', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_DONE,
      });
      const result = resolveState(tmpDir);
      assert.equal(result.steps[0].status, 'done');
      assert.equal(result.steps[1].status, 'done');
      assert.equal(result.steps[2].status, 'active');
      assert.equal(result.steps[3].status, 'pending');
    });

    it('project-defined skips to planned: discussed and researched are active/pending without skip artifacts', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-PLAN.md': PLAN_2_PHASES,
      });
      const result = resolveState(tmpDir);
      assert.equal(result.steps[0].status, 'done');   // defined
      assert.equal(result.steps[1].status, 'active');  // discussed (no file, first incomplete)
      assert.equal(result.steps[2].status, 'pending'); // researched
      assert.equal(result.steps[3].status, 'pending'); // planned
    });

    it('project-defined with skip artifacts: discussed and researched are skipped', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
      });
      const result = resolveState(tmpDir);
      assert.equal(result.steps[0].status, 'done');    // defined
      assert.equal(result.steps[1].status, 'skipped'); // discussed
      assert.equal(result.steps[2].status, 'skipped'); // researched
      assert.equal(result.steps[3].status, 'done');    // planned
      assert.equal(result.steps[4].id, 'phase-1-discussed');
      assert.equal(result.steps[4].status, 'active');
    });

    it('full sequence with 2 phases, phase 1 midway, with skip artifacts', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_DONE,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-1-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      const result = resolveState(tmpDir);
      // Project steps
      assert.equal(result.steps[0].status, 'done');    // defined
      assert.equal(result.steps[1].status, 'done');    // discussed
      assert.equal(result.steps[2].status, 'skipped'); // researched
      assert.equal(result.steps[3].status, 'done');    // planned
      // Phase 1
      assert.equal(result.steps[4].status, 'skipped'); // phase-1-discussed
      assert.equal(result.steps[5].status, 'skipped'); // phase-1-researched
      assert.equal(result.steps[6].status, 'done');    // phase-1-planned
      assert.equal(result.steps[7].status, 'active');  // phase-1-executed
      // Phase 2 all pending
      for (let i = 9; i <= 13; i++) {
        assert.equal(result.steps[i].status, 'pending');
      }
      // project-verified pending
      assert.equal(result.steps[14].status, 'pending');
    });

    it('full sequence with 2 phases, phase 1 midway, without skip artifacts shows active/pending', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_DONE,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      const result = resolveState(tmpDir);
      // Project steps
      assert.equal(result.steps[0].status, 'done');    // defined
      assert.equal(result.steps[1].status, 'done');    // discussed
      assert.equal(result.steps[2].status, 'active');  // researched (no file, first incomplete)
    });

    it('frontmatter-based skip: phase has plan with skip artifacts for discussion and research', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-1-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      const result = resolveState(tmpDir);
      const p1discussed = result.steps.find(s => s.id === 'phase-1-discussed');
      const p1researched = result.steps.find(s => s.id === 'phase-1-researched');
      assert.equal(p1discussed.status, 'skipped');
      assert.equal(p1researched.status, 'skipped');
    });

    it('totalPhases null before PROJECT-PLAN.md', () => {
      setupFiles(tmpDir, { 'PROJECT.md': '# Project\n' });
      const result = resolveState(tmpDir);
      assert.equal(result.totalPhases, null);
    });

    it('totalPhases correct with 2-phase plan', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-PLAN.md': PLAN_2_PHASES,
      });
      const result = resolveState(tmpDir);
      assert.equal(result.totalPhases, 2);
    });

    it('totalPhases correct with 3-phase plan', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-PLAN.md': PLAN_3_PHASES,
      });
      const result = resolveState(tmpDir);
      assert.equal(result.totalPhases, 3);
    });

    it('currentPhase tracks active phase', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-1-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-1-PLAN.md': '# Phase 1\n',
        'PROJECT-SUMMARY.md': SUMMARY_PHASE_1,
        'PHASE-1-VERIFICATION.md': '# Verified\n',
        'PHASE-2-PLAN.md': '# Phase 2\n',
      });
      const result = resolveState(tmpDir);
      assert.equal(result.currentPhase, 2);
    });

    it('project-verified: all steps done or skipped, no active step', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-1-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-1-PLAN.md': '# Phase 1\n',
        'PHASE-2-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-2-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-2-PLAN.md': '# Phase 2\n',
        'PROJECT-SUMMARY.md': SUMMARY_PHASE_1_AND_2,
        'PHASE-1-VERIFICATION.md': '# Verified\n',
        'PHASE-2-VERIFICATION.md': '# Verified\n',
        'PROJECT-VERIFICATION.md': '# Project Verified\n',
      });
      const result = resolveState(tmpDir);
      const activeSteps = result.steps.filter(s => s.status === 'active');
      assert.equal(activeSteps.length, 0);
      for (const step of result.steps) {
        assert.ok(step.status === 'done' || step.status === 'skipped', `step ${step.id} has status ${step.status}`);
      }
    });

    it('state field values unchanged across routing branches', () => {
      // no-project
      let result = resolveState(tmpDir);
      assert.equal(result.state, 'no-project');
      assert.equal(result.nextCommand, '/new-project');
      assert.equal(result.context, 'No project found.');

      // project-defined
      setupFiles(tmpDir, { 'PROJECT.md': '# Project\n' });
      result = resolveState(tmpDir);
      assert.equal(result.state, 'project-defined');
      assert.equal(result.nextCommand, '/discuss-project');

      // phase-1-planned
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      result = resolveState(tmpDir);
      assert.equal(result.state, 'phase-1-planned');
      assert.equal(result.nextCommand, '/execute-phase 1');

      // project-verified
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-1-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-1-PLAN.md': '# Phase 1\n',
        'PHASE-2-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-2-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-2-PLAN.md': '# Phase 2\n',
        'PROJECT-SUMMARY.md': SUMMARY_PHASE_1_AND_2,
        'PHASE-1-VERIFICATION.md': '# Verified\n',
        'PHASE-2-VERIFICATION.md': '# Verified\n',
        'PROJECT-VERIFICATION.md': '# Project Verified\n',
      });
      result = resolveState(tmpDir);
      assert.equal(result.state, 'project-verified');
      assert.equal(result.nextCommand, null);
    });
  });

  describe('frontmatter-based status detection', () => {
    function resolveState(dir) {
      const { resolveState } = require(STATE_RESOLVER_HOOK_PATH);
      return resolveState(dir);
    }

    it('file with skipped: true frontmatter reports as skipped', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
      });
      const result = resolveState(tmpDir);
      const p1discussed = result.steps.find(s => s.id === 'phase-1-discussed');
      assert.equal(p1discussed.status, 'skipped');
    });

    it('file with skipped: false frontmatter reports as done', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_DONE,
      });
      const result = resolveState(tmpDir);
      const p1discussed = result.steps.find(s => s.id === 'phase-1-discussed');
      assert.equal(p1discussed.status, 'done');
    });

    it('file without frontmatter is treated as done', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': '# Discussion\n',
      });
      const result = resolveState(tmpDir);
      const p1discussed = result.steps.find(s => s.id === 'phase-1-discussed');
      assert.equal(p1discussed.status, 'done');
    });

    it('file with empty frontmatter (no skipped field) is treated as done', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': '---\n---\n# Content\n',
      });
      const result = resolveState(tmpDir);
      const p1discussed = result.steps.find(s => s.id === 'phase-1-discussed');
      assert.equal(p1discussed.status, 'done');
    });

    it('skipped: false with real content reports as done', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': '---\nskipped: false\n---\n# Real discussion content\nLots of details here.\n',
      });
      const result = resolveState(tmpDir);
      const p1discussed = result.steps.find(s => s.id === 'phase-1-discussed');
      assert.equal(p1discussed.status, 'done');
    });

    it('plan/execute/verify steps do not require frontmatter', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-1-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-1-PLAN.md': '# Phase 1 Plan\n',
      });
      const result = resolveState(tmpDir);
      const p1planned = result.steps.find(s => s.id === 'phase-1-planned');
      assert.equal(p1planned.status, 'done');
    });
  });

  describe('CLI mode tests', () => {
    it('outputs valid JSON to stdout for a project directory', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      const result = runHook(STATE_RESOLVER_HOOK_PATH, '{}', tmpDir);
      assert.equal(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.state, 'phase-1-planned');
      assert.equal(parsed.nextCommand, '/execute-phase 1');
    });

    it('outputs no-project state JSON when no .planning/ exists', () => {
      const result = runHook(STATE_RESOLVER_HOOK_PATH, '{}', tmpDir);
      assert.equal(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout);
      assert.equal(parsed.state, 'no-project');
      assert.equal(parsed.nextCommand, '/new-project');
    });
  });

  describe('CLI mode — steps in JSON output', () => {
    it('CLI outputs steps array in JSON', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      const result = runHook(STATE_RESOLVER_HOOK_PATH, '{}', tmpDir);
      assert.equal(result.exitCode, 0);
      const parsed = JSON.parse(result.stdout);
      assert.ok(Array.isArray(parsed.steps), 'steps should be an array');
      assert.equal(parsed.totalPhases, 2);
      // 4 project + 5 phase-1 + 5 phase-2 + 1 verify = 15
      assert.equal(parsed.steps.length, 15);
    });

    it('CLI outputs steps with correct active step (with skip artifacts)', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-DISCUSSION.md': DISC_SKIPPED,
        'PROJECT-RESEARCH.md': RESEARCH_SKIPPED,
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-DISCUSSION.md': DISC_SKIPPED,
        'PHASE-1-RESEARCH.md': RESEARCH_SKIPPED,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      const result = runHook(STATE_RESOLVER_HOOK_PATH, '{}', tmpDir);
      const parsed = JSON.parse(result.stdout);
      const activeSteps = parsed.steps.filter(s => s.status === 'active');
      assert.equal(activeSteps.length, 1);
      assert.equal(activeSteps[0].id, 'phase-1-executed');

      const p1discussed = parsed.steps.find(s => s.id === 'phase-1-discussed');
      const p1researched = parsed.steps.find(s => s.id === 'phase-1-researched');
      const p1planned = parsed.steps.find(s => s.id === 'phase-1-planned');
      assert.equal(p1discussed.status, 'skipped');
      assert.equal(p1researched.status, 'skipped');
      assert.equal(p1planned.status, 'done');
    });

    it('CLI outputs steps without skip artifacts shows project-discussed as active', () => {
      setupFiles(tmpDir, {
        'PROJECT.md': '# Project\n',
        'PROJECT-PLAN.md': PLAN_2_PHASES,
        'PHASE-1-PLAN.md': '# Phase 1\n',
      });
      const result = runHook(STATE_RESOLVER_HOOK_PATH, '{}', tmpDir);
      const parsed = JSON.parse(result.stdout);
      const projDiscussed = parsed.steps.find(s => s.id === 'project-discussed');
      assert.equal(projDiscussed.status, 'active');
      const p1discussed = parsed.steps.find(s => s.id === 'phase-1-discussed');
      assert.equal(p1discussed.status, 'pending');
    });
  });
});
