// Context injection script - outputs formatted project state for prompt embedding
const fs = require('fs');
const path = require('path');
const { resolveState } = require('../hooks/gsd-state-resolver.js');

const PROJECT_FILES = [
  'PROJECT.md',
  'PROJECT-PLAN.md',
  'PROJECT-SUMMARY.md',
  'PROJECT-RESEARCH.md',
  'PROJECT-DISCUSSION.md',
  'PROJECT-VERIFICATION.md',
];

const PHASE_FILES = [
  'PHASE-{N}-PLAN.md',
  'PHASE-{N}-CONTEXT.md',
  'PHASE-{N}-RESEARCH.md',
  'PHASE-{N}-VERIFICATION.md',
];

function formatContext(resolved, dir) {
  const lines = [];

  lines.push(`Project state: ${resolved.state}`);

  if (resolved.totalPhases != null && resolved.currentPhase != null) {
    lines.push(`Current phase: ${resolved.currentPhase} of ${resolved.totalPhases}`);
  }

  if (resolved.nextCommand != null) {
    lines.push(`Next suggested command: ${resolved.nextCommand}`);
  }

  lines.push(`Context: ${resolved.context}`);

  const projectDir = path.join(dir, '.planning', 'project');
  const filesToCheck = [...PROJECT_FILES];

  if (resolved.currentPhase != null) {
    for (const tmpl of PHASE_FILES) {
      filesToCheck.push(tmpl.replace('{N}', String(resolved.currentPhase)));
    }
  }

  const present = [];
  const absent = [];

  for (const f of filesToCheck) {
    if (fs.existsSync(path.join(projectDir, f))) {
      present.push(f);
    } else {
      absent.push(f);
    }
  }

  lines.push('');
  if (present.length > 0) {
    lines.push(`Files present: ${present.join(', ')}`);
  }
  if (absent.length > 0) {
    lines.push(`Files absent: ${absent.join(', ')}`);
  }

  return lines.join('\n');
}

module.exports = { formatContext };

if (require.main === module) {
  try {
    const dir = process.cwd();
    const resolved = resolveState(dir);
    const output = formatContext(resolved, dir);
    process.stdout.write(output + '\n');
    process.exit(0);
  } catch (e) {
    process.stdout.write('Project state: unknown\nContext: State resolution failed.\n');
    process.exit(0);
  }
}
