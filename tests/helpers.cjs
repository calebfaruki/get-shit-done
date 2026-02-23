/**
 * GSD Tools Test Helpers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_CLI_PATH = path.join(__dirname, '..', 'get-shit-done', 'bin', 'lib', 'test-cli.cjs');

// Helper to run commands via test CLI wrapper
function runGsdTools(args, cwd = process.cwd()) {
  try {
    const testCli = require(TEST_CLI_PATH);
    const argArray = args.split(/\s+/).filter(a => a);

    // Capture stdout
    let output = '';
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      output += chunk;
      return true;
    };

    try {
      testCli.execute(argArray, cwd);
    } finally {
      process.stdout.write = originalStdoutWrite;
    }

    return { success: true, output: output.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// Create temp directory structure
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gsd-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

module.exports = { runGsdTools, createTempProject, cleanup };
