#!/usr/bin/env node
// Prerequisite Checker - PreToolUse hook
// Validates that required files exist before GSD commands run.
// Hard failures (exit 2) block the command. Soft warnings inject context.
// Uses the state resolver as the single source of truth for command validity.

const fs = require('fs');
const path = require('path');
const { resolveState } = require('./gsd-state-resolver.js');

const PHASE_COMMANDS = new Set([
  'discuss-phase', 'research-phase', 'plan-phase', 'execute-phase', 'verify-phase'
]);

const UTILITY_COMMANDS = new Set(['help', 'health', 'todo', 'map', 'debug', 'skip']);

const KNOWN_COMMANDS = new Set([
  'new-project', 'discuss-project', 'research-project', 'plan-project',
  'discuss-phase', 'research-phase', 'plan-phase', 'execute-phase', 'verify-phase',
  'verify-project', 'end-project'
]);

function isCommandAllowed(skill, phaseNum, resolved, cwd) {
  switch (skill) {
    case 'new-project':
    case 'verify-project':
      return { allowed: true };

    case 'discuss-project':
      if (resolved.state === 'no-project') {
        return { allowed: false, reason: 'No project defined.', fix: '/gsd:new-project' };
      }
      return { allowed: true };

    case 'research-project':
      if (resolved.state === 'no-project') {
        return { allowed: false, reason: 'No project defined.', fix: '/gsd:new-project' };
      }
      if (!fs.existsSync(path.join(cwd, '.planning/project/PROJECT-DISCUSSION.md'))) {
        return {
          allowed: false,
          reason: 'PROJECT-DISCUSSION.md not found. Discuss the project first, or skip to proceed.',
          fix: '/gsd:discuss-project',
          skipFix: '/gsd:skip discuss-project'
        };
      }
      return { allowed: true };

    case 'plan-project':
      if (resolved.state === 'no-project') {
        return { allowed: false, reason: 'No project defined.', fix: '/gsd:new-project' };
      }
      if (!fs.existsSync(path.join(cwd, '.planning/project/PROJECT-DISCUSSION.md'))) {
        return {
          allowed: false,
          reason: 'PROJECT-DISCUSSION.md not found. Discuss the project first, or skip to proceed.',
          fix: '/gsd:discuss-project',
          skipFix: '/gsd:skip discuss-project'
        };
      }
      if (!fs.existsSync(path.join(cwd, '.planning/project/PROJECT-RESEARCH.md'))) {
        return {
          allowed: false,
          reason: 'PROJECT-RESEARCH.md not found. Research the project first, or skip to proceed.',
          fix: '/gsd:research-project',
          skipFix: '/gsd:skip research-project'
        };
      }
      return { allowed: true };

    case 'discuss-phase':
      if (resolved.totalPhases === null) {
        return { allowed: false, reason: 'No project plan found.', fix: '/gsd:plan-project' };
      }
      if (phaseNum > resolved.totalPhases) {
        return { allowed: false, reason: `Phase ${phaseNum} not found in PROJECT-PLAN.md.`, fix: '/gsd:plan-project' };
      }
      return { allowed: true };

    case 'research-phase': {
      if (resolved.totalPhases === null) {
        return { allowed: false, reason: 'No project plan found.', fix: '/gsd:plan-project' };
      }
      if (phaseNum > resolved.totalPhases) {
        return { allowed: false, reason: `Phase ${phaseNum} not found in PROJECT-PLAN.md.`, fix: '/gsd:plan-project' };
      }
      if (!fs.existsSync(path.join(cwd, `.planning/project/PHASE-${phaseNum}-DISCUSSION.md`))) {
        return {
          allowed: false,
          reason: `PHASE-${phaseNum}-DISCUSSION.md not found. Discuss the phase first, or skip to proceed.`,
          fix: `/gsd:discuss-phase ${phaseNum}`,
          skipFix: `/gsd:skip discuss-phase ${phaseNum}`
        };
      }
      return { allowed: true };
    }

    case 'plan-phase': {
      if (resolved.totalPhases === null) {
        return { allowed: false, reason: 'No project plan found.', fix: '/gsd:plan-project' };
      }
      if (phaseNum > resolved.totalPhases) {
        return { allowed: false, reason: `Phase ${phaseNum} not found in PROJECT-PLAN.md.`, fix: '/gsd:plan-project' };
      }
      if (!fs.existsSync(path.join(cwd, `.planning/project/PHASE-${phaseNum}-DISCUSSION.md`))) {
        return {
          allowed: false,
          reason: `PHASE-${phaseNum}-DISCUSSION.md not found. Discuss the phase first, or skip to proceed.`,
          fix: `/gsd:discuss-phase ${phaseNum}`,
          skipFix: `/gsd:skip discuss-phase ${phaseNum}`
        };
      }
      if (!fs.existsSync(path.join(cwd, `.planning/project/PHASE-${phaseNum}-RESEARCH.md`))) {
        return {
          allowed: false,
          reason: `PHASE-${phaseNum}-RESEARCH.md not found. Research the phase first, or skip to proceed.`,
          fix: `/gsd:research-phase ${phaseNum}`,
          skipFix: `/gsd:skip research-phase ${phaseNum}`
        };
      }
      return { allowed: true };
    }

    case 'execute-phase': {
      const planPath = path.join(cwd, '.planning/project/PHASE-' + phaseNum + '-PLAN.md');
      if (!fs.existsSync(planPath)) {
        return { allowed: false, reason: `PHASE-${phaseNum}-PLAN.md not found.`, fix: `/gsd:plan-phase ${phaseNum}` };
      }
      return { allowed: true };
    }

    case 'verify-phase': {
      const phasePlanPath = path.join(cwd, '.planning/project/PHASE-' + phaseNum + '-PLAN.md');
      const summaryPath = path.join(cwd, '.planning/project/PROJECT-SUMMARY.md');
      if (!fs.existsSync(phasePlanPath)) {
        return { allowed: false, reason: `PHASE-${phaseNum}-PLAN.md not found.`, fix: `/gsd:plan-phase ${phaseNum}` };
      }
      if (!fs.existsSync(summaryPath)) {
        return { allowed: false, reason: 'PROJECT-SUMMARY.md not found. Phase has not been executed.', fix: `/gsd:execute-phase ${phaseNum}` };
      }
      return { allowed: true };
    }

    case 'end-project':
      if (resolved.state === 'no-project') {
        return { allowed: false, reason: 'No project to end.', fix: '/gsd:new-project' };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

function getSoftWarnings(skill, phaseNum, cwd) {
  const warnings = [];

  if (skill === 'new-project' || skill === 'research-project' || skill === 'discuss-project' || skill === 'plan-project') {
    if (!fs.existsSync(path.join(cwd, '.planning', 'codebase'))) {
      warnings.push({ message: 'No codebase map found.', fix: '/gsd:map' });
    }
    if (skill !== 'new-project' && !fs.existsSync(path.join(cwd, '.planning/project/PROJECT.md'))) {
      warnings.push({ message: 'PROJECT.md not found.', fix: '/gsd:new-project' });
    }
  }

  if (skill === 'execute-phase') {
    if (!fs.existsSync(path.join(cwd, '.planning/project/PROJECT.md'))) {
      warnings.push({ message: 'PROJECT.md not found. Executor will lack project context.', fix: '/gsd:new-project' });
    }
  }

  return warnings;
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

    const rawSkill = toolInput.skill;
    const skill = rawSkill.startsWith('gsd:') ? rawSkill.slice(4) : rawSkill;

    // Utility commands and unknown commands always pass through
    if (UTILITY_COMMANDS.has(skill) || !KNOWN_COMMANDS.has(skill)) {
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
      phaseNum = parseInt(match[1], 10);
    }

    const cwd = process.cwd();
    const resolved = resolveState(cwd);

    // Check if command is allowed
    const check = isCommandAllowed(skill, phaseNum, resolved, cwd);

    if (!check.allowed) {
      const label = rawSkill.startsWith('gsd:') ? rawSkill : `gsd:${skill}`;
      const lines = [`---GSD PREREQ---\nCannot run /${label}${phaseNum ? ' ' + phaseNum : ''}.\n`];
      lines.push(`MISSING: ${check.reason}`);
      lines.push(`FIX: Run ${check.fix} first.`);
      if (check.skipFix) {
        lines.push(`OR: Run ${check.skipFix} to skip this step.\n`);
      } else {
        lines.push('');
      }
      lines.push('Tell the user what is missing and which command(s) to run next.');
      lines.push('---END GSD PREREQ---');
      process.stderr.write(lines.join('\n'));
      process.exit(2);
    }

    // Soft warnings
    const softWarnings = getSoftWarnings(skill, phaseNum, cwd);

    // Out-of-sequence detection
    let sequenceWarning = '';
    try {
      const currentCmd = phaseNum ? `/${skill} ${phaseNum}` : `/${skill}`;
      if (resolved.nextCommand && resolved.nextCommand !== currentCmd) {
        const lines = [
          '---GSD SEQUENCE---',
          `Out of sequence: running ${currentCmd} but lifecycle suggests ${resolved.nextCommand}.`,
          `Context: ${resolved.context}`,
          'This is a warning only — command will proceed.',
          '---END GSD SEQUENCE---'
        ];
        sequenceWarning = lines.join('\n');
      }
    } catch (e) {
      // Silent continue on resolver errors
    }

    if (softWarnings.length > 0 || sequenceWarning) {
      const label = rawSkill.startsWith('gsd:') ? rawSkill : `gsd:${skill}`;
      const contextParts = [];

      if (softWarnings.length > 0) {
        const lines = [`---GSD PREREQ---\n/${label}${phaseNum ? ' ' + phaseNum : ''} — prerequisite warning:\n`];
        for (const w of softWarnings) {
          lines.push(`WARNING: ${w.message}`);
          lines.push(`SUGGESTED: Run ${w.fix}\n`);
        }
        lines.push('Mention this to the user, then proceed with the command.');
        lines.push('---END GSD PREREQ---');
        contextParts.push(lines.join('\n'));
      }

      if (sequenceWarning) {
        contextParts.push(sequenceWarning);
      }

      const output = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: contextParts.join('\n')
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
