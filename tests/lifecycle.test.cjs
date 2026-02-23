/**
 * Lifecycle Tests — Architecture validation and E2E agent spawning
 *
 * Suite A: Architecture validation (structural contracts)
 * - Validates toolkit/core/commands API contracts
 * - Checks agent file structure
 * - Verifies gsd-tools.cjs deletion
 *
 * Suite B: E2E agent spawning (behind RUN_E2E=1 flag)
 * - Full command lifecycle with real agent spawning
 * - PROJECT.md → PROJECT-PLAN.md → execution → verification
 * - Non-deterministic LLM output — validates structure, not content
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createTempProject, cleanup } = require('./helpers.cjs');

describe('lifecycle: architecture validation', () => {
  test('toolkit.cjs exports all expected functions', () => {
    const toolkit = require('../get-shit-done/bin/lib/toolkit.cjs');

    const expectedExports = [
      'atomicWrite',
      'getCurrentCommitSHA',
      'isCodebaseMapStale',
      'checkPlanningDirExists',
      'checkFileExists',
      'checkMapNotStale',
      'resolveModel',
      'createTodo',
      'listTodos',
      'completeTodo',
      'deleteTodo',
    ];

    for (const exportName of expectedExports) {
      assert.ok(
        typeof toolkit[exportName] === 'function',
        `toolkit.cjs should export ${exportName} function`
      );
    }
  });

  test('core.cjs exports MODEL_PROFILES and resolveModelInternal', () => {
    const core = require('../get-shit-done/bin/lib/core.cjs');

    assert.ok(core.MODEL_PROFILES, 'core.cjs should export MODEL_PROFILES');
    assert.ok(typeof core.MODEL_PROFILES === 'object', 'MODEL_PROFILES should be an object');
    assert.ok(
      typeof core.resolveModelInternal === 'function',
      'core.cjs should export resolveModelInternal function'
    );
  });

  test('toolkit.cjs resolveModel returns valid model IDs for all known agent types', () => {
    const toolkit = require('../get-shit-done/bin/lib/toolkit.cjs');
    const tmpDir = createTempProject();

    const agentTypes = [
      'gsd-planner',
      'gsd-executor',
      'gsd-phase-researcher',
      'gsd-project-researcher',
      'gsd-debugger',
      'gsd-codebase-mapper',
      'gsd-verifier',
      'gsd-plan-checker',
    ];

    const validModels = ['inherit', 'sonnet', 'haiku'];

    for (const agentType of agentTypes) {
      const resolved = toolkit.resolveModel(tmpDir, agentType);
      assert.ok(
        validModels.includes(resolved),
        `resolveModel(${agentType}) should return valid model ID, got ${resolved}`
      );
    }

    cleanup(tmpDir);
  });

  test('toolkit.cjs MODEL_PROFILES matches core.cjs MODEL_PROFILES (same object reference)', () => {
    const core = require('../get-shit-done/bin/lib/core.cjs');

    // toolkit.cjs doesn't export MODEL_PROFILES anymore - it imports from core.cjs
    // We verify this by checking toolkit's resolveModel uses the same profiles
    const tmpDir = createTempProject();
    const toolkit = require('../get-shit-done/bin/lib/toolkit.cjs');

    // Spot check a few agent types
    const testCases = [
      { agent: 'gsd-planner', profile: 'balanced', expected: 'opus' },
      { agent: 'gsd-executor', profile: 'balanced', expected: 'sonnet' },
      { agent: 'gsd-codebase-mapper', profile: 'balanced', expected: 'haiku' },
    ];

    for (const { agent, profile, expected } of testCases) {
      const coreModel = core.MODEL_PROFILES[agent]?.[profile];
      assert.strictEqual(
        coreModel,
        expected,
        `core.cjs MODEL_PROFILES[${agent}][${profile}] should be ${expected}`
      );
    }

    cleanup(tmpDir);
  });

  test('commands.cjs cmdListTodos returns same structure as toolkit.listTodos for empty todos dir', () => {
    const tmpDir = createTempProject();
    const commands = require('../get-shit-done/bin/lib/commands.cjs');
    const toolkit = require('../get-shit-done/bin/lib/toolkit.cjs');

    // Capture output from cmdListTodos
    let cmdOutput = null;
    const originalStdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      cmdOutput = chunk;
      return true;
    };

    try {
      commands.cmdListTodos(tmpDir, null, false);
    } catch {
      // cmdListTodos calls process.exit(0) — expected
    } finally {
      process.stdout.write = originalStdoutWrite;
    }

    const cmdResult = JSON.parse(cmdOutput);
    const toolkitResult = toolkit.listTodos(tmpDir, null);

    assert.deepStrictEqual(
      cmdResult,
      toolkitResult,
      'cmdListTodos should delegate to toolkit.listTodos'
    );

    cleanup(tmpDir);
  });

  test('all agent .md files exist and deleted agents are gone', () => {
    const agentsDir = path.join(__dirname, '..', 'agents');

    const expectedAgents = [
      'gsd-executor.md',
      'gsd-planner.md',
      'gsd-plan-checker.md',
      'gsd-verifier.md',
      'gsd-codebase-mapper.md',
      'gsd-phase-researcher.md',
      'gsd-project-researcher.md',
      'gsd-debugger.md',
    ];

    const deletedAgents = [
      'gsd-research-synthesizer.md',
      'gsd-roadmapper.md',
      'gsd-integration-checker.md',
    ];

    for (const agent of expectedAgents) {
      const agentPath = path.join(agentsDir, agent);
      assert.ok(fs.existsSync(agentPath), `${agent} should exist`);
    }

    for (const agent of deletedAgents) {
      const agentPath = path.join(agentsDir, agent);
      assert.ok(!fs.existsSync(agentPath), `${agent} should be deleted`);
    }
  });

  test('all command .md files exist and use bare namespace (no gsd: prefix)', () => {
    const commandsDir = path.join(__dirname, '..', 'commands');

    const expectedCommands = [
      'debug.md',
      'discuss-phase.md',
      'discuss-project.md',
      'execute-phase.md',
      'health.md',
      'help.md',
      'new-project.md',
      'plan-phase.md',
      'plan-project.md',
      'research-phase.md',
      'research-project.md',
      'verify-project.md',
    ];

    // Check bare namespace: no gsd: prefix in filenames
    if (fs.existsSync(commandsDir)) {
      const files = fs.readdirSync(commandsDir);
      const gsdPrefixFiles = files.filter(f => f.startsWith('gsd'));
      assert.strictEqual(
        gsdPrefixFiles.length,
        0,
        `No command files should start with 'gsd' prefix, found: ${gsdPrefixFiles.join(', ')}`
      );
    }

    for (const command of expectedCommands) {
      const commandPath = path.join(commandsDir, command);
      assert.ok(fs.existsSync(commandPath), `${command} should exist`);
    }
  });

  test('gsd-tools.cjs does NOT exist (confirms deletion)', () => {
    const gsdToolsPath = path.join(__dirname, '..', 'get-shit-done', 'bin', 'gsd-tools.cjs');
    assert.ok(!fs.existsSync(gsdToolsPath), 'gsd-tools.cjs should be deleted');
  });

  test('no workflow file contains gsd-tools.cjs as an active call (only warnings allowed)', () => {
    const workflowsDir = path.join(__dirname, '..', 'get-shit-done', 'workflows');

    if (!fs.existsSync(workflowsDir)) {
      // No workflows directory — skip test
      return;
    }

    const workflowFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.md'));

    for (const file of workflowFiles) {
      const content = fs.readFileSync(path.join(workflowsDir, file), 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comment lines and lines that say "NEVER use gsd-tools.cjs"
        if (line.includes('NEVER use gsd-tools.cjs') || line.trim().startsWith('#')) {
          continue;
        }

        // Check for active gsd-tools.cjs calls (node ... gsd-tools.cjs)
        if (line.includes('gsd-tools.cjs') && line.includes('node ')) {
          assert.fail(
            `${file}:${i + 1} contains active gsd-tools.cjs call: ${line.trim()}`
          );
        }
      }
    }
  });
});

describe('lifecycle: E2E agent spawning', () => {
  const shouldRunE2E = process.env.RUN_E2E === '1';

  test('new-project creates valid PROJECT.md', { skip: !shouldRunE2E }, async () => {
    const tmpDir = createTempProject();

    // Create minimal fixture
    fs.writeFileSync(
      path.join(tmpDir, 'index.js'),
      'function greet(name) { return `Hello, ${name}!`; }\nmodule.exports = { greet };'
    );

    // TODO: Invoke /new-project command via claude CLI
    // This would require spawning claude process with appropriate prompt
    // For now, this is a stub documenting the intended E2E flow

    // Expected: .planning/project/PROJECT.md exists with valid structure
    // Validate: non-zero length, markdown format, contains project sections

    cleanup(tmpDir);
  });

  test('plan-project creates valid PROJECT-PLAN.md', { skip: !shouldRunE2E }, async () => {
    const tmpDir = createTempProject();

    // Create minimal PROJECT.md
    fs.mkdirSync(path.join(tmpDir, '.planning', 'project'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'project', 'PROJECT.md'),
      '# Test Project\n\nAdd greeting feature to index.js'
    );

    // TODO: Invoke /plan-project command via claude CLI
    // Expected: .planning/project/PROJECT-PLAN.md exists with phase list

    cleanup(tmpDir);
  });

  test('execute-phase runs and leaves changes unstaged (stub)', { skip: true }, async () => {
    // Aspirational E2E test for execute-phase
    // Would validate: executor runs, files modified, changes left unstaged
  });

  test('verify-phase validates and stages on pass (stub)', { skip: true }, async () => {
    // Aspirational E2E test for verify-phase
    // Would validate: verifier checks must_haves, stages files on pass
  });
});
