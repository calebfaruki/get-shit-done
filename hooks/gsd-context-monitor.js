#!/usr/bin/env node
// Context Monitor - PostToolUse hook
// Reads context metrics from the statusline bridge file and injects
// warnings when context usage is high. This makes the AGENT aware of
// context limits (the statusline only shows the user).
//
// How it works:
// 1. The statusline hook writes metrics to /tmp/claude-ctx-{session_id}.json
// 2. This hook reads those metrics after each tool use
// 3. When remaining context drops below thresholds, it injects a warning
//    as additionalContext, which the agent sees in its conversation
//
// Thresholds:
//   WARNING   (remaining <= 35%): Agent should wrap up current task
//   CRITICAL  (remaining <= 25%): Agent must stop after current action
//   EXHAUSTED (remaining <= 15%): Agent must stop immediately
//
// Debounce (level-aware):
//   WARNING: 5 tool uses between warnings
//   CRITICAL: 2 tool uses between warnings
//   EXHAUSTED: 1 tool use (fires every time)
// Severity escalation bypasses debounce

const fs = require('fs');
const os = require('os');
const path = require('path');

const WARNING_THRESHOLD = 35;
const CRITICAL_THRESHOLD = 25;
const EXHAUSTED_THRESHOLD = 15;
const STALE_SECONDS = 60;
const DEBOUNCE_BY_LEVEL = { warning: 5, critical: 2, exhausted: 1 };

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;

    if (!sessionId) {
      process.exit(0);
    }

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    if (!fs.existsSync(metricsPath)) {
      process.exit(0);
    }

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (metrics.timestamp && (now - metrics.timestamp) > STALE_SECONDS) {
      process.exit(0);
    }

    const remaining = metrics.remaining_percentage;

    if (remaining > WARNING_THRESHOLD) {
      process.exit(0);
    }

    // Determine current level
    let currentLevel;
    if (remaining <= EXHAUSTED_THRESHOLD) {
      currentLevel = 'exhausted';
    } else if (remaining <= CRITICAL_THRESHOLD) {
      currentLevel = 'critical';
    } else {
      currentLevel = 'warning';
    }

    // Debounce: check if we warned recently
    const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-warned.json`);
    let warnData = { callsSinceWarn: 0, lastLevel: null };
    let firstWarn = true;

    if (fs.existsSync(warnPath)) {
      try {
        warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
        firstWarn = false;
      } catch (e) {
        // Corrupted file, reset
      }
    }

    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;

    const LEVEL_ORDER = { warning: 0, critical: 1, exhausted: 2 };
    const severityEscalated = warnData.lastLevel &&
      LEVEL_ORDER[currentLevel] > LEVEL_ORDER[warnData.lastLevel];

    const debounceLimit = DEBOUNCE_BY_LEVEL[currentLevel];
    if (!firstWarn && warnData.callsSinceWarn < debounceLimit && !severityEscalated) {
      fs.writeFileSync(warnPath, JSON.stringify(warnData));
      process.exit(0);
    }

    // Reset debounce counter
    warnData.callsSinceWarn = 0;
    warnData.lastLevel = currentLevel;
    fs.writeFileSync(warnPath, JSON.stringify(warnData));

    // Build warning message
    let message;
    if (currentLevel === 'exhausted') {
      message =
        '---CONTEXT MONITOR---\n' +
        `CONTEXT WINDOW EXHAUSTED — ${remaining}% remaining.\n` +
        '\n' +
        'These instructions override your current task. STOP. Do not make any more tool calls. Your only remaining action is to write a message to the user summarizing session state. If you have not updated PROJECT-SUMMARY.md, include all progress notes in your message directly.\n' +
        '\n' +
        'Do not make any tool calls. Write your summary message now.\n' +
        '---END CONTEXT MONITOR---';
    } else if (currentLevel === 'critical') {
      message =
        '---CONTEXT MONITOR---\n' +
        `CONTEXT WINDOW CRITICAL — ${remaining}% remaining.\n` +
        '\n' +
        'These instructions override your current task. You must stop after your current action. Do the following immediately:\n' +
        '1. Complete only the single operation you are currently performing. Do not start another.\n' +
        '2. Write your progress to PROJECT-SUMMARY.md: completed work, incomplete work, next steps, and any relevant file paths or error states.\n' +
        '3. Tell the user: context is nearly exhausted, the session must end, and provide a summary of what was accomplished and what remains.\n' +
        '4. Do not make any further tool calls after the summary unless the user explicitly asks.\n' +
        '---END CONTEXT MONITOR---';
    } else {
      message =
        '---CONTEXT MONITOR---\n' +
        `CONTEXT WINDOW WARNING — ${remaining}% remaining.\n` +
        '\n' +
        'Stop what you are planning and follow these steps in order:\n' +
        '1. Finish your current in-progress action (complete the file edit or test you started).\n' +
        '2. Do NOT begin new file modifications or start new subtasks.\n' +
        '3. Update PROJECT-SUMMARY.md with: what you completed, what remains, and any state the next session needs.\n' +
        '4. Tell the user that context is running low and that they must start a fresh session after this task.\n' +
        '---END CONTEXT MONITOR---';
    }

    const output = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: message
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    // Silent fail -- never block tool execution
    process.exit(0);
  }
});
