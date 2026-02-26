// State Resolver - derives lifecycle position from .planning/project/ file presence
const fs = require('fs');
const path = require('path');

function resolveState(dir) {
  const projectDir = path.join(dir, '.planning', 'project');

  if (!fs.existsSync(projectDir)) {
    return { state: 'no-project', nextCommand: '/new-project', context: 'No project found.' };
  }

  const files = new Set(fs.readdirSync(projectDir));

  if (!files.has('PROJECT.md') || files.size === 0) {
    return { state: 'no-project', nextCommand: '/new-project', context: 'No project found.' };
  }

  if (!files.has('PROJECT-PLAN.md')) {
    return { state: 'project-defined', nextCommand: '/plan-project', context: 'Project defined. Create a project plan.' };
  }

  const planContent = fs.readFileSync(path.join(projectDir, 'PROJECT-PLAN.md'), 'utf8');
  const phaseMatches = planContent.match(/^#{2,3} Phase (\d+):/gm);
  if (!phaseMatches || phaseMatches.length === 0) {
    return { state: 'project-defined', nextCommand: '/plan-project', context: 'Project plan has no phases. Create a project plan.' };
  }

  let totalPhases = 0;
  for (const m of phaseMatches) {
    const num = parseInt(m.match(/(\d+)/)[1], 10);
    if (num > totalPhases) totalPhases = num;
  }

  const summaryContent = files.has('PROJECT-SUMMARY.md')
    ? fs.readFileSync(path.join(projectDir, 'PROJECT-SUMMARY.md'), 'utf8')
    : '';

  for (let n = 1; n <= totalPhases; n++) {
    if (!files.has(`PHASE-${n}-PLAN.md`)) {
      return { state: `phase-${n}-unplanned`, nextCommand: `/plan-phase ${n}`, context: `Phase ${n} needs planning.` };
    }

    const phaseHeaderRegex = new RegExp('^## Phase ' + n + ':', 'm');
    if (!phaseHeaderRegex.test(summaryContent)) {
      return { state: `phase-${n}-planned`, nextCommand: `/execute-phase ${n}`, context: `Phase ${n} planned. Ready to execute.` };
    }

    if (!files.has(`PHASE-${n}-VERIFICATION.md`)) {
      return { state: `phase-${n}-executed`, nextCommand: `/verify-phase ${n}`, context: `Phase ${n} executed. Ready for verification.` };
    }
  }

  if (!files.has('PROJECT-VERIFICATION.md')) {
    return { state: 'all-phases-verified', nextCommand: '/verify-project', context: 'All phases verified. Ready for project verification.' };
  }

  return { state: 'project-verified', nextCommand: null, context: 'Project complete.' };
}

module.exports = { resolveState };

if (require.main === module) {
  const dir = process.argv[2] || process.cwd();
  const result = resolveState(dir);
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}
