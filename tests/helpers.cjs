const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PREREQS_HOOK_PATH = path.join(__dirname, '..', 'hooks', 'gsd-prereqs.js');
const BASH_GUARD_HOOK_PATH = path.join(__dirname, '..', 'hooks', 'gsd-bash-guard.js');
const IDLE_DEBUG_HOOK_PATH = path.join(__dirname, '..', 'hooks', 'gsd-idle-debug.js');

function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-test-'));
  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function runHook(hookPath, stdinData, cwd) {
  const input = typeof stdinData === 'string' ? stdinData : JSON.stringify(stdinData);
  try {
    const stdout = execSync(`node ${hookPath}`, {
      input,
      cwd: cwd || process.cwd(),
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { exitCode: 0, stdout: stdout.toString(), stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status,
      stdout: (err.stdout || '').toString(),
      stderr: (err.stderr || '').toString()
    };
  }
}

module.exports = { PREREQS_HOOK_PATH, BASH_GUARD_HOOK_PATH, IDLE_DEBUG_HOOK_PATH, createTempProject, cleanup, runHook };
