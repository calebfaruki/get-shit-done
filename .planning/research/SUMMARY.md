# Project Research Summary

**Project:** Stateless Project PM -- GSD Fork
**Domain:** Knowledge-first AI agent CLI framework (single-commit scope)
**Researched:** 2026-02-22
**Confidence:** HIGH

## Executive Summary

Stateless Project PM is a fork of get-shit-done-cc that replaces rigid workflow scripts with a knowledge-first architecture: deterministic tooling for mechanical operations plus markdown knowledge docs that agents reason over. The 2026 industry consensus, backed by Vercel's empirical testing (100% pass rate with docs-in-context vs 79% with skill-based retrieval), strongly validates this approach. The recommended stack is conservative -- Node.js, CommonJS, zero external production dependencies -- with the innovation happening entirely in how agent context is structured, not in runtime technology.

The architecture follows a two-layer separation of concerns. Deterministic code handles file operations, git staging, SHA comparison, prerequisite checks -- anything with exactly one correct answer. Knowledge documents (AGENTS.md as a short index, reference docs for domain knowledge, SKILL.md for progressive disclosure of procedural knowledge) handle everything requiring contextual judgment: scope assessment, acceptance criteria sharpening, phase planning, implementation decisions. Commands become thin triggers that load relevant knowledge docs and spawn agents, rather than encoding decision logic in step-by-step scripts.

The primary risks are: (1) misplacing the deterministic-knowledge boundary early, which poisons all downstream phases; (2) documentation drift degrading agent performance silently over weeks; (3) big-bang deletion of ~55 existing files breaking the working system without a rollback path; and (4) subagent context propagation failures when orchestrators fail to pass self-contained context. Mitigation for all four is well-documented: establish a bright-line rule for the boundary in Phase 1, treat docs as living code artifacts, use strangler fig incremental migration, and mandate `<files_to_read>` blocks for all subagent handoffs.

## Key Findings

### Recommended Stack

The stack is deliberately minimal. Node.js (>=16.7.0) with CommonJS modules and zero external production dependencies. This is not a technology bet -- it is a preservation of the working installation base while shifting innovation to the knowledge layer.

**Core technologies:**
- **Node.js + CommonJS:** Runtime and module system -- existing, validated, no migration needed
- **Markdown knowledge docs (AGENTS.md, SKILL.md, references/):** Agent context -- Vercel empirical data shows docs-based context outperforms skill-based retrieval
- **Node.js fs with atomic writes:** File state management -- temp file + rename pattern prevents half-written states
- **Native tools (Read, Write, Grep, Glob, Bash):** Agent tooling -- no abstraction layer needed for local file operations
- **Thin command wrappers:** CLI entry points -- YAML frontmatter metadata, load context, spawn agent; no workflow logic

**Critical version/format requirements:**
- AGENTS.md: Under 300 lines (ideally 50-100), table-of-contents style pointing to detailed docs
- SKILL.md: YAML frontmatter (50-100 tokens at startup), body loaded on-demand only
- Reference docs: Under 10,000 tokens each to avoid context degradation

### Expected Features

**Must have (table stakes):**
- Project intake with scope validation (greenfield/mechanical/brownfield assessment)
- Acceptance criteria sharpening (vague requests to testable outcomes)
- Phase planning with task decomposition (sequential, dependency-aware phases)
- Codebase mapping with SHA-anchored staleness detection
- Verification against acceptance criteria (report-only, stage on pass)
- Human-in-the-loop checkpoints (approval gates before destructive actions)
- TDD integration (tests first, audit, implement)
- Single-commit scope enforcement
- Context engineering (load only relevant docs per command)

**Should have (differentiators):**
- Knowledge-first over workflow scripts (core value proposition)
- Deterministic-knowledge hybrid architecture
- Ephemeral project state (clean slate per commit)
- Separate planner/executor/verifier agents
- Parking lot / todo system
- Phase-specific research agents
- Report-only verification (no auto-fix loops)

