# Architecture Patterns

**Domain:** Knowledge-first AI agent CLI framework
**Researched:** 2026-02-22

## Recommended Architecture

Knowledge-first agent CLIs use a **two-layer separation-of-concerns architecture**:

1. **Deterministic Tooling Layer** - Mechanical operations with predictable behavior
2. **Knowledge Documents Layer** - Reference material agents reason over

```
┌─────────────────────────────────────────────────────────────┐
│ CLI Commands (Thin Triggers)                                 │
│ /new-project, /plan-project, /execute-phase                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──► Deterministic Tooling (JavaScript/Node)
             │    • File management (create, read, write)
             │    • Staleness detection (SHA comparison)
             │    • Prerequisites checking
             │    • Git operations (git add)
             │    • Todo CRUD
             │    • Model resolution
             │
             └──► Knowledge Documents (Markdown)
                  • Project intake patterns
                  • Scope validation heuristics
                  • Phase planning standards
                  • Verification criteria
                  • Domain patterns
```

### Component Boundaries

| Component | Responsibility | Inputs | Outputs | Talks To |
|-----------|---------------|--------|---------|----------|
| **CLI Commands** | Parse args, validate prerequisites, orchestrate | User input, flags | Agent invocation with context | Deterministic tooling, Agent runtime |
| **Deterministic Tooling** | File ops, SHA checks, git staging, model resolution | File paths, config | Status codes, structured data | File system, git |
| **Knowledge Docs** | Provide reference context for agent reasoning | None (static) | Loaded into agent context | Agent runtime |
| **Agent Runtime** | Reason over knowledge, execute commands, create artifacts | Knowledge docs, user request, codebase | Files written, commands executed | Deterministic tooling, file system |
| **Planning State (`.planning/`)** | Persist project artifacts | Agent writes | Agent reads | Agents, deterministic tooling |

### Data Flow

**Command execution flow:**

1. User invokes `/new-project`
2. Command parses args → calls deterministic tooling to check prerequisites
3. Tooling checks: Does `.planning/` exist? Is it stale? Returns status
4. Command spawns agent with:
   - Loaded knowledge docs (e.g., `PROJECT-INTAKE.md`, `SCOPE-VALIDATION.md`)
   - User request
   - Planning state context
5. Agent reasons over knowledge docs, conducts conversation with user
6. Agent calls deterministic tooling for mechanical ops (create files, stage files)
7. Agent writes artifacts to `.planning/project/PROJECT.md`
8. Command completes

**Progressive disclosure pattern:**

```
Command triggered → Load only relevant knowledge docs → Agent reasons → Complete → Discard context
```

Not: "Load all knowledge into every command"

## Patterns to Follow

### Pattern 1: One Short Index, Many Focused Docs

**What:** AGENTS.md as table of contents (~100 lines), detailed knowledge in `docs/` directory

**When:** Always. Research shows monolithic docs hit context limits and cause "curse of instructions" (too many directives → agent follows none well)

**Why:**
- Keeps context windows lean
- Reduces hallucination
- Enables progressive disclosure
- Matches empirical evidence: "Small, focused context beats one giant prompt"

**Example structure:**

```
AGENTS.md                         # 100 lines: map with pointers
docs/
  project/
    intake-patterns.md            # ~200 lines: how to conduct intake
    scope-validation.md           # ~150 lines: greenfield/brownfield heuristics
    acceptance-criteria.md        # ~100 lines: sharpening techniques
  planning/
    phase-planning-standards.md   # ~250 lines: what good plans contain
    single-commit-scope.md        # ~120 lines: scope constraints
  execution/
    tdd-flow.md                   # ~180 lines: red-green-refactor
    deviation-rules.md            # ~100 lines: Rules 1-4
  verification/
    verification-standards.md     # ~200 lines: what to check
```

**Anti-pattern:** Stuffing entire project into single 2000-line AGENTS.md

### Pattern 2: Command-Specific Context Loading

**What:** Each command loads only the knowledge docs it needs

**When:** Command defines context requirements in metadata/frontmatter

**Why:**
- Context is a resource to manage, not a limit to work around
- Models break much earlier than advertised (200k → unreliable at 130k)
- Sharp performance drops past 32k tokens even in top models

**Example:**

```javascript
// /new-project command
const contextDocs = [
  'docs/project/intake-patterns.md',
  'docs/project/scope-validation.md',
  'docs/project/acceptance-criteria.md'
];

// /execute-phase command
const contextDocs = [
  'docs/execution/tdd-flow.md',
  'docs/execution/deviation-rules.md',
  '.planning/phases/N/PLAN.md'
];
```

