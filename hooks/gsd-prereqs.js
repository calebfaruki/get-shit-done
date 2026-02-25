#!/usr/bin/env node
// Prerequisite Checker - PreToolUse hook
// Validates that required files exist before GSD commands run.
// Hard failures (exit 2) block the command. Soft warnings inject context.

const fs = require('fs');
const path = require('path');

const PHASE_COMMANDS = new Set([
  'discuss-phase', 'research-phase', 'plan-phase', 'execute-phase', 'verify-phase'
]);

const PREREQS = {
  'new-project': {
    soft: [
      { file: '.planning/CODEBASE.md', message: 'No codebase map found.', fix: '/gsd:map' }
    ]
  },
  'research-project': {
    soft: [
      { file: '.planning/project/PROJECT.md', message: 'PROJECT.md not found.', fix: '/gsd:new-project' }
    ]
  },
  'discuss-project': {
    soft: [
      { file: '.planning/project/PROJECT.md', message: 'PROJECT.md not found.', fix: '/gsd:new-project' }
    ]
  },
  'plan-project': {
    soft: [
      { file: '.planning/project/PROJECT.md', message: 'PROJECT.md not found.', fix: '/gsd:new-project' }
    ]
  },
  'discuss-phase': {
    hard: [
      { file: '.planning/project/PROJECT-PLAN.md', message: 'PROJECT-PLAN.md not found.', fix: '/gsd:plan-project' },
      { type: 'phase-exists', message: 'Phase {N} not found in PROJECT-PLAN.md.', fix: '/gsd:plan-project' }
    ]
  },
  'research-phase': {
    hard: [
      { file: '.planning/project/PROJECT-PLAN.md', message: 'PROJECT-PLAN.md not found.', fix: '/gsd:plan-project' },
      { type: 'phase-exists', message: 'Phase {N} not found in PROJECT-PLAN.md.', fix: '/gsd:plan-project' }
    ]
  },
  'plan-phase': {
    hard: [
      { file: '.planning/project/PROJECT-PLAN.md', message: 'PROJECT-PLAN.md not found.', fix: '/gsd:plan-project' },
      { type: 'phase-exists', message: 'Phase {N} not found in PROJECT-PLAN.md.', fix: '/gsd:plan-project' }
    ]
  },
  'execute-phase': {
    hard: [
      { file: '.planning/project/PHASE-{N}-PLAN.md', message: 'PHASE-{N}-PLAN.md not found.', fix: '/gsd:plan-phase {N}' }
    ],
    soft: [
      { file: '.planning/project/PROJECT.md', message: 'PROJECT.md not found. Executor will lack project context.', fix: '/gsd:new-project' }
    ]
  },
  'verify-phase': {
    hard: [
      { file: '.planning/project/PHASE-{N}-PLAN.md', message: 'PHASE-{N}-PLAN.md not found.', fix: '/gsd:plan-phase {N}' },
      { file: '.planning/project/PROJECT-SUMMARY.md', message: 'PROJECT-SUMMARY.md not found. Phase has not been executed.', fix: '/gsd:execute-phase {N}' }
    ]
  },
  'verify-project': {
    soft: [
      { file: '.planning/project/PROJECT.md', message: 'PROJECT.md not found.', fix: '/gsd:new-project' },
      { file: '.planning/project/PROJECT-SUMMARY.md', message: 'No execution history.', fix: 'Execute phases first.' }
    ]
  }
};

function resolveTemplate(str, phaseNum) {
  return str.replace(/\{N\}/g, phaseNum);
}

function checkRule(rule, phaseNum) {
  if (rule.type === 'phase-exists') {
    const planPath = path.join(process.cwd(), '.planning/project/PROJECT-PLAN.md');
    if (!fs.existsSync(planPath)) return true; // already caught by file rule
    const content = fs.readFileSync(planPath, 'utf8');
    const regex = new RegExp(`^### Phase ${phaseNum}:`, 'm');
    return !regex.test(content);
  }
  const filePath = path.join(process.cwd(), resolveTemplate(rule.file, phaseNum));
  return !fs.existsSync(filePath);
}

function formatFailure(rule, phaseNum) {
  const message = resolveTemplate(rule.message, phaseNum);
  const fix = resolveTemplate(rule.fix, phaseNum);
  return { message, fix };
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolInput = data.tool_input;

    if (!toolInput || !toolInput.skill) {
      process.exit(0);
    }

    // Normalize: strip "gsd:" prefix
    const rawSkill = toolInput.skill;
    const skill = rawSkill.startsWith('gsd:') ? rawSkill.slice(4) : rawSkill;
    const rules = PREREQS[skill];
    if (!rules) {
      process.exit(0);
    }

    // Parse phase number for phase commands
    let phaseNum = null;
    if (PHASE_COMMANDS.has(skill)) {
      const args = (toolInput.args || '').trim();
      const match = args.match(/^(\d+)/);
      if (!match) {
        const label = rawSkill.startsWith('gsd:') ? rawSkill : `gsd:${skill}`;
        process.stderr.write(
          '---GSD PREREQ---\n' +
          `Cannot run /${label}.\n\n` +
          'MISSING: Phase number is required.\n' +
          `FIX: Run /${label} N (where N is the phase number).\n\n` +
          'Tell the user what is missing and which command to run next.\n' +
          '---END GSD PREREQ---'
        );
        process.exit(2);
      }
      phaseNum = match[1];
    }

    // Check hard rules
    const hardFailures = [];
    if (rules.hard) {
      for (const rule of rules.hard) {
        if (checkRule(rule, phaseNum)) {
          hardFailures.push(formatFailure(rule, phaseNum));
        }
      }
    }

    if (hardFailures.length > 0) {
      const label = rawSkill.startsWith('gsd:') ? rawSkill : `gsd:${skill}`;
      const lines = [`---GSD PREREQ---\nCannot run /${label}${phaseNum ? ' ' + phaseNum : ''}.\n`];
      for (const f of hardFailures) {
        lines.push(`MISSING: ${f.message}`);
        lines.push(`FIX: Run ${f.fix} first.\n`);
      }
      lines.push('Tell the user what is missing and which command to run next.');
      lines.push('---END GSD PREREQ---');
      process.stderr.write(lines.join('\n'));
      process.exit(2);
    }

    // Check soft rules
    const softWarnings = [];
    if (rules.soft) {
      for (const rule of rules.soft) {
        if (checkRule(rule, phaseNum)) {
          softWarnings.push(formatFailure(rule, phaseNum));
        }
      }
    }

    if (softWarnings.length > 0) {
      const label = rawSkill.startsWith('gsd:') ? rawSkill : `gsd:${skill}`;
      const lines = [`---GSD PREREQ---\n/${label}${phaseNum ? ' ' + phaseNum : ''} — prerequisite warning:\n`];
      for (const w of softWarnings) {
        lines.push(`WARNING: ${w.message}`);
        lines.push(`SUGGESTED: Run ${w.fix}\n`);
      }
      lines.push('Mention this to the user, then proceed with the command.');
      lines.push('---END GSD PREREQ---');

      const output = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: lines.join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output));
    }

    process.exit(0);
  } catch (e) {
    // Silent fail -- never block tool execution on hook errors
    process.exit(0);
  }
});
