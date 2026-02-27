// State Resolver - derives lifecycle position from .planning/project/ file presence
const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  try {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const fm = {};
    for (const line of match[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (kv) fm[kv[1]] = kv[2].trim();
    }
    return fm;
  } catch (e) {
    return {};
  }
}

function resolveState(dir) {
  const projectDir = path.join(dir, '.planning', 'project');

  if (!fs.existsSync(projectDir)) {
    return { state: 'no-project', nextCommand: '/new-project', context: 'No project found.', steps: [], totalPhases: null, currentPhase: null };
  }

  const files = new Set(fs.readdirSync(projectDir));

  if (!files.has('PROJECT.md') || files.size === 0) {
    return { state: 'no-project', nextCommand: '/new-project', context: 'No project found.', steps: [], totalPhases: null, currentPhase: null };
  }

  if (!files.has('PROJECT-PLAN.md')) {
    let nextCommand, context;
    if (!files.has('PROJECT-RESEARCH.md') && !files.has('PROJECT-DISCUSSION.md')) {
      nextCommand = '/discuss-project';
      context = 'Project defined. Discuss implementation decisions. (skip: /plan-project)';
    } else if (!files.has('PROJECT-RESEARCH.md')) {
      nextCommand = '/research-project';
      context = 'Project discussed. Research before planning. (skip: /plan-project)';
    } else {
      nextCommand = '/plan-project';
      context = 'Project researched. Create a project plan.';
    }
    const legacy = { state: 'project-defined', nextCommand, context };
    const steps = buildSteps(files, null, '', projectDir);
    return { ...legacy, ...assignStatuses(steps), totalPhases: null, currentPhase: null };
  }

  const planContent = fs.readFileSync(path.join(projectDir, 'PROJECT-PLAN.md'), 'utf8');
  const phaseMatches = planContent.match(/^#{2,3} Phase (\d+):/gm);
  if (!phaseMatches || phaseMatches.length === 0) {
    const legacy = { state: 'project-defined', nextCommand: '/plan-project', context: 'Project plan has no phases. Create a project plan.' };
    const steps = buildSteps(files, null, '', projectDir);
    return { ...legacy, ...assignStatuses(steps), totalPhases: null, currentPhase: null };
  }

  let totalPhases = 0;
  for (const m of phaseMatches) {
    const num = parseInt(m.match(/(\d+)/)[1], 10);
    if (num > totalPhases) totalPhases = num;
  }

  const summaryContent = files.has('PROJECT-SUMMARY.md')
    ? fs.readFileSync(path.join(projectDir, 'PROJECT-SUMMARY.md'), 'utf8')
    : '';

  let legacy;
  for (let n = 1; n <= totalPhases; n++) {
    if (!files.has(`PHASE-${n}-PLAN.md`)) {
      if (!files.has(`PHASE-${n}-RESEARCH.md`) && !files.has(`PHASE-${n}-DISCUSSION.md`)) {
        legacy = { state: `phase-${n}-unplanned`, nextCommand: `/discuss-phase ${n}`, context: `Phase ${n} needs planning. Discuss implementation decisions. (skip: /plan-phase ${n})` };
      } else if (!files.has(`PHASE-${n}-RESEARCH.md`)) {
        legacy = { state: `phase-${n}-unplanned`, nextCommand: `/research-phase ${n}`, context: `Phase ${n} discussed. Research before planning. (skip: /plan-phase ${n})` };
      } else {
        legacy = { state: `phase-${n}-unplanned`, nextCommand: `/plan-phase ${n}`, context: `Phase ${n} researched. Create a phase plan.` };
      }
      break;
    }

    const phaseHeaderRegex = new RegExp('^## Phase ' + n + ':', 'm');
    if (!phaseHeaderRegex.test(summaryContent)) {
      legacy = { state: `phase-${n}-planned`, nextCommand: `/execute-phase ${n}`, context: `Phase ${n} planned. Ready to execute.` };
      break;
    }

    if (!files.has(`PHASE-${n}-VERIFICATION.md`)) {
      legacy = { state: `phase-${n}-executed`, nextCommand: `/verify-phase ${n}`, context: `Phase ${n} executed. Ready for verification.` };
      break;
    }
  }

  if (!legacy) {
    if (!files.has('PROJECT-VERIFICATION.md')) {
      legacy = { state: 'all-phases-verified', nextCommand: '/verify-project', context: 'All phases verified. Ready for project verification.' };
    } else {
      legacy = { state: 'project-verified', nextCommand: null, context: 'Project complete.' };
    }
  }

  const steps = buildSteps(files, totalPhases, summaryContent, projectDir);
  const resolved = assignStatuses(steps);
  const currentPhase = deriveCurrentPhase(resolved.steps);

  return { ...legacy, ...resolved, totalPhases, currentPhase };
}

function buildSteps(files, totalPhases, summaryContent, projectDir) {
  const steps = [];

  // Project-level steps (always present)
  steps.push({ id: 'project-defined', label: 'defined', file: 'PROJECT.md' });
  steps.push({ id: 'project-discussed', label: 'discussed', file: 'PROJECT-DISCUSSION.md' });
  steps.push({ id: 'project-researched', label: 'researched', file: 'PROJECT-RESEARCH.md' });
  steps.push({ id: 'project-planned', label: 'planned', file: 'PROJECT-PLAN.md' });

  if (totalPhases != null) {
    for (let n = 1; n <= totalPhases; n++) {
      steps.push({ id: `phase-${n}-discussed`, label: 'discussed', file: `PHASE-${n}-DISCUSSION.md` });
      steps.push({ id: `phase-${n}-researched`, label: 'researched', file: `PHASE-${n}-RESEARCH.md` });
      steps.push({ id: `phase-${n}-planned`, label: 'planned', file: `PHASE-${n}-PLAN.md` });
      steps.push({ id: `phase-${n}-executed`, label: 'executed', summaryPhase: n });
      steps.push({ id: `phase-${n}-verified`, label: 'verified', file: `PHASE-${n}-VERIFICATION.md` });
    }

    steps.push({ id: 'project-verified', label: 'verified', file: 'PROJECT-VERIFICATION.md' });
  }

  // Check completion for each step
  for (const step of steps) {
    if (step.file) {
      step.completed = files.has(step.file);
      // For discuss/research steps, check frontmatter for skip status
      if (step.completed && (step.id.includes('discussed') || step.id.includes('researched'))) {
        try {
          const content = fs.readFileSync(path.join(projectDir, step.file), 'utf8');
          const fm = parseFrontmatter(content);
          if ('skipped' in fm) {
            step.recognized = true;
            step.skippedByFrontmatter = (fm.skipped === 'true');
          } else {
            step.completed = false;
            step.recognized = false;
          }
        } catch (e) {
          step.completed = false;
          step.recognized = false;
        }
      }
    } else if (step.summaryPhase != null) {
      const regex = new RegExp('^## Phase ' + step.summaryPhase + ':', 'm');
      step.completed = regex.test(summaryContent);
    }
  }

  return steps;
}

function assignStatuses(steps) {
  if (steps.length === 0) return { steps: [] };

  let activeIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    if (!steps[i].completed) {
      activeIndex = i;
      break;
    }
  }

  const result = steps.map((step, i) => {
    let status;
    if (activeIndex === -1) {
      // All steps completed
      status = step.skippedByFrontmatter ? 'skipped' : 'done';
    } else if (i < activeIndex) {
      status = step.skippedByFrontmatter ? 'skipped' : 'done';
    } else if (i === activeIndex) {
      status = 'active';
    } else {
      status = 'pending';
    }
    return { id: step.id, label: step.label, status };
  });

  return { steps: result };
}

function deriveCurrentPhase(steps) {
  const active = steps.find(s => s.status === 'active');
  if (!active) return null;
  const match = active.id.match(/^phase-(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

module.exports = { resolveState };

if (require.main === module) {
  const dir = process.argv[2] || process.cwd();
  const result = resolveState(dir);
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}
