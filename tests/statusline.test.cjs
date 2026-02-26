const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { STATUSLINE_HOOK_PATH, createTempProject, cleanup, runHook } = require('./helpers.cjs');

const STATUSLINE_STDIN = (dir) => ({
  model: { display_name: 'Claude' },
  workspace: { current_dir: dir },
  session_id: 'test',
  context_window: { remaining_percentage: 50 }
});

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('gsd-statusline', () => {

describe('renderBrailleIndicator', () => {
  let renderBrailleIndicator;

  beforeEach(() => {
    renderBrailleIndicator = require(STATUSLINE_HOOK_PATH).renderBrailleIndicator;
  });

  it('returns empty string for empty steps array', () => {
    assert.equal(renderBrailleIndicator([], null), '');
  });

  it('renders 4-char project segment for pre-plan state', () => {
    const steps = [
      { id: 'project-defined', label: 'defined', status: 'done' },
      { id: 'project-discussed', label: 'discussed', status: 'active' },
      { id: 'project-researched', label: 'researched', status: 'pending' },
      { id: 'project-planned', label: 'planned', status: 'pending' },
    ];
    const result = renderBrailleIndicator(steps, null);
    const stripped = stripAnsi(result);
    assert.equal(stripped, '\u25CF\u25D0\u25CB\u25CB');
  });

  it('renders space-separated segments for 2-phase project', () => {
    const steps = [
      { id: 'project-defined', label: 'defined', status: 'done' },
      { id: 'project-discussed', label: 'discussed', status: 'done' },
      { id: 'project-researched', label: 'researched', status: 'skipped' },
      { id: 'project-planned', label: 'planned', status: 'done' },
      { id: 'phase-1-discussed', label: 'discussed', status: 'done' },
      { id: 'phase-1-researched', label: 'researched', status: 'done' },
      { id: 'phase-1-planned', label: 'planned', status: 'done' },
      { id: 'phase-1-executed', label: 'executed', status: 'done' },
      { id: 'phase-1-verified', label: 'verified', status: 'done' },
      { id: 'phase-2-discussed', label: 'discussed', status: 'active' },
      { id: 'phase-2-researched', label: 'researched', status: 'pending' },
      { id: 'phase-2-planned', label: 'planned', status: 'pending' },
      { id: 'phase-2-executed', label: 'executed', status: 'pending' },
      { id: 'phase-2-verified', label: 'verified', status: 'pending' },
      { id: 'project-verified', label: 'verified', status: 'pending' },
    ];
    const result = renderBrailleIndicator(steps, 2);
    const stripped = stripAnsi(result);
    const segments = stripped.split(' ');
    assert.equal(segments.length, 4);
    assert.equal(segments[0].length, 4); // project
    assert.equal(segments[1].length, 5); // phase 1
    assert.equal(segments[2].length, 5); // phase 2
    assert.equal(segments[3].length, 1); // verify
  });

  it('uses green ANSI for done steps', () => {
    const steps = [
      { id: 'project-defined', label: 'defined', status: 'done' },
      { id: 'project-discussed', label: 'discussed', status: 'active' },
      { id: 'project-researched', label: 'researched', status: 'pending' },
      { id: 'project-planned', label: 'planned', status: 'pending' },
    ];
    const result = renderBrailleIndicator(steps, null);
    assert.ok(result.includes('\x1b[32m\u25CF'), 'expected green ANSI before done braille');
  });

  it('uses yellow ANSI for active step', () => {
    const steps = [
      { id: 'project-defined', label: 'defined', status: 'done' },
      { id: 'project-discussed', label: 'discussed', status: 'active' },
      { id: 'project-researched', label: 'researched', status: 'pending' },
      { id: 'project-planned', label: 'planned', status: 'pending' },
    ];
    const result = renderBrailleIndicator(steps, null);
    assert.ok(result.includes('\x1b[33m\u25D0'), 'expected yellow ANSI before active braille');
  });

  it('uses dim ANSI for pending steps', () => {
    const steps = [
      { id: 'project-defined', label: 'defined', status: 'done' },
      { id: 'project-discussed', label: 'discussed', status: 'active' },
      { id: 'project-researched', label: 'researched', status: 'pending' },
      { id: 'project-planned', label: 'planned', status: 'pending' },
    ];
    const result = renderBrailleIndicator(steps, null);
    assert.ok(result.includes('\x1b[2m\u25CB'), 'expected dim ANSI before pending braille');
  });

  it('uses red ANSI for skipped steps', () => {
    const steps = [
      { id: 'project-defined', label: 'defined', status: 'done' },
      { id: 'project-discussed', label: 'discussed', status: 'skipped' },
      { id: 'project-researched', label: 'researched', status: 'skipped' },
      { id: 'project-planned', label: 'planned', status: 'done' },
    ];
    const result = renderBrailleIndicator(steps, null);
    assert.ok(result.includes('\x1b[31m\u25CF'), 'expected red ANSI before skipped braille');
  });

  it('renders correct segment widths: 4 project + 5 per phase + 1 verify', () => {
    const steps = [];
    const labels = ['defined', 'discussed', 'researched', 'planned'];
    for (const l of labels) steps.push({ id: `project-${l}`, label: l, status: 'done' });
    for (let p = 1; p <= 3; p++) {
      for (const l of ['discussed', 'researched', 'planned', 'executed', 'verified']) {
        steps.push({ id: `phase-${p}-${l}`, label: l, status: 'pending' });
      }
    }
    steps.push({ id: 'project-verified', label: 'verified', status: 'pending' });

    const result = renderBrailleIndicator(steps, 3);
    const stripped = stripAnsi(result);
    const segments = stripped.split(' ');
    assert.equal(segments.length, 5); // project + 3 phases + verify
    assert.equal(segments[0].length, 4);
    assert.equal(segments[1].length, 5);
    assert.equal(segments[2].length, 5);
    assert.equal(segments[3].length, 5);
    assert.equal(segments[4].length, 1);
  });
});

describe('gsd-statusline MAP staleness', () => {

  describe('parseCommitSha', () => {
    let parseCommitSha;

    beforeEach(() => {
      parseCommitSha = require(STATUSLINE_HOOK_PATH).parseCommitSha;
    });

    it('returns 40-char hex SHA from valid frontmatter', () => {
      const content = '---\ncommit_sha: abcdef1234567890abcdef1234567890abcdef12\n---\n# Body';
      assert.equal(parseCommitSha(content), 'abcdef1234567890abcdef1234567890abcdef12');
    });

    it('returns null when content has no frontmatter delimiters', () => {
      const content = 'Just some text without frontmatter';
      assert.equal(parseCommitSha(content), null);
    });

    it('returns null when frontmatter exists but has no commit_sha field', () => {
      const content = '---\ngenerated: 2026-01-01\n---\n# Body';
      assert.equal(parseCommitSha(content), null);
    });

    it('returns null when content is empty string', () => {
      assert.equal(parseCommitSha(''), null);
    });

    it('returns null when commit_sha value is empty or whitespace', () => {
      const content = '---\ncommit_sha:   \n---\n# Body';
      assert.equal(parseCommitSha(content), null);
    });
  });

  describe('countLinesChanged', () => {
    let countLinesChanged;

    beforeEach(() => {
      countLinesChanged = require(STATUSLINE_HOOK_PATH).countLinesChanged;
    });

    it('returns 0 for empty string', () => {
      assert.equal(countLinesChanged(''), 0);
    });

    it('sums insertions and deletions from numstat output', () => {
      const numstat = '10\t5\tfile1.js\n20\t3\tfile2.js';
      assert.equal(countLinesChanged(numstat), 38);
    });

    it('handles binary files (- - markers) gracefully', () => {
      const numstat = '10\t5\tfile1.js\n-\t-\timage.png';
      assert.equal(countLinesChanged(numstat), 15);
    });

    it('handles single file', () => {
      const numstat = '100\t0\tnew-file.js';
      assert.equal(countLinesChanged(numstat), 100);
    });
  });

  describe('getMapStalenessColor', () => {
    let getMapStalenessColor;

    beforeEach(() => {
      getMapStalenessColor = require(STATUSLINE_HOOK_PATH).getMapStalenessColor;
    });

    it('returns green for 0-100 lines changed', () => {
      assert.equal(getMapStalenessColor(0), '\x1b[32m');
      assert.equal(getMapStalenessColor(100), '\x1b[32m');
    });

    it('returns yellow for 101-500 lines changed', () => {
      assert.equal(getMapStalenessColor(101), '\x1b[33m');
      assert.equal(getMapStalenessColor(500), '\x1b[33m');
    });

    it('returns orange for 501-2000 lines changed', () => {
      assert.equal(getMapStalenessColor(501), '\x1b[38;5;208m');
      assert.equal(getMapStalenessColor(2000), '\x1b[38;5;208m');
    });

    it('returns red for 2000+ lines changed', () => {
      assert.equal(getMapStalenessColor(2001), '\x1b[31m');
      assert.equal(getMapStalenessColor(20000), '\x1b[31m');
    });
  });

  describe('integration — MAP segment in output', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = createTempProject();
      execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
    });

    afterEach(() => {
      cleanup(tmpDir);
    });

    it('shows Δ with line count when tech-stack.md exists with valid SHA', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });
      const sha = execSync('git rev-parse HEAD', { cwd: tmpDir, stdio: 'pipe' }).toString().trim();

      // Add a file with some lines so diff has content
      fs.writeFileSync(path.join(tmpDir, 'hello.js'), 'line1\nline2\nline3\n');
      execSync('git add . && git commit -m "add file"', { cwd: tmpDir, stdio: 'pipe' });

      const codebaseDir = path.join(tmpDir, '.planning', 'codebase');
      fs.mkdirSync(codebaseDir, { recursive: true });
      fs.writeFileSync(path.join(codebaseDir, 'tech-stack.md'), `---\ncommit_sha: ${sha}\n---\n# Map\n`);

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('Δ'), `expected Δ in output, got: ${result.stdout}`);
      assert.ok(result.stdout.includes('lines'), `expected "lines" in output, got: ${result.stdout}`);
    });

    it('shows Δ 0 lines when map is at HEAD', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });
      const sha = execSync('git rev-parse HEAD', { cwd: tmpDir, stdio: 'pipe' }).toString().trim();

      const codebaseDir = path.join(tmpDir, '.planning', 'codebase');
      fs.mkdirSync(codebaseDir, { recursive: true });
      fs.writeFileSync(path.join(codebaseDir, 'tech-stack.md'), `---\ncommit_sha: ${sha}\n---\n# Map\n`);

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('Δ 0 lines'), `expected "Δ 0 lines" in output, got: ${result.stdout}`);
    });

    it('shows red MAP: ✗ warning when .planning/codebase/tech-stack.md is missing', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('MAP:'), `expected MAP: in output, got: ${result.stdout}`);
      assert.ok(result.stdout.includes('✗'), `expected ✗ in output, got: ${result.stdout}`);
      assert.ok(result.stdout.includes('\x1b[31m'), `expected red ANSI code in output`);
    });

    it('does not show Δ when tech-stack.md exists but has no commit_sha', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const codebaseDir = path.join(tmpDir, '.planning', 'codebase');
      fs.mkdirSync(codebaseDir, { recursive: true });
      fs.writeFileSync(path.join(codebaseDir, 'tech-stack.md'), '---\ngenerated: 2026-01-01\n---\n# Map\n');

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(!result.stdout.includes('Δ'), `expected no Δ in output, got: ${result.stdout}`);
    });

    it('does not show Δ when commit_sha references non-existent commit', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const codebaseDir = path.join(tmpDir, '.planning', 'codebase');
      fs.mkdirSync(codebaseDir, { recursive: true });
      fs.writeFileSync(path.join(codebaseDir, 'tech-stack.md'), '---\ncommit_sha: 0000000000000000000000000000000000000000\n---\n# Map\n');

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(!result.stdout.includes('Δ'), `expected no Δ in output, got: ${result.stdout}`);
    });

    it('does not crash on garbage tech-stack.md content', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const codebaseDir = path.join(tmpDir, '.planning', 'codebase');
      fs.mkdirSync(codebaseDir, { recursive: true });
      fs.writeFileSync(path.join(codebaseDir, 'tech-stack.md'), '!!!garbage{{{not yaml%%%\x00\x01\x02');

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.length > 0, 'should still produce some output');
    });

    it('replaces dirname with map segment (no dirname in output)', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      const dirname = path.basename(tmpDir);
      assert.ok(!result.stdout.includes(dirname), `expected no dirname "${dirname}" in output, got: ${result.stdout}`);
    });

    it('shows braille indicator when project exists', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const projectDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), '# Project\n');

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      const stripped = stripAnsi(result.stdout);
      assert.ok(
        stripped.includes('\u25CF') || stripped.includes('\u25D0') || stripped.includes('\u25CB'),
        `expected braille characters in output, got: ${stripped}`
      );
    });

    it('braille segment count matches phase count', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const projectDir = path.join(tmpDir, '.planning', 'project');
      fs.mkdirSync(projectDir, { recursive: true });
      const plan2Phases = '# Project Plan\n\n### Phase 1: Setup\nDo stuff.\n\n### Phase 2: Build\nBuild it.\n';
      fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), '# Project\n');
      fs.writeFileSync(path.join(projectDir, 'PROJECT-PLAN.md'), plan2Phases);
      fs.writeFileSync(path.join(projectDir, 'PHASE-1-PLAN.md'), '# Phase 1\n');
      fs.writeFileSync(path.join(projectDir, 'PROJECT-SUMMARY.md'), '## Phase 1: Setup\n**Status:** Complete\n');
      fs.writeFileSync(path.join(projectDir, 'PHASE-1-VERIFICATION.md'), '# Verified\n');

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      const stripped = stripAnsi(result.stdout);
      // Find braille portion (before first |)
      const braillePart = stripped.split('│')[0].trim();
      const segments = braillePart.split(' ');
      // project(4) + phase-1(5) + phase-2(5) + verify(1) = 4 segments
      assert.equal(segments.length, 4, `expected 4 segments, got ${segments.length}: ${JSON.stringify(segments)}`);
    });

    it('no braille when no .planning/project/ exists', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      const stripped = stripAnsi(result.stdout);
      assert.ok(!stripped.includes('\u25CF'), 'expected no braille done char');
      assert.ok(!stripped.includes('\u25D0'), 'expected no braille active char');
      assert.ok(!stripped.includes('\u25CB'), 'expected no braille pending char');
    });
  });
});
});
