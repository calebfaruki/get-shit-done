# Research Project Workflow

Strategic research workflow for project-level investigation. Spawns a research subagent that produces PROJECT-RESEARCH.md.

## Prerequisites

Check that `.planning/project/PROJECT.md` exists:

```bash
[ -f .planning/project/PROJECT.md ] && echo "PROJECT.md exists" || echo "PROJECT.md missing"
```

**If missing:** Soft warning. Suggest running `/new-project` first. Offer to continue anyway if user wants to research before project definition.

## Flow

### 1. Check for existing research

```bash
[ -f .planning/project/PROJECT-RESEARCH.md ] && echo "exists" || echo "missing"
```

If exists: Inform user that re-running will overwrite existing research. Confirm before proceeding.

### 2. Spawn research subagent

Agent: `gsd-project-researcher` (use `resolve-model` for model selection)

**Files to read** (`<files_to_read>` block in subagent spawn):
- `.planning/project/PROJECT.md`
- `.planning/codebase/architecture.md` (if exists)
- `.planning/codebase/conventions.md` (if exists)
- `.planning/codebase/tech-stack.md` (if exists)
- `.planning/codebase/concerns.md` (if exists)
- `get-shit-done/knowledge/project-domain.md`

**Agent task:**
1. Read PROJECT.md to understand project scope
2. Perform web search for:
   - Recommended libraries/frameworks for the domain
   - Common patterns and anti-patterns
   - Critical pitfalls and gotchas
   - Best practices
3. Analyze codebase (if codebase files exist) to understand:
   - Existing tech stack
   - Current patterns in use
   - Constraints from existing architecture
4. Synthesize findings into single document
5. Write `.planning/project/PROJECT-RESEARCH.md`

### 3. Output format

PROJECT-RESEARCH.md structure per SPEC:

```markdown
# Project Research: [Short name]

**Domain:** [primary technology/problem domain]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Summary

[2-3 paragraph executive summary. Key recommendations.]

**Primary recommendation:** [one-liner]

## Recommended Stack

### Core

| Technology | Purpose | Why Recommended |
|------------|---------|-----------------|
| [name] | [what it does] | [why experts use it] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| [tech A] | [tech B] | [why A was chosen] |

## Architecture Approach

[1-2 paragraphs. Key patterns. Anti-patterns to avoid.]

## Critical Pitfalls

### [Pitfall Name]

**What goes wrong:** [description]
**How to avoid:** [prevention strategy]
**Warning signs:** [early detection]

## Open Questions

[Unresolved items — recommendation for how to handle during planning/execution]

## Sources

### Primary (HIGH confidence)
- [Official docs, verified sources]

### Secondary (MEDIUM confidence)
- [Community consensus]
```

**Re-run behavior:** Overwrites existing PROJECT-RESEARCH.md without archiving.

### 4. Handoff

Determine next step:

```bash
node ~/.claude/hooks/gsd-state-resolver.js
```

Parse the JSON result and present:
```
Research complete. Domain: [domain], Confidence: [level]

Primary recommendation: [one-liner from research]

Next: [nextCommand from resolver]
Context: [context from resolver]

The research document is available at .planning/project/PROJECT-RESEARCH.md

<sub>`/clear` first -> fresh context window</sub>
```

Present exactly ONE next step from the resolver. Do not list alternatives.

**Never auto-advance.** Human decides next step.

## Success Criteria

- [ ] PROJECT.md was read by subagent
- [ ] Web search was performed
- [ ] Codebase files were considered if they exist
- [ ] PROJECT-RESEARCH.md written to `.planning/project/`
- [ ] Research follows SPEC format (Summary, Stack, Approach, Pitfalls, Questions, Sources)
- [ ] Handoff message suggests next steps without auto-advancing
