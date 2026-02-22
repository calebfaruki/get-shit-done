# Technology Stack

**Project:** Stateless Project PM — GSD Fork
**Researched:** 2026-02-22

## Recommended Stack

### Core Runtime
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | >= 16.7.0 | Runtime environment | Already in use; CommonJS modules; no external deps in production; mature CLI tooling ecosystem |
| CommonJS | ES5 | Module system | Existing constraint; ensures compatibility across Claude Code/OpenCode/Gemini; simple interop with Node builtins |

**Rationale:** Maintaining Node.js + CommonJS ensures zero breaking changes for existing installation base. The constraint (no external production dependencies) is a feature, not a bug—it guarantees deterministic behavior and eliminates supply chain risks.

**Confidence:** HIGH (existing stack, validated over 1.20.5 releases)

### Knowledge Architecture Layer

The fork's core innovation is replacing workflow scripts with knowledge-first architecture. This layer has no dependencies—it's markdown files the agent reasons over.

| Component | Format | Purpose | Why |
|-----------|--------|---------|-----|
| Reference docs | Markdown | Knowledge retrieval for agent reasoning | Vercel empirical data: 100% pass rate vs 79% for skill-based retrieval |
| SKILL.md pattern | Markdown + YAML frontmatter | Progressive disclosure for procedural knowledge | Anthropic standard; 50-100 tokens per skill at startup; loads detail on-demand |
| AGENTS.md | Markdown | Project-level context loaded every session | Industry standard (agents.md/); supported by most 2026 coding agents |
| CLAUDE.md | Markdown | User-level + project-level instructions | Claude Code standard; hierarchical (global → project → local) |

**Rationale:**
- **Vercel's empirical testing** (2025-2026): Compressed 8KB docs index in AGENTS.md achieved 100% pass rate. Skills with explicit instructions maxed at 79% even when told to use them. For general framework knowledge, passive context outperforms on-demand retrieval.
- **Progressive disclosure solves the contradiction** between capability expansion and context cost. Skills let Claude load information only as needed—detail files consume no tokens until accessed.
- **Hierarchical knowledge docs** mirror existing patterns (CLAUDE.md in ~/.claude/ → project root → .claude/CLAUDE.md) already working in production.

**Confidence:** HIGH (Vercel empirical data, Anthropic standard, widespread 2026 adoption)

