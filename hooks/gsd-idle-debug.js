#!/usr/bin/env node
// Idle Debug Escalation - PostToolUse hook (Bash only)
// When idle timeout kills a command, instructs the agent to stop and
// return to the orchestrator for debugger escalation.

const IDLE_SENTINEL = '---GSD IDLE TIMEOUT---';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    if (data.tool_name !== 'Bash') {
      process.exit(0);
    }

    const resultText = typeof data.tool_result === 'string'
      ? data.tool_result
      : JSON.stringify(data.tool_result || '');

    if (!resultText.includes(IDLE_SENTINEL)) {
      process.exit(0);
    }

    const command = (data.tool_input && data.tool_input.command) || '(unknown)';

    const lines = resultText.split('\n');
    const sentinelIdx = lines.findIndex(l => l.includes(IDLE_SENTINEL));
    const lastOutput = lines.slice(0, sentinelIdx).slice(-30).join('\n').trim()
      || '(no output before timeout)';

    const safeCommand = command.replace(/</g, '[').replace(/>/g, ']');
    const safeOutput = lastOutput.replace(/</g, '[').replace(/>/g, ']');

    const message =
      '---GSD IDLE TIMEOUT---\n' +
      'MANDATORY OVERRIDE — read every line before acting.\n' +
      '\n' +
      'The Bash command you just ran was killed after 60 seconds of no output.\n' +
      'This is a process hang. The same command will hang again. A modified version\n' +
      'of the same command will also hang. There is no retry that fixes a hang.\n' +
      '\n' +
      'STOP CURRENT TASK. Follow the hung-process gate protocol:\n' +
      '\n' +
      '1. Do NOT re-run the hung command or any variation of it.\n' +
      '2. Update PROJECT-SUMMARY.md with status "Stopped (Hung Process)".\n' +
      '   In Notes, record:\n' +
      '   - The command that hung: ' + safeCommand + '\n' +
      '   - Last output before hang: ' + safeOutput + '\n' +
      '   - Which task in the plan you were executing\n' +
      '   - What you were trying to verify or accomplish\n' +
      '3. Return this message to the orchestrator:\n' +
      '\n' +
      '   HUNG PROCESS — DEBUGGER REQUIRED\n' +
      '   command: [the command that hung]\n' +
      '   task: [which plan task you were on]\n' +
      '   context: [what you were trying to accomplish]\n' +
      '   last_output: [last few lines before hang, or "none"]\n' +
      '\n' +
      'Do not continue to the next task. Do not attempt workarounds.\n' +
      'The orchestrator will spawn a debugger to investigate.\n' +
      '---END GSD IDLE TIMEOUT---';

    const output = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: message
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    process.exit(0);
  }
});
