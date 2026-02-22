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

// ─── Todo CRUD Tests ──────────────────────────────────────────────────────────

describe('createTodo(cwd, title, area, body)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates todo file in .planning/todos/ directory', () => {
    const result = toolkit.createTodo(tmpDir, 'Add caching to API', 'api', 'Need to implement Redis caching');

    assert.strictEqual(result.success, true, 'should succeed');
    assert.ok(result.filename, 'should return filename');
    assert.ok(result.path, 'should return relative path');

    const todoPath = path.join(tmpDir, result.path);
    assert.ok(fs.existsSync(todoPath), 'todo file should exist');
  });

  test('slugifies title for filename', () => {
    const result = toolkit.createTodo(tmpDir, 'Add caching to API', 'api', 'Test body');

    assert.strictEqual(result.filename, 'add-caching-to-api.md', 'filename should be slugified');
  });

  test('creates .planning/todos/ directory if it does not exist', () => {
    const todosDir = path.join(tmpDir, '.planning', 'todos');
    assert.ok(!fs.existsSync(todosDir), 'todos dir should not exist initially');

    toolkit.createTodo(tmpDir, 'Test todo', 'general', 'Body');

    assert.ok(fs.existsSync(todosDir), 'todos dir should be created');
    assert.ok(fs.statSync(todosDir).isDirectory(), 'should be a directory');
  });

  test('file contains YAML frontmatter with area and created date', () => {
    toolkit.createTodo(tmpDir, 'Test todo', 'api', 'Todo body content');

    const todoPath = path.join(tmpDir, '.planning', 'todos', 'test-todo.md');
    const content = fs.readFileSync(todoPath, 'utf-8');

    assert.ok(content.startsWith('---\n'), 'should start with frontmatter');
    assert.ok(content.includes('area: api'), 'should include area');
    assert.ok(content.match(/created: \d{4}-\d{2}-\d{2}/), 'should include created date in YYYY-MM-DD format');
    assert.ok(content.includes('Todo body content'), 'should include body');
  });

  test('file contains markdown body after frontmatter', () => {
    const body = 'This is the todo body.\n\nIt can have multiple lines.';
    toolkit.createTodo(tmpDir, 'Test todo', 'general', body);

    const todoPath = path.join(tmpDir, '.planning', 'todos', 'test-todo.md');
    const content = fs.readFileSync(todoPath, 'utf-8');

    const parts = content.split('---\n');
    assert.strictEqual(parts.length, 3, 'should have frontmatter and body');
    assert.ok(parts[2].trim().includes(body), 'body should be after frontmatter');
  });

  test('defaults area to "general" when not provided', () => {
    toolkit.createTodo(tmpDir, 'Test todo', undefined, 'Body');

    const todoPath = path.join(tmpDir, '.planning', 'todos', 'test-todo.md');
    const content = fs.readFileSync(todoPath, 'utf-8');

    assert.ok(content.includes('area: general'), 'should default to general area');
  });

  test('handles filename collision by appending -2', () => {
    toolkit.createTodo(tmpDir, 'Duplicate title', 'general', 'First');
    const result = toolkit.createTodo(tmpDir, 'Duplicate title', 'general', 'Second');

    assert.strictEqual(result.filename, 'duplicate-title-2.md', 'should append -2 for collision');
    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'todos', 'duplicate-title.md')), 'original should exist');
    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'todos', 'duplicate-title-2.md')), 'collision file should exist');
  });

  test('handles multiple collisions by appending -3, -4, etc.', () => {
    toolkit.createTodo(tmpDir, 'Same title', 'general', 'First');
    toolkit.createTodo(tmpDir, 'Same title', 'general', 'Second');
    const result = toolkit.createTodo(tmpDir, 'Same title', 'general', 'Third');

    assert.strictEqual(result.filename, 'same-title-3.md', 'should append -3 for third collision');
  });

  test('slugifies complex titles correctly', () => {
    const result = toolkit.createTodo(tmpDir, 'Fix bug #123: API Error!!!', 'bugs', 'Body');

    assert.strictEqual(result.filename, 'fix-bug-123-api-error.md', 'should strip special chars and multiple hyphens');
  });
});

