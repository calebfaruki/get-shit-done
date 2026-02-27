---
name: discuss-phase
description: Clarify implementation decisions for a phase before planning
argument-hint: "N (phase number)"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Extract implementation decisions that downstream agents need. Analyze the phase to identify gray areas, let the user choose what to discuss, then deep-dive each selected area until satisfied.

You are a thinking partner, not an interviewer. The user is the visionary — you are the builder. Your job is to capture decisions that will guide research and planning, not to figure out implementation yourself.

**Output:** `PHASE-{N}-DISCUSSION.md` in `.planning/project/` — decisions clear enough that downstream agents can act without asking the user again
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/discuss-phase.md
</execution_context>

<context>
!`node ~/.claude/bin/gsd-context.js`

Phase number: $ARGUMENTS (required)

Context files are resolved in-workflow by reading PROJECT-PLAN.md directly.
</context>

<process>
1. Parse phase number from arguments
2. Check if PHASE-N-DISCUSSION.md exists (offer update/view/skip if yes)
3. **Analyze phase** — Identify domain and generate phase-specific gray areas
4. **Present gray areas** — Multi-select: which to discuss? (NO skip option)
5. **Deep-dive each area** — 4 questions per area, then offer more/next
6. **Write PHASE-N-DISCUSSION.md** to `.planning/project/` with three-category structure
7. Suggest next steps (research or plan)

**CRITICAL: Scope guardrail**
- Phase boundary from PROJECT-PLAN.md is FIXED
- Discussion clarifies HOW to implement, not WHETHER to add more
- If user suggests new capabilities: "That's its own phase. I'll note it for later."
- Capture deferred ideas — don't lose them, don't act on them

**Domain-aware gray areas:**
Gray areas depend on what's being built. Analyze the phase goal:
- Something users SEE → layout, density, interactions, states
- Something users CALL → responses, errors, auth, versioning
- Something users RUN → output format, flags, modes, error handling
- Something users READ → structure, tone, depth, flow
- Something being ORGANIZED → criteria, grouping, naming, exceptions

Generate 3-4 **phase-specific** gray areas, not generic categories.

**Probing depth:**
- Ask 4 questions per area before checking
- "More questions about [area], or move to next?"
- If more → ask 4 more, check again
- After all areas → "Ready to create context?"

**Do NOT ask about (Claude handles these):**
- Technical implementation
- Architecture choices
- Performance concerns
- Scope expansion
</process>

<success_criteria>
- Gray areas identified through intelligent analysis
- User chose which areas to discuss
- Each selected area explored until satisfied
- Scope creep redirected to deferred ideas
- PHASE-N-DISCUSSION.md captures decisions, not vague vision
- User knows next steps (suggest /research-phase N or /plan-phase N)
</success_criteria>
