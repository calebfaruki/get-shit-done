/**
 * Toolkit — Core utility functions library
 *
 * Zero external dependencies. Node.js stdlib only.
 * Pure functions returning structured objects — no console.log, no process.exit.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { MODEL_PROFILES } = require('./core.cjs');

// ─── File Management ──────────────────────────────────────────────────────────

/**
 * atomicWrite - Write file content atomically using temp-file-then-rename
 *
 * @param {string} targetPath - Absolute path to target file
 * @param {string} content - File content to write
 * @returns {{success: boolean, error?: string}}
 */
function atomicWrite(targetPath, content) {
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath);
  const tmpPath = path.join(dir, `.${base}.${process.pid}.${Date.now()}.tmp`);

  try {
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, targetPath);
    return { success: true };
  } catch (err) {
    // Cleanup temp file on failure
    try { fs.unlinkSync(tmpPath); } catch {}
    return { success: false, error: err.message };
  }
}

// ─── Git Integration ──────────────────────────────────────────────────────────

/**
 * getCurrentCommitSHA - Get the current git HEAD SHA
 *
 * @param {string} cwd - Working directory (must be git repo)
 * @returns {{success: boolean, sha?: string, error?: string}}
 */
function getCurrentCommitSHA(cwd) {
  try {
    const sha = execSync('git rev-parse HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return { success: true, sha };
  } catch (err) {
    return { success: false, error: 'Not a git repository or git not available' };
  }
}

/**
 * isCodebaseMapStale - Compare stored SHA against current HEAD
 *
 * @param {string} cwd - Working directory
 * @param {string} storedSHA - SHA to compare against
 * @returns {{stale: boolean|null, currentSHA?: string, storedSHA?: string, message?: string, error?: string}}
 */
function isCodebaseMapStale(cwd, storedSHA) {
  const shaResult = getCurrentCommitSHA(cwd);

  if (!shaResult.success) {
    return {
      stale: null,
      error: 'Cannot determine staleness: ' + shaResult.error
    };
  }

  const currentSHA = shaResult.sha;
  const stale = currentSHA !== storedSHA;

  return {
    stale,
    currentSHA,
    storedSHA,
    message: stale ? 'Map is stale' : 'Map is current'
  };
}

// ─── Prerequisite Validators ──────────────────────────────────────────────────

/**
 * checkPlanningDirExists - Validate .planning directory exists
 *
 * @param {string} cwd - Working directory
 * @returns {{passed: boolean, message: string}}
 */
function checkPlanningDirExists(cwd) {
  const planningDir = path.join(cwd, '.planning');
  try {
    const stats = fs.statSync(planningDir);
    if (!stats.isDirectory()) {
      return {
        passed: false,
        message: '.planning exists but is not a directory'
      };
    }
    return {
      passed: true,
      message: '.planning directory exists'
    };
  } catch {
    return {
      passed: false,
      message: '.planning directory does not exist'
    };
  }
}

/**
 * checkFileExists - Validate file exists
 *
 * @param {string} cwd - Working directory
 * @param {string} relativePath - Path relative to cwd
 * @returns {{passed: boolean, message: string}}
 */
function checkFileExists(cwd, relativePath) {
  const targetPath = path.join(cwd, relativePath);
  try {
    fs.statSync(targetPath);
    return {
      passed: true,
      message: `File exists: ${relativePath}`
    };
  } catch {
    return {
      passed: false,
      message: `File does not exist: ${relativePath}`
    };
  }
}

/**
 * checkMapNotStale - Validate codebase map freshness
 *
 * @param {string} cwd - Working directory
 * @param {string} mapPath - Path to map file (absolute or relative)
 * @returns {{passed: boolean, message: string, currentSHA?: string, storedSHA?: string}}
 */
function checkMapNotStale(cwd, mapPath) {
  const fullMapPath = path.isAbsolute(mapPath) ? mapPath : path.join(cwd, mapPath);

  // Check map file exists
  try {
    fs.statSync(fullMapPath);
  } catch {
    return {
      passed: false,
      message: 'Map file does not exist'
    };
  }

  // Read map file and extract SHA from frontmatter
  let storedSHA = null;
  try {
    const content = fs.readFileSync(fullMapPath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1];
      const shaMatch = yaml.match(/^sha:\s*(.+)$/m);
      if (shaMatch) {
        storedSHA = shaMatch[1].trim();
      }
    }
  } catch {
    return {
      passed: false,
      message: 'Failed to read map file'
    };
  }

  if (!storedSHA) {
    return {
      passed: false,
      message: 'Map file does not contain SHA in frontmatter'
    };
  }

  // Compare with current HEAD
  const stalenessResult = isCodebaseMapStale(cwd, storedSHA);

  if (stalenessResult.stale === null) {
    return {
      passed: false,
      message: 'Cannot check staleness: ' + stalenessResult.error
    };
  }

  if (stalenessResult.stale) {
    return {
      passed: false,
      message: 'Map is stale',
      currentSHA: stalenessResult.currentSHA,
      storedSHA: stalenessResult.storedSHA
    };
  }

  return {
    passed: true,
    message: 'Map is current',
    currentSHA: stalenessResult.currentSHA,
    storedSHA: stalenessResult.storedSHA
  };
}

// ─── Model Resolution ─────────────────────────────────────────────────────────