**Anti-pattern:** Loading all docs into every command

### Pattern 3: Deterministic Tooling for Mechanical Operations

**What:** Anything with a deterministic answer goes in code, not knowledge docs

**When:** File management, SHA comparison, git operations, prerequisite checks, todo CRUD

**Why:**
- "When you can solve part of your problem with a deterministic tool you control, you should—don't default to asking a large language model to probabilistically reason through something that has a clear, deterministic answer"
- Tools are contracts between deterministic systems and non-deterministic agents
- Tool wrappers abstract complexity, sanitize inputs, validate outputs

**Example:**

```javascript
// Deterministic: Is codebase map stale?
function isMapStale(manifestPath, currentSHA) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  return manifest.commit_sha !== currentSHA;
}

// Not: "Ask agent to determine if map is stale by reading files"
```

**Anti-pattern:** Asking agents to perform mechanical operations that have deterministic answers

### Pattern 4: Hierarchical Documentation for Large Systems

**What:** Root-level AGENTS.md + subdirectory-specific docs for different contexts

**When:** System has multiple domains (project, phase, execution, verification)

**Why:**
- Guidance matches exact context and version
- Reduces context size per operation
- Enables modular reasoning

**Example:**

```
AGENTS.md                          # Root: overall system map
docs/
  project/AGENTS.md                # Project domain map
  project/intake-patterns.md
  planning/AGENTS.md               # Planning domain map
  planning/phase-planning.md
  execution/AGENTS.md              # Execution domain map
```

**Anti-pattern:** Flat documentation structure for multi-domain systems

### Pattern 5: Specification-Driven Development (SDD)

**What:** Structured specs drive what agents produce; eliminate ad hoc prompts

**When:** Defining what "done" looks like for a phase, project, or artifact

**Why:**
- Agents operate best "inside conventions, structured specifications, and deterministic processes"
- Blend adaptability of agents with structure of workflows
- Verifiability requires structured specs

**Example:**

```markdown
# Phase Plan Specification

A valid phase plan MUST contain:

- [ ] YAML frontmatter with: phase_number, estimated_effort, must_haves
- [ ] Context section explaining why this phase exists
- [ ] Implementation approach (3-5 bullet points)
- [ ] File changes list (paths and purpose)
- [ ] Test strategy
- [ ] Success criteria (observable, testable outcomes)
```

**Anti-pattern:** "Just make a plan" without structured requirements

### Pattern 6: Capability Descriptions Over File Structure

**What:** Describe what the system can do, not where every file lives

**When:** Writing AGENTS.md or domain docs

**Why:**
- Lets agent generate just-in-time documentation during planning
- Prevents docs from rotting when files move
- Focuses on intent, not implementation details

**Example:**

**Good:**
```markdown
The system can:
- Map codebases to understand architecture (see codebase mapping)
- Plan projects as phases (see phase planning)
- Execute phases with TDD flow (see execution)
```

**Bad:**
```markdown
File structure:
- get-shit-done/bin/lib/core.cjs
- get-shit-done/bin/lib/phase.cjs
- get-shit-done/bin/lib/state.cjs
[... 50 more file paths]
```

### Pattern 7: Context Engineering Over Context Limits

**What:** Treat context as intentionally managed resource, not problem to solve by getting bigger models

**When:** Always

**Why:**
- Semantic caching cuts redundant API calls
- Vector search enables retrieval-augmented generation
- Agent memory management provides persistent context across sessions
- Combined strategies outperform relying solely on larger context windows

**Implementation:**

```javascript
// Cache frequently used docs
const docCache = new Map();

function loadKnowledgeDocs(docPaths) {
  return docPaths.map(path => {
    if (!docCache.has(path)) {
      docCache.set(path, fs.readFileSync(path, 'utf8'));
    }
    return docCache.get(path);
  });
}
```

**Anti-pattern:** "Just use a model with 1M token window"

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Knowledge Documents

**What:** Single 2000+ line AGENTS.md with all project knowledge

**Why bad:**
- Hits context limits (models break ~130k, not advertised 200k)
- Buries signal in noise
- "Curse of instructions" - too many directives → agent follows none well
- Prevents progressive disclosure

**Instead:** Use AGENTS.md as ~100-line map, detailed docs in focused files

### Anti-Pattern 2: Knowledge Docs for Mechanical Operations

**What:** Writing markdown docs that describe how to check if files exist, compare SHAs, stage files

**Why bad:**
- Adds probabilistic reasoning to deterministic problems
- "Don't default to asking a large language model to probabilistically reason through something that has a clear, deterministic answer"
- Reduces reliability
- Increases latency and cost

