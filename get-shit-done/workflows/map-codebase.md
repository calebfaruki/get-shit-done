<purpose>
Orchestrate parallel codebase mapper agents to analyze codebase and produce 4 specialized files in .planning/codebase/

Each agent has fresh context, explores a specific focus area, and writes its file directly. No consolidation step needed.

Output: .planning/codebase/ directory with 4 topic-specific files (architecture.md, conventions.md, tech-stack.md, concerns.md), each with its own commit_sha in YAML frontmatter
</purpose>

<philosophy>
**Why dedicated mapper agents:**
- Fresh context per domain (no token contamination)
- Agents write files directly (no context transfer back to orchestrator)
- Faster execution (agents run simultaneously)

**Document quality over length:**
Include enough detail to be useful as reference. Prioritize practical examples (especially code patterns) over arbitrary brevity.

**Always include file paths:**
Documents are reference material for Claude when planning/executing. Always include actual file paths formatted with backticks: `src/services/user.ts`.
</philosophy>

<process>

<step name="init_context" priority="first">
Get current git commit SHA for anchoring the codebase files:

```bash
CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
MAPPER_MODEL="sonnet"  # Default model for codebase mapping
```
</step>

<step name="check_existing">
Check if .planning/codebase/ directory and its files already exist:

```bash
test -d .planning/codebase && ls .planning/codebase/*.md 2>/dev/null || echo "not found"
```

**If files exist:**
Read any existing file and extract the stored commit SHA from its frontmatter.

Compare stored SHA against CURRENT_SHA:
- If they match: Map is fresh (anchored to same commit)
- If they diverge: Map is stale (codebase changed since mapping)

```
.planning/codebase/ files exist (anchored to commit [stored_sha]).

Current HEAD: [current_sha]
Status: [Fresh/Stale - [N] commits ahead]

What's next?
1. Refresh - Regenerate codebase files
2. Skip - Use existing codebase files as-is
```

Wait for user response.

If "Refresh": Continue to create_structure
If "Skip": Exit workflow

**If doesn't exist:**
Continue to create_structure.
</step>

<step name="create_structure">
Create .planning/codebase/ directory:

```bash
mkdir -p .planning/codebase
```

**Expected output:** 4 files in .planning/codebase/:
- architecture.md - Architecture and structure
- conventions.md - Conventions and testing
- tech-stack.md - Tech stack and integrations
- concerns.md - Concerns and technical debt

Continue to spawn_agents.
</step>

<step name="spawn_agents">
Spawn 4 parallel gsd-codebase-mapper agents.

Use Task tool with `subagent_type="gsd-codebase-mapper"`, `model="{mapper_model}"`, and `run_in_background=true` for parallel execution.

**CRITICAL:** Use the dedicated `gsd-codebase-mapper` agent, NOT `Explore`. The mapper agent analyzes and writes its file directly.

**Agent 1: Tech Focus**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="Map codebase tech stack",
  prompt="Focus: tech
Commit SHA: {CURRENT_SHA}
Output file: .planning/codebase/tech-stack.md

Analyze this codebase for technology stack and external integrations.

Report findings for:
- Tech stack - Languages, runtime, frameworks, dependencies, configuration
- Integrations - External APIs, databases, auth providers, webhooks

Explore thoroughly. Write your findings directly to .planning/codebase/tech-stack.md with commit_sha in YAML frontmatter."
)
```

**Agent 2: Architecture Focus**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="Map codebase architecture",
  prompt="Focus: arch
Commit SHA: {CURRENT_SHA}
Output file: .planning/codebase/architecture.md

Analyze this codebase architecture and directory structure.

Report findings for:
- Architecture - Pattern, layers, data flow, abstractions, entry points
- Structure - Directory layout, key locations, naming conventions

Explore thoroughly. Write your findings directly to .planning/codebase/architecture.md with commit_sha in YAML frontmatter."
)
```

**Agent 3: Quality Focus**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="Map codebase conventions",
  prompt="Focus: quality
