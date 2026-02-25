const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { IDLE_DEBUG_HOOK_PATH, runHook } = require('./helpers.cjs');

const SENTINEL = '---GSD IDLE TIMEOUT---';

function makeInput(overrides = {}) {
  return {
    tool_name: 'Bash',
    tool_input: { command: 'npm test' },
    tool_result: `some output\n${SENTINEL}\nCommand killed: no output for 60s.\n---END GSD IDLE TIMEOUT---`,
    ...overrides
  };
}

describe('gsd-idle-debug hook', () => {
  it('ignores non-Bash tools', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, makeInput({ tool_name: 'Read' }));
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, '');
  });

  it('ignores normal Bash results', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, {
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_result: 'file1.txt\nfile2.txt'
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, '');
  });

  it('detects idle timeout and injects context', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, makeInput());
    assert.equal(result.exitCode, 0);
    const output = JSON.parse(result.stdout);
    const ctx = output.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('Do NOT re-run'));
    assert.ok(ctx.includes('HUNG PROCESS'));
  });

  it('includes command in context', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, makeInput({
      tool_input: { command: 'npm test' }
    }));
    const output = JSON.parse(result.stdout);
    const ctx = output.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('npm test'));
  });

  it('includes last output in context', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, makeInput({
      tool_result: `Starting server...\nListening on port 3000\n${SENTINEL}\nKilled\n---END GSD IDLE TIMEOUT---`
    }));
    const output = JSON.parse(result.stdout);
    const ctx = output.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('Listening on port 3000'));
  });

  it('handles missing tool_input', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, {
      tool_name: 'Bash',
      tool_result: `${SENTINEL}\nKilled\n---END GSD IDLE TIMEOUT---`
    });
    assert.equal(result.exitCode, 0);
    const output = JSON.parse(result.stdout);
    const ctx = output.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('(unknown)'));
  });

  it('handles invalid JSON', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, 'not valid json {{{');
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, '');
  });

  it('sanitizes angle brackets', () => {
    const result = runHook(IDLE_DEBUG_HOOK_PATH, makeInput({
      tool_input: { command: 'echo <script>alert(1)</script>' }
    }));
    const output = JSON.parse(result.stdout);
    const ctx = output.hookSpecificOutput.additionalContext;
    assert.ok(ctx.includes('[script]'));
    assert.ok(!ctx.includes('<script>'));
  });
});
