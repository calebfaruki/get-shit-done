const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

const WRAPPER_PATH = path.join(__dirname, '..', 'hooks', 'gsd-idle-timeout');

function runWrapper(wrapperArgs, opts = {}) {
  const result = spawnSync('node', [WRAPPER_PATH, ...wrapperArgs], {
    timeout: opts.timeout || 15000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return {
    exitCode: result.status,
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString()
  };
}

describe('gsd-idle-timeout wrapper', () => {
  describe('legacy form: <timeout> -- cmd args', () => {
    it('passes through stdout', () => {
      const result = runWrapper(['5', '--', 'echo', 'hello']);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('hello'));
    });

    it('passes through stderr', () => {
      const result = runWrapper(['5', '--', 'sh', '-c', 'echo err >&2']);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stderr.includes('err'));
    });

    it('kills on silence', () => {
      const result = runWrapper(['2', '--', 'sleep', '30'], { timeout: 10000 });
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stderr.includes('IDLE TIMEOUT'));
    });

    it('resets timer on output', () => {
      const script = 'for i in 1 2 3 4 5; do echo $i; sleep 1; done';
      const result = runWrapper(['3', '--', 'sh', '-c', script], { timeout: 15000 });
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('5'));
    });

    it('preserves exit code', () => {
      const result = runWrapper(['5', '--', 'sh', '-c', 'exit 42']);
      assert.equal(result.exitCode, 42);
    });

    it('handles missing command', () => {
      const result = runWrapper(['--']);
      assert.equal(result.exitCode, 0);
    });
  });

  describe('short form: <timeout> <command string>', () => {
    it('passes through stdout', () => {
      const result = runWrapper(['5', 'echo hello']);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('hello'));
    });

    it('passes through stderr', () => {
      const result = runWrapper(['5', 'echo err >&2']);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stderr.includes('err'));
    });

    it('handles pipes', () => {
      const result = runWrapper(['5', 'echo hello | tr h H']);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('Hello'));
    });

    it('kills on silence', () => {
      const result = runWrapper(['2', 'sleep 30'], { timeout: 10000 });
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stderr.includes('IDLE TIMEOUT'));
    });

    it('preserves exit code', () => {
      const result = runWrapper(['5', 'exit 42']);
      assert.equal(result.exitCode, 42);
    });
  });
});
