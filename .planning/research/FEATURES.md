# Feature Landscape

**Domain:** Knowledge-first AI coding agent CLI framework (single-commit scope)
**Researched:** 2026-02-22

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project intake with scope validation | Standard workflow entry point; prevents unverifiable work | Medium | Must assess greenfield/mechanical/brownfield patterns and reject unverifiable scopes |
| Acceptance criteria sharpening | Core quality gate; AI agents need explicit pass/fail criteria | Medium | Transform vague requests into testable outcomes; research shows 100% vs 79% pass rate with clear criteria |
| Task decomposition / phase planning | Foundation of reliable agent behavior; complex requests fail without breakdown | High | Break project into sequential phases; dependencies must be explicit |
| Codebase mapping with staleness detection | Context accuracy determines agent quality; drift is #1 silent failure mode | High | Anchor to commit SHA; detect when map is stale; documentation drift degrades performance quietly |
| Verification against acceptance criteria | Separate verification step is non-negotiable in 2026; prevents critical errors | Medium | Report-only, no auto-fix loops; stage files on pass; must validate behavior matches criteria |
| Multi-model orchestration | Different tasks need different model profiles (quality/balanced/budget) | Low | Existing pattern; quality for planning, balanced for execution, budget for research |
| Human-in-the-loop checkpoints | Developers expect approval gates before destructive actions (rm -rf, git operations) | Low | Configurable autonomy levels; clear audit trails; required for production trust |
| Context engineering | Powerful context curation is "huge part of developer experience" in 2026 | Medium | Markdown reference docs agents reason over; hierarchical summaries; surface only relevant content |
| TDD integration | Test-first workflow creates feedback loop; agents need structure to deliver speed | Medium | Write tests → audit → implement; catch bugs before code lands |
| Tool integration (deterministic) | Agents need clearly defined interfaces for reads/writes | Low | File management, git staging, prerequisite checks; same behavior every time |
| Observability / audit trail | Trust requires transparency; must show what agent did and why | Medium | Trace-level logging; reviewable diffs; clear commit messages documenting "why" |
| Single-commit scope enforcement | Small commits document development; easier to pinpoint issues vs giant "AI changes" commit | Low | Core value proposition; prevents scope creep; enforces verifiable boundaries |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Knowledge-first over workflow scripts | Research shows 100% pass rate (docs-based) vs 79% (skill-based); agents reason better over reference docs | High | Vercel's empirical finding; compressed 8KB docs in AGENTS.md outperformed sophisticated skill retrieval |
| Deterministic-knowledge hybrid architecture | Separates mechanical operations (deterministic code) from reasoning tasks (knowledge docs) | High | Offload calculations/checks to tools; reserve LLM for planning/decision-making; reduces hallucination risk |
| Ephemeral project state | Clean slate per commit; no cross-session cruft; files on disk are the state | Medium | Cursor/Copilot clone repos and spin up ephemeral environments; matches 2026 patterns |
| Verifiability-based scope warnings | Proactive assessment of whether request is verifiable before planning | Medium | Greenfield (new feature, clear inputs/outputs) vs brownfield (refactor, harder to verify); prevents wasted work |
| Parking lot / todo system | Semi-durable, area-tagged storage for deferred decisions and discovered issues | Low | One file per todo in `.planning/todos/`; helps manage scope without losing context |
| Phase-specific research agents | Tactical, implementation-focused research invoked per phase (not just project-level) | Medium | XML-tagged output for planner consumption; lighter touch than strategic research |
| Separate planner/executor/verifier agents | Specialization increases reliability; each agent has single responsibility | Medium | Planner explores + creates tasks; executor implements; verifier checks; no mixing concerns |
| Context window management (intentional compaction) | Frequent intentional compaction keeps utilization 40-60%; prevents sudden performance drops | High | Models become unreliable near token limits; proactive management beats reactive overflow |
| Commit SHA-anchored mapping | Detect when map is stale (codebase evolved); prevents working from outdated mental model | Medium | Codebase evolves rapidly with AI-generated code; staleness detection is critical |
| Report-only verification (no auto-fix loops) | Verifier reports and stops; human decides next step | Low | Prevents infinite loops; maintains human control; agent proposes, human authorizes |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-milestone lifecycle management | Overkill for single-commit scope; adds complexity without value | Keep project = one commit; human drives next project |
| Auto-advance between phases | Removes human control; can compound errors across phases | Human triggers phase transitions explicitly; `/execute-phase N` |
| Automated fix loops when verification fails | Wastes tokens; often makes things worse; infinite loop risk | Report diagnostics and stop; let human assess and re-plan |
| Persistent cross-session state files (ROADMAP.md, STATE.md) | Becomes stale; adds maintenance burden; doesn't match actual workflow | Ephemeral PROJECT-PLAN.md; wiped on new project |
| Rigid workflow scripts for context-dependent decisions | 79% pass rate vs 100% with knowledge docs; agents can't adapt | Knowledge docs agents reason over; deterministic code only for mechanical ops |
| RAG / vector search layer | Unnecessary for single-commit scope; adds complexity and latency | Direct file reads; glob/grep for discovery; context window sufficient |
| Skill library for mechanical patterns | Training data shows this underperforms passive docs; maintenance burden | Embed knowledge in AGENTS.md or reference docs; agents reason over examples |
| Generic "helpful coding assistant" prompts | Vague prompts → wrong results; #1 reason agent files fail | Specific role descriptions: "test engineer who writes React tests, follows examples, never modifies source" |
| 50-page documentation dumps | Models can't figure out what's relevant; wasted tokens; hallucination risk | Hierarchical summaries or surface only relevant sections via tools |
| General-purpose agent for all tasks | Mixing concerns reduces reliability; no clear accountability | Specialized agents: intake, research, planning, execution, verification |
| Git operations without approval gates | Dangerous; developers expect approval before destructive actions | Human-in-the-loop for rm -rf, git reset, force push; audit trails |
| Full autonomy without checkpoints | Misinterpretation/hallucination wastes money; compounding errors | Explicit planning phase before coding; verification gates; human approval for destructive actions |
| Bolted-on features without integration | "Vanity rollout metrics"; doesn't deliver value | Features must integrate with deterministic tooling layer and knowledge docs |
| Vibe coding without tests | Debugging requires programming knowledge user may lack; creates debt | TDD workflow: tests first, audit, then implement; build quality in |

