#!/usr/bin/env node
// Claude Code Statusline - GSD Edition
// Shows: model | current task | directory | context usage

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

if (require.main === module) {
// Read JSON from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = data.workspace?.current_dir || process.cwd();
    const session = data.session_id || '';
    const remaining = data.context_window?.remaining_percentage;

    // Context window display (shows USED percentage scaled to 80% limit)
    // Claude Code enforces an 80% context limit, so we scale to show 100% at that point
    let ctx = '';
    if (remaining != null) {
      const rem = Math.round(remaining);
      const rawUsed = Math.max(0, Math.min(100, 100 - rem));
      // Scale: 80% real usage = 100% displayed
      const used = Math.min(100, Math.round((rawUsed / 80) * 100));

      // Write context metrics to bridge file for the context-monitor PostToolUse hook.
      // The monitor reads this file to inject agent-facing warnings when context is low.
      if (session) {
        try {
          const bridgePath = path.join(os.tmpdir(), `claude-ctx-${session}.json`);
          const bridgeData = JSON.stringify({
            session_id: session,
            remaining_percentage: remaining,
            used_pct: used,
            timestamp: Math.floor(Date.now() / 1000)
          });
          fs.writeFileSync(bridgePath, bridgeData);
        } catch (e) {
          // Silent fail -- bridge is best-effort, don't break statusline
        }
      }

      // Build progress bar (10 segments)
      const filled = Math.floor(used / 10);
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

      // Color based on scaled usage (thresholds adjusted for new scale)
      if (used < 63) {        // ~50% real
        ctx = ` \x1b[32m${bar} ${used}%\x1b[0m`;
      } else if (used < 81) { // ~65% real
        ctx = ` \x1b[33m${bar} ${used}%\x1b[0m`;
      } else if (used < 95) { // ~76% real
        ctx = ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
      } else {
        ctx = ` \x1b[5;31m💀 ${bar} ${used}%\x1b[0m`;
      }
    }

    // Current task from todos
    let task = '';
    const homeDir = os.homedir();
    const todosDir = path.join(homeDir, '.claude', 'todos');
    if (session && fs.existsSync(todosDir)) {
      try {
        const files = fs.readdirSync(todosDir)
          .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
          .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
          .sort((a, b) => b.mtime - a.mtime);

        if (files.length > 0) {
          try {
            const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
            const inProgress = todos.find(t => t.status === 'in_progress');
            if (inProgress) task = inProgress.activeForm || '';
          } catch (e) {}
        }
      } catch (e) {
        // Silently fail on file system errors - don't break statusline
      }
    }

    // Map staleness indicator (replaces dirname in output)
    let mapSegment = '';
    const codebasePath = path.join(dir, '.planning', 'codebase', 'tech-stack.md');
    if (!fs.existsSync(codebasePath)) {
      mapSegment = `\x1b[31mMAP: ✗\x1b[0m`;
    } else {
      try {
        const codebaseContent = fs.readFileSync(codebasePath, 'utf8');
        const sha = parseCommitSha(codebaseContent);
        if (sha) {
          const numstat = execSync('git diff --numstat ' + sha + '..HEAD', {
            cwd: dir, timeout: 1000, stdio: ['pipe', 'pipe', 'pipe']
          }).toString().trim();
          const lines = countLinesChanged(numstat);
          const color = getMapStalenessColor(lines);
          mapSegment = `${color}Δ ${lines} lines\x1b[0m`;
        }
      } catch (e) {
        // Silent fail if git fails or timeout
      }
    }

    // Braille lifecycle indicator
    let braille = '';
    try {
      const { resolveState } = require('./gsd-state-resolver.js');
      const resolved = resolveState(dir);
      braille = renderBrailleIndicator(resolved.steps, resolved.totalPhases);
    } catch (e) {
      // Silent fail — don't break statusline if resolver fails
    }

    // Output
    const braillePrefix = braille ? `${braille} │ ` : '';
    const sep = (mapSegment && ctx) ? ' │' : '';
    if (task) {
      process.stdout.write(`${braillePrefix}\x1b[2m${model}\x1b[0m │ \x1b[1m${task}\x1b[0m │ ${mapSegment}${sep}${ctx}`);
    } else {
      process.stdout.write(`${braillePrefix}\x1b[2m${model}\x1b[0m │ ${mapSegment}${sep}${ctx}`);
    }
  } catch (e) {
    // Silent fail - don't break statusline on parse errors
  }
});
} // end require.main === module

function parseCommitSha(content) {
  if (!content) return null;
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const frontmatter = match[1];
  const shaMatch = frontmatter.match(/^commit_sha:\s*([a-f0-9]{7,40})\s*$/m);
  return shaMatch ? shaMatch[1] : null;
}

function countLinesChanged(numstatOutput) {
  if (!numstatOutput) return 0;
  let total = 0;
  for (const line of numstatOutput.split('\n')) {
    const parts = line.split('\t');
    const added = parseInt(parts[0], 10);
    const deleted = parseInt(parts[1], 10);
    if (!isNaN(added)) total += added;
    if (!isNaN(deleted)) total += deleted;
  }
  return total;
}

function getMapStalenessColor(lines) {
  if (lines <= 100) return '\x1b[32m';
  if (lines <= 500) return '\x1b[33m';
  if (lines <= 2000) return '\x1b[38;5;208m';
  return '\x1b[31m';
}

function renderBrailleIndicator(steps, totalPhases) {
  if (!steps || steps.length === 0) return '';

  const CHAR_MAP = {
    done: '\x1b[32m\u25CF\x1b[0m',
    active: '\x1b[33m\u25D0\x1b[0m',
    pending: '\x1b[2m\u25CB\x1b[0m',
    skipped: '\x1b[31m\u25CF\x1b[0m',
  };

  const segments = [];
  let idx = 0;

  // Project segment: 4 steps
  let seg = '';
  for (let i = 0; i < 4 && idx < steps.length; i++, idx++) {
    seg += CHAR_MAP[steps[idx].status] || '';
  }
  segments.push(seg);

  // Phase segments: 5 steps each
  if (totalPhases != null) {
    for (let p = 0; p < totalPhases; p++) {
      seg = '';
      for (let i = 0; i < 5 && idx < steps.length; i++, idx++) {
        seg += CHAR_MAP[steps[idx].status] || '';
      }
      segments.push(seg);
    }

    // Verify segment: 1 step
    if (idx < steps.length) {
      segments.push(CHAR_MAP[steps[idx].status] || '');
      idx++;
    }
  }

  return segments.join(' ');
}

module.exports = { parseCommitSha, countLinesChanged, getMapStalenessColor, renderBrailleIndicator };