**Sources:**
- [AGENTS.md outperforms skills in our agent evals - Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Agent Skills - Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [A Complete Guide To AGENTS.md](https://www.aihero.dev/a-complete-guide-to-agents-md)

### Deterministic Tooling Layer

Operations where the same input must produce the same output every time.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js fs module | Built-in | File operations | Atomic operations; no external deps; safe-write pattern with temp files + rename |
| Node.js child_process | Built-in | Git operations, subprocess spawning | Existing use; synchronous git commands for staging |
| Node.js path module | Built-in | Path resolution | Cross-platform; handles ~/.claude expansion |

**Patterns to follow:**

**Safe file writes** (2026 production pattern):
```javascript
// Write to temp in same directory
const tmp = `${targetPath}.tmp.${process.pid}`;
fs.writeFileSync(tmp, content);
// Optional: flush when durability matters
fs.fsyncSync(fs.openSync(tmp, 'r+'));
// Atomic rename (old or new, never half-written)
fs.renameSync(tmp, targetPath);
```

**File watching** (treat events as hints):
```javascript
// Debounce → re-scan → compute diff → apply idempotent update
// Don't react directly to raw watch events (unstable)
```

**Rationale:** Files don't give transactional guarantees by default. Atomic rename within same filesystem ensures readers see old or new version, not half-written bytes. This is critical for `.planning/` file management where agents read state mid-operation.

**Confidence:** HIGH (standard Node.js production pattern, documented in 2026 guides)

**Sources:**
- [Node.js File System in Practice: A Production-Grade Guide for 2026](https://thelinuxcode.com/nodejs-file-system-in-practice-a-production-grade-guide-for-2026/)

### Command Registration Layer

The fork strips heavy workflow scripts in favor of thin command wrappers that load context and trigger agents.

| Pattern | Purpose | Why |
|---------|---------|-----|
| Markdown command definitions | CLI entry points | Existing GSD pattern; IDE-agnostic; YAML frontmatter for metadata |
| Minimal bootstrap code | Prerequisite checks, file staging | Deterministic ops belong in code, not knowledge docs |
| Context loading | Load relevant .md files into agent context | Decisions belong in knowledge docs, not scripts |

**Pattern to follow:**

```markdown
---
name: new-project
description: Project intake and acceptance criteria sharpening
tools: [Read, Write, Grep, Glob, Bash]
---

# New Project

**Prerequisites:** (deterministic code)
- Check `.planning/` doesn't exist or confirm wipe
- Validate git working tree is clean (warn only)

**Knowledge docs to load:**
- `.planning/references/PROJECT-INTAKE.md` (what well-defined projects look like)
- `.planning/references/SCOPE-HEURISTICS.md` (verifiability patterns)
- `.planning/references/ACCEPTANCE-CRITERIA.md` (must-have standards)

**Agent behavior:**
Conversational intake guided by knowledge docs. Reason over scope heuristics to assess verifiability. Sharpen into concrete acceptance criteria. Write PROJECT.md.
```

**Anti-pattern to avoid:**

```markdown
# DON'T: Heavy workflow scripts
1. Ask user for project description
2. If description < 10 words, ask for more detail
3. Check if description contains technical terms
4. If yes, ask about stack
5. If no, suggest generic stack
... (rigid step sequences)
```

**Rationale:**
- **2026 industry shift:** Workflow automation (deterministic If-This-Then-That) → AI agent builders (reason over context, autonomous planning)
- **Abstraction layer pattern:** Wrap frameworks in custom interfaces; when migrating, rewrite thin wrapper, not entire application (20% more initial dev time, 70% less migration cost)
- **Vercel data:** Agents reason better over reference docs than explicit step sequences

**Confidence:** MEDIUM-HIGH (industry trend validated by multiple sources, but GSD is pioneering application to CLI PM framework)

**Sources:**
- [The 2026 Guide to AI Agent Workflows](https://www.vellum.ai/blog/agentic-workflows-emerging-architectures-and-design-patterns)
- [Agentic Frameworks in 2026: What Actually Works in Production](https://zircon.tech/blog/agentic-frameworks-in-2026-what-actually-works-in-production/)

### State Management Layer

| Pattern | Format | Purpose | Why |
|---------|--------|---------|-----|
| File-based state | Markdown + JSON | Planning artifacts, config, todos | Existing GSD pattern; simple, inspectable, version-controllable |
| Atomic operations | Node.js fs with safe-write | State transitions | Prevent half-written states; readers see consistent snapshots |
| No external state | `.planning/` directory only | All project state in one place | Working tree safety constraint; no database needed for single-commit scope |

**Patterns to follow:**

**Ephemeral project directory:**
```
.planning/
├── PROJECT.md              # Acceptance criteria, scope
├── PROJECT-PLAN.md         # Phases (replaces ROADMAP.md)
├── PROJECT-SUMMARY.md      # Executor appends phase completion blocks
├── research/               # Research files (STACK.md, FEATURES.md, etc.)
├── phases/
│   ├── 1-setup/
│   │   ├── PLAN.md
│   │   └── SUMMARY.md
├── todos/                  # Parking lot items
│   └── [area]-[title].md   # One file per todo
└── codebase/               # Map anchored to SHA
    ├── STACK.md
    ├── ARCHITECTURE.md
    └── .map-sha            # Staleness detection
```

**Wipe on new project:**
```javascript
if (fs.existsSync('.planning/PROJECT.md')) {
  const answer = await prompt('Wipe existing .planning/? (y/N) ');
  if (answer.toLowerCase() !== 'y') process.exit(0);
}
// Safe wipe: rm -rf .planning/phases .planning/research .planning/PROJECT*.md
// Keep: .planning/codebase (expensive to regenerate)
```

**Rationale:**
- **Single-commit scope** eliminates need for persistent ROADMAP.md, STATE.md, MILESTONES.md
- **File-based state** is inspectable (human can read PROJECT.md), debuggable (no opaque DB), and version-controllable (can commit .planning/ for later resume)
- **Ephemeral artifacts** match actual workflow: planning serves current commit, then gets discarded or archived

**Confidence:** HIGH (existing GSD pattern + explicit PROJECT.md constraint)

### Git Integration Layer

| Operation | Pattern | Why |
|-----------|---------|-----|
| Working tree reads | `git status --porcelain` | Detect dirty working tree for prerequisite checks |
| Staging | `git add <specific files>` | `/verify-phase N` stages files on pass; never `git add -A` (avoid secrets) |
| SHA anchoring | `git rev-parse HEAD` | Codebase map staleness detection |
| No destructive ops | Never reset, checkout, stash, clean | Working tree safety constraint |

**Pattern to follow:**

```javascript
// Verifier stages files on pass
function stagePhaseFiles(phaseNum) {
  const plan = readPlan(phaseNum);
  const files = extractFilesFromPlan(plan);

  // Stage specific files (never -A or .)
  for (const file of files) {
    if (fs.existsSync(file)) {
      execGit(['add', file]);
    }
  }

  // Write summary to .planning (outside working tree)
  writeSummary(phaseNum, files);
}
```

**Anti-pattern to avoid:**
```javascript
// DON'T: Stage everything
execGit(['add', '-A']); // Can accidentally include .env, credentials

// DON'T: Destructive operations
execGit(['reset', '--hard']); // Violates working tree safety
execGit(['checkout', '.']);   // Discards user work
```

**Rationale:**
- **Working tree safety** is a hard constraint: pipeline manages `.planning/` only
- **Staging on verification pass** cleanly separates "work done" from "work verified"
- **SHA anchoring** lets us detect codebase map staleness (current HEAD != map SHA → re-run `/map`)

**Confidence:** HIGH (explicit PROJECT.md constraints + git safety best practices)

**Sources:**
- Git safety patterns are standard CLI framework practice; specific to GSD's working tree safety constraint

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Module system | CommonJS | ES Modules | Breaking change for existing installs; CommonJS works fine |
| Knowledge docs | AGENTS.md + SKILL.md | Custom XML format | Industry moved to markdown standards; don't fight ecosystem |
| State storage | File-based (.planning/) | SQLite database | Overkill for single-commit scope; files are inspectable + version-controllable |
| Command framework | Minimal markdown + Node.js | oclif | oclif is powerful but heavy; GSD's command layer is intentionally thin (just triggers + context loading) |
| Tool integration | MCP servers | Custom tool abstraction | MCP is the 2026 standard (500+ servers, OpenAI adopted March 2025) but GSD agents use native tools (Read/Write/Bash) for now; adopt MCP later if external integrations needed |

**Rationale for "thin over heavy":**

The fork's architecture is **thin wrappers + knowledge docs**, not **framework-driven**. This is intentional:

- **oclif** is excellent for complex CLIs with plugin systems, but GSD commands are triggers that load context and spawn agents. Adding oclif would be premature abstraction.
- **MCP** is the right answer for external tool integration (databases, Slack, etc.), but current scope is local file operations (Read, Write, Grep, Glob, Bash). Adopt MCP when integrations are needed, not before.

**Confidence:** HIGH (architectural decision driven by single-commit scope + working tree safety constraints)

## Installation

### Production (no external dependencies)

```bash
# Current GSD installation
npm install get-shit-done-cc
npx get-shit-done-cc
```

No changes needed. The fork maintains zero external production dependencies.

### Development

```bash
# Existing dev dependencies
npm install -D esbuild  # Hook bundling only
```

## Knowledge Document Structure Recommendations

Based on 2026 research, here's how to structure knowledge docs for optimal agent reasoning:

### AGENTS.md (Project-level context)

**Location:** Project root (version controlled)

**Purpose:** Loaded every session; high-value context Claude needs to orient itself

**Structure:**
```markdown
# Project Context

[One-paragraph summary: what is this, what stack]

## Architecture

[Key directories, component boundaries, data flow]

## Code Style

- [Conventions Claude can't infer from code]
- [Style preferences that prevent common mistakes]

## Commands

- Build: `npm run build:hooks`
- Test: `node --test`

## Rules

- Never use `git add -A` (avoid staging secrets)
- Never skip hooks (`--no-verify`)
- Atomic file writes: temp file → rename
```

**Size:** 50-100 lines ideal, max 300 lines

**Confidence:** HIGH (Vercel empirical data: 100% pass rate with docs-in-context)

**Sources:**
- [Using CLAUDE.MD files: Customizing Claude Code for your codebase](https://claude.com/blog/using-claude-md-files)
- [How to Write a Good CLAUDE.md File](https://www.builder.io/blog/claude-md-guide)

### SKILL.md (Progressive disclosure for procedural knowledge)

**Location:** `.planning/skills/<skill-name>/SKILL.md`

**Purpose:** Procedural knowledge loaded on-demand when agent determines it's relevant

**Structure:**
```markdown
---
name: phase-planning
description: How to break projects into phases for single-commit scope
---

# Phase Planning

## When to Use This Skill

Breaking a project into phases that each produce one reviewable commit.

## Core Principles

1. Each phase must be independently verifiable
2. Phases should build on each other (dependencies clear)
3. Single-commit scope: no phase should require multiple commits

## Planning Process

[Detailed step-by-step, can be long because it's loaded on-demand]

## Examples

[Concrete examples of good phase plans]

## Common Pitfalls

[What goes wrong, how to avoid]
```

**Size:** SKILL.md body under 500 lines; split to separate files if longer

**Pattern:** YAML frontmatter (50-100 tokens at startup) → full content on-demand (0 tokens unless activated)

**Confidence:** HIGH (Anthropic official standard)

**Sources:**
- [Equipping agents for the real world with Agent Skills - Anthropic](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Progressive Disclosure Matters: Applying 90s UX Wisdom to 2026 AI Agents](https://aipositive.substack.com/p/progressive-disclosure-matters)

### Reference Docs (Implementation-specific knowledge)

**Location:** `.planning/references/`

**Purpose:** Detailed knowledge for specific domains (scope assessment, verification standards, architecture patterns)

**Structure:**
```markdown
# Scope Heuristics

## Greenfield Projects

**Characteristics:**
- Building from scratch
- No existing codebase to integrate with

**Verifiability:** HIGH (clear acceptance criteria possible)

**Recommended phases:** Setup → Core features → Testing

## Brownfield Modifications

**Characteristics:**
- Modifying existing code
- Dependencies on existing architecture

**Verifiability:** MEDIUM (need to understand existing patterns first)

**Recommended phases:** Map codebase → Research patterns → Plan modifications → Execute

[Detailed decision trees, examples, edge cases]
```

**Size:** Unconstrained (loaded explicitly when needed)

**Confidence:** MEDIUM (pattern works but needs validation in GSD context)

### Hierarchical Organization

```
.planning/
├── PROJECT.md                    # Acceptance criteria (always loaded)
├── AGENTS.md                     # Project context (loaded every session)
│
├── skills/                       # Progressive disclosure
│   ├── phase-planning/
│   │   └── SKILL.md             # Frontmatter always loaded, body on-demand
│   ├── scope-assessment/
│   │   └── SKILL.md
│   └── verification/
│       └── SKILL.md
│
└── references/                   # Explicit loading
    ├── SCOPE-HEURISTICS.md      # Loaded by scope-assessment skill
    ├── ACCEPTANCE-CRITERIA.md   # Loaded during /new-project
    ├── PHASE-PATTERNS.md        # Loaded during /plan-project
    └── VERIFICATION-STANDARDS.md # Loaded during /verify-phase
```

**Load order:**
1. **Startup:** AGENTS.md (always) + skill frontmatter (50-100 tokens each)
2. **On-demand:** SKILL.md bodies when agent determines relevance
3. **Explicit:** Reference docs when command/skill needs them

**Confidence:** HIGH (matches Anthropic Skills + Vercel empirical patterns)

## Migration Path from Current GSD

| Current | Fork Pattern | Migration |
|---------|-------------|-----------|
| `workflows/*.md` (rigid step sequences) | `references/*.md` (knowledge docs) + thin command wrappers | Extract domain knowledge → write reference docs → replace workflow calls with context loading |
| `STATE.md` (cross-phase state machine) | `PROJECT-PLAN.md` (ephemeral, single-commit) | Strip state transitions → phases become simple list in plan |
| `ROADMAP.md` (multi-milestone) | `PROJECT-PLAN.md` (single project = one commit) | Collapse roadmap to plan; milestones concept removed |
| `gsd-tools.cjs` (tool abstraction) | Native tools (Read, Write, Bash) | Agents call tools directly; keep `resolve-model` for shared logic |
| 30+ commands in `commands/gsd/` | ~10 commands (new-project, plan-project, execute-phase, verify-phase, map, research-project, discuss-project, discuss-phase, plan-phase, research-phase, todo) | Delete milestone commands; consolidate phase commands; strip auto-advance |

**Confidence:** HIGH (clear mapping from PROJECT.md requirements)

## Tool Integration Strategy

### Current (2026-02-22)

Agents use native tools only:
- `Read` - File reading
- `Write` - File writing
- `Grep` - Content search
- `Glob` - File pattern matching
- `Bash` - Git operations, script execution

**Rationale:** GSD's scope is local file operations. Native tools are sufficient and eliminate the abstraction layer that `gsd-tools.cjs` represented.

**Exception:** `resolve-model` likely survives in tooling because model selection logic is shared across commands and genuinely needs code (not knowledge docs).

**Confidence:** HIGH (explicit PROJECT.md decision)

### Future (if external integrations needed)

Adopt **Model Context Protocol (MCP)** when scope expands beyond local operations.

**MCP adoption triggers:**
- Need to integrate with external services (Slack, databases, APIs)
- Want to share tool definitions across multiple frameworks
- Community builds MCP servers for common GSD use cases

**MCP server patterns to follow:**
1. **Prompt Library Server** - Parameterized prompt templates for common workflows
2. **Tool Catalog Server** - Wrap external APIs as MCP tools (e.g., GitHub API for issue creation)
3. **Resource Server** - Read-only access to external data (e.g., documentation databases)

**Confidence:** MEDIUM (MCP is the 2026 standard but GSD doesn't need it yet)

**Sources:**
- [Model Context Protocol: A Complete Guide for 2026](https://fast.io/resources/model-context-protocol/)
- [Model Context Protocol (MCP) explained](https://codilime.com/blog/model-context-protocol-explained/)

## Anti-Patterns to Avoid

### 1. Rigid Workflow Scripts

**What:** Step-by-step instructions with conditional logic embedded in markdown
```markdown
1. Ask user for description
2. If description contains "API", ask about authentication
3. If yes, ask which auth type
4. If OAuth, ask about provider
...
```

**Why bad:** Agent can't reason over context-dependent decisions; becomes brittle as edge cases emerge

**Instead:** Knowledge docs with principles + examples
```markdown
# API Projects

When projects involve APIs, consider:
- Authentication patterns (OAuth, API keys, JWT)
- Rate limiting strategies
- Error handling for network failures

[Examples of well-scoped API projects]
```

**Confidence:** HIGH (Vercel empirical data: 100% vs 79%)

### 2. Global Mutable State

**What:** Shared state files modified by multiple commands without coordination

**Why bad:** Race conditions in multi-agent scenarios; hard to debug "who changed what"

**Instead:** Atomic file operations with safe-write pattern; each command owns its state files

**Confidence:** HIGH (standard production pattern)

### 3. Premature Abstraction

**What:** Building framework-level abstraction (like oclif) before validating command patterns

**Why bad:** Over-engineering for single-commit scope; 20% more dev time without clear payoff

**Instead:** Start with thin wrappers; extract framework if patterns emerge across many commands

**Confidence:** MEDIUM-HIGH (industry pattern, but needs validation in GSD context)

### 4. Secret Staging

**What:** `git add -A` or `git add .` staging everything including .env, credentials.json

**Why bad:** Accidentally stages secrets; leads to credential leaks in commits

**Instead:** Stage specific files by name from plan; whitelist pattern, never blacklist

**Confidence:** HIGH (git security best practice)

### 5. Skill Overuse

**What:** Putting everything in SKILL.md files expecting progressive disclosure to solve context bloat

**Why bad:** If knowledge is always needed, it should be in AGENTS.md (always loaded). Skills are for optional procedural knowledge.

**Instead:**
- AGENTS.md: Project context, conventions (always needed)
- SKILL.md: Procedural workflows (needed sometimes)
- References: Detailed domain knowledge (loaded explicitly)

**Confidence:** MEDIUM-HIGH (Anthropic pattern, but needs validation in GSD fork)

**Sources:**
- [Claude Agent Skills Landing Guide](https://claudecn.com/en/blog/claude-agent-skills-landing-guide/)

## Testing Strategy

### Deterministic Tooling Layer

**Pattern:** Unit tests with Node.js native test runner

```javascript
// test/lib/state.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { safeWrite, readState } = require('../../get-shit-done/bin/lib/state.cjs');

test('safeWrite creates atomic file operation', async (t) => {
  const tmpDir = t.mock.tmpdir();
  const targetPath = `${tmpDir}/state.json`;

  safeWrite(targetPath, { phase: 1 });

  const state = readState(targetPath);
  assert.strictEqual(state.phase, 1);
});
```

**Coverage:** File operations, git integration, prerequisite checks

**Confidence:** HIGH (existing test infrastructure)

### Knowledge Documents

**Pattern:** Red-green testing with real agent execution

```bash
# Write failing test scenario
echo "Test: phase planning for greenfield project" > test-scenario.md

# Run agent with scenario
/plan-project

# Verify output matches acceptance criteria
node --test test/integration/phase-planning.test.cjs

# Iterate on knowledge docs until green
```

**Coverage:** Agent reasoning over reference docs, scope assessment accuracy

**Confidence:** MEDIUM (pattern works but slower than unit tests; use sparingly)

### Command Integration

**Pattern:** End-to-end tests in clean git repos

```bash
# Setup
git init test-repo && cd test-repo

# Execute command
/new-project "Build a todo CLI"

# Verify artifacts
test -f .planning/PROJECT.md
grep -q "Acceptance Criteria" .planning/PROJECT.md

# Teardown
cd .. && rm -rf test-repo
```

**Coverage:** Command wiring, prerequisite checks, file creation

**Confidence:** HIGH (standard integration test pattern)

## Observability

### Deterministic Tooling

**Pattern:** Structured JSON output to stdout, errors to stderr

```javascript
function resolvModel(profile) {
  try {
    const model = MODEL_PROFILES[profile];
    if (!model) throw new Error(`Unknown profile: ${profile}`);

    // Success: JSON to stdout
    console.log(JSON.stringify({ model, profile }));
  } catch (err) {
    // Error: message to stderr, exit 1
    process.stderr.write(`ERROR: ${err.message}\n`);
    process.exit(1);
  }
}
```

**Rationale:** Caller can parse success as JSON, display errors to user with formatting

**Confidence:** HIGH (existing GSD pattern)

### Agent Behavior

**Pattern:** Trace logging via Claude Code's built-in logging

Claude Code already logs tool calls, model selections, token usage. No custom logging needed.

**For debugging:** Run command with verbose flag (if implemented)

```bash
/execute-phase 1 --verbose
# Logs: knowledge docs loaded, tool calls made, reasoning steps
```

**Confidence:** MEDIUM (relies on Claude Code infrastructure, not GSD code)

## Success Criteria

This stack is validated when:

- [ ] Zero breaking changes to existing GSD installation (npm install, CLI works identically for commands that survive)
- [ ] Knowledge docs (AGENTS.md, SKILL.md, references/*.md) replace workflow scripts
- [ ] Verifier stages files on pass using specific `git add <file>` (never `-A` or `.`)
- [ ] Codebase map anchored to SHA with staleness detection
- [ ] Safe-write pattern prevents half-written states
- [ ] Test suite passes (existing + new tests for knowledge doc loading)
- [ ] No external production dependencies (maintain existing constraint)

**Confidence:** HIGH (explicit requirements from PROJECT.md)

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|-----------|-----------|
| Node.js + CommonJS | HIGH | Existing stack, validated over 1.20.5 releases |
| Knowledge-first architecture | HIGH | Vercel empirical data (100% vs 79%), Anthropic standard, 2026 adoption |
| AGENTS.md structure | HIGH | Industry standard, multiple sources agree on patterns |
| SKILL.md progressive disclosure | HIGH | Anthropic official standard, well-documented |
| Deterministic tooling patterns | HIGH | Standard Node.js production patterns, 2026 guides |
| Safe file writes | HIGH | Standard atomic operation pattern |
| Git integration | HIGH | Explicit PROJECT.md constraints + git best practices |
| Thin command wrappers | MEDIUM-HIGH | Industry trend, but GSD is pioneering application to CLI PM |
| File-based state | HIGH | Existing GSD pattern + single-commit scope fits well |
| MCP future adoption | MEDIUM | MCP is the 2026 standard but GSD doesn't need external integrations yet |
| Testing strategy | MEDIUM-HIGH | Patterns work but knowledge doc testing needs validation |
| Migration path | HIGH | Clear mapping from current GSD to fork patterns |

**Overall Confidence:** HIGH

The stack is well-validated by 2026 industry standards (AGENTS.md, SKILL.md, MCP) and empirical data (Vercel testing). The main unknowns are in application-specific details (how to structure reference docs for GSD's domain), not in foundational patterns.

## Gaps to Address

### Research Gaps

1. **CLAUDE.md hierarchical loading:** How does Claude Code prioritize global vs project vs local? (Need to test)
2. **SKILL.md activation rate:** What description patterns trigger skill loading reliably? (Need empirical testing)
3. **Context window management:** At what point does AGENTS.md size hurt reasoning quality? (Vercel used 8KB; what's the upper bound?)

### Implementation Gaps

1. **Reference doc structure:** What's the optimal organization for scope heuristics, verification standards, phase patterns? (Design during implementation)
2. **Safe-write error handling:** How to handle rename failures (rare but possible)? (Implement + test)
3. **Codebase map staleness:** What's the UX when map is stale? Warn? Block? Auto-regenerate? (Design decision needed)

### Validation Gaps

1. **Knowledge doc effectiveness:** Does the fork's reference doc structure actually achieve 100% reasoning quality? (Measure during alpha testing)
2. **Progressive disclosure adoption:** Do agents activate skills when expected? (Instrument and measure)
3. **Performance:** Does loading AGENTS.md every session add noticeable latency? (Measure during alpha)

---

*Stack research: 2026-02-22*
*Confidence: HIGH*
*Sources: 15+ web searches, Vercel empirical data, Anthropic official docs, 2026 industry standards*