**Instead:** Write deterministic code for mechanical operations, provide as tools

### Anti-Pattern 3: Loading All Context Into Every Command

**What:** Every command loads entire knowledge base regardless of need

**Why bad:**
- Wastes context window
- Increases cost
- Adds irrelevant information that can confuse agent
- Sharp performance drops past 32k tokens

**Instead:** Command-specific context loading (progressive disclosure)

### Anti-Pattern 4: File Structure Documentation

**What:** Documenting every file path and directory in knowledge docs

**Why bad:**
- Documentation rots as files move
- Focuses on "what" not "why"
- Prevents agent from exploring and generating its own understanding
- Wastes context on mechanical details

**Instead:** Describe capabilities and point to entry points

### Anti-Pattern 5: Rigid Workflow Scripts

**What:** Step-by-step procedural scripts agents must follow exactly

**Why bad:**
- Research shows 79% pass rate for rigid instructions vs 100% for docs-based context
- Agents reason better over reference material than step sequences
- Removes agent ability to adapt to context
- Creates brittle systems

**Instead:** Provide reference docs with patterns, standards, and examples; let agents reason

### Anti-Pattern 6: Cross-Tool Incompatibility

**What:** Using tool-specific formats that don't work across Claude Code, Cursor, Gemini, OpenCode

**Why bad:**
- AGENTS.md is tool-agnostic standard
- Teams symlink tool-specific files to AGENTS.md
- Fragmentation reduces ecosystem value

**Instead:** Use AGENTS.md as primary, symlink tool-specific if needed

### Anti-Pattern 7: Unstructured Specifications

**What:** Ad hoc prompts instead of structured specs for what agents should produce

**Why bad:**
- Agents work best with structure + adaptability
- Unverifiable outputs
- Inconsistent quality
- No clear "done" criteria

**Instead:** Specification-driven development with structured requirements

## Scalability Considerations

| Concern | At 5 commands | At 20 commands | At 50+ commands |
|---------|---------------|----------------|-----------------|
| **Context size** | Single domain doc per command | Domain-specific docs with shared references | Hierarchical docs with lazy loading |
| **File organization** | Flat `docs/` directory | Organized by domain (`docs/project/`, `docs/execution/`) | Hierarchical with subdirectory AGENTS.md files |
| **Knowledge maintenance** | Manual updates | Automated staleness detection | Version-controlled docs with change tracking |
| **Command dispatch** | Direct agent invocation | Command metadata defines context requirements | Registry-based dispatch with context profiles |
| **Deterministic tooling** | Inline in command code | Shared utility library | Modular tooling layer with versioning |

## Build Order Implications

Knowledge-first architecture enables **concurrent development** once foundations are set:

### Phase 1: Foundation (Sequential - Must Complete First)

1. **Deterministic tooling library** - File ops, git integration, prerequisite checking
   - Why first: All other components depend on this
   - Deliverable: `lib/core.js` with file management, SHA comparison, model resolution

2. **Command dispatch system** - Thin triggers that load context and invoke agents
   - Why second: Defines how knowledge docs are loaded
   - Deliverable: Command parser with context loading

3. **AGENTS.md root index** - Table of contents for knowledge system
   - Why third: Defines knowledge organization
   - Deliverable: ~100 line map with pointers to domains

### Phase 2: Domains (Parallel - Independent)

Each domain can be built concurrently once foundation exists:

- **Project domain** (`docs/project/`, `/new-project`, `/discuss-project`, `/verify-project`)
- **Planning domain** (`docs/planning/`, `/plan-project`, `/research-project`)
- **Execution domain** (`docs/execution/`, `/execute-phase`, `/verify-phase`)
- **Mapping domain** (`docs/mapping/`, `/map`)

Dependencies only within domains, not across.

### Phase 3: Integration (Sequential - After Domains)

1. **Cross-domain workflows** - Commands that span multiple domains
2. **End-to-end testing** - Full project lifecycle validation
3. **Documentation consolidation** - Ensure no duplication across domains

## Component Dependencies

```
Deterministic Tooling
  ↓
Command Dispatch System
  ↓
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Project      │ Planning     │ Execution    │ Mapping      │
│ Domain       │ Domain       │ Domain       │ Domain       │
│              │              │              │              │
│ (independent)│ (independent)│ (independent)│ (independent)│
└──────────────┴──────────────┴──────────────┴──────────────┘
  ↓
Integration & Testing
```

**Key insight:** Domain independence enables parallel development and reduces build dependencies.

## Sources