Commit SHA: {CURRENT_SHA}
Output file: .planning/codebase/conventions.md

Analyze this codebase for coding conventions and testing patterns.

Report findings for:
- Conventions - Code style, naming, patterns, error handling
- Testing - Framework, structure, mocking, coverage

Explore thoroughly. Write your findings directly to .planning/codebase/conventions.md with commit_sha in YAML frontmatter."
)
```

**Agent 4: Concerns Focus**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="Map codebase concerns",
  prompt="Focus: concerns
Commit SHA: {CURRENT_SHA}
Output file: .planning/codebase/concerns.md

Analyze this codebase for technical debt, known issues, and areas of concern.

Report findings for:
- Concerns - Tech debt, bugs, security, performance, fragile areas

Explore thoroughly. Write your findings directly to .planning/codebase/concerns.md with commit_sha in YAML frontmatter."
)
```

Continue to collect_confirmations.
</step>

<step name="collect_confirmations">
Wait for all 4 agents to complete.

Verify that each of the 4 files exists in `.planning/codebase/`:
- `.planning/codebase/tech-stack.md`
- `.planning/codebase/architecture.md`
- `.planning/codebase/conventions.md`
- `.planning/codebase/concerns.md`

If any agent failed, note the failure and report to the user.

Continue to verify_output.
</step>

<step name="verify_output">
Verify all 4 codebase files created successfully:

```bash
ls -la .planning/codebase/
head -3 .planning/codebase/*.md
wc -l .planning/codebase/*.md
```

**Verification checklist:**
- All 4 files exist (architecture.md, conventions.md, tech-stack.md, concerns.md)
- None are empty (each should have >20 lines)
- Each contains commit_sha in frontmatter

Continue to scan_for_secrets.
</step>

<step name="scan_for_secrets">
**CRITICAL SECURITY CHECK:** Scan output files for accidentally leaked secrets.

Run secret pattern detection:

```bash
# Check for common API key patterns in generated docs
grep -E '(sk-[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]+|AKIA[A-Z0-9]{16}|xox[baprs]-[a-zA-Z0-9-]+|-----BEGIN.*PRIVATE KEY|eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.)' .planning/codebase/*.md 2>/dev/null && SECRETS_FOUND=true || SECRETS_FOUND=false
```

**If SECRETS_FOUND=true:**

```
⚠️  SECURITY ALERT: Potential secrets detected in codebase files!

Found patterns that look like API keys or tokens.

This would expose credentials if committed.

**Action required:**
1. Review the flagged content above
2. If these are real secrets, they must be removed
3. Consider adding sensitive files to Claude Code "Deny" permissions

Pausing. Reply "safe to proceed" if the flagged content is not actually sensitive, or edit the files first.
```

Wait for user confirmation before continuing to offer_next.

**If SECRETS_FOUND=false:**

Continue to offer_next.
</step>

<step name="offer_next">
Present completion summary and next steps.

**Get line counts and commit SHA:**
```bash
wc -l .planning/codebase/*.md
head -3 .planning/codebase/tech-stack.md | grep commit
```

**Output format:**

```
Codebase mapping complete.

Created .planning/codebase/ files:
- architecture.md ([N] lines)
- conventions.md ([N] lines)
- tech-stack.md ([N] lines)
- concerns.md ([N] lines)

Anchored to commit: [SHA]

---

## ▶ Next Up

**Initialize project** — use codebase context for planning

`/new-project`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Re-run mapping: `/map`
- Review codebase files: `ls .planning/codebase/`
- Edit before proceeding

---
```

End workflow.
</step>

</process>

<success_criteria>
- .planning/codebase/ directory created
- 4 parallel gsd-codebase-mapper agents spawned with run_in_background=true
- Each agent writes its file directly (no consolidation step)
- 4 files created in .planning/codebase/, each with commit_sha in frontmatter
- Clear completion summary with line counts and commit reference
- User offered clear next steps
</success_criteria>
