# Planner Subagent Prompt Template

Template for spawning gsd-planner agent. The agent contains all planning expertise - this template provides planning context only.

---

## Template

```markdown
<planning_context>

**Phase:** {phase_number}

**Project:**
@.planning/project/PROJECT.md

**Project Plan:**
@.planning/project/PROJECT-PLAN.md

**Codebase Map (if exists):**
@.planning/codebase/architecture.md
@.planning/codebase/conventions.md
@.planning/codebase/tech-stack.md
@.planning/codebase/concerns.md

**Phase Context (if exists):**
@.planning/project/PHASE-{N}-DISCUSSION.md

**Research (if exists):**
@.planning/project/PHASE-{N}-RESEARCH.md

</planning_context>

<downstream_consumer>
Output consumed by /execute-phase
Plans must be executable prompts with:
- Frontmatter (acceptance_criteria, files_modified)
- Tasks in XML format
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<quality_gate>
Before returning PLANNING COMPLETE:
- [ ] PHASE-{N}-PLAN.md created in project directory
- [ ] Plan has valid frontmatter
- [ ] Tasks are specific and actionable
- [ ] must_haves derived from phase goal
</quality_gate>
```

---

## Placeholders

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{phase_number}` | From PROJECT-PLAN.md/arguments | `1` or `2` |
| `{N}` | Phase number | `1` |

---

## Usage

**From /plan-phase (standard mode):**
```python
Task(
  prompt=filled_template,
  subagent_type="gsd-planner",
  description="Plan Phase {phase}"
)
```

---

**Note:** Planning methodology, task breakdown, TDD detection, and goal-backward derivation are baked into the gsd-planner agent. This template only passes context.
