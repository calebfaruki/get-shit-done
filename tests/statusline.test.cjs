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

    it('shows Δ with line count when CODEBASE.md exists with valid SHA', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });
      const sha = execSync('git rev-parse HEAD', { cwd: tmpDir, stdio: 'pipe' }).toString().trim();

      // Add a file with some lines so diff has content
      fs.writeFileSync(path.join(tmpDir, 'hello.js'), 'line1\nline2\nline3\n');
      execSync('git add . && git commit -m "add file"', { cwd: tmpDir, stdio: 'pipe' });

      const planDir = path.join(tmpDir, '.planning');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'CODEBASE.md'), `---\ncommit_sha: ${sha}\n---\n# Map\n`);

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('Δ'), `expected Δ in output, got: ${result.stdout}`);
      assert.ok(result.stdout.includes('lines'), `expected "lines" in output, got: ${result.stdout}`);
    });

    it('shows Δ 0 lines when map is at HEAD', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });
      const sha = execSync('git rev-parse HEAD', { cwd: tmpDir, stdio: 'pipe' }).toString().trim();

      const planDir = path.join(tmpDir, '.planning');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'CODEBASE.md'), `---\ncommit_sha: ${sha}\n---\n# Map\n`);

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('Δ 0 lines'), `expected "Δ 0 lines" in output, got: ${result.stdout}`);
    });

    it('shows red MAP: ✗ warning when .planning/CODEBASE.md is missing', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('MAP:'), `expected MAP: in output, got: ${result.stdout}`);
      assert.ok(result.stdout.includes('✗'), `expected ✗ in output, got: ${result.stdout}`);
      assert.ok(result.stdout.includes('\x1b[31m'), `expected red ANSI code in output`);
    });

    it('does not show Δ when CODEBASE.md exists but has no commit_sha', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const planDir = path.join(tmpDir, '.planning');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'CODEBASE.md'), '---\ngenerated: 2026-01-01\n---\n# Map\n');

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(!result.stdout.includes('Δ'), `expected no Δ in output, got: ${result.stdout}`);
    });

    it('does not show Δ when commit_sha references non-existent commit', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const planDir = path.join(tmpDir, '.planning');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'CODEBASE.md'), '---\ncommit_sha: 0000000000000000000000000000000000000000\n---\n# Map\n');

      const result = runHook(STATUSLINE_HOOK_PATH, STATUSLINE_STDIN(tmpDir), tmpDir);
      assert.equal(result.exitCode, 0);
      assert.ok(!result.stdout.includes('Δ'), `expected no Δ in output, got: ${result.stdout}`);
    });

    it('does not crash on garbage CODEBASE.md content', () => {
      execSync('git commit --allow-empty -m "init"', { cwd: tmpDir, stdio: 'pipe' });

      const planDir = path.join(tmpDir, '.planning');
      fs.mkdirSync(planDir, { recursive: true });
      fs.writeFileSync(path.join(planDir, 'CODEBASE.md'), '!!!garbage{{{not yaml%%%\x00\x01\x02');

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
  });
});
