#!/usr/bin/env node
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const sep = args.indexOf('--');
const idleSec = sep > 0 ? parseInt(args[0], 10) : 60;
const cmdArgs = sep >= 0 ? args.slice(sep + 1) : args;

if (cmdArgs.length === 0) { process.exit(0); }

const child = spawn(cmdArgs[0], cmdArgs.slice(1), {
  stdio: ['inherit', 'pipe', 'pipe']
});

let timer;
function resetTimer() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    process.stderr.write(
      '\n---GSD IDLE TIMEOUT---\n' +
      `Command killed: no output for ${idleSec}s.\n` +
      'This is a hang, not a transient failure. Retrying will hang again.\n' +
      '---END GSD IDLE TIMEOUT---\n'
    );
    child.kill('SIGTERM');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) {} }, 5000);
  }, idleSec * 1000);
}

child.stdout.on('data', d => { process.stdout.write(d); resetTimer(); });
child.stderr.on('data', d => { process.stderr.write(d); resetTimer(); });
resetTimer();

child.on('exit', (code) => {
  clearTimeout(timer);
  process.exit(code ?? 1);
});