describe('listTodos(cwd, area)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns all todo files with parsed frontmatter', () => {
    toolkit.createTodo(tmpDir, 'First todo', 'api', 'First body');
    toolkit.createTodo(tmpDir, 'Second todo', 'general', 'Second body');

    const result = toolkit.listTodos(tmpDir);

    assert.strictEqual(result.count, 2, 'should return count of 2');
    assert.strictEqual(result.todos.length, 2, 'should have 2 todos in array');
  });

  test('each todo includes filename, title, area, created, body, and path', () => {
    toolkit.createTodo(tmpDir, 'Test todo', 'api', 'Test body');

    const result = toolkit.listTodos(tmpDir);
    const todo = result.todos[0];

    assert.ok(todo.filename, 'should have filename');
    assert.ok(todo.title, 'should have title');
    assert.ok(todo.area, 'should have area');
    assert.ok(todo.created, 'should have created date');
    assert.ok(todo.body, 'should have body');
    assert.ok(todo.path, 'should have path');
  });

  test('derives title from filename when frontmatter does not have title', () => {
    toolkit.createTodo(tmpDir, 'Add caching support', 'api', 'Body');

    const result = toolkit.listTodos(tmpDir);
    const todo = result.todos[0];

    assert.ok(todo.title.includes('Add') || todo.title.includes('Caching'), 'should derive title from filename');
  });

  test('returns empty result for nonexistent todos directory', () => {
    const result = toolkit.listTodos(tmpDir);

    assert.strictEqual(result.count, 0, 'should return count of 0');
    assert.strictEqual(result.todos.length, 0, 'should have empty todos array');
  });

  test('filters todos by area when area parameter provided', () => {
    toolkit.createTodo(tmpDir, 'API todo', 'api', 'API body');
    toolkit.createTodo(tmpDir, 'General todo', 'general', 'General body');
    toolkit.createTodo(tmpDir, 'Another API todo', 'api', 'API body 2');

    const result = toolkit.listTodos(tmpDir, 'api');

    assert.strictEqual(result.count, 2, 'should return only api todos');
    assert.ok(result.todos.every(t => t.area === 'api'), 'all todos should have api area');
  });

  test('returns empty result when filtering by nonexistent area', () => {
    toolkit.createTodo(tmpDir, 'API todo', 'api', 'Body');

    const result = toolkit.listTodos(tmpDir, 'nonexistent');

    assert.strictEqual(result.count, 0, 'should return count of 0');
    assert.strictEqual(result.todos.length, 0, 'should have empty array');
  });
});

describe('completeTodo(cwd, filename)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('deletes the todo file from .planning/todos/', () => {
    toolkit.createTodo(tmpDir, 'Test todo', 'general', 'Body');
    const todoPath = path.join(tmpDir, '.planning', 'todos', 'test-todo.md');
    assert.ok(fs.existsSync(todoPath), 'file should exist before deletion');

    const result = toolkit.completeTodo(tmpDir, 'test-todo.md');

    assert.strictEqual(result.success, true, 'should succeed');
    assert.strictEqual(result.deleted, 'test-todo.md', 'should return deleted filename');
    assert.ok(!fs.existsSync(todoPath), 'file should not exist after deletion');
  });

  test('returns error when file does not exist', () => {
    const result = toolkit.completeTodo(tmpDir, 'nonexistent.md');

    assert.strictEqual(result.success, false, 'should fail');
    assert.ok(result.error, 'should include error message');
    assert.ok(typeof result.error === 'string', 'error should be a string');
  });

  test('handles filename without .md extension', () => {
    toolkit.createTodo(tmpDir, 'Test todo', 'general', 'Body');

    const result = toolkit.completeTodo(tmpDir, 'test-todo');

    assert.strictEqual(result.success, true, 'should handle filename without extension');
  });
});

describe('deleteTodo(cwd, filename)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('deletes the todo file from .planning/todos/', () => {
    toolkit.createTodo(tmpDir, 'Test todo', 'general', 'Body');
    const todoPath = path.join(tmpDir, '.planning', 'todos', 'test-todo.md');
    assert.ok(fs.existsSync(todoPath), 'file should exist before deletion');

    const result = toolkit.deleteTodo(tmpDir, 'test-todo.md');

    assert.strictEqual(result.success, true, 'should succeed');
    assert.strictEqual(result.deleted, 'test-todo.md', 'should return deleted filename');
    assert.ok(!fs.existsSync(todoPath), 'file should not exist after deletion');
  });

  test('returns error when file does not exist', () => {
    const result = toolkit.deleteTodo(tmpDir, 'nonexistent.md');

    assert.strictEqual(result.success, false, 'should fail');
    assert.ok(result.error, 'should include error message');
  });

  test('has same behavior as completeTodo (semantic alias)', () => {
    toolkit.createTodo(tmpDir, 'Todo 1', 'general', 'Body');
    toolkit.createTodo(tmpDir, 'Todo 2', 'general', 'Body');

    const completeResult = toolkit.completeTodo(tmpDir, 'todo-1.md');
    const deleteResult = toolkit.deleteTodo(tmpDir, 'todo-2.md');

    assert.strictEqual(completeResult.success, deleteResult.success, 'both should succeed');
    assert.strictEqual(typeof completeResult.deleted, typeof deleteResult.deleted, 'both should return deleted field');
  });
});
