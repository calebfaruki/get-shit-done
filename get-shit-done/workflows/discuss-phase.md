<purpose>
Extract implementation decisions that downstream agents need. Analyze the phase to identify gray areas, let the user choose what to discuss, then deep-dive each selected area until satisfied.

You are a thinking partner, not an interviewer. The user is the visionary — you are the builder. Your job is to capture decisions that will guide research and planning, not to figure out implementation yourself.
</purpose>

<downstream_awareness>
**CONTEXT.md feeds into:**

1. **gsd-phase-researcher** — Reads CONTEXT.md to know WHAT to research
   - "User wants card-based layout" → researcher investigates card component patterns
   - "Infinite scroll decided" → researcher looks into virtualization libraries

2. **gsd-planner** — Reads CONTEXT.md to know WHAT decisions are locked
   - "Pull-to-refresh on mobile" → planner includes that in task specs
   - "Claude's Discretion: loading skeleton" → planner can decide approach

**Your job:** Capture decisions clearly enough that downstream agents can act on them without asking the user again.

**Not your job:** Figure out HOW to implement. That's what research and planning do with the decisions you capture.
</downstream_awareness>

<philosophy>
**User = founder/visionary. Claude = builder.**

The user knows:
- How they imagine it working
- What it should look/feel like
- What's essential vs nice-to-have
- Specific behaviors or references they have in mind

The user doesn't know (and shouldn't be asked):
- Codebase patterns (researcher reads the code)
- Technical risks (researcher identifies these)
- Implementation approach (planner figures this out)
- Success metrics (inferred from the work)

Ask about vision and implementation choices. Capture decisions for downstream agents.
</philosophy>

<scope_guardrail>
**CRITICAL: No scope creep.**

The phase boundary comes from PROJECT-PLAN.md and is FIXED. Discussion clarifies HOW to implement what's scoped, never WHETHER to add new capabilities.

**Allowed (clarifying ambiguity):**
- "How should posts be displayed?" (layout, density, info shown)
- "What happens on empty state?" (within the feature)
- "Pull to refresh or manual?" (behavior choice)

**Not allowed (scope creep):**
- "Should we also add comments?" (new capability)
- "What about search/filtering?" (new capability)
- "Maybe include bookmarking?" (new capability)

**The heuristic:** Does this clarify how we implement what's already in the phase, or does it add a new capability that could be its own phase?

**When user suggests scope creep:**
```
"[Feature X] would be a new capability — that's its own phase.
Want me to note it for the roadmap backlog?

For now, let's focus on [phase domain]."
```

Capture the idea in a "Deferred Ideas" section. Don't lose it, don't act on it.
</scope_guardrail>

<gray_area_identification>
Gray areas are **implementation decisions the user cares about** — things that could go multiple ways and would change the result.

**How to identify gray areas:**

1. **Read the phase goal** from PROJECT-PLAN.md
2. **Understand the domain** — What kind of thing is being built?
   - Something users SEE → visual presentation, interactions, states matter
   - Something users CALL → interface contracts, responses, errors matter
   - Something users RUN → invocation, output, behavior modes matter
   - Something users READ → structure, tone, depth, flow matter
   - Something being ORGANIZED → criteria, grouping, handling exceptions matter
3. **Generate phase-specific gray areas** — Not generic categories, but concrete decisions for THIS phase

**Don't use generic category labels** (UI, UX, Behavior). Generate specific gray areas:

```
Phase: "User authentication"
→ Session handling, Error responses, Multi-device policy, Recovery flow

Phase: "Organize photo library"
→ Grouping criteria, Duplicate handling, Naming convention, Folder structure

Phase: "CLI for database backups"
→ Output format, Flag design, Progress reporting, Error recovery

Phase: "API documentation"
→ Structure/navigation, Code examples depth, Versioning approach, Interactive elements
```

**The key question:** What decisions would change the outcome that the user should weigh in on?

