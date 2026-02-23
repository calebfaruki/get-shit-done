/**
 * Test CLI Wrapper
 *
 * Minimal CLI interface for test helpers to call lib functions.
 * Mimics the old gsd-tools.cjs interface but uses the new modular structure.
 */

const commands = require('./commands.cjs');
const verify = require('./verify.cjs');
const state = require('./state.cjs');
const frontmatter = require('./frontmatter.cjs');
const phase = require('./phase.cjs');
const roadmap = require('./roadmap.cjs');
const milestone = require('./milestone.cjs');
const init = require('./init.cjs');
const template = require('./template.cjs');

async function execute(args, cwd) {
  const rawIndex = args.indexOf('--raw');
  const raw = rawIndex !== -1;
  if (rawIndex !== -1) args.splice(rawIndex, 1);

  const command = args[0];

  switch (command) {
    case 'history-digest':
      commands.cmdHistoryDigest(cwd, raw);
      break;

    case 'summary-extract': {
      const summaryPath = args[1];
      const fieldsIndex = args.indexOf('--fields');
      const fields = fieldsIndex !== -1 ? args[fieldsIndex + 1]?.split(',') : null;
      commands.cmdSummaryExtract(cwd, summaryPath, fields, raw);
      break;
    }

    case 'validate': {
      const subcommand = args[1];
      if (subcommand === 'consistency') {
        verify.cmdValidateConsistency(cwd, raw);
      } else {
        throw new Error(`Unknown validate subcommand: ${subcommand}`);
      }
      break;
    }

    case 'frontmatter': {
      const subcommand = args[1];
      const file = args[2];
      if (subcommand === 'get') {
        const fieldIdx = args.indexOf('--field');
        frontmatter.cmdFrontmatterGet(cwd, file, fieldIdx !== -1 ? args[fieldIdx + 1] : null, raw);
      } else if (subcommand === 'validate') {
        const schemaIdx = args.indexOf('--schema');
        frontmatter.cmdFrontmatterValidate(cwd, file, schemaIdx !== -1 ? args[schemaIdx + 1] : null, raw);
      } else if (subcommand === 'merge') {
        const dataIdx = args.indexOf('--data');
        frontmatter.cmdFrontmatterMerge(cwd, file, dataIdx !== -1 ? args[dataIdx + 1] : null, raw);
      } else {
        throw new Error(`Unknown frontmatter subcommand: ${subcommand}`);
      }
      break;
    }

    case 'state-snapshot':
      state.cmdStateSnapshot(cwd, raw);
      break;

    case 'state': {
      const subcommand = args[1];
      if (subcommand === 'update-progress') {
        state.cmdStateUpdateProgress(cwd, raw);
      } else if (subcommand === 'advance-plan') {
        state.cmdStateAdvancePlan(cwd, raw);
      } else {
        state.cmdStateLoad(cwd, raw);
      }
      break;
    }

    case 'init': {
      const workflow = args[1];
      const phaseArg = args[2];
      if (workflow === 'execute-phase') {
        init.cmdInitExecutePhase(cwd, phaseArg, raw);
      } else if (workflow === 'plan-phase') {
        init.cmdInitPlanPhase(cwd, phaseArg, raw);
      } else {
        throw new Error(`Unknown init workflow: ${workflow}`);
      }
      break;
    }

    case 'phases': {
      const subcommand = args[1];
      if (subcommand === 'list') {
        const typeIndex = args.indexOf('--type');
        const phaseIndex = args.indexOf('--phase');
        const options = {
          type: typeIndex !== -1 ? args[typeIndex + 1] : null,
          phase: phaseIndex !== -1 ? args[phaseIndex + 1] : null,
          includeArchived: args.includes('--include-archived'),
        };
        phase.cmdPhasesList(cwd, options, raw);
      } else {
        throw new Error(`Unknown phases subcommand: ${subcommand}`);
      }
      break;
    }

    case 'roadmap': {
      const subcommand = args[1];
      if (subcommand === 'analyze') {
        roadmap.cmdRoadmapAnalyze(cwd, raw);
      } else if (subcommand === 'update-plan-progress') {
        roadmap.cmdRoadmapUpdatePlanProgress(cwd, args[2], raw);
      } else {
        throw new Error(`Unknown roadmap subcommand: ${subcommand}`);
      }
      break;
    }

    case 'progress': {
      const format = args[1] || 'json';
      commands.cmdProgressRender(cwd, format, raw);
      break;
    }

    case 'phase-plan-index': {
      phase.cmdPhasePlanIndex(cwd, args[1], raw);
      break;
    }

    case 'milestone': {
      const subcommand = args[1];
      if (subcommand === 'complete') {
        const version = args[2];
        const nameIndex = args.indexOf('--name');
        const archivePhases = args.includes('--archive-phases');
        let milestoneName = null;
        if (nameIndex !== -1) {
          const nameArgs = [];
          for (let i = nameIndex + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) break;
            nameArgs.push(args[i]);
          }
          milestoneName = nameArgs.join(' ') || null;
        }
        milestone.cmdMilestoneComplete(cwd, version, { name: milestoneName, archivePhases }, raw);
      } else {
        throw new Error(`Unknown milestone subcommand: ${subcommand}`);
      }
      break;
    }

    case 'template': {
      const subcommand = args[1];
      if (subcommand === 'fill') {
        const templateType = args[2];
        const phaseIdx = args.indexOf('--phase');
        const planIdx = args.indexOf('--plan');
        template.cmdTemplateFill(cwd, templateType, {
          phase: phaseIdx !== -1 ? args[phaseIdx + 1] : null,
          plan: planIdx !== -1 ? args[planIdx + 1] : null,
        }, raw);
      } else {
        throw new Error(`Unknown template subcommand: ${subcommand}`);
      }
      break;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

module.exports = { execute };