Research findings based on:

### Knowledge-First Architecture
- [OpenAI Codex App Server Architecture](https://www.infoq.com/news/2026/02/opanai-codex-app-server/) - Bidirectional protocol decoupling agent logic from client surfaces
- [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) - Repository optimized for agent legibility, short AGENTS.md as table of contents
- [Context Engineering for Coding Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) - Progressive disclosure, command-triggered context loading

### Documentation Organization
- [Writing AI coding agent context files](https://packmind.com/evaluate-context-ai-coding-agent/) - Modular documentation beats monolithic, "curse of instructions"
- [How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/) - Small focused context, tackle one piece at a time
- [AGENTS.md: One File to Guide Them All](https://layer5.io/blog/ai/agentsmd-one-file-to-guide-them-all/) - Standardized markdown file for AI context
- [A Complete Guide To AGENTS.md](https://www.aihero.dev/a-complete-guide-to-agents-md) - Aim for ≤150 lines, progressive disclosure
- [AGENTS.md Best Practices](https://agentsmd.io/agents-md-best-practices/) - Essential sections, hierarchical structure for large repos

### Deterministic vs Reasoning Layers
- [AI Agents and Deterministic Workflows: A Spectrum](https://www.deepset.ai/blog/ai-agents-and-deterministic-workflows-a-spectrum) - Hybrid approach, agents within structured specifications
- [Writing effective tools for AI agents](https://www.anthropic.com/engineering/writing-tools-for-agents) - Tools as contracts between deterministic and non-deterministic systems
- [The 3-Layer Architecture Every AI Agent Needs](https://unanimoustech.com/3-layer-architecture-production-ai-agents/) - Separation of deterministic engine and intelligent model
- [Blueprint First, Model Second](https://arxiv.org/pdf/2508.02721) - Deterministic workflow blueprint, model handles discrete tasks

### Context Window Management
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - Models break earlier than advertised, treat context as managed resource
- [Context Engineering in agents - LangChain](https://docs.langchain.com/oss/python/langchain/context-engineering/) - Semantic caching, vector search, memory management
- [The Context Window Problem](https://factory.ai/news/context-window-problem/) - Sharp performance drops past 32k tokens
- [Best Long Context LLMs January 2026](https://whatllm.org/blog/best-long-context-models-january-2026/) - Current model capabilities and limitations

### Agentic Workflow Patterns
- [Agentic workflows for software development](https://medium.com/quantumblack/agentic-workflows-for-software-development-dc8e64f4a79d) - Decomposition, planning, reflection loop
- [The 2026 Guide to AI Agent Workflows](https://www.vellum.ai/blog/agentic-workflows-emerging-architectures-and-design-patterns) - ReAct vs Plan-and-Execute patterns
- [What Are Agentic Workflows?](https://www.deck.co/blog/what-are-agentic-workflows-complete-guide-for-2026) - Intelligent orchestration vs rigid rules

### CLI Architecture
- [Why CLI is the New MCP for AI Agents](https://oneuptime.com/blog/post/2026-02-03-cli-is-the-new-mcp/view) - Context triggered at deterministic points
- [Vercel Bash Tool for Context Retrieval](https://www.infoq.com/news/2026/01/vercel-bash-tool/) - Progressive disclosure architecture, skills framework

### Cross-Tool Compatibility
- [Rules | OpenCode](https://opencode.ai/docs/rules/) - Tool compatibility and fallback conventions
- [Claude Code Gets Path-Specific Rules](https://paddo.dev/blog/claude-rules-path-specific-native/) - Path matching patterns across tools

---

**Confidence Assessment:**

| Area | Level | Reason |
|------|-------|--------|
| Modular docs > monolithic | HIGH | Multiple authoritative sources (OpenAI, Anthropic, Martin Fowler) with empirical data |
| Deterministic tooling separation | HIGH | Anthropic engineering blog, academic papers, production system case studies |
| Command-specific context loading | HIGH | Progressive disclosure pattern documented across OpenAI Codex, Vercel skills, LangChain |
| AGENTS.md conventions | MEDIUM | Emerging standard (2025-2026), broad adoption but still evolving |
| Context window limits | HIGH | Official model documentation, empirical testing from Maxim.ai, Factory.ai |
| Build order implications | MEDIUM | Derived from component dependencies, validated by general software architecture principles |

**Research gaps:**
- Specific Vercel "100% vs 79%" claim mentioned in PROJECT.md could not be verified with direct source; found supporting evidence for docs-based context superiority but not exact numbers
- Optimal knowledge doc size (100-250 lines) based on community practices, not controlled studies