**Defer:**
- Phase-specific research agents (project-level research suffices initially)
- Advanced context window management (start simple, optimize when hitting limits)
- Multi-model orchestration profiles (start with single quality model)
- MCP integration (only when external integrations are needed)

### Architecture Approach

Two-layer architecture: deterministic tooling for mechanical operations, knowledge documents for agent reasoning. Commands are thin triggers that load context and spawn agents. State lives in `.planning/` as inspectable markdown/JSON files, ephemeral per project. Domains (project, planning, execution, mapping) are independent once the foundation layer exists, enabling parallel development.

**Major components:**
1. **Deterministic Tooling Layer** -- file ops, git staging, SHA checks, prerequisite validation, model resolution; same input always produces same output
2. **Knowledge Documents Layer** -- AGENTS.md (always loaded, ~100 lines), SKILL.md (progressive disclosure), references/ (explicit loading per command); agents reason over these
3. **CLI Commands** -- thin wrappers with YAML frontmatter defining context requirements; ~10 commands replacing ~30
4. **Planning State (.planning/)** -- ephemeral project artifacts, phase plans, todos; wiped on new project, file-based, inspectable
5. **Agent Runtime** -- specialized agents (intake, planner, executor, verifier) spawned with self-contained context via `<files_to_read>` blocks

### Critical Pitfalls

1. **Deterministic-knowledge boundary misplacement** -- Apply bright-line rule: if operation has exactly one correct outcome for given inputs, it goes in code; if it requires contextual judgment, it goes in knowledge docs. Validate with: "Could two agents produce different valid outcomes?" Get this wrong in early phases, rewrite everything later.

2. **Documentation drift and context degradation** -- Treat knowledge docs as living code artifacts with same review rigor. 50% of AGENTS.md files go stale post-creation. Keep docs under 10,000 tokens. Add staleness markers. Update docs atomically with behavior changes.

3. **Big-bang deletion without strangler fig** -- Delete ~55 files incrementally by category, not all at once. Keep old command names as aliases during transition. Validate after each deletion wave. Never delete and rebuild simultaneously.

4. **Subagent context propagation failures** -- Every subagent prompt must be self-contained. Use `<files_to_read>` blocks listing required context files. Spawn subagents before orchestrator hits 50% context usage. Use `.planning/` files as inputs, not prompt-only context.

5. **Scope creep through incremental additions** -- `/new-project` must produce must-have/nice-to-have split with verifiable criteria. Park nice-to-haves as todos. Warn if plan exceeds 5 phases. Reject scope expansion during execution.

## Implications for Roadmap

Based on combined research, the migration should follow a strangler fig pattern with 7 phases. The architecture's domain independence (project, planning, execution, mapping) enables parallelism in mid-phases, but foundation and integration phases are sequential.

### Phase 1: Characterization Tests and Safe Deletion
**Rationale:** PITFALLS.md warns that refactoring without test safety nets causes unrecoverable breakage. CONCERNS.md identifies untested areas. Must establish behavioral baseline before changing anything.
**Delivers:** Characterization tests for fragile subsystems; incremental deletion of truly orphaned files (no dependents)
**Addresses:** Test breakage prevention (Pitfall 6), safe deletion (Pitfall 3)
**Avoids:** Big-bang deletion, losing behavior guarantees

### Phase 2: Deterministic Tooling Foundation
**Rationale:** ARCHITECTURE.md shows all components depend on this layer. STACK.md defines atomic file writes, git integration, prerequisite checking as foundational. The deterministic-knowledge boundary (Pitfall 1) must be established here.
**Delivers:** Core library with safe-write, SHA comparison, model resolution, file management; bright-line rule documented and enforced
**Addresses:** Tool integration (table stakes), atomic operations, model validation (Pitfall 9)
**Implements:** Deterministic Tooling Layer from architecture

