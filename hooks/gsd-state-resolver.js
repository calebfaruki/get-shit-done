// State Resolver - derives lifecycle position from .planning/project/ file presence
const fs = require('fs');
const path = require('path');

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
    const legacy = { state: 'project-defined', nextCommand: '/plan-project', context: 'Project defined. Create a project plan.' };
    const steps = buildSteps(files, null, '');
    return { ...legacy, ...assignStatuses(steps), totalPhases: null, currentPhase: null };
  }

  const planContent = fs.readFileSync(path.join(projectDir, 'PROJECT-PLAN.md'), 'utf8');
  const phaseMatches = planContent.match(/^#{2,3} Phase (\d+):/gm);
  if (!phaseMatches || phaseMatches.length === 0) {
    const legacy = { state: 'project-defined', nextCommand: '/plan-project', context: 'Project plan has no phases. Create a project plan.' };
    const steps = buildSteps(files, null, '');
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
      legacy = { state: `phase-${n}-unplanned`, nextCommand: `/plan-phase ${n}`, context: `Phase ${n} needs planning.` };
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

  const steps = buildSteps(files, totalPhases, summaryContent);
  const resolved = assignStatuses(steps);
  const currentPhase = deriveCurrentPhase(resolved.steps);

  return { ...legacy, ...resolved, totalPhases, currentPhase };
}

function buildSteps(files, totalPhases, summaryContent) {
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
    } else if (step.summaryPhase != null) {
      const regex = new RegExp('^## Phase ' + step.summaryPhase + ':', 'm');
      step.completed = regex.test(summaryContent);
    }
  }

  return steps;
}

function assignStatuses(steps) {
  if (steps.length === 0) return { steps: [] };

  // For each incomplete step, determine if a later step is completed (making it skipped).
  // The active step is the first incomplete step with no later completed step.
  // Steps after the active step are pending.

  // Build a "has later completed" lookup: for each index, is there any j > i where steps[j].completed?
  const hasLaterCompleted = new Array(steps.length).fill(false);
  let seenCompleted = false;
  for (let i = steps.length - 1; i >= 0; i--) {
    hasLaterCompleted[i] = seenCompleted;
    if (steps[i].completed) seenCompleted = true;
  }

  // Find active index: first incomplete step where no later step is completed
  let activeIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    if (!steps[i].completed && !hasLaterCompleted[i]) {
      activeIndex = i;
      break;
    }
  }

  const result = steps.map((step, i) => {
    let status;
    if (activeIndex === -1) {
      // All complete or all incomplete-with-later-complete (terminal state)
      status = step.completed ? 'done' : 'skipped';
    } else if (i < activeIndex) {
      status = step.completed ? 'done' : 'skipped';
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