## Feature Dependencies

```
Project intake → Scope validation (must assess verifiability before accepting)
Scope validation → Acceptance criteria sharpening (can't validate without criteria)
Acceptance criteria → Phase planning (planner needs clear goals)
Phase planning → Codebase mapping (executor needs current mental model)
Codebase mapping → Staleness detection (map must be anchored to commit SHA)
Phase planning → Phase execution (can't execute without plan)
Phase execution → Verification (must check result against acceptance criteria)
Verification pass → Git staging (only stage on successful verification)
```

**Research triggers planning:**
- Project-level research → Phase planning (strategic context informs breakdown)
- Phase-level research → Phase execution (tactical details inform implementation)

**Human gates:**
- Scope validation → Planning (human must approve scope before investing in plan)
- Planning → Execution (human must approve plan before agent codes)
- Verification → Commit (human reviews staged changes before committing)

## MVP Recommendation

Prioritize:
1. **Project intake with scope validation** - Entry point; prevents wasted work on unverifiable tasks
2. **Acceptance criteria sharpening** - Quality foundation; everything downstream depends on clear criteria
3. **Codebase mapping with staleness detection** - Context accuracy determines success; drift is silent killer
4. **Phase planning with task decomposition** - Core orchestration; breaks complexity into manageable units
5. **Phase execution with deterministic tooling** - Does the actual work; needs file ops, git staging, prerequisite checks
6. **Verification against acceptance criteria** - Quality gate; report-only, stages on pass
7. **TDD integration** - Tests first → audit → implement; creates reliable feedback loop
8. **Human approval gates for destructive actions** - Trust and safety; prevents disasters
9. **Ephemeral project state** - Clean architecture; no cross-session cruft

Defer:
- **Phase-specific research** - Useful but not essential for MVP; project-level research may suffice initially
- **Parking lot / todo system** - Nice to have; can track todos in PROJECT.md notes section for MVP
- **Context window management (advanced)** - Important but can start simple; optimize when hitting limits
- **Multi-model orchestration profiles** - Can start with single quality model; add balanced/budget later
- **Separate research agents** - Can use main context for initial research; spawn subagents when proven valuable

## Scope Validation Based on Verifiability

Critical pattern for knowledge-first agent systems: assess whether request is verifiable BEFORE planning.

**Greenfield (HIGH verifiability):**
- New features with clear inputs/outputs
- Well-defined data transformations
- Explicit acceptance criteria from start
- Fresh test surface area you define

**Mechanical (HIGH verifiability):**
- File operations, renaming, moving
- Dependency updates with test coverage
- Configuration changes with validation
- Formatting, linting, obvious refactors

**Brownfield (LOW verifiability):**
- Large refactors without clear before/after states
- Performance improvements without benchmarks
- "Make it better" without specific criteria
- Touching many files with unclear coupling

**Recommendation:** Accept greenfield and mechanical scopes. For brownfield, require human to sharpen criteria until verifiable (add benchmarks, define specific metrics, narrow scope).

## Todo/Parking-Lot Patterns

Observed in coding agent tools:

**Semi-durable storage:**
- One file per todo in `.planning/todos/`
- Survives phase transitions
- Tagged by area (scope, implementation, testing, deployment)
- Each todo has: description, context, blocking/non-blocking flag

**Creation triggers:**
- Executor discovers issue outside current phase scope
- Verifier identifies gap that doesn't block current work
- Researcher flags area needing deeper investigation
- Human explicitly parks a discussion point

**Access patterns:**
- `/todo` - View all parking lot items
- Executor mentions relevant todos when planning next phase
- Human reviews and decides: address now, defer, or discard

**Lifecycle:**
- Created during any phase
- Referenced in subsequent planning
- Resolved when addressed or explicitly discarded
- Wiped when project completes (ephemeral to project, not to phase)

**Anti-patterns:**
- Don't let todos accumulate indefinitely (signals scope creep)
- Don't auto-create todos without human awareness (surprises erode trust)
- Don't block current work on non-blocking todos (kills momentum)

## Verification Patterns in Single-Commit Systems

2026 best practices for verification in scoped systems:

**Pre-execution validation:**
- Spec approved (acceptance criteria are testable)
- Constraints clear (no new paid dependencies, latency requirements)
- Non-goals explicit (prevents scope drift)
- Dependencies available (all tools/libraries accessible)

**Post-execution validation:**
- Tests pass (or documented reason for not running)
- Linting passes
- Type checking passes
- Builds successfully
- Behavior matches acceptance criteria (most critical)