### Phase 3: Knowledge Document System
**Rationale:** STACK.md and ARCHITECTURE.md agree that knowledge docs are the core innovation. Must exist before commands can load context. AGENTS.md structure, SKILL.md progressive disclosure, reference doc organization all defined here.
**Delivers:** AGENTS.md root index, reference docs for each domain (project intake, scope validation, phase planning, verification standards), SKILL.md templates
**Addresses:** Knowledge-first architecture (differentiator), context engineering (table stakes)
**Avoids:** Documentation drift (Pitfall 2) by establishing maintenance discipline from day one

### Phase 4: Command Handlers and Project Lifecycle
**Rationale:** FEATURES.md dependency chain shows intake -> scope validation -> acceptance criteria -> phase planning as sequential. Commands are thin triggers loading knowledge docs from Phase 3. STACK.md defines the command pattern (YAML frontmatter + context loading).
**Delivers:** `/new-project`, `/plan-project`, `/execute-phase`, `/verify-phase`, `/map`, `/todo` command handlers with prerequisite checks, context loading, archive-before-wipe safety
**Addresses:** Project intake, acceptance criteria, phase planning, codebase mapping (all table stakes); ephemeral state (differentiator)
**Avoids:** Ephemeral directory data loss (Pitfall 10), command namespace confusion (Pitfall 13)

### Phase 5: Agent Spawning and Handoff Protocols
**Rationale:** PITFALLS.md identifies subagent context propagation as critical failure mode. Specialized agents (planner, executor, verifier) need self-contained prompts with explicit file references. This is where the knowledge-first architecture becomes operational.
**Delivers:** Agent spawn protocols with `<files_to_read>` blocks, orchestrator context budgets, specialized agent roles (intake, planner, executor, verifier)
**Addresses:** Separate planner/executor/verifier (differentiator), human-in-the-loop checkpoints (table stakes)
**Avoids:** Context propagation failures (Pitfall 4)

### Phase 6: Verification and Git Staging
**Rationale:** FEATURES.md places verification as the final quality gate. PITFALLS.md warns about git staging failures. Verification must be report-only with explicit file staging (never `git add -A`).
**Delivers:** `/verify-phase` with acceptance criteria checking, explicit file staging on pass, dry-run reporting, scope creep detection
**Addresses:** Verification (table stakes), report-only verification (differentiator), single-commit enforcement (table stakes)
**Avoids:** Git staging failures (Pitfall 7), scope creep (Pitfall 5)

### Phase 7: Integration Testing and Migration Cleanup
**Rationale:** ARCHITECTURE.md shows integration phase follows domain phases. PITFALLS.md warns about test coverage regression and YAML frontmatter corruption. Final deletion of remaining old files.
**Delivers:** End-to-end lifecycle tests, doc-code alignment checks, frontmatter validation, removal of remaining legacy files, deprecation aliases
**Addresses:** Observability/audit trail (table stakes), TDD integration (table stakes)
**Avoids:** YAML corruption (Pitfall 8), test breakage (Pitfall 6)

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Cannot safely refactor without behavioral baseline tests
- **Phase 2 before Phase 3:** Knowledge docs load via deterministic tooling; tooling must exist first
- **Phase 3 before Phase 4:** Commands load knowledge docs; docs must exist before commands
- **Phase 4 before Phase 5:** Agent spawning happens inside command handlers
- **Phase 5 before Phase 6:** Verifier is a specialized agent needing spawn infrastructure
- **Phase 7 last:** Integration testing validates all phases work together; cleanup removes legacy artifacts
- **Phases 4-6 could partially overlap** once Phase 3 is complete, since project/planning/execution domains are independent

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Knowledge docs):** Optimal reference doc structure for GSD's domain is unvalidated; needs experimentation with doc sizes, organization, agent activation rates
- **Phase 5 (Agent spawning):** Context propagation protocols are well-documented in theory but need GSD-specific validation; SKILL.md activation reliability is unknown

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Tests + deletion):** Standard characterization testing and strangler fig patterns
- **Phase 2 (Deterministic tooling):** Standard Node.js file ops, git integration; existing GSD patterns
- **Phase 4 (Command handlers):** Thin wrapper pattern well-defined in STACK.md
- **Phase 6 (Verification):** Report-only pattern well-documented; git staging is standard
- **Phase 7 (Integration):** Standard end-to-end testing patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack validated over 1.20.5 releases; knowledge doc patterns backed by Vercel empirical data and Anthropic standards |
| Features | HIGH | Feature landscape well-mapped; dependency chain clear; MVP priorities align with industry 2026 patterns |
| Architecture | HIGH | Two-layer separation validated by multiple authoritative sources (OpenAI, Anthropic, Martin Fowler, arXiv); command-specific context loading documented across frameworks |
| Pitfalls | HIGH (critical), MEDIUM (moderate/minor) | Critical pitfalls backed by empirical studies and production case studies; moderate pitfalls inferred from architecture constraints with less direct evidence |

