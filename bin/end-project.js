#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

const projectDir = path.join(process.cwd(), '.planning', 'project');

if (!fs.existsSync(projectDir)) {
  console.log(`\n  ${yellow}No project to clean up.${reset} (.planning/project/ does not exist)\n`);
  process.exit(0);
}

const files = fs.readdirSync(projectDir);
if (files.length === 0) {
  console.log(`\n  ${yellow}No project to clean up.${reset} (.planning/project/ is empty)\n`);
  process.exit(0);
}

// Extract project name from PROJECT.md if available
let projectName = '(unknown)';
const projectMdPath = path.join(projectDir, 'PROJECT.md');
if (fs.existsSync(projectMdPath)) {
  const content = fs.readFileSync(projectMdPath, 'utf8');
  const match = content.match(/^# Project:\s*(.+)/m);
  if (match) projectName = match[1].trim();
}

console.log(`\n  ${cyan}Project:${reset} ${projectName}\n`);
console.log(`  Files to remove:`);
for (const file of files) {
  console.log(`    ${dim}${file}${reset}`);
}
console.log(`\n  ${dim}codebase/ and todos/ are preserved.${reset}\n`);

const { resolveState } = require('../hooks/gsd-state-resolver.js');
const result = resolveState(process.cwd());
if (result.state !== 'project-verified') {
  const incomplete = result.steps.filter(s => s.status !== 'done' && s.status !== 'skipped');
  if (incomplete.length > 0) {
    console.log(`  ${yellow}WARNING: Project is not fully verified.${reset}`);
    for (const step of incomplete) {
      console.log(`    ${dim}- ${step.id} (${step.status})${reset}`);
    }
    console.log('');
  }
}

if (process.argv.includes('--yes') || process.argv.includes('-y')) {
  wipe();
} else if (!process.stdin.isTTY) {
  console.log(`  ${yellow}Non-interactive terminal — pass --yes to skip confirmation.${reset}\n`);
  process.exit(1);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`  Wipe project artifacts? ${dim}[y/N]${reset} `, (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() === 'y') {
      wipe();
    } else {
      console.log(`  Cancelled.\n`);
    }
  });
}

function wipe() {
  fs.rmSync(projectDir, { recursive: true });
  console.log(`  ${green}✓${reset} Project artifacts wiped. Ready for ${cyan}/new-project${reset}.\n`);
}
