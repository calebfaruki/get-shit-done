const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { BASH_GUARD_HOOK_PATH, runHook } = require('./helpers.cjs');

describe('gsd-bash-guard hook', () => {
  it('blocks run_in_background: true', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test', run_in_background: true }
    });
    assert.equal(result.exitCode, 2);
    assert.ok(result.stderr.includes('not permitted'));
  });

  it('allows normal Bash calls', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test' }
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });

  it('allows explicit run_in_background: false', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test', run_in_background: false }
    });
    assert.equal(result.exitCode, 0);
  });

  it('blocks truthy non-boolean', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'ls', run_in_background: 'true' }
    });
    assert.equal(result.exitCode, 2);
    assert.ok(result.stderr.includes('not permitted'));
  });

  it('handles missing tool_input', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {});
    assert.equal(result.exitCode, 0);
  });

  it('blocks even with missing command', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { run_in_background: true }
    });
    assert.equal(result.exitCode, 2);
  });

  it('handles invalid JSON', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, 'not valid json {{{');
    assert.equal(result.exitCode, 0);
  });

  it('stderr message is actionable', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test', run_in_background: true }
    });
    assert.ok(result.stderr.includes('foreground'));
    assert.ok(result.stderr.includes('timeout'));
  });

  it('wraps command with idle timeout', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test' }
    });
    assert.equal(result.exitCode, 0);
    const output = JSON.parse(result.stdout);
    const cmd = output.hookSpecificOutput.updatedInput.command;
    assert.ok(cmd.includes('gsd-idle-timeout.js'));
    assert.ok(cmd.startsWith('node'));
    assert.ok(cmd.includes("-- sh -c 'npm test'"));
  });

  it('preserves original timeout param in updatedInput', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test', timeout: 300000 }
    });
    assert.equal(result.exitCode, 0);
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.updatedInput.timeout, 300000);
  });

  it('preserves run_in_background: false in updatedInput', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test', run_in_background: false }
    });
    assert.equal(result.exitCode, 0);
    const output = JSON.parse(result.stdout);
    assert.equal(output.hookSpecificOutput.updatedInput.run_in_background, false);
  });

  it('allows long timeouts (no cap)', () => {
    const result = runHook(BASH_GUARD_HOOK_PATH, {
      tool_input: { command: 'npm test', timeout: 600000 }
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, '');
  });
});
