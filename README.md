<div align="center">

# GET SHIT DONE

**A simplified fork focused on single-commit projects with strong planning and verification discipline.**

**Solves context rot through fresh subagent contexts and structured planning.**

[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

<br>

*"A stripped-down, single-commit focused GSD fork. The human drives. The AI assists."*

<br>

[Why This Fork](#why-this-fork) · [How It Works](#how-it-works) · [Commands](#commands) · [Installation](#installation)

</div>

---

## Why This Fork

This is a **philosophical fork** of the original Get Shit Done. Same discipline around planning, research, and verification — different lifecycle.

**Core difference**: A "project" is **one commit's worth of work**, not a multi-milestone lifecycle. No roadmaps. No STATE.md. No auto-advance. No git commits. The human drives all transitions. The AI is a skilled pair programmer, not a project manager.

**What we kept from GSD**:
- Strong planning discipline (research, structured plans, acceptance criteria)
- Fresh subagent contexts for execution (no context rot)
- Verification against explicit criteria
- Phase-based breakdown

**What we simplified**:
- Projects are single-commit scope (typically 1-2 phases, rarely more)
- No milestones or roadmaps
- No git operations except `git add` for staging verified work
- Ephemeral planning artifacts (`.planning/project/` wiped between projects)
- Human-driven workflow (no auto-advance between steps)
- Parking lot todos instead of persistent requirements tracking

**Philosophy**: The code is the durable artifact. Planning documents are scratch work that serve the current commit and get discarded. The codebase map anchors to git commit SHAs and updates after each project.

If you want the full GSD multi-milestone project management system, use [upstream GSD](https://github.com/glittercowboy/get-shit-done). If you want focused, single-commit discipline with strong planning/verification but lighter process, this fork is for you.

---

## How It Works

### The Single-Commit Workflow

A project is one commit's worth of work. You describe what you want, the system helps you plan and implement it, verifies the result, stages it, and hands back a clean diff for you to review and commit.

> **Already have code?** Run `/map` first. It analyzes your codebase (anchored to current commit SHA) so planning commands understand your stack and conventions.

---

### 1. Define the Project

```
/new-project
```

The system asks clarifying questions until it understands your goal completely, then writes **PROJECT.md** with:
- Problem statement
- Acceptance criteria (what must be true when done)
- Out of scope items (deferred to parking lot)
- Key decisions

**Scope gate**: The system validates that the project is verifiable in a single commit. Too broad? It recommends scoping down and captures deferred work in `.planning/todos/`.

**Input quality gates**:
- Trivial fixes (typos, single-line bugs) → "Just ask me directly, no project needed"
- Vague one-liners → "Talk it through first, then run `/new-project` when you can describe what you want"
- Moderate/detailed requests → 1-5 clarifying questions to nail down acceptance criteria

---

### 2. Research (Optional)

```
/research-project
```

Strategic research when the project involves unfamiliar libraries, patterns, or architectural decisions. The researcher spawns as a subagent, investigates the domain (web search + codebase analysis), and writes **PROJECT-RESEARCH.md** with:
- Recommended stack and alternatives
- Architecture approaches
- Critical pitfalls
- Open questions

Run this before `/discuss-project` so decisions are grounded in what's actually available.

---

### 3. Discuss (Optional)

```
/discuss-project
```

Deeper exploration of gray areas, edge cases, and implementation preferences. Updates **PROJECT.md** with additional context and decisions.

---

### 4. Plan the Project

```
/plan-project
```

Breaks the project into phases (strategic breakdown). Each phase has:
- Clear outcome-shaped goal
- Mapped acceptance criteria
- Dependencies

Writes **PROJECT-PLAN.md**. Typically 1-2 phases for single-commit scope, rarely more.

**Acceptance criteria mapping**: Every criterion from PROJECT.md gets assigned to a phase. No orphans allowed.

---

### 5. Plan Each Phase

```
/discuss-phase 1   # Optional: clarify implementation decisions
/research-phase 1  # Optional: tactical research (library details, gotchas)
/plan-phase 1      # Required: detailed execution plan
```

**Phase planning produces PHASE-{N}-PLAN.md** with:
- Objective
- Context files to load
- Task breakdown with verification steps
- Must-haves (observable behaviors and required artifacts)

The phase planner is a subagent that reads PROJECT-PLAN.md, CODEBASE.md, phase context/research (if you ran the optional steps), and relevant source files.

---

### 6. Execute and Verify

```
/execute-phase 1
/verify-phase 1
```

**Execution** (`/execute-phase`):
- Fresh subagent context (no accumulated context rot)
- Implements the phase plan
- Tracks what changed, what deviated
- Updates **PROJECT-SUMMARY.md**
- Leaves all changes **unstaged**

**Verification** (`/verify-phase`):
- Separate agent checks the work against must-haves
- On pass: stages the changes via `git add`
- On fail: writes diagnostics (what failed, why, where to look)

This creates two views for you:
- `git diff` — current phase work (unstaged)
- `git diff --cached` — all verified phases (staged)

---

### 7. Repeat for Remaining Phases

```
/discuss-phase 2
/research-phase 2
/plan-phase 2
/execute-phase 2
/verify-phase 2
```

Loop through phases at your own pace. The human decides when to move forward.

---

### 8. Verify the Full Project

```
/verify-project
```

Checks the final result against all project-level acceptance criteria. Writes **PROJECT-VERIFICATION.md** with pass/fail per criterion and diagnostics for any failures.

If everything passes, review the staged diff and commit:

```bash
git diff --cached  # Review the work
git commit         # Commit when satisfied
```

The system never commits for you. You commit when ready.

---

### 9. Update Codebase Map

After committing, regenerate the map to capture what changed:

```
/map
```

The map anchors to the current commit SHA. Future projects will see updated stack knowledge and conventions.

---

## Why It Works

### Context Engineering

Every stage uses the right context at the right time:

| File | Purpose | Lifecycle |
|------|---------|-----------|
| `PROJECT.md` | Project vision and acceptance criteria | Ephemeral (wiped on `/new-project`) |
| `PROJECT-PLAN.md` | Strategic phase breakdown | Ephemeral |
| `PROJECT-SUMMARY.md` | What happened during execution | Ephemeral |
| `PROJECT-VERIFICATION.md` | Pass/fail vs acceptance criteria | Ephemeral |
| `PHASE-{N}-PLAN.md` | Detailed execution instructions | Ephemeral |
| `CODEBASE.md` | Stack, architecture, conventions (SHA-anchored) | Semi-durable (regenerate after commits) |
| `todos/*.md` | Parking lot for deferred scope | Semi-durable (human manages lifecycle) |

Size limits keep Claude's quality high. Fresh subagent contexts for research, planning, execution, and verification prevent context rot.

### Multi-Agent Orchestration

Every command spawns specialized subagents:

| Command | What Happens |
|---------|--------------|
| `/research-project` | Research agent investigates domain, writes PROJECT-RESEARCH.md |
| `/plan-project` | Planner breaks project into phases, maps acceptance criteria |
| `/plan-phase N` | Phase planner creates detailed execution plan |
| `/execute-phase N` | Executor implements in fresh 200k context, leaves work unstaged |
| `/verify-phase N` | Verifier checks must-haves, stages on pass |
| `/verify-project` | Project verifier checks final result vs all criteria |
| `/map` | Mapper analyzes codebase, anchors to commit SHA |

Your main context window stays clean. The work happens in specialized subagent contexts.

### XML Prompt Formatting

Phase plans use structured XML optimized for execution:

```xml
<task>
  <name>Create user registration endpoint</name>
  <files>app/controllers/users_controller.rb</files>
  <action>
    Add POST /users endpoint.
    Validate email format and password length (min 8 chars).
    Use bcrypt for password hashing (already in Gemfile).
    Return 201 on success, 422 on validation failure.
  </action>
  <verify>curl -X POST localhost:3000/users -d "email=test@example.com&password=testpass123" returns 201</verify>
  <done>Valid user data creates user record and returns 201</done>
</task>
```

Precise instructions. Clear verification steps. No guessing.

### Scope Validation

Two scope gates protect verifiability:

1. **Project-level** (`/new-project`): Can a human review this diff and confidently say it's correct?
2. **Plan-level** (`/plan-phase`): Plan checker validates the phase plan achieves phase goals without scope creep

When scope is too broad, the system recommends scoping down and captures deferred work in todos. You decide whether to accept the recommendation.

---

## Commands

### Project Lifecycle

| Command | Purpose |
|---------|---------|
| `/new-project` | Define project with acceptance criteria |
| `/research-project` | Strategic research (libraries, architecture, approaches) |
| `/discuss-project` | Deeper exploration of decisions and edge cases |
| `/plan-project` | Break project into phases, map acceptance criteria |
| `/verify-project` | Check final result against acceptance criteria |

### Phase Lifecycle

| Command | Purpose |
|---------|---------|
| `/discuss-phase N` | Clarify implementation decisions for phase N |
| `/research-phase N` | Tactical research (implementation details, gotchas) |
| `/plan-phase N` | Create detailed execution plan for phase N |
| `/execute-phase N` | Execute phase plan (leaves changes unstaged) |
| `/verify-phase N` | Verify must-haves, stage on pass |

### Utilities

| Command | Purpose |
|---------|---------|
| `/map` | Analyze codebase (SHA-anchored) |
| `/todo` | View parking lot items |
| `/debug` | Systematic debugging |
| `/health` | Validate `.planning/` integrity |
| `/help` | Show all commands |

---

## File Structure

All planning artifacts live in `.planning/` (gitignored):

```
.planning/
├── CODEBASE.md              # semi-durable — anchored to commit SHA
├── todos/                   # semi-durable — parking lot items
│   └── *.md
└── project/                 # ephemeral — wiped on /new-project
    ├── PROJECT.md
    ├── PROJECT-PLAN.md
    ├── PROJECT-SUMMARY.md
    ├── PROJECT-VERIFICATION.md
    ├── PROJECT-RESEARCH.md
    ├── PHASE-{N}-CONTEXT.md
    ├── PHASE-{N}-RESEARCH.md
    └── PHASE-{N}-PLAN.md
```

**Lifecycle**:
- `CODEBASE.md` and `todos/` persist across projects
- `project/` is ephemeral — `/new-project` wipes it after confirmation
- The system never touches your working tree (staged/unstaged code changes)
- The only git write operation is `git add` (by `/verify-phase` on pass)

---

## Installation

Install from a local clone of this repo:

```bash
git clone <this-repo> ~/get-shit-done
cd ~/get-shit-done
node bin/install.js --claude --global
```

This copies commands, agents, hooks, and the skill library to `~/.claude/`. To reinstall after making changes:

```bash
node bin/install.js --claude --global
```

### Recommended: Skip Permissions Mode

GSD is designed for frictionless automation. Run Claude Code with:

```bash
claude --dangerously-skip-permissions
```

> [!TIP]
> This is how GSD is intended to be used — stopping to approve `date` and `git add` repeatedly defeats the purpose.

<details>
<summary><strong>Alternative: Granular Permissions</strong></summary>

If you prefer not to use that flag, add this to your project's `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(date:*)",
      "Bash(echo:*)",
      "Bash(cat:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(wc:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(sort:*)",
      "Bash(grep:*)",
      "Bash(tr:*)",
      "Bash(git add:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git diff:*)"
    ]
  }
}
```

</details>

---

## Model Profiles

Control which Claude model each agent uses. Balance quality vs token spend.

| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (default) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |

See reference documentation for model profile details.

---

## Security

### Protecting Sensitive Files

GSD's codebase mapping commands read files to understand your project. **Protect files containing secrets** by adding them to Claude Code's deny list:

1. Open Claude Code settings (`.claude/settings.json` or global)
2. Add sensitive file patterns:

```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/secrets/*)",
      "Read(**/*credential*)",
      "Read(**/*.pem)",
      "Read(**/*.key)"
    ]
  }
}
```

This prevents Claude from reading these files entirely.

> [!IMPORTANT]
> GSD includes built-in protections against committing secrets, but defense-in-depth is best practice.

---

## Troubleshooting

**Commands not found after install?**
- Restart Claude Code to reload slash commands
- Verify files exist in `~/.claude/commands/gsd/`

**Commands not working as expected?**
- Run `/help` to verify installation
- Re-run `node bin/install.js --claude --global` to reinstall

---

## Comparison with Upstream GSD

| Feature | This Fork | Upstream GSD |
|---------|-----------|--------------|
| **Project scope** | One commit | Multi-milestone lifecycle |
| **Planning artifacts** | Ephemeral (wiped between projects) | Durable (accumulated over project lifetime) |
| **Milestones** | No concept — the commit is the milestone | Full milestone tracking with archives |
| **Roadmaps** | No roadmaps | ROADMAP.md tracks phases across milestones |
| **State tracking** | No STATE.md | STATE.md tracks decisions and blockers |
| **Git integration** | `git add` only (staging verified work) | Full git operations (commits, tags, branching) |
| **Auto-advance** | Human drives all transitions | Optional auto-advance between phases |
| **Typical phases** | 1-2 (single-commit scope) | Many (multi-milestone scope) |
| **Session continuity** | Session-agnostic (files on disk) | Resume/pause commands |
| **Workflow** | Human-driven, explicit steps | Can be automated with configuration |

**Use upstream GSD if**: You want full project management with milestones, automatic git commits, and long-running multi-phase projects.

**Use this fork if**: You want focused single-commit discipline with strong planning/verification but lighter process and explicit human control.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Claude Code is powerful. This fork makes it focused.**

Forked from [Get Shit Done](https://github.com/glittercowboy/get-shit-done) with gratitude to TÂCHES and the GSD community.

</div>
