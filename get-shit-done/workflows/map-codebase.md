<purpose>
Orchestrate parallel codebase mapper agents to analyze codebase and produce a single structured document in .planning/CODEBASE.md

Each agent has fresh context and explores a specific focus area, returning structured findings. The orchestrator consolidates findings into a single codebase map anchored to the current git commit SHA.

Output: .planning/CODEBASE.md (single file, semi-durable, commit SHA anchored)
</purpose>

<philosophy>
**Why dedicated mapper agents:**
- Fresh context per domain (no token contamination)
- Agents write documents directly (no context transfer back to orchestrator)
- Orchestrator only summarizes what was created (minimal context usage)
- Faster execution (agents run simultaneously)

**Document quality over length:**
Include enough detail to be useful as reference. Prioritize practical examples (especially code patterns) over arbitrary brevity.

**Always include file paths:**
Documents are reference material for Claude when planning/executing. Always include actual file paths formatted with backticks: `src/services/user.ts`.
</philosophy>

<process>

<step name="init_context" priority="first">
Get current git commit SHA for anchoring the codebase map:

```bash
CURRENT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
MAPPER_MODEL="sonnet"  # Default model for codebase mapping
```
</step>

<step name="check_existing">
Check if .planning/CODEBASE.md already exists:

```bash
test -f .planning/CODEBASE.md && echo "exists" || echo "not found"
```

**If exists:**
Read the file and extract the stored commit SHA from the frontmatter.

Compare stored SHA against CURRENT_SHA:
- If they match: Map is fresh (anchored to same commit)
- If they diverge: Map is stale (codebase changed since mapping)

```
.planning/CODEBASE.md exists (anchored to commit [stored_sha]).

Current HEAD: [current_sha]
Status: [Fresh/Stale - [N] commits ahead]

What's next?
1. Refresh - Regenerate codebase map
2. Skip - Use existing codebase map as-is
```

Wait for user response.

If "Refresh": Continue to create_structure
If "Skip": Exit workflow

**If doesn't exist:**
Continue to create_structure.
</step>

<step name="create_structure">
Create .planning/ directory if needed:

```bash
mkdir -p .planning
```

**Expected output:** Single consolidated file .planning/CODEBASE.md with sections for:
- Tech stack and integrations
- Architecture and structure
- Conventions and testing
- Concerns and technical debt

Continue to spawn_agents.
</step>

<step name="spawn_agents">
Spawn 4 parallel gsd-codebase-mapper agents.

Use Task tool with `subagent_type="gsd-codebase-mapper"`, `model="{mapper_model}"`, and `run_in_background=true` for parallel execution.

**CRITICAL:** Use the dedicated `gsd-codebase-mapper` agent, NOT `Explore`. The mapper agent analyzes and returns findings.

**Agent 1: Tech Focus**

```
Task(
  subagent_type="gsd-codebase-mapper",
  model="{mapper_model}",
  run_in_background=true,
  description="Map codebase tech stack",
  prompt="Focus: tech

Analyze this codebase for technology stack and external integrations.

Report findings for:
- Tech stack - Languages, runtime, frameworks, dependencies, configuration
- Integrations - External APIs, databases, auth providers, webhooks

Explore thoroughly. Return structured markdown sections with your findings. Do NOT write any files — orchestrator consolidates into CODEBASE.md."
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

Analyze this codebase architecture and directory structure.

Report findings for:
- Architecture - Pattern, layers, data flow, abstractions, entry points
- Structure - Directory layout, key locations, naming conventions

Explore thoroughly. Return structured markdown sections with your findings. Do NOT write any files — orchestrator consolidates into CODEBASE.md."
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

Analyze this codebase for coding conventions and testing patterns.

Report findings for:
- Conventions - Code style, naming, patterns, error handling
- Testing - Framework, structure, mocking, coverage

Explore thoroughly. Return structured markdown sections with your findings. Do NOT write any files — orchestrator consolidates into CODEBASE.md."
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

Analyze this codebase for technical debt, known issues, and areas of concern.

Report findings for:
- Concerns - Tech debt, bugs, security, performance, fragile areas

Explore thoroughly. Return structured markdown sections with your findings. Do NOT write any files — orchestrator consolidates into CODEBASE.md."
)
```

