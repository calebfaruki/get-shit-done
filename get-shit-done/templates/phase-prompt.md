# Phase Prompt Template

> **Note:** Planning methodology is in `agents/gsd-planner.md`.
> This template defines the PLAN.md output format that the agent produces.

Template for `.planning/project/PHASE-{N}-PLAN.md` - executable phase plans.

**Naming:** Use `PHASE-{N}-PLAN.md` format (e.g., `PHASE-1-PLAN.md` for Phase 1)

---

## File Template

```markdown
---
phase: N
type: execute
acceptance_criteria: []    # AC-IDs from PROJECT-PLAN.md this phase addresses
files_modified: []         # Files this plan modifies
user_setup: []             # Human-required setup Claude cannot automate (see below)

# Goal-backward verification (derived during planning, verified after execution)
must_haves:
  truths: []               # Observable behaviors that must be true for goal achievement
  artifacts: []            # Files that must exist with real implementation
  key_links: []            # Critical connections between artifacts
---

<objective>
[What this plan accomplishes]

Purpose: [Why this matters for the project]
Output: [What artifacts will be created]
</objective>

<context>
@.planning/project/PROJECT.md
@.planning/project/PROJECT-PLAN.md

# Only reference prior phase SUMMARYs if genuinely needed:
# - This phase uses types/exports from a prior phase
# - A prior phase made a decision that affects this phase
# Do NOT reflexively chain: Phase 2 refs Phase 1, Phase 3 refs Phase 2...

[Relevant source files:]
@src/path/to/relevant.ts
</context>

<tasks>

<task>
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext, another/file.ext</files>
  <action>[Specific implementation - what to do, how to do it, what to avoid and WHY]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria]</done>
</task>

<task>
  <name>Task 2: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[Specific implementation]</action>
  <verify>[Command or check]</verify>
  <done>[Acceptance criteria]</done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] [Specific test command]
- [ ] [Build/type check passes]
- [ ] [Behavior verification]
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- [Plan-specific criteria]
  </success_criteria>

<output>
After completion, update `.planning/project/PROJECT-SUMMARY.md` with phase block.
</output>
```

---

## Frontmatter Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `phase` | Yes | Phase number (e.g., `1`, `2`) |
| `type` | Yes | Always `execute` for standard plans, `tdd` for TDD plans |
| `acceptance_criteria` | Yes | AC-IDs from PROJECT-PLAN.md this phase addresses |
| `files_modified` | Yes | Files this plan touches |
| `user_setup` | No | Array of human-required setup items (external services) |
| `must_haves` | Yes | Goal-backward verification criteria (see below) |

**Must-haves enable verification:** The `must_haves` field carries goal-backward requirements from planning to execution. After the phase completes, `/verify-phase` checks these criteria against the actual codebase.

---

## Context Section

```markdown
<context>
@.planning/project/PROJECT.md
@.planning/project/PROJECT-PLAN.md

# Only include SUMMARY refs if genuinely needed:
# - This phase imports types from a prior phase
# - A prior phase made a decision affecting this phase
# - A prior phase's output is input to this phase
#
# Independent phases need NO prior SUMMARY references.

@src/relevant/source.ts
</context>
```

**Bad pattern (creates false dependencies):**
```markdown
<context>
@.planning/project/PROJECT-SUMMARY.md  # Just to "have context"
</context>
```

---

## Scope Guidance

**Plan sizing:**

- 2-3 tasks per plan
- ~50% context usage maximum
- One plan per phase

**Vertical slices preferred:**

```
PREFER: Phase 1 = User (model + API + UI)
        Phase 2 = Product (model + API + UI)

AVOID:  Phase 1 = All models
        Phase 2 = All APIs
        Phase 3 = All UIs
```

---

## TDD Plans

TDD features get plans with `type: tdd`.

**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
→ Yes: Create a TDD plan
→ No: Standard task in standard plan

See `~/.claude/get-shit-done/references/tdd.md` for TDD plan structure.

---

## Task Format

| Element | Purpose |
|---------|---------|
| `<name>` | Action-oriented name for the task |
| `<files>` | Files this task modifies |
| `<action>` | Specific implementation — what to do, how, what to avoid and WHY |
| `<verify>` | Command or check to prove it worked |
| `<done>` | Measurable acceptance criteria for this task |

---

## Examples

**Standard plan:**