**Report format:**
- Clear pass/fail per criterion
- Diagnostic information on failures
- Suggestions for fixes (but don't auto-apply)
- Files staged automatically on full pass

**Failure handling:**
- Report diagnostics
- Stop execution (no retry loops)
- Human reviews and decides: fix manually, re-plan phase, or adjust acceptance criteria

## Architecture Pattern: Deterministic Core + Reasoned Edge

Winning 2026 pattern for production agent systems:

**Deterministic core:**
- File management (read, write, glob, grep)
- Git operations (staging, SHA checks)
- Prerequisite validation (dependencies installed, tests exist)
- Tool invocation (standardized interfaces)
- State transitions (phase complete, verification pass)

**Reasoned edge:**
- Scope assessment (is this verifiable?)
- Acceptance criteria sharpening (transform vague → testable)
- Task decomposition (break project into phases)
- Implementation planning (what to build, in what order)
- Error diagnosis (what went wrong, why, what to try next)

**Rhythm:**
1. AI proposes (planning, implementation approach)
2. Deterministic checks validate (prerequisites, syntax, tests)
3. Human approves (scope, plan, destructive actions)
4. Orchestration executes (agent codes, tools stage)
5. Verification refines (check criteria, report diagnostics)

**Why this works:**
- Offload precision tasks to deterministic tools (calculations, date comparisons, structured data retrieval)
- Reserve LLM for synthesis, decision-making, adaptation
- Reduces hallucination risk (intelligent APIs vs raw data access)
- Maintains control (deterministic handles orchestration + guardrails, AI adds insights)

## Feature Complexity Drivers

**High complexity features:**
- **Codebase mapping with staleness** - Requires parallel mapper agents, SHA anchoring, structural change detection, incremental updates
- **Knowledge-first architecture** - Paradigm shift from scripts to docs; requires reference doc design, agent prompt engineering, verification that agents reason correctly
- **Task decomposition / phase planning** - Must understand dependencies, sequence correctly, handle partial failures, maintain coherence across phases
- **Context window management** - Frequent intentional compaction, hierarchical summarization, intelligent paging, utilization monitoring

**Medium complexity features:**
- **Scope validation** - Pattern matching (greenfield/mechanical/brownfield), heuristics, human feedback loop
- **Acceptance criteria sharpening** - Conversational refinement, testability assessment, example elicitation
- **TDD integration** - Test generation, red-green verification, test auditing
- **Observability** - Structured logging, trace correlation, diff formatting, commit message generation

**Low complexity features:**
- **Multi-model orchestration** - Model selection logic, API switching (existing patterns well-understood)
- **Human approval gates** - Prompt before dangerous commands, simple boolean gates
- **Tool integration** - Wrapper functions for file ops, git commands, shell execution
- **Single-commit scope enforcement** - Boundary checking, file count validation, diff size limits

## Sources

### Knowledge-First Architecture
- [How we made v0 an effective coding agent - Vercel](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent)
- [AGENTS.md outperforms skills in our agent evals - Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Context Engineering for Coding Agents - Martin Fowler](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)

### Scope Validation and Acceptance Criteria
- [2026 Agentic Coding Trends - Implementation Guide (Technical)](https://huggingface.co/blog/Svngoku/agentic-coding-trends-2026)
- [Agents At Work: The 2026 Playbook for Building Reliable Agentic Workflows](https://promptengineering.org/agents-at-work-the-2026-playbook-for-building-reliable-agentic-workflows/)
- [The Complete Guide to Agentic Coding in 2026](https://www.teamday.ai/blog/complete-guide-agentic-coding-2026)

### Verification and TDD Patterns
- [Test-Driven Development | Agentic Coding Handbook](https://tweag.github.io/agentic-coding-handbook/WORKFLOW_TDD/)
- [The Death of Traditional Testing: Agentic Development Broke a 50-Year-Old Field, JiTTesting Can Revive It - Meta Engineering](https://engineering.fb.com/2026/02/11/developer-tools/the-death-of-traditional-testing-agentic-development-jit-testing-revival/)
- [Agentic Coding · Missing Semester](https://missing.csail.mit.edu/2026/agentic-coding/)

### Codebase Mapping and Staleness
- [Writing AI coding agent context files is easy. Keeping them accurate isn't. - Packmind](https://packmind.com/evaluate-context-ai-coding-agent/)
- [Context Engineering for Coding Agents - Martin Fowler](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)

### Human-in-the-Loop Patterns
- [How to Build Transparent AI Agents: Traceable Decision-Making with Audit Trails and Human Gates - MarkTechPost](https://www.marktechpost.com/2026/02/19/how-to-build-transparent-ai-agents-traceable-decision-making-with-audit-trails-and-human-gates/)
- [Human-in-the-Loop for AI Agents: Best Practices, Frameworks, Use Cases - Permit.io](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo)
- [Human in the loop | OpenAI Agents SDK](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)

### Single-Commit Scope and Ephemeral State
- [AI Coding Agents in 2026: Coherence Through Orchestration, Not Autonomy - Mike Mason](https://mikemason.ca/writing/ai-coding-agents-jan-2026/)
- [AddyOsmani.com - My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/)

### Task Decomposition and Phase Planning
- [How to Create Task Decomposition - OneUptime](https://oneuptime.com/blog/post/2026-01-30-task-decomposition/view)
- [AI Coding Agents in 2026: Coherence Through Orchestration, Not Autonomy - Mike Mason](https://mikemason.ca/writing/ai-coding-agents-jan-2026/)
- [What is AI Agent Planning? - IBM](https://www.ibm.com/think/topics/ai-agent-planning)

### Context Window Management
- [Context Window Management: Strategies for Long-Context AI Agents and Chatbots - Maxim](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [Best LLMs for Extended Context Windows in 2026 - AIMultiple](https://aimultiple.com/ai-context-window)

### Deterministic vs Agent Reasoning
- [AI Agents and Deterministic Workflows: A Spectrum, Not a Binary Choice - deepset](https://www.deepset.ai/blog/ai-agents-and-deterministic-workflows-a-spectrum)
- [Why Agentic AI Requires a "Determinism-First" Architecture - Volt Active Data](https://www.voltactivedata.com/blog/2026/02/agentic-ai-determinism-first-architecture)
- [Beyond Deterministic Automation: Why AI Reasoning is the Future - Itential](https://www.itential.com/blog/beyond-deterministic-automation-why-ai-reasoning-is-the-future-of-infrastructure-orchestration/)

### Anti-Patterns and Anti-Features
- [AddyOsmani.com - How to write a good spec for AI agents](https://addyosmani.com/blog/good-spec/)
- [The TechBeat: Patterns That Work and Pitfalls to Avoid in AI Agent Deployment - HackerNoon](https://hackernoon.com/1-15-2026-techbeat)
- [Anti‑Patterns in Corporate AI Adoption - Teamform](https://www.teamform.co/blogs/anti-patterns-in-corporate-ai-adoption-lessons-from-real-world-experiences)

### Quality Differentiators
- [Best AI Coding Agents for 2026: Real-World Developer Reviews - Faros AI](https://www.faros.ai/blog/best-ai-coding-agents-2026)
- [5 Best AI Agents for Coding in 2026 [Tried & Tested] - Index.dev](https://www.index.dev/blog/ai-agents-for-coding)
- [Top 7 AI Coding Agents for 2026: Tested & Ranked - Lindy](https://www.lindy.ai/blog/ai-coding-agents)

### MVP and Core Features
- [The Best AI Agents in 2026: Tools, Frameworks, and Platforms Compared - DataCamp](https://www.datacamp.com/blog/best-ai-agents)
- [The Core Skills AI Practitioners Need for Agentic AI in 2026 - ODSC](https://opendatascience.com/agentic-ai-skills-2026/)
- [Agentic AI Frameworks: Top 8 Options in 2026 - Instaclustr](https://www.instaclustr.com/education/agentic-ai/agentic-ai-frameworks-top-8-options-in-2026/)
