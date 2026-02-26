<purpose>
Deeper exploration of an existing PROJECT.md. This workflow enables conversational refinement of gray areas, edge cases, and implementation preferences after initial project intake.
</purpose>

<required_reading>
@~/.claude/get-shit-done/knowledge/project-domain.md — intake methodology, acceptance criteria patterns
</required_reading>

<process>

## 1. Prerequisite Check

Check if `.planning/project/PROJECT.md` exists:

```bash
[ -f .planning/project/PROJECT.md ] && echo "exists" || echo "missing"
```

**If missing:**

Soft block (not hard error):

Use AskUserQuestion:
- header: "No project"
- question: "No PROJECT.md found. Run /new-project first?"
- options:
  - "Run /new-project" -- Start project intake
  - "Cancel" -- Stop workflow

If "Run /new-project": suggest running `/new-project`. If "Cancel": stop workflow.

## 2. Load Project Context

Read `.planning/project/PROJECT.md` using Read tool.

Extract:
- Project name
- Problem statement
- Acceptance criteria
- Out of scope items
- Decisions made

## 3. Load Research Context (if exists)

Check if `.planning/project/PROJECT-RESEARCH.md` exists:

```bash
[ -f .planning/project/PROJECT-RESEARCH.md ] && echo "exists" || echo "missing"
```

**If exists:** Read research findings to reference during discussion.

## 4. Surface Relevant Todos

List todos from `.planning/todos/`:

```bash
ls .planning/todos/*.md 2>/dev/null || echo "No todos"
```

**If todos exist:**

Read each todo file and extract `area:` tag from frontmatter.

Match area tags against project keywords.

**If matches found:**

Display relevant todos:
```
Relevant parking lot items:

**[area]:** [todo summary]
**[area]:** [todo summary]

These might inform our discussion.
```

## 5. Conversational Exploration

**Focus areas:**
- **Gray areas** — Parts of PROJECT.md that are ambiguous or underspecified
- **Edge cases** — Boundary conditions, error scenarios, unusual inputs
- **Implementation preferences** — Technical choices, library preferences, architectural patterns

**Style:** Conversational, not interrogative. Build on their answers.

**Example questions:**
- "The acceptance criteria mention [X]. What should happen when [edge case]?"
- "You've deferred [Y] to out of scope. What if a user tries to [related action]?"
- "How important is [quality attribute] for this project?"
- "Research suggested [approach]. Does that fit your vision?"

**Use research findings if available:**
- Reference research recommendations
- Discuss tradeoffs between options
- Surface gotchas from research

**Track proposed changes:**
- Additional acceptance criteria
- Updated decisions
- Scope adjustments (additions or removals)
- Implementation constraints

## 6. Summarize Proposed Changes

After exploration, summarize what would change:

```
Proposed updates to PROJECT.md:

**Acceptance Criteria:**
- Add: [new criterion]
- Clarify: [existing criterion] → [sharpened version]

**Decisions:**
- Add: [new decision from discussion]

**Out of Scope:**
- Update: [item moved in/out of scope]

Use AskUserQuestion:
- header: "Apply"
- question: "Apply these changes to PROJECT.md?"
- options:
  - "Apply" -- Update PROJECT.md with these changes
  - "Adjust" -- Revise the proposed changes
  - "Cancel" -- Discard changes

**If "Apply":** Continue to update.
**If "Adjust":** Get feedback, revise summary, re-ask.
**If "Cancel":** Stop workflow, no changes made.

## 7. Check for Existing Plan

Check if `.planning/project/PROJECT-PLAN.md` exists:

```bash
[ -f .planning/project/PROJECT-PLAN.md ] && echo "exists" || echo "missing"
```

**If plan exists:**

Warn:
```
PROJECT-PLAN.md already exists. Changes to PROJECT.md may invalidate the existing plan.
```

Use AskUserQuestion:
- header: "Plan exists"
- question: "PROJECT-PLAN.md exists. Changes may invalidate it. Continue?"
- options:
  - "Continue" -- Update PROJECT.md, may need to replan
  - "Cancel" -- Keep PROJECT.md unchanged

**If "Cancel":** Stop workflow, no changes made.
**If "Continue":** Continue to update.

## 8. Update PROJECT.md

Rewrite `.planning/project/PROJECT.md` with updated content using Write tool.

**Maintain format (plain markdown, NO frontmatter):**

```markdown
# Project: [Short name]

## Problem
[Updated problem statement if changed]

## Acceptance Criteria
- [ ] [Updated/added criteria]
- [ ] [Updated/added criteria]

## Out of Scope
- [Updated deferred items]

## Decisions
- [Existing decisions]
- [New decisions from discussion]
```

## 9. Handoff

Determine next step:

```bash
node ~/.claude/hooks/gsd-state-resolver.js
```

Parse the JSON result and present:
```
PROJECT.md updated!

Next: [nextCommand from resolver]
Context: [context from resolver]

<sub>`/clear` first -> fresh context window</sub>
```

Present exactly ONE next step from the resolver. Do not list alternatives.

</process>

<success_criteria>
- [ ] PROJECT.md prerequisite checked (soft block if missing)
- [ ] PROJECT.md and PROJECT-RESEARCH.md loaded
- [ ] Relevant todos surfaced
- [ ] Conversational exploration conducted (gray areas, edge cases, preferences)
- [ ] Proposed changes summarized and confirmed
- [ ] Plan invalidation warning shown if PROJECT-PLAN.md exists
- [ ] PROJECT.md updated only after confirmation
- [ ] Handoff message suggests next steps without auto-advance
</success_criteria>

<output>
Updated `.planning/project/PROJECT.md`
</output>