```markdown
---
phase: 1
type: execute
acceptance_criteria: [AC-1, AC-2]
files_modified: [src/features/user/model.ts, src/features/user/api.ts, src/features/user/UserList.tsx]
---

<objective>
Implement complete User feature as vertical slice.

Purpose: Self-contained user management.
Output: User model, API endpoints, and UI components.
</objective>

<context>
@.planning/project/PROJECT.md
@.planning/project/PROJECT-PLAN.md
</context>

<tasks>
<task>
  <name>Task 1: Create User model</name>
  <files>src/features/user/model.ts</files>
  <action>Define User type with id, email, name, createdAt. Export TypeScript interface.</action>
  <verify>tsc --noEmit passes</verify>
  <done>User type exported and usable</done>
</task>

<task>
  <name>Task 2: Create User API endpoints</name>
  <files>src/features/user/api.ts</files>
  <action>GET /users (list), GET /users/:id (single), POST /users (create). Use User type from model.</action>
  <verify>curl tests pass for all endpoints</verify>
  <done>All CRUD operations work</done>
</task>
</tasks>

<verification>
- [ ] npm run build succeeds
- [ ] API endpoints respond correctly
</verification>

<success_criteria>
- All tasks completed
- User feature works end-to-end
</success_criteria>

<output>
After completion, update `.planning/project/PROJECT-SUMMARY.md` with phase block.
</output>
```

---

## Anti-Patterns

**Bad: Vague tasks**
```xml
<task>
  <name>Set up authentication</name>
  <action>Add auth to the app</action>
</task>
```

**Bad: Horizontal layer grouping**
```
Phase 1: All models
Phase 2: All APIs (depends on 1)
Phase 3: All UIs (depends on 2)
```

---

## Guidelines

- Always use XML structure for Claude parsing
- Include `acceptance_criteria`, `files_modified` in every plan
- Prefer vertical slices over horizontal layers
- Only reference prior phase context when genuinely needed
- 2-3 tasks per plan, ~50% context max

---

## User Setup (External Services)

When a plan introduces external services requiring human configuration, declare in frontmatter:

```yaml
user_setup:
  - service: stripe
    why: "Payment processing requires API keys"
    env_vars:
      - name: STRIPE_SECRET_KEY
        source: "Stripe Dashboard → Developers → API keys → Secret key"
      - name: STRIPE_WEBHOOK_SECRET
        source: "Stripe Dashboard → Developers → Webhooks → Signing secret"
    dashboard_config:
      - task: "Create webhook endpoint"
        location: "Stripe Dashboard → Developers → Webhooks → Add endpoint"
        details: "URL: https://[your-domain]/api/webhooks/stripe"
    local_dev:
      - "stripe listen --forward-to localhost:3000/api/webhooks/stripe"
```

**The automation-first rule:** `user_setup` contains ONLY what Claude literally cannot do:
- Account creation (requires human signup)
- Secret retrieval (requires dashboard access)
- Dashboard configuration (requires human in browser)

**NOT included:** Package installs, code changes, file creation, CLI commands Claude can run.

See `~/.claude/get-shit-done/templates/user-setup.md` for full schema and examples

---

## Must-Haves (Goal-Backward Verification)

The `must_haves` field defines what must be TRUE for the phase goal to be achieved. Derived during planning, verified after execution.

**Structure:**

```yaml
must_haves:
  truths:
    - "User can see existing messages"
    - "User can send a message"
    - "Messages persist across refresh"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "Message list rendering"
      min_lines: 30
    - path: "src/app/api/chat/route.ts"
      provides: "Message CRUD operations"
      exports: ["GET", "POST"]
    - path: "prisma/schema.prisma"
      provides: "Message model"
      contains: "model Message"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/chat"
      via: "fetch in useEffect"
      pattern: "fetch.*api/chat"
    - from: "src/app/api/chat/route.ts"
      to: "prisma.message"
      via: "database query"
      pattern: "prisma\\.message\\.(find|create)"
```

**Field descriptions:**

| Field | Purpose |
|-------|---------|
| `truths` | Observable behaviors from user perspective. Each must be testable. |
| `artifacts` | Files that must exist with real implementation. |
| `artifacts[].path` | File path relative to project root. |
| `artifacts[].provides` | What this artifact delivers. |
| `artifacts[].min_lines` | Optional. Minimum lines to be considered substantive. |
| `artifacts[].exports` | Optional. Expected exports to verify. |
| `artifacts[].contains` | Optional. Pattern that must exist in file. |
| `key_links` | Critical connections between artifacts. |
| `key_links[].from` | Source artifact. |
| `key_links[].to` | Target artifact or endpoint. |
| `key_links[].via` | How they connect (description). |
| `key_links[].pattern` | Optional. Regex to verify connection exists. |

**Why this matters:**

Task completion ≠ Goal achievement. A task "create chat component" can complete by creating a placeholder. The `must_haves` field captures what must actually work, enabling verification to catch gaps before they compound.

**Verification flow:**

1. Plan-phase derives must_haves from phase goal (goal-backward)
2. Must_haves written to PHASE-{N}-PLAN.md frontmatter
3. Execute-phase runs all tasks
4. `/verify-phase` checks must_haves against codebase
5. Gaps found → diagnostics reported
6. All must_haves pass → changes staged

See `~/.claude/get-shit-done/workflows/verify-phase.md` for verification logic.
