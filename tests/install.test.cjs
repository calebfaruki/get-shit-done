const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { INSTALL_BIN_PATH, createTempProject, cleanup } = require('./helpers.cjs');

function runInstall(tmpDir, args = [], opts = {}) {
  return spawnSync('node', [INSTALL_BIN_PATH, ...args], {
    cwd: tmpDir,
    timeout: 10000,
    env: { ...process.env, FORCE_COLOR: '0', CLAUDE_CONFIG_DIR: tmpDir },
    ...opts
  });
}

describe('install.js', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  describe('--help flag', () => {
    it('prints usage line and exits 0', () => {
      const result = runInstall(tmpDir, ['--help']);
      assert.equal(result.status, 0);
      assert.ok(result.stdout.toString().includes('Usage: node install.js'));
    });

    it('does not respond to -h', () => {
      const result = runInstall(tmpDir, ['-h']);
      assert.equal(result.status, 1);
      assert.ok(result.stderr.toString().includes('Unknown flag: -h'));
    });
  });

  describe('unknown flags', () => {
    it('rejects unknown flags with error and usage', () => {
      const result = runInstall(tmpDir, ['--foo']);
      assert.equal(result.status, 1);
      assert.ok(result.stderr.toString().includes('Unknown flag: --foo'));
      assert.ok(result.stdout.toString().includes('Usage: node install.js'));
    });

    it('rejects removed --global flag', () => {
      const result = runInstall(tmpDir, ['--global']);
      assert.equal(result.status, 1);
      assert.ok(result.stderr.toString().includes('Unknown flag: --global'));
    });

    it('rejects removed --uninstall flag', () => {
      const result = runInstall(tmpDir, ['--uninstall']);
      assert.equal(result.status, 1);
      assert.ok(result.stderr.toString().includes('Unknown flag: --uninstall'));
    });
  });

  describe('educational TUI', () => {
    it('does not show educational content in non-TTY mode', () => {
      const result = runInstall(tmpDir, [], { input: '' });
      const stdout = result.stdout.toString();
      assert.ok(!stdout.includes('Philosophy'), 'Philosophy should not appear in non-TTY');
      assert.ok(!stdout.includes('Workflow'), 'Workflow should not appear in non-TTY');
      assert.ok(!stdout.includes('Progress Tracker'), 'Progress Tracker should not appear in non-TTY');
      assert.ok(!stdout.includes('Codemap Staleness'), 'Codemap Staleness should not appear in non-TTY');
    });

    it('printEducation function exists in source', () => {
      const source = fs.readFileSync(INSTALL_BIN_PATH, 'utf8');
      assert.ok(source.includes('function printEducation'), 'printEducation function not found');
    });

    it('source contains all four educational sections', () => {
      const source = fs.readFileSync(INSTALL_BIN_PATH, 'utf8');
      assert.ok(source.includes('Philosophy'), 'missing Philosophy section');
      assert.ok(source.includes('Workflow'), 'missing Workflow section');
      assert.ok(source.includes('Progress Tracker'), 'missing Progress Tracker section');
      assert.ok(source.includes('Codemap Staleness'), 'missing Codemap Staleness section');
    });

    it('source has sections in correct order', () => {
      const source = fs.readFileSync(INSTALL_BIN_PATH, 'utf8');
      const philIdx = source.indexOf('Philosophy');
      const workIdx = source.indexOf('Workflow');
      const progIdx = source.indexOf('Progress Tracker');
      const staleIdx = source.indexOf('Codemap Staleness');
      assert.ok(philIdx < workIdx, 'Philosophy must come before Workflow');
      assert.ok(workIdx < progIdx, 'Workflow must come before Progress Tracker');
      assert.ok(progIdx < staleIdx, 'Progress Tracker must come before Codemap Staleness');
    });

    it('source contains box-drawing characters', () => {
      const source = fs.readFileSync(INSTALL_BIN_PATH, 'utf8');
      assert.ok(source.includes('┌'), 'missing top-left box corner');
      assert.ok(source.includes('└'), 'missing bottom-left box corner');
      assert.ok(source.includes('│'), 'missing vertical box border');
    });

    it('printEducation is called in promptLocation', () => {
      const source = fs.readFileSync(INSTALL_BIN_PATH, 'utf8');
      const promptIdx = source.indexOf('function promptLocation');
      const callIdx = source.indexOf('printEducation()', promptIdx);
      assert.ok(callIdx > promptIdx, 'printEducation() must be called inside promptLocation');
    });
  });

  describe('non-interactive install (non-TTY)', () => {
    it('defaults to global install when non-TTY', () => {
      const result = runInstall(tmpDir, [], { input: '' });
      assert.equal(result.status, 0);
      assert.ok(result.stdout.toString().includes('installed'));
    });

    it('creates commands/gsd/ directory', () => {
      runInstall(tmpDir, [], { input: '' });
      assert.ok(fs.existsSync(path.join(tmpDir, 'commands', 'gsd')));
    });

    it('creates get-shit-done/ directory', () => {
      runInstall(tmpDir, [], { input: '' });
      assert.ok(fs.existsSync(path.join(tmpDir, 'get-shit-done')));
    });

    it('creates agents/ directory with gsd-*.md files', () => {
      runInstall(tmpDir, [], { input: '' });
      const agentsDir = path.join(tmpDir, 'agents');
      assert.ok(fs.existsSync(agentsDir));
      const files = fs.readdirSync(agentsDir);
      assert.ok(files.some(f => f.startsWith('gsd-') && f.endsWith('.md')));
    });

    it('creates hooks/ directory with gsd-*.js files', () => {
      runInstall(tmpDir, [], { input: '' });
      const hooksDir = path.join(tmpDir, 'hooks');
      assert.ok(fs.existsSync(hooksDir));
      const files = fs.readdirSync(hooksDir);
      assert.ok(files.some(f => f.startsWith('gsd-') && f.endsWith('.js')));
    });

    it('writes VERSION file', () => {
      runInstall(tmpDir, [], { input: '' });
      assert.ok(fs.existsSync(path.join(tmpDir, 'get-shit-done', 'VERSION')));
    });

    it('writes package.json with commonjs type', () => {
      runInstall(tmpDir, [], { input: '' });
      const content = fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf8');
      assert.ok(content.includes('"type":"commonjs"'));
    });

    it('registers hooks in settings.json', () => {
      runInstall(tmpDir, [], { input: '' });
      const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
      assert.ok(Array.isArray(settings.hooks.PreToolUse) && settings.hooks.PreToolUse.length > 0);
      assert.ok(Array.isArray(settings.hooks.PostToolUse) && settings.hooks.PostToolUse.length > 0);
      assert.ok(Array.isArray(settings.hooks.SessionStart) && settings.hooks.SessionStart.length > 0);
    });

    it('auto-installs statusline in settings.json', () => {
      runInstall(tmpDir, [], { input: '' });
      const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
      assert.ok(settings.statusLine);
      assert.ok(settings.statusLine.command.includes('gsd-statusline'));
    });

    it('preserves non-GSD settings.json keys', () => {
      const settingsPath = path.join(tmpDir, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify({ customKey: 'customValue' }));
      runInstall(tmpDir, [], { input: '' });
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.equal(settings.customKey, 'customValue');
    });

    it('does not duplicate hooks on reinstall', () => {
      runInstall(tmpDir, [], { input: '' });
      runInstall(tmpDir, [], { input: '' });
      const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf8'));
      for (const eventType of ['PreToolUse', 'PostToolUse', 'SessionStart']) {
        const hooks = settings.hooks[eventType];
        const commands = hooks.flatMap(entry =>
          (entry.hooks || []).map(h => h.command)
        );
        const unique = new Set(commands);
        assert.equal(commands.length, unique.size, `${eventType} has duplicate hook commands`);
      }
    });

    it('prints reinstalled on second run', () => {
      runInstall(tmpDir, [], { input: '' });
      const result = runInstall(tmpDir, [], { input: '' });
      assert.ok(result.stdout.toString().includes('reinstalled'));
    });
  });
});
