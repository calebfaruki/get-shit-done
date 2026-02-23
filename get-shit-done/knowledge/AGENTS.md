# Agent Knowledge System Index

This is the root index for agent knowledge documents. Agents load domain-specific docs based on their role. Command handlers (Phase 4) will reference this to determine which docs to pass to agents.

**How to use:** Identify your agent's role, then load the corresponding domain knowledge document(s) listed below.

---

## Knowledge Domains

| Domain | File | Purpose | Primary Sections | Token Size |
|--------|------|---------|------------------|------------|
| **Project** | `project-domain.md` | Intake methodology, scope validation, acceptance criteria sharpening | `<intake>`, `<scope_validation>`, `<acceptance_criteria>`, `<tool_guidance>` | ~3K tokens |
| **Planning** | `planning-domain.md` | Single-commit scope, phase decomposition, goal-backward methodology, context budgets | `<single_commit_scope>`, `<phase_decomposition>`, `<goal_backward>`, `<context_budget>`, `<tool_guidance>` | ~3K tokens |
| **Execution** | `execution-domain.md` | TDD flow, deviation rules (1-4), fix attempt limit, scope boundary | `<tdd_flow>`, `<deviation_rules>`, `<tool_guidance>` | ~3K tokens |
| **Verification** | `verification-domain.md` | Goal-backward verification, stub detection, staging rules, report-only principle | `<verification_methodology>`, `<stub_detection>`, `<staging_rules>`, `<tool_guidance>` | ~3K tokens |

All domain documents are kept under 10K tokens to ensure fast loading and low context overhead.

---

## Agent-to-Domain Mapping

| Agent Role | Required Domains | Purpose |
|------------|------------------|---------|
| **Project Researcher** | `project-domain.md` | Understand intake methodology and scope validation for research synthesis |
| **Planner** | `planning-domain.md`, `project-domain.md` | Create phase plans using goal-backward methodology with scope context |
| **Plan Checker** | `planning-domain.md` | Validate plans against single-commit scope and context budget constraints |
| **Executor** | `execution-domain.md` | Implement tasks following TDD flow and deviation rules |
| **Verifier** | `verification-domain.md` | Check executor work using goal-backward verification and stub detection |
| **Debugger** | `execution-domain.md` | Understand deviation context for troubleshooting issues |
| **Codebase Mapper** | None | Maps are mechanical, no domain knowledge needed |

---

## Shared Principles

These principles apply to ALL agents regardless of domain:

### Tool Usage
- **Use native Claude Code tools exclusively**: Read, Write, Edit, Glob, Grep, Bash
- **NEVER use gsd-tools.cjs commands**: Knowledge docs are standalone, not coupled to GSD tooling
- **Prefer native over bash**: Use Grep over `grep`, Glob over `find`, Read over `cat`

### Scope Philosophy
- **One commit = one project**: The atomic unit is a single commit's worth of work
- **Single-commit scope is strategic**: Projects are verifiable in one diff review
- **Phases are tactical**: Each phase is a coherent, verifiable subdivision of the project

### Knowledge vs Orchestration
- **Knowledge docs contain principles and patterns**: Standards, heuristics, methodologies
- **Orchestration lives in command handlers**: Step-by-step process flows, agent sequencing
- **Domain docs teach "how to think"**: Command handlers manage "what to do next"

### Domain Separation
- **Each domain is self-contained**: Load only what your role requires
- **Cross-references are minimal**: Domain docs may reference each other for context
- **Token efficiency matters**: Don't load unnecessary domains

---

## Cross-References

Domain docs may reference each other:
- **Planning** references **Execution** for TDD detection and task sizing
- **Verification** references **Planning** for understanding must_haves structure
- **Execution** references **Planning** for context budget awareness

These cross-references are informational, not dependencies. Each doc remains independently loadable.

---

## Reference Files vs Knowledge Documents

**Knowledge documents** (this directory):
- Domain principles, patterns, methodologies
- How agents should think and reason
- Loaded based on agent role

**Reference files** (`get-shit-done/references/`):
- Data tables and lookup information
- Model profiles, argument parsing specs
- Loaded as needed for specific operations

Reference files are configuration data. Knowledge docs are reasoning substrates.

---

## Design Notes

### Why Separate Domains?
Token efficiency and cognitive load. An executor doesn't need intake methodology. A planner doesn't need stub detection patterns. Loading only relevant knowledge keeps context usage low.

### Why Not One Big Doc?
A single AGENTS.md with all knowledge would be 12-15K tokens. That's:
- Expensive to load every time
- Overwhelming cognitive overhead
- Poor separation of concerns
- Hard to maintain and update

Four focused 3K token docs are faster to load, easier to maintain, and more modular.

### Why Not Agent-Specific Files?
Agent files would duplicate knowledge across roles. If two agents need the same pattern, it would exist in two files. Knowledge docs provide single-source-of-truth for domain patterns.

---

**Total Knowledge System:**
- 5 files: AGENTS.md (this index) + 4 domain docs
- ~13K tokens total when all loaded
- Typical agent loads 1-2 domains (~3-6K tokens)
- 10K token limit per file ensures fast loading