Continue to collect_confirmations.
</step>

<step name="collect_confirmations">
Wait for all 4 agents to complete.

Read each agent's output file to collect findings.

**Expected format from each agent:**
Structured markdown sections matching the agent's focus area (e.g., `## Tech Stack`, `## Architecture`, etc.).

Collect all agent findings for consolidation into single CODEBASE.md file.

If any agent failed, note the failure and continue with successful findings.

Continue to write_codebase_map.
</step>

<step name="write_codebase_map">
Consolidate all agent findings into a single .planning/CODEBASE.md file.

**File structure:**
```markdown
---
commit_sha: {CURRENT_SHA}
generated: {timestamp}
---

# Codebase Map

[Consolidated findings from all 4 agents, organized into coherent sections]

## Tech Stack
[Agent 1 tech findings]

## Integrations
[Agent 1 integration findings]

## Architecture
[Agent 2 architecture findings]

## Structure
[Agent 2 structure findings]

## Conventions
[Agent 3 convention findings]

## Testing
[Agent 3 testing findings]

## Concerns
[Agent 4 concerns findings]
```

Write the consolidated file.

Continue to verify_output.
</step>

<step name="verify_output">
Verify CODEBASE.md created successfully:

```bash
test -f .planning/CODEBASE.md && wc -l .planning/CODEBASE.md || echo "File missing"
```

**Verification checklist:**
- File exists
- Not empty (should have >50 lines)
- Contains commit SHA in frontmatter

Continue to scan_for_secrets.
</step>

<step name="scan_for_secrets">
**CRITICAL SECURITY CHECK:** Scan output file for accidentally leaked secrets.

Run secret pattern detection:

```bash
# Check for common API key patterns in generated docs
grep -E '(sk-[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_-]+|AKIA[A-Z0-9]{16}|xox[baprs]-[a-zA-Z0-9-]+|-----BEGIN.*PRIVATE KEY|eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.)' .planning/CODEBASE.md 2>/dev/null && SECRETS_FOUND=true || SECRETS_FOUND=false
```

**If SECRETS_FOUND=true:**

```
⚠️  SECURITY ALERT: Potential secrets detected in codebase document!

Found patterns that look like API keys or tokens.

This would expose credentials if committed.

**Action required:**
1. Review the flagged content above
2. If these are real secrets, they must be removed
3. Consider adding sensitive files to Claude Code "Deny" permissions

Pausing. Reply "safe to proceed" if the flagged content is not actually sensitive, or edit the file first.
```

Wait for user confirmation before continuing to offer_next.

**If SECRETS_FOUND=false:**

Continue to offer_next.
</step>

<step name="offer_next">
Present completion summary and next steps.

**Get line count and commit SHA:**
```bash
wc -l .planning/CODEBASE.md
head -3 .planning/CODEBASE.md | grep commit
```

**Output format:**

```
Codebase mapping complete.

Created .planning/CODEBASE.md ([N] lines)
Anchored to commit: [SHA]

---

## ▶ Next Up

**Initialize project** — use codebase context for planning

`/new-project`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Re-run mapping: `/map`
- Review codebase map: `cat .planning/CODEBASE.md`
- Edit before proceeding

---
```

End workflow.
</step>

</process>

<success_criteria>
- .planning/ directory created
- 4 parallel gsd-codebase-mapper agents spawned with run_in_background=true
- Agent findings collected and consolidated by orchestrator
- Single CODEBASE.md file created with commit SHA in frontmatter
- Clear completion summary with line count and commit reference
- User offered clear next steps
</success_criteria>
