<purpose>
Project intake workflow that transforms fuzzy ideas into verifiable PROJECT.md specifications through conversational sharpening, scope validation, and acceptance criteria definition.
</purpose>

<required_reading>
@~/.claude/get-shit-done/knowledge/project-domain.md — intake methodology, scope validation, acceptance criteria patterns
@~/.claude/get-shit-done/knowledge/AGENTS.md — agent system context
</required_reading>

<process>

## 1. Input Quality Gate

Check if this is actually a project or just a quick fix.

**Hard deflects (no override):**
- **Trivial fix** (typo, single-line bug, simple rename): "This is a quick fix — just ask me directly, no project needed."
- **Vague one-liner** (no clear outcome, no describable scope): "This isn't clear enough to plan against. Talk it through with me first."

**Proceed with sharpening:**
- **Moderate input** (describable goal, some gaps): 3-5 clarifying questions
- **Detailed input** (clear goal, mostly complete criteria): 1-3 clarifying questions

## 2. Check for Existing Project

Check if `.planning/project/` exists:

```bash
[ -d .planning/project/ ] && echo "exists" || echo "missing"
```

**If exists:**

Warn the user:
```
You have an existing project in progress: [name from PROJECT.md]. Planning artifacts will be wiped.

Staged/unstaged code changes in your working tree are untouched.

Continue? (yes/no)
```

**If yes:** Remove existing project artifacts:
```bash
rm -rf .planning/project/
```

**If no:** Stop workflow and return.

## 3. Create Project Directory

```bash
mkdir -p .planning/project/
```

## 4. Check Codebase Map Staleness

Read `.planning/codebase/tech-stack.md` if it exists (contains commit_sha in frontmatter):

```bash
[ -f .planning/codebase/tech-stack.md ] && cat .planning/codebase/tech-stack.md | head -n 10 || echo "No codebase map"
```

**If map exists:**

Extract stored SHA from frontmatter `commit_sha` field.

Get current HEAD SHA:
```bash
git rev-parse HEAD 2>/dev/null || echo "no-git"
```

**If SHAs differ:**

Warn:
```
Your codebase map is stale (anchored to different commit).

Would you like to update it before continuing? (yes/no)
```

**If yes:** Suggest running `/map` first and return. User will resume `/new-project` after map completes.

**If no:** Continue with intake.

## 5. Surface Relevant Todos

List todos from `.planning/todos/`:

```bash
ls .planning/todos/*.md 2>/dev/null || echo "No todos"
```

**If todos exist:**

Read each todo file and extract `area:` tag from frontmatter.

Match area tags against the user's project description keywords (simple string matching, not semantic AI).

**If matches found:**

Display relevant todos:
```
Relevant parking lot items:

**[area]:** [todo summary from file body]
**[area]:** [todo summary from file body]

These can be folded into this project if they fit scope, or left for later.
```

## 6. Conversational Intake

**Philosophy:** You're a thinking partner, not an interviewer. Follow energy, challenge vagueness, make abstract concrete.

**Ask open:** "What do you want to build?"

Wait for response. Based on their answer, ask follow-up questions that dig into what they said.

**Follow the thread:**
- What excited them
- What problem sparked this
- What they mean by vague terms
- What it would actually look like
- What's already decided

Use project-domain.md intake methodology:
- Challenge vagueness
- Make abstract concrete
- Surface assumptions
- Find edges
- Reveal motivation

**Context checklist (background, not conversation structure):**
- [ ] What they're building (concrete enough to explain to a stranger)
- [ ] Why it needs to exist (the problem or desire driving it)
- [ ] Who it's for (even if just themselves)
- [ ] What "done" looks like (observable outcomes)

**Be adversarial in a helpful way:**
- Poke holes in scope
- Surface edge cases
- Flag scope creep
- Efficient sharpener style: 1-2 rounds max, propose acceptance criteria quickly

**Decision gate:**

When you could write a clear PROJECT.md, ask:

```
Ready? (Create PROJECT.md / Keep exploring)
```

If "Keep exploring" — ask what they want to add, or identify gaps and probe naturally.

Loop until "Create PROJECT.md" selected.

## 7. Validate Scope

Apply verifiability heuristics from project-domain.md:

**Greenfield** — Building new where nothing exists (highly verifiable, can be larger)
**Mechanical** — Repetitive changes following single pattern (highly verifiable)
**Brownfield** — Modifying existing code (verifiability depends on interaction density and risk)

**If too broad:**

Recommend scoping down to most foundational piece.

Propose deferred items as todos:
```
This scope feels broad for a single commit. Consider:

**This project:** [foundational piece]
**Defer to todos:** [list items]

This keeps the diff reviewable in one sitting. Continue with full scope or scope down?
```

**AI proposes todos, human confirms before write** (SCOPE-03).

**If human confirms scope down:**

Create todo files for deferred items:
```bash
# Example todo creation
cat > .planning/todos/auth-roles.md << 'EOF'
---
area: authentication
created: 2026-02-22
---
Add role-based authorization to auth system after basic JWT auth is working.
EOF
```

## 8. Sharpen Acceptance Criteria

Extract observables from conversation. Make specific, cover happy and sad paths.

**Good criteria:**
- Observable from user's perspective
- Specific enough to verify against
- Measurable (can say "yes this is true" or "no it isn't")
- Complete (covers full scope of "done")

**Example sharpening:**
- "Authentication works" → "Valid credentials return 200 + JWT cookie, invalid credentials return 401"
- "Users can manage projects" → "User can create project with name/description, view project list, edit project details, delete project with confirmation"

Propose criteria to user, adjust based on feedback.

## 9. Summarize Project

Present:
- **Problem:** [What needs to happen and why]
- **Acceptance Criteria:** [Proposed list]
- **Out of Scope:** [Deferred items if any]
- **Decisions:** [Key decisions made during intake]

Ask for confirmation or adjustments.

## 10. Write PROJECT.md

**Format (plain markdown, NO frontmatter per SPEC):**

```markdown
# Project: [Short name]

## Problem
[What needs to happen and why]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Out of Scope
- [Deferred to todos if applicable]

## Decisions
- [Key decisions made during intake]
```

Write to `.planning/project/PROJECT.md` using Write tool (NEVER bash heredoc).

## 11. Handoff

Determine next step:

```bash
node ~/.claude/hooks/gsd-state-resolver.js
```

Parse the JSON result and present:
```
Project initialized!

Next: [nextCommand from resolver]
Context: [context from resolver]

<sub>`/clear` first -> fresh context window</sub>
```

Human decides next step -- no auto-advance. Present exactly ONE next step from the resolver. Do not list alternatives.

</process>

<success_criteria>
- [ ] Input quality gate applied (hard deflects for trivial fixes and vague one-liners)
- [ ] Existing project artifacts wiped with human confirmation
- [ ] Codebase map staleness checked and warned if stale
- [ ] Relevant todos surfaced by area tag matching
- [ ] Conversational intake conducted (efficient sharpener style, 1-2 rounds)
- [ ] Scope validated using greenfield/mechanical/brownfield heuristics
- [ ] Must-have/nice-to-have split enforced with todo proposals (human confirms)
- [ ] Acceptance criteria sharpened (observable, specific, measurable, complete)
- [ ] PROJECT.md written to `.planning/project/PROJECT.md` only after confirmation
- [ ] Handoff message suggests next steps without auto-advance
</success_criteria>

<output>
`.planning/project/PROJECT.md` — plain markdown, no frontmatter
</output>
