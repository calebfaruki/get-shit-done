# Domain Pitfalls

**Domain:** Knowledge-first AI agent CLI framework migration
**Researched:** 2026-02-22

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: The Deterministic-Flexible Boundary Misplacement

**What goes wrong:** Teams misplace the split between deterministic code and knowledge docs, putting mechanical operations (file management, staleness checks) in docs where agents hallucinate logic, or putting reasoning-dependent decisions (scope assessment, phase structure) in rigid code that can't adapt to context.

**Why it happens:** [The spectrum between deterministic and agentic systems is not obvious](https://www.deepset.ai/blog/ai-agents-and-deterministic-workflows-a-spectrum). Teams default to either "everything in code" (defeating knowledge-first architecture) or "everything in docs" (causing unreliable mechanical operations). [Deterministic engines execute code-defined workflows with complete fidelity](https://arxiv.org/pdf/2508.02721), while agents dynamically direct their own processes through real-time reasoning—mixing these concerns creates unpredictable behavior.

**Consequences:** File management operations become non-deterministic (`.planning/` directory sometimes created, sometimes not). Scope validation becomes rigid (can't adapt to project nuances). [Agentic systems navigate vastly expanded decision spaces](https://www.salesforce.com/blog/deterministic-ai/?bc=OTH), and when file operations live there, every mkdir becomes probabilistic.

**Prevention:**
- **Bright-line rule:** If the operation has exactly one correct outcome for given inputs → code. If it requires contextual judgment → docs.
- **Test for determinism:** File operations, SHA comparisons, prerequisite checks, git staging, todo CRUD all have single correct answers → deterministic tooling layer.
- **Test for judgment:** "Is this project well-scoped?" requires reasoning over acceptance criteria, domain complexity, verifiability → knowledge docs.
- **Verification:** For each function/doc, ask: "Could two agents with the same inputs produce different valid outcomes?" If no → code. If yes → docs.

**Detection:**
- Agent spawns fail intermittently with "file not found" (mechanical ops in docs)
- Scope validation rejects valid edge-case projects (judgment in code)
- `git add` sometimes stages wrong files (file selection in docs)
- Prerequisite checks have false positives/negatives (validation logic in docs)

**Phase mapping:** Phase 1 (Delete dead files) and Phase 2 (Architecture foundation) must establish this boundary. All subsequent phases inherit the split. Get it wrong early, rewrite everything later.

---

### Pitfall 2: Documentation Drift and Context Degradation

**What goes wrong:** Knowledge docs start accurate, then degrade over time through drift (docs don't match reality), bloat (accumulated contradictory guidance), and staleness (outdated patterns). [50% of AGENTS.md files remain unmodified post-creation](https://arxiv.org/pdf/2511.12884) while codebases evolve, causing systematic divergence.

**Why it happens:** [The hard part isn't writing context files—it's keeping them accurate as the codebase evolves](https://packmind.com/evaluate-context-ai-coding-agent/). Developers add features without updating docs. Multiple contributors add conflicting guidance. [Documentation drift is the ongoing process of a codebase becoming out of sync with its documentation](https://gaudion.dev/blog/documentation-drift), and agent instruction files are documentation.

**Consequences:** [Degradation is uniform—the agent starts following all instructions slightly worse](https://13doots.substack.com/p/agentsmd-the-file-nobody-writes-well), skipping rules randomly, mixing conventions, hallucinating patterns. Performance degrades subtly rather than failing hard, making detection difficult. [When context exceeds 30,000 tokens, models start deteriorating significantly](https://deepwiki.com/muratcankoylan/Agent-Skills-for-Context-Engineering/2.2-context-degradation-patterns).

**Prevention:**
- **Living document discipline:** [Treat context files as living code artifacts](https://packmind.com/evaluate-context-ai-coding-agent/) requiring the same review/update rigor as production code.
- **Contradiction detection:** Add pre-commit hook scanning for conflicting guidance ("always X" vs "never X" in same doc).
- **Staleness markers:** Date-stamp patterns/examples, flag for review after 3 months.
- **Single source of truth:** Use [AGENTS.md standard](https://agents.md/) to avoid fragmentation across CLAUDE.md, .cursorrules, multiple instruction files. [Every tool except Claude Code has rallied behind AGENTS.md](https://kau.sh/blog/agents-md/).
- **Length limits:** Keep reference docs under 10,000 tokens to avoid [context degradation when tasks require more than 10 tool calls](https://deepwiki.com/muratcankoylan/Agent-Skills-for-Context-Engineering/2.2-context-degradation-patterns).

**Detection:**
- Agent generates code not following codebase patterns (drift)
- Agent output quality declines over weeks/months (degradation)
- Agent asks about features/patterns already documented (staleness)
- Contradictory commits (agent follows conflicting guidance)
- Context files exceed 20,000 tokens (bloat)

**Phase mapping:** Phase 3 (Knowledge docs) must establish maintenance discipline. Phase 7 (Testing/validation) should include doc-code alignment checks. Every phase modifying behavior should update relevant docs atomically.

---

### Pitfall 3: Big Bang Deletion Without Strangler Fig Transition

**What goes wrong:** Deleting ~55 files at once breaks working system during transition. [Trying to overhaul an application's internal codebase all at once is a recipe for failure](https://www.freecodecamp.org/news/how-to-refactor-complex-codebases/). Tests fail, edge cases surface, dependencies break, rollback becomes impossible.

**Why it happens:** Confidence in "the new architecture is better" leads to impatience. PROJECT.md says "delete dead files first," which sounds like Phase 1 = delete everything. [Refactoring large chunks carries high risk of errors at code, configuration, and infrastructure level](https://www.techtarget.com/searchcloudcomputing/tip/Application-refactoring-Best-practices-for-cloud-migrations).

**Consequences:** Working GSD installation becomes non-functional. No incremental testing. Can't validate new architecture against old behavior. [Each mistake potentially causes delays, cost escalations, and possible outages](https://www.cloudficient.com/blog/what-is-refactoring-in-cloud-migration-and-why-it-matters).

**Prevention:**
- **Strangler fig pattern:** [Gradually extract features, creating new application around existing system](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html). [A façade intercepts requests and routes to legacy or new services](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig).
- **Incremental deletion:** Delete files in categories (commands first, then workflows, then templates), validating after each wave.
- **Parallel operation period:** Keep old command names as aliases to new ones during transition (`/gsd:new-project` → `/new-project`).
- **Feature flags:** Use environment variable to toggle old vs new code paths for risky subsystems.
- **Backward compatibility:** [Isolate data migrations from code migrations, don't deploy both simultaneously](https://viktorstanchev.com/posts/how-to-break-up-a-large-code-refactor/). Ensure code supports both old and new formats before migrating data.

**Detection:**
- Test suite failure rate >20% after deletion
- Installation broken for any supported runtime (Claude Code/OpenCode/Gemini)
- Existing projects can't continue after update
- No clear rollback path

**Phase mapping:** Phase 1 should delete only truly orphaned files (no dependents). Phase 2-4 should migrate dependents to new architecture. Phase 5 deletes now-orphaned old files. Never delete and rebuild simultaneously.

---

### Pitfall 4: Subagent Context Propagation Failures

**What goes wrong:** [Orchestrators spawn subagents but fail to propagate necessary context](https://deepwiki.com/glittercowboy/get-shit-done/16-troubleshooting), causing subagents to hallucinate missing information or fail with "insufficient context" errors. [When orchestrator context usage exceeds 80%, Task() fails to spawn](https://clouatre.ca/posts/orchestrating-ai-agents-subagent-architecture/).

**Why it happens:** [Subagents are typically stateless, and the prompt sent via task tool must be self-contained](https://www.eesel.ai/blog/subagent-orchestration). Orchestrators accumulate rich context but only pass summarized/filtered subset. [If main conversation exceeds 50% of context, orchestrator is doing too much work](https://deepwiki.com/glittercowboy/get-shit-done/16-troubleshooting) instead of delegating earlier.

**Consequences:** Research agents produce shallow findings (missing project context). Planners create generic plans (missing domain specifics). Verifiers miss requirement mismatches (missing acceptance criteria). [Skills don't resolve inside Task subagents](https://github.com/glittercowboy/get-shit-done/issues/669) spawned during auto-advance chains.

**Prevention:**
- **Self-contained prompts:** [Each subagent prompt must include all necessary context](https://docs.langchain.com/oss/python/langchain/multi-agent/subagents)—no reliance on orchestrator memory.
- **Explicit handoff contracts:** Use `<files_to_read>` blocks listing required context files. GSD already does this for project researchers.
- **Context budgets:** [Claude subagents employ isolated memory spaces](https://www.cursor-ide.com/blog/claude-subagents) with orchestrator holding global memory. Track orchestrator token usage, spawn before 50% threshold.
- **Filesystem state:** [Tasks are filesystem-backed persistent state where plan lives on disk](https://agentfactory.panaversity.org/docs/General-Agents-Foundations/context-engineering/tasks-system), not in context. Use `.planning/` files as subagent inputs rather than context propagation.
- **Minimal history:** [BUILD subagent receives only the plan rather than accumulated history](https://arize.com/blog/orchestrator-worker-agents-a-practical-comparison-of-common-agent-frameworks/)—builder knows what to build, not how it was decided.

**Detection:**
- `Task()` spawn failures with "context limit exceeded"
- Subagent output quality lower than orchestrator despite same model
- Subagents ask for information orchestrator already has
- Subagents generate code contradicting project patterns
- Tool/skill resolution errors in subagents

**Phase mapping:** Phase 4 (Command handlers) and Phase 5 (Subagent spawning) must implement handoff protocols. All spawned agents should receive `<files_to_read>` blocks, never rely on prompt-only context.

---

### Pitfall 5: Scope Creep Through "Just One More Feature"

**What goes wrong:** Single-commit scope expands through incremental feature additions. "Just add error handling" → "just add retry logic" → "just add exponential backoff" → commit becomes multi-day effort defeating the architecture.

**Why it happens:** Lack of verification-based scope discipline. PROJECT.md defines single-commit scope but doesn't enforce it mechanically. Developers underestimate compound complexity—each addition seems small in isolation.

**Consequences:** "Simple" projects take multiple sessions. Working tree stays dirty for days. Can't verify completion (scope undefined). Defeats core value proposition: "one commit's worth of work."

**Prevention:**
- **Acceptance criteria gatekeeping:** `/new-project` must produce must-have/nice-to-have split with verifiable criteria. Reject vague goals ("improve performance" → "reduce query time to <100ms, measured by benchmark X").
- **Greenfield/mechanical/brownfield heuristics:** [Verifiability-based scope warnings](https://www.philschmid.de/context-engineering-part-2)—greenfield (high verifiability), mechanical (medium), brownfield refactoring (low, needs deeper scoping).
- **Nice-to-have parking lot:** Automatically create todos from nice-to-have items instead of scope expansion mid-project.
- **Phase plan size limits:** Planner should warn if plan exceeds 5 phases or 15 steps (signals over-scoped project).
- **Time-based checkpoints:** After 2 hours execution, stop and verify scope creep before continuing.

**Detection:**
- PROJECT.md acceptance criteria expand during execution
- Phase count increases after planning completes
- Nice-to-have items migrate to must-have without explicit decision
- Working tree stays modified >4 hours
- Verifier reports "new requirements not in original PROJECT.md"

**Phase mapping:** Phase 2 (`/new-project`) must implement hard scope validation. Phase 6 (`/verify-project`) should reject scope creep (fail if verifying items not in original acceptance criteria).

---

### Pitfall 6: Test Breakage During Refactoring Without Safety Net

**What goes wrong:** [Refactoring large portions of working codebase breaks tests](https://www.effective-software-testing.com/do-unit-tests-make-refactoring-harder/), but no pre-refactoring baseline exists to validate behavior preservation. [The refactoring-testing deadlock: automated testing is necessary for rewriting, but it's difficult to get good testing without rewriting implementation](https://madewithlove.com/blog/refactoring-untestable-code-towards-testability/).

**Why it happens:** PROJECT.md Constraints say "Must not break existing test suite during transition," but CONCERNS.md shows extensive test coverage gaps (Windows path handling, Gemini CLI, OpenCode permissions, executor continuation, requirement orphan detection). Teams refactor untested code assuming "it works now" equals "tests exist."

**Consequences:** Refactored code passes new tests but breaks production edge cases. No way to verify behavior equivalence. [Breaking tests are not always bad—tests that break when something changes help you revisit propagation points](https://www.effective-software-testing.com/do-unit-tests-make-refactoring-harder/), but only if tests exist.

**Prevention:**
- **Characterization testing first:** Before refactoring, [write tests for existing code to ensure functionality won't be broken](https://www.linkedin.com/advice/0/how-do-you-refactor-your-code-improve-testability). Capture current behavior even if implementation is ugly.
- **Incremental refactoring:** [Refactor in small, manageable increments rather than massive restructures](https://www.linkedin.com/advice/3/how-do-you-test-measure-impact-refactoring). Frequent small changes make validation easier.
- **Test-first for gaps:** CONCERNS.md lists untested areas—Phase 0 should write tests for Windows paths, Gemini conversion, OpenCode permissions before touching those files.
- **Behavior snapshots:** For complex subsystems (installer, phase workflow state machine), generate behavior snapshots (input → output mappings) before refactoring, validate after.
- **Red-green discipline:** [Apply refactoring, run tests; if they fail, undo and try again](https://developer20.com/refactoring-for-better-testability/).

**Detection:**
- Production failures after deployment that tests didn't catch
- "It worked before" debugging sessions
- Test coverage decreasing during refactoring
- Inability to explain what behavior changed vs what's preserved
- Rollback required after merge

**Phase mapping:** Phase 0 (pre-migration) should add characterization tests for fragile areas from CONCERNS.md. Every refactoring phase must maintain test coverage ≥ baseline. Phase 7 validates coverage hasn't regressed.

---

## Moderate Pitfalls

Painful but recoverable mistakes.

### Pitfall 7: Git Staging Failures in Verifier

**What goes wrong:** `/verify-phase N` is supposed to stage files on pass, but fails due to untracked files in `.planning/`, merge conflicts, or files outside `.planning/` accidentally staged.

**Why it happens:** Verifier is report-only (no gap-closure loop) but now has side effect (staging). [Working tree safety constraint](https://www.josys.com/article/understanding-the-lifecycle-of-configuration-drift-detection-remediation-and-prevention) says "never commit, reset, checkout, stash, or discard working tree content," but `git add .planning/` could accidentally stage `.planning/.gitignore` or other files.

**Consequences:** User runs `/verify-phase 1`, sees "PASS," expects clean staging, finds wrong files staged or staging failed silently. Manual cleanup required.

**Prevention:**
- **Explicit file staging:** `git add` specific files from SUMMARY.md manifest, never `git add .planning/` glob.
- **Staging verification:** After `git add`, run `git diff --cached --name-only`, verify all staged files are in `.planning/project/` or `.planning/todos/`.
- **Dry-run reporting:** Before staging, report "Will stage: [list]" and require user confirmation.
- **Unstaged check:** Fail if working tree has unstaged changes outside `.planning/` (signals scope creep).

**Detection:**
- `git status` shows staged files outside `.planning/`
- Verifier reports PASS but staging failed
- Commit includes working tree changes unrelated to project
- User surprise at what's staged

**Phase mapping:** Phase 6 (`/verify-phase N`) must implement safe staging with verification. Should be added to testing/validation phase.

---

### Pitfall 8: YAML Frontmatter Corruption

**What goes wrong:** [YAML frontmatter parsing may silently corrupt quoted strings in plan metadata](https://www.josys.com/article/understanding-the-lifecycle-of-configuration-drift-detection-remediation-and-prevention), especially with apostrophes, quotes, multiline values, or special characters.

**Why it happens:** CONCERNS.md: "Manual regex-based parsing, no schema validation, inconsistent behavior across agents." PROJECT.md strips `gsd-tools.cjs` which had centralized frontmatter handling, pushing parsing back to agents.

**Consequences:** Phase plans have corrupted must_haves, planners can't parse previous summaries, verifiers miss requirements. Silent corruption—no error, just wrong data.

**Prevention:**
- **Schema validation:** Every agent writing frontmatter should validate against JSON schema before writing.
- **Escape testing:** Test plans with apostrophes, quotes, multiline descriptions, YAML reserved characters.
- **Centralized parsing:** Even without `gsd-tools.cjs`, create shared utility in deterministic layer for frontmatter get/set/validate.
- **Fail loud:** Parsing errors should fail hard (block agent) rather than silent corruption.

**Detection:**
- Plans with malformed frontmatter that agents can't parse
- Must-have items disappearing or changing unexpectedly
- Verifier missing requirements that exist in PROJECT.md
- Quotes/apostrophes appearing escaped in rendered output

**Phase mapping:** Phase 3 (Knowledge docs) should document frontmatter format requirements. Phase 5 (modified planner/verifier) must implement validation. Phase 7 tests edge cases.

---

### Pitfall 9: Model Profile Misconfiguration

**What goes wrong:** [Model profile may reference a model not available in Claude Code subscription](https://deepwiki.com/glittercowboy/get-shit-done/16-troubleshooting), causing all subagent spawns to fail.

**Why it happens:** `resolve-model` tooling survives the fork but loses config.json validation. Users set `CLAUDE_MODEL=opus-4` but subscription only has Sonnet.

**Consequences:** Every `/plan-project`, `/research-project`, `/verify-phase` fails immediately. User thinks system is broken.

**Prevention:**
- **Model availability check:** `resolve-model` should validate model against Claude Code API before returning.
- **Graceful degradation:** If requested model unavailable, fall back to Sonnet with warning.
- **Clear error messages:** "Model opus-4-6 not available in subscription. Available: sonnet-4-5, haiku-4. Set CLAUDE_MODEL or use default."
- **Startup validation:** Command handlers should validate model profile before spawning agents.

**Detection:**
- All subagent spawns fail with "model not found"
- Task() tool errors consistently
- Error messages mention model names

**Phase mapping:** Phase 4 (Command handlers) should implement model validation. `resolve-model` enhancement belongs in Phase 2 (deterministic tooling).

---

### Pitfall 10: Ephemeral Directory Wiping Data Loss

**What goes wrong:** `.planning/project/` is ephemeral and wiped on `/new-project`, but user had valuable research/plans they wanted to preserve.

**Why it happens:** PROJECT.md design: "Ephemeral project directory wiped on new project." But no warning, no archive, immediate deletion.

**Consequences:** User runs `/new-project` forgetting about valuable content, loses hours of work.

**Prevention:**
- **Archive before wipe:** Move `.planning/project/` to `.planning/archive/project-$(date +%s)/` before wiping.
- **Dirty check:** If `.planning/project/` has uncommitted content, warn and require `--force`.
- **Confirmation prompt:** "`.planning/project/` exists. Archive and start fresh? (y/N)"
- **Grace period:** Keep last 3 archived projects, delete older automatically.

**Detection:**
- User complaint about lost work
- `.planning/project/` empty but user expected content
- Repeated manual recreation of research

**Phase mapping:** Phase 4 (`/new-project` handler) must implement archive-before-wipe. Should be in safety/validation phase.

---

## Minor Pitfalls

Inconveniences, easily fixed.

### Pitfall 11: Todo Area Tag Fragmentation

**What goes wrong:** Todos have area tags but no validation, leading to typos (`backlgo` instead of `backlog`) and proliferation of near-duplicate tags.

**Why it happens:** PROJECT.md: "Todo system semi-durable, area-tagged, one file per todo." But no tag registry, no autocomplete, no validation.

**Consequences:** `/todo` output fragmented across typo variants. Search doesn't find all relevant items. Cleanup burden.

**Prevention:**
- **Tag registry:** Maintain `.planning/todos/.tags` with known areas.
- **Validation:** `/todo add` suggests closest match if tag not in registry.
- **Autocomplete:** Command completion shows registered tags.
- **Tag cleanup:** `/todo tags` shows usage counts, offers to merge variants.

**Detection:**
- Similar tag names (`backlog`, `backlgo`, `back-log`)
- Tags with single use
- User asks "which tag should I use?"

**Phase mapping:** Phase 5 (Todo system) should implement tag validation.

---

### Pitfall 12: Stale Codebase Map with SHA Drift

**What goes wrong:** Codebase map anchored to commit SHA, but codebase advances, map becomes stale, agents use outdated understanding.

**Why it happens:** PROJECT.md: "Codebase map anchored to commit SHA with staleness detection." Detection exists, but what happens when stale? Auto-regenerate or warn?

**Consequences:** Agents reference files that moved, use outdated patterns, miss new utilities.

**Prevention:**
- **Staleness threshold:** If HEAD SHA differs from map SHA, warn on every command.
- **Auto-regenerate trigger:** After 10 commits divergence, auto-trigger `/map` with user confirmation.
- **Command integration:** `/new-project`, `/plan-project` check staleness before proceeding.
- **Map age display:** Show "Map current (0 commits behind)" vs "Map stale (15 commits behind)".

**Detection:**
- Agents reference non-existent files
- Agents miss newly added utilities
- Map SHA doesn't match `git rev-parse HEAD`

**Phase mapping:** Phase 4 (`/map` command) must implement staleness checks and warnings.

---

### Pitfall 13: Command Namespace Confusion During Transition

**What goes wrong:** PROJECT.md says strip `gsd:` prefix, but transition period has both `/gsd:new-project` and `/new-project` coexisting, causing confusion and accidental double-execution.

**Why it happens:** Strangler fig pattern keeps both during migration but no clear guidance on which to use.

**Consequences:** User runs `/gsd:new-project`, it fails (deleted), tries `/new-project`, now confused about which commands exist.

**Prevention:**
- **Deprecation warnings:** Old commands print "Use /new-project instead" and exit.
- **Alias period:** Old commands work as aliases during transition (1-2 versions).
- **Clear cut-over:** Version N-1 has both, version N removes old, release notes document.
- **Help text:** `/help` shows only new commands, deprecation notice at top.

**Detection:**
- User reports "command not found"
- Users ask which commands are current
- Mix of old/new commands in documentation

**Phase mapping:** Should be addressed in migration documentation, not code. Transition strategy belongs in Phase 1 plan.

---

## Phase-Specific Warnings

Pitfalls likely to emerge during specific phases.

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Delete dead files | Big bang deletion (Pitfall 3) | Incremental deletion by category, validate after each wave |
| Phase 2: Architecture foundation | Deterministic-flexible boundary misplacement (Pitfall 1) | Document bright-line rule, validate with examples |
| Phase 3: Knowledge docs | Documentation drift begins (Pitfall 2) | Establish living document discipline, staleness markers |
| Phase 4: Command handlers | Model profile misconfiguration (Pitfall 9) | Validate model availability before subagent spawn |
| Phase 5: Subagent spawning | Context propagation failures (Pitfall 4) | Self-contained prompts, `<files_to_read>` blocks |
| Phase 6: Modified verifier | Git staging failures (Pitfall 7) | Explicit file lists, verify staged files before reporting |
| Phase 7: Testing/validation | Test coverage gaps exposed (Pitfall 6) | Write characterization tests before refactoring fragile areas |
| Multi-phase risk | Scope creep (Pitfall 5) | Acceptance criteria gatekeeping, nice-to-have parking lot |
| Multi-phase risk | YAML frontmatter corruption (Pitfall 8) | Centralized parsing utility, schema validation |

---

## Research Confidence

| Area | Confidence | Evidence |
|------|-----------|----------|
| Deterministic vs knowledge docs split | HIGH | Multiple authoritative sources (Salesforce, Microsoft, deepset, arXiv) + architectural patterns align with PROJECT.md design |
| Documentation drift patterns | HIGH | Empirical study of 2,303 context files (arXiv 2511.12884) + practitioner experience (packmind, 13doots) |
| Refactoring risks | MEDIUM | Industry best practices (AWS, Microsoft, FreeCodecamp) but not agent-specific |
| Subagent context propagation | HIGH | Direct GSD troubleshooting docs + multi-framework comparison (LangChain, Composio, Arize) |
| Scope creep prevention | MEDIUM | General software engineering + PROJECT.md constraints, but single-commit scope is novel pattern |
| Test breakage mitigation | MEDIUM | Standard refactoring practices, apply to agent framework context |
| Git staging failures | LOW | Inferred from PROJECT.md constraints + git behavior, no direct sources |
| YAML frontmatter corruption | MEDIUM | CONCERNS.md evidence + general YAML fragility knowledge |
| Model profile misconfiguration | HIGH | Direct GSD troubleshooting documentation |
| Ephemeral directory data loss | MEDIUM | Inferred from PROJECT.md design, common UX anti-pattern |
| Minor pitfalls | LOW-MEDIUM | Logical extensions of architecture decisions, limited external validation |

---

## Sources

**Agent Framework Architecture:**
- [AI Agents and Deterministic Workflows: A Spectrum, Not a Binary Choice | deepset Blog](https://www.deepset.ai/blog/ai-agents-and-deterministic-workflows-a-spectrum)
- [Not All AI Agent Use Cases Are Created Equal: When to Script, When to Set Free](https://www.salesforce.com/blog/deterministic-ai/?bc=OTH)
- [Blueprint First, Model Second: A Framework for Deterministic LLM Workflow](https://arxiv.org/pdf/2508.02721)
- [Beyond Probability: The Case for Deterministic Agents in Agentic AI](https://rainbird.ai/the-case-for-deterministic-agents-in-agentic-ai/)

**Documentation Drift:**
- [Agent READMEs: An Empirical Study of Context Files for Agentic Coding](https://arxiv.org/pdf/2511.12884)
- [AGENTS.md: The File Nobody Writes Well (And How It Destroys Your Agent's Output)](https://13doots.substack.com/p/agentsmd-the-file-nobody-writes-well)
- [Writing AI coding agent context files is easy. Keeping them accurate isn't.](https://packmind.com/evaluate-context-ai-coding-agent/)
- [Context Degradation Patterns | Agent-Skills-for-Context-Engineering](https://deepwiki.com/muratcankoylan/Agent-Skills-for-Context-Engineering/2.2-context-degradation-patterns)
- [What is Documentation Drift and How to Avoid It?](https://gaudion.dev/blog/documentation-drift)

**AGENTS.md Standards:**
- [Keep your AGENTS.md in sync — One Source of Truth for AI Instructions](https://kau.sh/blog/agents-md/)
- [AGENTS.md](https://agents.md/)

**Refactoring Migration:**
- [How to Refactor Complex Codebases – A Practical Guide for Devs](https://www.freecodecamp.org/news/how-to-refactor-complex-codebases/)
- [How to break up a large code refactor | Blog](https://viktorstanchev.com/posts/how-to-break-up-a-large-code-refactor/)
- [Strangler fig pattern - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html)
- [Strangler Fig Pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)

**Testing During Refactoring:**
- [Do unit tests make refactoring harder?](https://www.effective-software-testing.com/do-unit-tests-make-refactoring-harder)
- [Refactoring towards testability](https://madewithlove.com/blog/refactoring-untestable-code-towards-testability/)
- [Refactoring for better testability · Developer 2.0](https://developer20.com/refactoring-for-better-testability/)

**Subagent Orchestration:**
- [Troubleshooting | glittercowboy/get-shit-done](https://deepwiki.com/glittercowboy/get-shit-done/16-troubleshooting)
- [Orchestrating AI Agents: A Subagent Architecture for Code](https://clouatre.ca/posts/orchestrating-ai-agents-subagent-architecture/)
- [Subagent orchestration: The complete 2025 guide for AI workflows](https://www.eesel.ai/blog/subagent-orchestration)
- [Orchestrator-Worker Agents: A Practical Comparison](https://arize.com/blog/orchestrator-worker-agents-a-practical-comparison-of-common-agent-frameworks/)
- [Claude Subagents: The Complete Guide to Multi-Agent AI Systems](https://www.cursor-ide.com/blog/claude-subagents)
- [Subagents - Docs by LangChain](https://docs.langchain.com/oss/python/langchain/multi-agent/subagents)

**State Management:**
- [The Tasks System: Persistent State for Context Management | Agent Factory](https://agentfactory.panaversity.org/docs/General-Agents-Foundations/context-engineering/tasks-system)
- [Ephemeral Context | Graphlit Agent Memory Glossary](https://www.graphlit.com/glossary/ephemeral-context)
- [Introducing Sub-agents](https://www.vectara.com/blog/introducing-sub-agents)

---

*Research completed: 2026-02-22*
*Domain: Knowledge-first AI agent CLI framework migration*
*Confidence: HIGH for critical pitfalls, MEDIUM for moderate, LOW-MEDIUM for minor*