**Claude handles these (don't ask):**
- Technical implementation details
- Architecture patterns
- Performance optimization
- Scope (roadmap defines this)
</gray_area_identification>

<process>

<step name="initialize" priority="first">
Phase number from argument (required).

**Prerequisite check:** Verify `.planning/project/PROJECT-PLAN.md` exists.

```bash
if [ ! -f ".planning/project/PROJECT-PLAN.md" ]; then
  echo "PROJECT-PLAN.md not found."
  echo ""
  echo "Run /plan-project first to break your project into phases."
  exit 1
fi
```

**Parse phase number:**
```bash
PHASE="$1"
```

**Validate phase exists in PROJECT-PLAN.md:**
```bash
grep -q "^### Phase ${PHASE}:" .planning/project/PROJECT-PLAN.md 2>/dev/null
```

**If phase not found:**
```
Phase ${PHASE} not found in PROJECT-PLAN.md.

Check PROJECT-PLAN.md for available phases.
```
Exit workflow.

**If phase found:** Continue to check_existing.
</step>

<step name="check_existing">
Check if PHASE-N-CONTEXT.md already exists:

```bash
ls .planning/project/PHASE-${PHASE}-CONTEXT.md 2>/dev/null
```

**If exists:**
Use AskUserQuestion:
- header: "Context"
- question: "Phase ${PHASE} already has context. What do you want to do?"
- options:
  - "Update it" — Review and revise existing context
  - "View it" — Show me what's there
  - "Skip" — Use existing context as-is

If "Update": Load existing, continue to analyze_phase
If "View": Display PHASE-N-CONTEXT.md, then offer update/skip
If "Skip": Exit workflow

**If doesn't exist:**

Check if PHASE-N-PLAN.md exists:

```bash
ls .planning/project/PHASE-${PHASE}-PLAN.md 2>/dev/null
```

**If plan exists:**

Use AskUserQuestion:
- header: "Plan exists"
- question: "Phase ${PHASE} already has a plan created without user context. Your decisions here won't affect the existing plan unless you replan."
- options:
  - "Continue and replan after" — Capture context, then run /plan-phase ${PHASE} to replan
  - "View existing plan" — Show plan before deciding
  - "Cancel" — Skip discuss-phase

If "Continue and replan after": Continue to analyze_phase.
If "View existing plan": Display plan file, then offer "Continue" / "Cancel".
If "Cancel": Exit workflow.

**If plan doesn't exist:** Continue to analyze_phase.
</step>

<step name="analyze_phase">
Analyze the phase to identify gray areas worth discussing.

**Read the phase description from PROJECT-PLAN.md and determine:**

```bash
PHASE_SECTION=$(sed -n "/^### Phase ${PHASE}:/,/^### Phase [0-9]/p" .planning/project/PROJECT-PLAN.md | head -n -1)
PHASE_NAME=$(echo "$PHASE_SECTION" | head -1 | sed 's/^### Phase [0-9]*: //')
PHASE_GOAL=$(echo "$PHASE_SECTION" | grep "^\*\*Goal\*\*:" | sed 's/^\*\*Goal\*\*: //')
```

1. **Domain boundary** — What capability is this phase delivering? State it clearly.

2. **Gray areas by category** — For each relevant category (UI, UX, Behavior, Empty States, Content), identify 1-2 specific ambiguities that would change implementation.

3. **Skip assessment** — If no meaningful gray areas exist (pure infrastructure, clear-cut implementation), the phase may not need discussion.

**Output your analysis internally, then present to user.**

Example analysis for "Post Feed" phase:
```
Domain: Displaying posts from followed users
Gray areas:
- UI: Layout style (cards vs timeline vs grid)
- UI: Information density (full posts vs previews)
- Behavior: Loading pattern (infinite scroll vs pagination)
- Empty State: What shows when no posts exist
- Content: What metadata displays (time, author, reactions count)
```
</step>

<step name="present_gray_areas">
Present the domain boundary and gray areas to user.

**First, state the boundary:**
```
Phase [X]: [Name]
Domain: [What this phase delivers — from your analysis]

We'll clarify HOW to implement this.
(New capabilities belong in other phases.)
```

**Then use AskUserQuestion (multiSelect: true):**
- header: "Discuss"
- question: "Which areas do you want to discuss for [phase name]?"
- options: Generate 3-4 phase-specific gray areas, each with:
  - "[Specific area]" (label) — concrete, not generic
  - [1-2 questions this covers] (description)
  - **Highlight the recommended choice with brief explanation why**

**Do NOT include a "skip" or "you decide" option.** User ran this command to discuss — give them real choices.

**Examples by domain:**

For "Post Feed" (visual feature):
```
☐ Layout style — Cards vs list vs timeline? Information density?
☐ Loading behavior — Infinite scroll or pagination? Pull to refresh?
☐ Content ordering — Chronological, algorithmic, or user choice?
☐ Post metadata — What info per post? Timestamps, reactions, author?
```

For "Database backup CLI" (command-line tool):
```
☐ Output format — JSON, table, or plain text? Verbosity levels?
☐ Flag design — Short flags, long flags, or both? Required vs optional?
☐ Progress reporting — Silent, progress bar, or verbose logging?
☐ Error recovery — Fail fast, retry, or prompt for action?
```

For "Organize photo library" (organization task):
```
☐ Grouping criteria — By date, location, faces, or events?
☐ Duplicate handling — Keep best, keep all, or prompt each time?
☐ Naming convention — Original names, dates, or descriptive?
☐ Folder structure — Flat, nested by year, or by category?
```

Continue to discuss_areas with selected areas.
</step>

<step name="discuss_areas">
For each selected area, conduct a focused discussion loop.

**Philosophy: 4 questions, then check.**

Ask 4 questions per area before offering to continue or move on. Each answer often reveals the next question.

**For each area:**

1. **Announce the area:**
   ```
   Let's talk about [Area].
   ```

2. **Ask 4 questions using AskUserQuestion:**
   - header: "[Area]" (max 12 chars — abbreviate if needed)
   - question: Specific decision for this area
   - options: 2-3 concrete choices (AskUserQuestion adds "Other" automatically), with the recommended choice highlighted and brief explanation why
   - Include "You decide" as an option when reasonable — captures Claude discretion

3. **After 4 questions, check:**
   - header: "[Area]" (max 12 chars)
   - question: "More questions about [area], or move to next?"
   - options: "More questions" / "Next area"

   If "More questions" → ask 4 more, then check again
   If "Next area" → proceed to next selected area
   If "Other" (free text) → interpret intent: continuation phrases ("chat more", "keep going", "yes", "more") map to "More questions"; advancement phrases ("done", "move on", "next", "skip") map to "Next area". If ambiguous, ask: "Continue with more questions about [area], or move to the next area?"

4. **After all initially-selected areas complete:**
   - Summarize what was captured from the discussion so far
   - AskUserQuestion:
     - header: "Done"
     - question: "We've discussed [list areas]. Which gray areas remain unclear?"
     - options: "Explore more gray areas" / "I'm ready for context"
   - If "Explore more gray areas":
     - Identify 2-4 additional gray areas based on what was learned
     - Return to present_gray_areas logic with these new areas
     - Loop: discuss new areas, then prompt again
   - If "I'm ready for context": Proceed to write_context

**Question design:**
- Options should be concrete, not abstract ("Cards" not "Option A")
- Each answer should inform the next question
- If user picks "Other", receive their input, reflect it back, confirm

**Scope creep handling:**
If user mentions something outside the phase domain:
```
"[Feature] sounds like a new capability — that belongs in its own phase.
I'll note it as a deferred idea.

Back to [current area]: [return to current question]"
```

Track deferred ideas internally.
</step>

<step name="write_context">
Create PHASE-N-CONTEXT.md capturing decisions made.

**Ensure .planning/project/ directory exists:**

```bash
mkdir -p .planning/project
```

**File location:** `.planning/project/PHASE-${PHASE}-CONTEXT.md`

**Structure per SPEC — three-category output:**

```markdown
# Phase ${PHASE}: ${PHASE_NAME} - Context

**Gathered:** $(date +%Y-%m-%d)
**Status:** Ready for planning

## Locked Decisions

[Decisions that the planner and executor MUST follow — non-negotiable constraints]

### [Category 1 that was discussed]
- [Locked decision or requirement]
- [Another locked decision if applicable]

### [Category 2 that was discussed]
- [Locked decision or requirement]

[If none: "No locked decisions — standard approaches acceptable"]

## Discretion Areas

[Areas where Claude can choose the implementation approach]

### [Category where user said "you decide"]
- [Area description and any guidance provided]

[If none: "No discretion areas specified — follow research and best practices"]

## Deferred Ideas

[Ideas that came up but belong in future work. These are OUT OF SCOPE for this phase.]

- [Deferred idea 1] — potential future enhancement
- [Deferred idea 2] — potential future phase

[If none: "None — discussion stayed within phase scope"]

---

*Phase: ${PHASE}*
*Context gathered: $(date +%Y-%m-%d)*
```

Write file using Write tool.
</step>

<step name="confirm_creation">
Present summary and next steps:

```
Created: .planning/project/PHASE-${PHASE}-CONTEXT.md

## Decisions Captured

### Locked Decisions
- [Key locked decision]

### Discretion Areas
- [Key discretion area]

[If deferred ideas exist:]
## Noted for Later
- [Deferred idea] — future enhancement

---

## Next Steps

Suggest continuing with:
- `/research-phase ${PHASE}` — investigate implementation details
- `/plan-phase ${PHASE}` — create detailed execution plan

---
```

**Never auto-advance** — user decides next command.
</step>


</process>

<success_criteria>
- Phase validated against roadmap
- Gray areas identified through intelligent analysis (not generic questions)
- User selected which areas to discuss
- Each selected area explored until user satisfied
- Scope creep redirected to deferred ideas
- CONTEXT.md captures actual decisions, not vague vision
- Deferred ideas preserved for future phases
- User knows next steps
</success_criteria>