**Overall confidence:** HIGH

The research is unusually well-grounded for a project at this stage. The knowledge-first approach has strong empirical backing (Vercel testing, Anthropic standards, 2026 industry consensus). The main uncertainty is in application-specific details -- how to structure reference docs for GSD's specific domain, whether SKILL.md activation is reliable enough, and optimal doc sizes -- all of which can be resolved through iteration in Phases 3 and 5.

### Gaps to Address

- **SKILL.md activation reliability:** What description patterns trigger skill loading consistently? Needs empirical testing in Phase 5.
- **Optimal reference doc structure:** How to organize scope heuristics, verification standards, phase patterns for GSD's domain. Design during Phase 3 implementation.
- **Context window upper bounds:** Vercel used 8KB compressed docs; what is the practical ceiling before reasoning degrades? Monitor during Phase 5.
- **CLAUDE.md hierarchical loading priority:** How Claude Code prioritizes global vs project vs local instructions. Test during Phase 2.
- **Codebase map staleness UX:** Warn, block, or auto-regenerate when map is stale? Design decision needed in Phase 4.
- **Vercel "100% vs 79%" exact numbers:** Supporting evidence found for docs-based superiority but exact figures could not be independently verified. Does not change the recommendation.

## Sources

### Primary (HIGH confidence)
- [Vercel: AGENTS.md outperforms skills in agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals) -- Knowledge-first architecture validation
- [Anthropic: Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) -- SKILL.md progressive disclosure standard
- [Anthropic: Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) -- Deterministic tooling as contracts
- [Martin Fowler: Context Engineering for Coding Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) -- Progressive disclosure, command-triggered loading
- [arXiv 2511.12884: Agent READMEs empirical study](https://arxiv.org/pdf/2511.12884) -- 50% of AGENTS.md files go stale; documentation drift data
- [arXiv 2508.02721: Blueprint First, Model Second](https://arxiv.org/pdf/2508.02721) -- Deterministic workflow blueprint framework

### Secondary (MEDIUM confidence)
- [deepset: AI Agents and Deterministic Workflows](https://www.deepset.ai/blog/ai-agents-and-deterministic-workflows-a-spectrum) -- Hybrid architecture spectrum
- [AWS: Strangler fig pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html) -- Migration strategy
- [Maxim.ai: Context Window Management](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) -- Models break before advertised limits
- [Factory.ai: The Context Window Problem](https://factory.ai/news/context-window-problem/) -- Sharp performance drops past 32k tokens
- [GSD Troubleshooting docs](https://deepwiki.com/glittercowboy/get-shit-done/16-troubleshooting) -- Subagent propagation failures

### Tertiary (LOW confidence)
- [Packmind: Writing AI coding agent context files](https://packmind.com/evaluate-context-ai-coding-agent/) -- Practitioner experience on doc maintenance
- Git staging failure patterns -- Inferred from PROJECT.md constraints, no direct sources
- Todo tag fragmentation -- Logical extension of architecture decisions

---
*Research completed: 2026-02-22*
*Ready for roadmap: yes*
