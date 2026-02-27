#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

// Get version from package.json
const pkg = require('../package.json');

const banner = '\n' +
  cyan + '   ██████╗ ███████╗██████╗\n' +
  '  ██╔════╝ ██╔════╝██╔══██╗\n' +
  '  ██║  ███╗███████╗██║  ██║\n' +
  '  ██║   ██║╚════██║██║  ██║\n' +
  '  ╚██████╔╝███████║██████╔╝\n' +
  '   ╚═════╝ ╚══════╝╚═════╝' + reset + '\n' +
  '\n' +
  '  Get Shit Done ' + dim + 'v' + pkg.version + reset + '\n' +
  '  A meta-prompting, context engineering and spec-driven\n' +
  '  development system for Claude Code by Caleb Faruki.\n';

function expandTilde(filePath) {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function buildHookCommand(configDir, hookName) {
  const hooksPath = configDir.replace(/\\/g, '/') + '/hooks/' + hookName;
  return `node "${hooksPath}"`;
}

function readSettings(settingsPath) {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function writeSettings(settingsPath, settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

function getGlobalDir() {
  if (process.env.CLAUDE_CONFIG_DIR) return expandTilde(process.env.CLAUDE_CONFIG_DIR);
  return path.join(os.homedir(), '.claude');
}

function copyWithPathReplacement(srcDir, destDir, pathPrefix) {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else if (entry.name.endsWith('.md')) {
      let content = fs.readFileSync(srcPath, 'utf8');
      content = content.replace(/~\/\.claude\//g, pathPrefix);
      content = content.replace(/\.\/\.claude\//g, './.claude/');
      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanupOrphanedFiles(configDir) {
  const orphanedFiles = [
    'hooks/gsd-notify.sh',
    'hooks/statusline.js',
  ];

  for (const relPath of orphanedFiles) {
    const fullPath = path.join(configDir, relPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

function cleanupOrphanedHooks(settings) {
  const orphanedHookPatterns = [
    'gsd-notify.sh',
    'hooks/statusline.js',
    'gsd-intel-index.js',
    'gsd-intel-session.js',
    'gsd-intel-prune.js',
  ];

  if (settings.hooks) {
    for (const eventType of Object.keys(settings.hooks)) {
      const hookEntries = settings.hooks[eventType];
      if (Array.isArray(hookEntries)) {
        settings.hooks[eventType] = hookEntries.filter(entry => {
          if (entry.hooks && Array.isArray(entry.hooks)) {
            return !entry.hooks.some(h =>
              h.command && orphanedHookPatterns.some(pattern => h.command.includes(pattern))
            );
          }
          return true;
        });
      }
    }
  }

  if (settings.statusLine && settings.statusLine.command &&
      settings.statusLine.command.includes('statusline.js') &&
      !settings.statusLine.command.includes('gsd-statusline.js')) {
    settings.statusLine.command = settings.statusLine.command.replace(
      /statusline\.js/,
      'gsd-statusline.js'
    );
  }

  return settings;
}

function verifyInstalled(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`  Failed to install ${description}: directory not created`);
    process.exit(1);
  }
  try {
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      console.error(`  Failed to install ${description}: directory is empty`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`  Failed to install ${description}: ${e.message}`);
    process.exit(1);
  }
}

function verifyFileInstalled(filePath, description) {
  if (!fs.existsSync(filePath)) {
    console.error(`  Failed to install ${description}: file not created`);
    process.exit(1);
  }
}

function install(isGlobal) {
  const src = path.join(__dirname, '..');

  const targetDir = isGlobal
    ? getGlobalDir()
    : path.join(process.cwd(), '.claude');

  const locationLabel = isGlobal
    ? targetDir.replace(os.homedir(), '~')
    : targetDir.replace(process.cwd(), '.');

  const pathPrefix = isGlobal
    ? `${targetDir.replace(/\\/g, '/')}/`
    : './.claude/';

  const isReinstall = fs.existsSync(path.join(targetDir, 'get-shit-done', 'VERSION'));

  if (!fs.existsSync(targetDir)) {
    console.log(`  Creating ${locationLabel}...`);
  }
  fs.mkdirSync(targetDir, { recursive: true });

  cleanupOrphanedFiles(targetDir);

  // Install commands
  const commandsDir = path.join(targetDir, 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });
  const gsdSrc = path.join(src, 'commands');
  const gsdDest = path.join(commandsDir, 'gsd');
  copyWithPathReplacement(gsdSrc, gsdDest, pathPrefix);
  verifyInstalled(gsdDest, 'commands/gsd');

  // Copy get-shit-done skill
  const skillSrc = path.join(src, 'get-shit-done');
  const skillDest = path.join(targetDir, 'get-shit-done');
  copyWithPathReplacement(skillSrc, skillDest, pathPrefix);
  verifyInstalled(skillDest, 'get-shit-done');

  // Copy agents
  const agentsSrc = path.join(src, 'agents');
  if (fs.existsSync(agentsSrc)) {
    const agentsDest = path.join(targetDir, 'agents');
    fs.mkdirSync(agentsDest, { recursive: true });

    // Remove old GSD agents before copying new ones
    for (const file of fs.readdirSync(agentsDest)) {
      if (file.startsWith('gsd-') && file.endsWith('.md')) {
        fs.unlinkSync(path.join(agentsDest, file));
      }
    }

    const agentEntries = fs.readdirSync(agentsSrc, { withFileTypes: true });
    for (const entry of agentEntries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        let content = fs.readFileSync(path.join(agentsSrc, entry.name), 'utf8');
        content = content.replace(/~\/\.claude\//g, pathPrefix);
        fs.writeFileSync(path.join(agentsDest, entry.name), content);
      }
    }
    verifyInstalled(agentsDest, 'agents');
  }

  // Copy CHANGELOG.md
  const changelogSrc = path.join(src, 'CHANGELOG.md');
  const changelogDest = path.join(targetDir, 'get-shit-done', 'CHANGELOG.md');
  if (fs.existsSync(changelogSrc)) {
    fs.copyFileSync(changelogSrc, changelogDest);
    verifyFileInstalled(changelogDest, 'CHANGELOG.md');
  }

  // Write VERSION file
  const versionDest = path.join(targetDir, 'get-shit-done', 'VERSION');
  fs.writeFileSync(versionDest, pkg.version);
  verifyFileInstalled(versionDest, 'VERSION');

  // Write package.json to force CommonJS mode
  const pkgJsonDest = path.join(targetDir, 'package.json');
  fs.writeFileSync(pkgJsonDest, '{"type":"commonjs"}\n');

  // Copy hooks
  const hooksSrc = path.join(src, 'hooks');
  if (fs.existsSync(hooksSrc)) {
    const hooksDest = path.join(targetDir, 'hooks');
    fs.mkdirSync(hooksDest, { recursive: true });
    const hookEntries = fs.readdirSync(hooksSrc);
    for (const entry of hookEntries) {
      const srcFile = path.join(hooksSrc, entry);
      const stat = fs.statSync(srcFile);
      if (stat.isFile() && (entry.endsWith('.js') || (stat.mode & 0o111))) {
        const destFile = path.join(hooksDest, entry);
        fs.copyFileSync(srcFile, destFile);
        if (stat.mode & 0o111) fs.chmodSync(destFile, stat.mode);
      }
    }
    verifyInstalled(hooksDest, 'hooks');
  } else {
    console.error('  Failed to install hooks: source directory not found');
    process.exit(1);
  }

  // Configure hooks in settings.json
  const settingsPath = path.join(targetDir, 'settings.json');
  const settings = cleanupOrphanedHooks(readSettings(settingsPath));

  const statuslineCommand = isGlobal
    ? buildHookCommand(targetDir, 'gsd-statusline.js')
    : 'node .claude/hooks/gsd-statusline.js';
  const updateCheckCommand = isGlobal
    ? buildHookCommand(targetDir, 'gsd-check-update.js')
    : 'node .claude/hooks/gsd-check-update.js';
  const contextMonitorCommand = isGlobal
    ? buildHookCommand(targetDir, 'gsd-context-monitor.js')
    : 'node .claude/hooks/gsd-context-monitor.js';

  if (!settings.hooks) settings.hooks = {};

  // SessionStart hooks
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
  if (!settings.hooks.SessionStart.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-check-update'))
  )) {
    const updateCheckDest = path.join(targetDir, 'hooks', 'gsd-check-update.js');
    if (fs.existsSync(updateCheckDest)) {
      settings.hooks.SessionStart.push({
        hooks: [{ type: 'command', command: updateCheckCommand }]
      });
    }
  }

  // PostToolUse hooks
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];
  if (!settings.hooks.PostToolUse.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-context-monitor'))
  )) {
    const contextMonitorDest = path.join(targetDir, 'hooks', 'gsd-context-monitor.js');
    if (fs.existsSync(contextMonitorDest)) {
      settings.hooks.PostToolUse.push({
        hooks: [{ type: 'command', command: contextMonitorCommand }]
      });
    }
  }
  if (!settings.hooks.PostToolUse.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-idle-debug'))
  )) {
    const idleDebugDest = path.join(targetDir, 'hooks', 'gsd-idle-debug.js');
    if (fs.existsSync(idleDebugDest)) {
      settings.hooks.PostToolUse.push({
        matcher: 'Bash',
        hooks: [{
          type: 'command',
          command: isGlobal
            ? buildHookCommand(targetDir, 'gsd-idle-debug.js')
            : 'node .claude/hooks/gsd-idle-debug.js'
        }]
      });
    }
  }

  // PreToolUse hooks
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
  if (!settings.hooks.PreToolUse.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-prereqs'))
  )) {
    const prereqDest = path.join(targetDir, 'hooks', 'gsd-prereqs.js');
    if (fs.existsSync(prereqDest)) {
      settings.hooks.PreToolUse.push({
        matcher: 'Skill',
        hooks: [{
          type: 'command',
          command: isGlobal
            ? buildHookCommand(targetDir, 'gsd-prereqs.js')
            : 'node .claude/hooks/gsd-prereqs.js'
        }]
      });
    }
  }
  if (!settings.hooks.PreToolUse.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gsd-bash-guard'))
  )) {
    const bashGuardDest = path.join(targetDir, 'hooks', 'gsd-bash-guard.js');
    if (fs.existsSync(bashGuardDest)) {
      settings.hooks.PreToolUse.push({
        matcher: 'Bash',
        hooks: [{
          type: 'command',
          command: isGlobal
            ? buildHookCommand(targetDir, 'gsd-bash-guard.js')
            : 'node .claude/hooks/gsd-bash-guard.js'
        }]
      });
    }
  }

  // Always install statusline
  settings.statusLine = {
    type: 'command',
    command: statuslineCommand
  };

  writeSettings(settingsPath, settings);

  const verb = isReinstall ? 'reinstalled' : 'installed';
  console.log(`  ${green}✓${reset} GSD ${verb} to ${locationLabel}`);
}

function printEducation() {
  const philosophy = [
    `  ${bold}${cyan}Philosophy${reset}`,
    `  ${dim}Every task scopes to a single commit. One change, tested and${reset}`,
    `  ${dim}verified, before moving to the next.${reset}`,
  ].join('\n');

  const workflow = [
    `  ${bold}${cyan}Workflow${reset}`,
    `  ${dim}discuss${reset} ${cyan}>${reset} ${dim}research${reset} ${cyan}>${reset} ${dim}plan${reset} ${cyan}>${reset} ${dim}execute${reset} ${cyan}>${reset} ${dim}verify${reset}`,
    `  ${dim}Each phase follows this cycle. Discuss and research are optional.${reset}`,
  ].join('\n');

  const progressTracker = [
    `  ${bold}${cyan}Progress Tracker${reset}`,
    `  ${dim}Shown in your terminal statusline during work:${reset}`,
    `  ${dim}┌────────────────────────────────────────────┐${reset}`,
    `  ${dim}│${reset} GSD ${green}████${reset}${dim}░░░░${reset} plan-phase 2            ${dim}│${reset}`,
    `  ${dim}└────────────────────────────────────────────┘${reset}`,
  ].join('\n');

  const staleness = [
    `  ${bold}${cyan}Codemap Staleness${reset}`,
    `  ${dim}Tracks drift between your code and the codebase map:${reset}`,
    `  ${dim}┌────────────────────────────────────────────┐${reset}`,
    `  ${dim}│${reset} MAP: ${green}+42${reset} ${dim}lines since /gsd:map${reset}          ${dim}│${reset}`,
    `  ${dim}└────────────────────────────────────────────┘${reset}`,
  ].join('\n');

  console.log([philosophy, '', workflow, '', progressTracker, '', staleness, ''].join('\n'));
}

function promptLocation() {
  if (!process.stdin.isTTY) {
    console.log(`  ${yellow}Non-interactive terminal detected, defaulting to global install${reset}\n`);
    install(true);
    return;
  }

  printEducation();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let answered = false;

  rl.on('close', () => {
    if (!answered) {
      answered = true;
      console.log(`\n  ${yellow}Installation cancelled${reset}\n`);
      process.exit(0);
    }
  });

  const globalPath = getGlobalDir().replace(os.homedir(), '~');

  console.log(`  ${yellow}Where would you like to install?${reset}\n\n  ${cyan}1${reset}) Global ${dim}(${globalPath})${reset} — all projects
  ${cyan}2${reset}) Local  ${dim}(./.claude)${reset} — this project only
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    answered = true;
    rl.close();
    const choice = answer.trim() || '1';
    const isGlobal = choice !== '2';
    install(isGlobal);
  });
}

// Main
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node install.js');
  process.exit(0);
}
const unknownFlag = args.find(a => a.startsWith('-'));
if (unknownFlag) {
  console.error(`Unknown flag: ${unknownFlag}`);
  console.log('Usage: node install.js');
  process.exit(1);
}
console.log(banner);
promptLocation();