/**
 * resolveModel - Resolve model ID for agent type and profile
 *
 * @param {string} cwd - Working directory
 * @param {string} agentType - Agent type identifier
 * @returns {string} Model ID ('inherit', 'sonnet', 'haiku')
 */
function resolveModel(cwd, agentType) {
  const DEFAULT_PROFILE = 'balanced';
  const DEFAULT_MODELS = { quality: 'opus', balanced: 'sonnet', budget: 'haiku' };

  // Try to load profile from config
  let profile = DEFAULT_PROFILE;
  try {
    const configPath = path.join(cwd, '.planning', 'model-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    profile = config.model_profile || DEFAULT_PROFILE;
  } catch {
    // No config or parse error: use default
  }

  // Lookup agent-specific models
  const agentModels = MODEL_PROFILES[agentType] || DEFAULT_MODELS;
  const resolved = agentModels[profile] || agentModels['balanced'] || 'sonnet';

  // Convert 'opus' to 'inherit' (Claude Code convention)
  return resolved === 'opus' ? 'inherit' : resolved;
}

// ─── Todo CRUD ────────────────────────────────────────────────────────────────

/**
 * createTodo - Create a todo file with YAML frontmatter
 *
 * @param {string} cwd - Working directory
 * @param {string} title - Todo title
 * @param {string} area - Todo area (defaults to 'general')
 * @param {string} body - Todo body content
 * @returns {{success: boolean, filename?: string, path?: string, error?: string}}
 */
function createTodo(cwd, title, area = 'general', body = '') {
  const todosDir = path.join(cwd, '.planning', 'todos');

  // Create todos directory if it doesn't exist
  try {
    fs.mkdirSync(todosDir, { recursive: true });
  } catch (err) {
    return { success: false, error: `Failed to create todos directory: ${err.message}` };
  }

  // Slugify title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Handle filename collisions
  let filename = `${baseSlug}.md`;
  let counter = 2;
  while (fs.existsSync(path.join(todosDir, filename))) {
    filename = `${baseSlug}-${counter}.md`;
    counter++;
  }

  // Build content with YAML frontmatter
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const content = `---
area: ${area}
created: ${today}
---

${body}`;

  // Write file atomically
  const todoPath = path.join(todosDir, filename);
  const writeResult = atomicWrite(todoPath, content);

  if (!writeResult.success) {
    return { success: false, error: writeResult.error };
  }

  return {
    success: true,
    filename,
    path: path.relative(cwd, todoPath)
  };
}

/**
 * listTodos - List all todos with parsed frontmatter
 *
 * @param {string} cwd - Working directory
 * @param {string} area - Optional area filter
 * @returns {{count: number, todos: Array}}
 */
function listTodos(cwd, area = null) {
  const todosDir = path.join(cwd, '.planning', 'todos');

  // Handle nonexistent or empty directory
  if (!fs.existsSync(todosDir)) {
    return { count: 0, todos: [] };
  }

  let files;
  try {
    files = fs.readdirSync(todosDir);
  } catch {
    return { count: 0, todos: [] };
  }

  // Filter to only .md files
  const todoFiles = files.filter(f => f.endsWith('.md'));

  const todos = [];
  for (const filename of todoFiles) {
    const todoPath = path.join(todosDir, filename);

    try {
      const content = fs.readFileSync(todoPath, 'utf-8');

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);

      let todoArea = 'general';
      let created = '';
      let body = '';

      if (frontmatterMatch) {
        const yaml = frontmatterMatch[1];
        const areaMatch = yaml.match(/^area:\s*(.+)$/m);
        const createdMatch = yaml.match(/^created:\s*(.+)$/m);

        if (areaMatch) todoArea = areaMatch[1].trim();
        if (createdMatch) created = createdMatch[1].trim();

        body = frontmatterMatch[2].trim();
      } else {
        body = content;
      }

      // Derive title from filename
      const title = filename
        .replace(/\.md$/, '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Apply area filter if provided
      if (area && todoArea !== area) {
        continue;
      }

      todos.push({
        filename,
        title,
        area: todoArea,
        created,
        body,
        path: path.relative(cwd, todoPath)
      });
    } catch {
      // Skip files that can't be read
      continue;
    }
  }

  return { count: todos.length, todos };
}

/**
 * completeTodo - Delete a todo file (completing it)
 *
 * @param {string} cwd - Working directory
 * @param {string} filename - Todo filename (with or without .md extension)
 * @returns {{success: boolean, deleted?: string, error?: string}}
 */
function completeTodo(cwd, filename) {
  // Ensure filename ends with .md
  const todoFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
  const todoPath = path.join(cwd, '.planning', 'todos', todoFilename);

  try {
    fs.unlinkSync(todoPath);
    return { success: true, deleted: todoFilename };
  } catch (err) {
    return { success: false, error: `Failed to delete todo: ${err.message}` };
  }
}

/**
 * deleteTodo - Delete a todo file (semantic alias for completeTodo)
 *
 * @param {string} cwd - Working directory
 * @param {string} filename - Todo filename (with or without .md extension)
 * @returns {{success: boolean, deleted?: string, error?: string}}
 */
function deleteTodo(cwd, filename) {
  return completeTodo(cwd, filename);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  atomicWrite,
  getCurrentCommitSHA,
  isCodebaseMapStale,
  checkPlanningDirExists,
  checkFileExists,
  checkMapNotStale,
  resolveModel,
  createTodo,
  listTodos,
  completeTodo,
  deleteTodo,
};
