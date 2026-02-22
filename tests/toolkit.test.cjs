/**
 * Toolkit Library Tests
 *
 * TDD tests for core utility functions: atomic writes, git SHA staleness,
 * prerequisite validators, and model resolution.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Import toolkit functions (will fail initially — RED phase)
const toolkit = require('../get-shit-done/bin/lib/toolkit.cjs');

describe('atomicWrite(targetPath, content)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('writes content to a new file successfully', () => {
    const targetPath = path.join(tmpDir, 'test.txt');
    const content = 'Hello, world!';

    const result = toolkit.atomicWrite(targetPath, content);

    assert.strictEqual(result.success, true, 'should return success: true');
    assert.ok(fs.existsSync(targetPath), 'file should exist');
    assert.strictEqual(fs.readFileSync(targetPath, 'utf-8'), content, 'content should match');
  });

  test('file content matches what was written', () => {
    const targetPath = path.join(tmpDir, 'data.json');
    const content = JSON.stringify({ foo: 'bar', nested: { value: 42 } }, null, 2);

    toolkit.atomicWrite(targetPath, content);

    const written = fs.readFileSync(targetPath, 'utf-8');
    assert.strictEqual(written, content, 'content should match exactly');
  });

  test('overwrites existing file atomically', () => {
    const targetPath = path.join(tmpDir, 'overwrite.txt');
    fs.writeFileSync(targetPath, 'original content');

    const newContent = 'new content';
    const result = toolkit.atomicWrite(targetPath, newContent);

    assert.strictEqual(result.success, true, 'should succeed');
    assert.strictEqual(fs.readFileSync(targetPath, 'utf-8'), newContent, 'content should be updated');
  });

  test('creates file in parent directory (parent must exist)', () => {
    const nestedDir = path.join(tmpDir, 'nested');
    fs.mkdirSync(nestedDir);
    const targetPath = path.join(nestedDir, 'file.txt');

    const result = toolkit.atomicWrite(targetPath, 'test content');

    assert.strictEqual(result.success, true, 'should succeed');
    assert.ok(fs.existsSync(targetPath), 'file should exist in nested dir');
  });

  test('returns error when target directory does not exist', () => {
    const targetPath = path.join(tmpDir, 'nonexistent', 'file.txt');

    const result = toolkit.atomicWrite(targetPath, 'test');

    assert.strictEqual(result.success, false, 'should return success: false');
    assert.ok(result.error, 'should include error message');
    assert.ok(typeof result.error === 'string', 'error should be a string');
  });

  test('cleans up temp file on write failure', () => {
    const targetPath = path.join(tmpDir, 'bad', 'file.txt');

    toolkit.atomicWrite(targetPath, 'content');

    // Check that no .tmp files are left behind
    const files = fs.readdirSync(tmpDir);
    const tmpFiles = files.filter(f => f.includes('.tmp'));
    assert.strictEqual(tmpFiles.length, 0, 'no temp files should remain');
  });
});

describe('getCurrentCommitSHA(cwd)', () => {
  test('returns success and SHA in a git repo', () => {
    const projectRoot = path.resolve(__dirname, '..');

    const result = toolkit.getCurrentCommitSHA(projectRoot);

    assert.strictEqual(result.success, true, 'should succeed in git repo');
    assert.ok(result.sha, 'should return SHA');
    assert.strictEqual(typeof result.sha, 'string', 'SHA should be a string');
    assert.strictEqual(result.sha.length, 40, 'SHA should be 40 characters');
    assert.ok(/^[0-9a-f]{40}$/.test(result.sha), 'SHA should be hex');
  });

  test('returns error when not in a git repo', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-git-'));

    const result = toolkit.getCurrentCommitSHA(tmpDir);

    assert.strictEqual(result.success, false, 'should fail outside git repo');
    assert.ok(result.error, 'should include error message');
    assert.ok(typeof result.error === 'string', 'error should be a string');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('isCodebaseMapStale(cwd, storedSHA)', () => {
  test('returns stale: false when storedSHA matches current HEAD', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const currentSHA = execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const result = toolkit.isCodebaseMapStale(projectRoot, currentSHA);

    assert.strictEqual(result.stale, false, 'should not be stale when SHA matches');
    assert.strictEqual(result.currentSHA, currentSHA, 'should return current SHA');
    assert.strictEqual(result.storedSHA, currentSHA, 'should return stored SHA');
    assert.ok(result.message, 'should include message');
  });

  test('returns stale: true when storedSHA differs', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const fakeSHA = '0000000000000000000000000000000000000000';

    const result = toolkit.isCodebaseMapStale(projectRoot, fakeSHA);

    assert.strictEqual(result.stale, true, 'should be stale when SHA differs');
    assert.ok(result.currentSHA, 'should return current SHA');
    assert.strictEqual(result.storedSHA, fakeSHA, 'should return stored SHA');
    assert.notStrictEqual(result.currentSHA, fakeSHA, 'current and stored should differ');
  });

  test('returns stale: null when not in a git repo', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-git-'));
    const fakeSHA = '1111111111111111111111111111111111111111';

    const result = toolkit.isCodebaseMapStale(tmpDir, fakeSHA);

    assert.strictEqual(result.stale, null, 'should return null when git unavailable');
    assert.ok(result.error, 'should include error message');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('checkPlanningDirExists(cwd)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns passed: true when .planning/ exists and is a directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.planning'));

    const result = toolkit.checkPlanningDirExists(tmpDir);

    assert.strictEqual(result.passed, true, 'should pass when dir exists');
    assert.ok(result.message, 'should include message');
    assert.ok(typeof result.message === 'string', 'message should be a string');
  });

  test('returns passed: false when .planning/ does not exist', () => {
    const result = toolkit.checkPlanningDirExists(tmpDir);

    assert.strictEqual(result.passed, false, 'should fail when dir does not exist');
    assert.ok(result.message, 'should include message');
  });

  test('returns passed: false when .planning exists but is a file', () => {
    fs.writeFileSync(path.join(tmpDir, '.planning'), 'not a directory');

    const result = toolkit.checkPlanningDirExists(tmpDir);

    assert.strictEqual(result.passed, false, 'should fail when .planning is a file');
    assert.ok(result.message.includes('not a directory') || result.message.includes('file'),
      'message should indicate it is not a directory');
  });
});

describe('checkFileExists(cwd, relativePath)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns passed: true when file exists', () => {
    const testFile = 'test.txt';
    fs.writeFileSync(path.join(tmpDir, testFile), 'content');

    const result = toolkit.checkFileExists(tmpDir, testFile);

    assert.strictEqual(result.passed, true, 'should pass when file exists');
    assert.ok(result.message, 'should include message');
  });

  test('returns passed: false when file does not exist', () => {
    const result = toolkit.checkFileExists(tmpDir, 'nonexistent.txt');

    assert.strictEqual(result.passed, false, 'should fail when file does not exist');
    assert.ok(result.message, 'should include message');
  });

  test('works with nested paths', () => {
    fs.mkdirSync(path.join(tmpDir, 'nested', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'nested', 'deep', 'file.md'), 'content');

    const result = toolkit.checkFileExists(tmpDir, 'nested/deep/file.md');

    assert.strictEqual(result.passed, true, 'should pass for nested file');
  });
});

describe('checkMapNotStale(cwd, mapPath)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
    // Initialize git repo in temp dir
    execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'dummy.txt'), 'initial');
    execSync('git add .', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'pipe' });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns passed: true when SHA in map matches HEAD', () => {
    const currentSHA = execSync('git rev-parse HEAD', {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const mapPath = path.join(tmpDir, 'map.md');
    fs.writeFileSync(mapPath, `---\nsha: ${currentSHA}\n---\n\nMap content`);

    const result = toolkit.checkMapNotStale(tmpDir, mapPath);

    assert.strictEqual(result.passed, true, 'should pass when SHA matches');
    assert.ok(result.message, 'should include message');
  });

  test('returns passed: false when SHA differs', () => {
    const fakeSHA = '0000000000000000000000000000000000000000';
    const mapPath = path.join(tmpDir, 'map.md');
    fs.writeFileSync(mapPath, `---\nsha: ${fakeSHA}\n---\n\nMap content`);

    const result = toolkit.checkMapNotStale(tmpDir, mapPath);

    assert.strictEqual(result.passed, false, 'should fail when SHA differs');
    assert.ok(result.message, 'should include message');
  });

  test('returns passed: false when map file does not exist', () => {
    const result = toolkit.checkMapNotStale(tmpDir, 'nonexistent-map.md');

    assert.strictEqual(result.passed, false, 'should fail when map does not exist');
    assert.ok(result.message, 'should include message');
  });

  test('reads SHA from YAML frontmatter', () => {
    const currentSHA = execSync('git rev-parse HEAD', {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const mapPath = path.join(tmpDir, 'complex-map.md');
    fs.writeFileSync(mapPath, `---
title: Codebase Map
phase: 01
sha: ${currentSHA}
created: 2026-02-22
---

# Codebase Map

Map content here...
`);

    const result = toolkit.checkMapNotStale(tmpDir, mapPath);

    assert.strictEqual(result.passed, true, 'should extract SHA from frontmatter');
  });
});

describe('resolveModel(cwd, agentType)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
    fs.mkdirSync(path.join(tmpDir, '.planning'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns correct model for known agent type with default profile (balanced)', () => {
    const model = toolkit.resolveModel(tmpDir, 'gsd-executor');

    assert.strictEqual(model, 'sonnet', 'executor balanced profile should be sonnet');
  });

  test('returns inherit for agents whose balanced profile maps to opus', () => {
    const model = toolkit.resolveModel(tmpDir, 'gsd-planner');

    assert.strictEqual(model, 'inherit', 'planner balanced=opus should return inherit');
  });

  test('returns sonnet for unknown agent types', () => {
    const model = toolkit.resolveModel(tmpDir, 'unknown-agent-type');

    assert.strictEqual(model, 'sonnet', 'unknown agents should default to sonnet');
  });

  test('reads profile from .planning/model-config.json when it exists', () => {
    const configPath = path.join(tmpDir, '.planning', 'model-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ model_profile: 'quality' }));

    const model = toolkit.resolveModel(tmpDir, 'gsd-executor');

    // executor quality profile is opus -> inherit
    assert.strictEqual(model, 'inherit', 'should use quality profile from config');
  });

  test('falls back to balanced profile when config file is missing', () => {
    const model = toolkit.resolveModel(tmpDir, 'gsd-executor');

    assert.strictEqual(model, 'sonnet', 'should use balanced when no config');
  });

  test('falls back to balanced profile when config has invalid JSON', () => {
    const configPath = path.join(tmpDir, '.planning', 'model-config.json');
    fs.writeFileSync(configPath, 'invalid json {');

    const model = toolkit.resolveModel(tmpDir, 'gsd-executor');

    assert.strictEqual(model, 'sonnet', 'should use balanced when config is invalid');
  });

  test('handles budget profile correctly', () => {
    const configPath = path.join(tmpDir, '.planning', 'model-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ model_profile: 'budget' }));

    const model = toolkit.resolveModel(tmpDir, 'gsd-executor');

    // executor budget profile is sonnet
    assert.strictEqual(model, 'sonnet', 'should use budget profile from config');
  });
});
