#!/usr/bin/env node
// Bash Guard - PreToolUse hook
// Blocks run_in_background and wraps commands with idle timeout monitor.

const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolInput = data.tool_input;

    if (!toolInput) {
      process.exit(0);
    }

    if (toolInput.run_in_background) {
      process.stderr.write(
        '---GSD BASH GUARD---\n' +
        'Background Bash execution is not permitted.\n\n' +
        'Use foreground execution with a timeout instead:\n' +
        '  { "command": "...", "timeout": 120000 }\n\n' +
        'Do NOT retry with run_in_background. Run the command in the foreground.\n' +
        '---END GSD BASH GUARD---'
      );
      process.exit(2);
    }

    const idleTimeout = 60;
    const wrapperPath = path.join(__dirname, 'gsd-idle-timeout');

    if (fs.existsSync(wrapperPath)) {
      const escapedCmd = toolInput.command.replace(/'/g, "'\\''");
      const wrappedCmd = `"${wrapperPath}" ${idleTimeout} '${escapedCmd}'`;
      const output = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          updatedInput: { ...toolInput, command: wrappedCmd }
        }
      };
      process.stdout.write(JSON.stringify(output));
    }

    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
