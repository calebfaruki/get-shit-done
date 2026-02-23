# Verification Report Template

Template for `.planning/project/PHASE-{N}-VERIFICATION.md` — phase goal verification results.

---

## File Template

```markdown
---
phase: XX-name
verified: YYYY-MM-DDTHH:MM:SSZ
status: passed | failed
score: N/M must-haves verified
---

# Phase {X}: {Name} Verification Report

**Phase Goal:** {goal from PROJECT-PLAN.md}
**Verified:** {timestamp}
**Status:** {passed | failed}

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | {truth from must_haves} | ✓ VERIFIED | {what confirmed it} |
| 2 | {truth from must_haves} | ✗ FAILED | {what's wrong} |
| 3 | {truth from must_haves} | ? UNCERTAIN | {why can't verify} |

**Score:** {N}/{M} truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/Chat.tsx` | Message list component | ✓ EXISTS + SUBSTANTIVE | Exports ChatList, renders Message[], no stubs |
| `src/app/api/chat/route.ts` | Message CRUD | ✗ STUB | File exists but POST returns placeholder |
| `prisma/schema.prisma` | Message model | ✓ EXISTS + SUBSTANTIVE | Model defined with all fields |

**Artifacts:** {N}/{M} verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Chat.tsx | /api/chat | fetch in useEffect | ✓ WIRED | Line 23: `fetch('/api/chat')` with response handling |
| ChatInput | /api/chat POST | onSubmit handler | ✗ NOT WIRED | onSubmit only calls console.log |

**Wiring:** {N}/{M} connections verified

## Acceptance Criteria Coverage

| Criterion | Status | Blocking Issue |
|-----------|--------|----------------|
| AC-1: {description} | ✓ SATISFIED | - |
| AC-2: {description} | ✗ BLOCKED | API route is stub |
| AC-3: {description} | ? NEEDS HUMAN | Can't verify WebSocket programmatically |

**Coverage:** {N}/{M} acceptance criteria satisfied

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/app/api/chat/route.ts | 12 | `// TODO: implement` | ⚠️ Warning | Indicates incomplete |
| src/components/Chat.tsx | 45 | `return <div>Placeholder</div>` | 🛑 Blocker | Renders no content |

**Anti-patterns:** {N} found ({blockers} blockers, {warnings} warnings)

## Diagnostics

{If passed:}
**No issues found.** All must-haves verified. Phase work staged via `git add`.

{If failed:}

### Failures

1. **{Failure name}**
   - What failed: {description}
   - Why: {root cause or best assessment}
   - Where to look: {specific files and line numbers}

2. **{Failure name}**
   - What failed: {description}
   - Why: {root cause}
   - Where to look: {files and lines}

**Nothing staged.** The human decides next steps: fix manually, re-run the phase, adjust the plan, or accept as-is.

## Verification Metadata

**Verification approach:** Goal-backward (derived from phase goal)
**Must-haves source:** PHASE-{N}-PLAN.md frontmatter
**Automated checks:** {N} passed, {M} failed
**Total verification time:** {duration}

---
*Verified: {timestamp}*
*Verifier: Claude (subagent)*
```

---

## Guidelines

**Status values:**
- `passed` — All must-haves verified, no blockers. Verifier stages changes via `git add`.
- `failed` — One or more critical issues found. Nothing is staged. Diagnostics explain what failed and where.

**On pass:** The verifier stages the executor's changed files (`git add`). The executor tracks files it writes; the verifier stages exactly those.

**On fail:** The verifier writes diagnostics — what failed, why, where to look. No automated fix loop, no re-execution. The human decides next steps.

**Evidence types:**
- For EXISTS: "File at path, exports X"
- For SUBSTANTIVE: "N lines, has patterns X, Y, Z"
- For WIRED: "Line N: code that connects A to B"
- For FAILED: "Missing because X" or "Stub because Y"

**Severity levels:**
- 🛑 Blocker: Prevents goal achievement, must fix
- ⚠️ Warning: Indicates incomplete but doesn't block
- ℹ️ Info: Notable but not problematic

---

## Example

```markdown
---
phase: 03-chat
verified: 2025-01-15T14:30:00Z
status: failed
score: 1/5 must-haves verified
---

# Phase 3: Chat Interface Verification Report

**Phase Goal:** Working chat interface where users can send and receive messages
**Verified:** 2025-01-15T14:30:00Z
**Status:** failed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see existing messages | ✗ FAILED | Component renders placeholder, not message data |
| 2 | User can type a message | ✓ VERIFIED | Input field exists with onChange handler |
| 3 | User can send a message | ✗ FAILED | onSubmit handler is console.log only |
| 4 | Sent message appears in list | ✗ FAILED | No state update after send |
| 5 | Messages persist across refresh | ? UNCERTAIN | Can't verify — send doesn't work |

**Score:** 1/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/Chat.tsx` | Message list component | ✗ STUB | Returns `<div>Chat will be here</div>` |
| `src/components/ChatInput.tsx` | Message input | ✓ EXISTS + SUBSTANTIVE | Form with input, submit button, handlers |
| `src/app/api/chat/route.ts` | Message CRUD | ✗ STUB | GET returns [], POST returns { ok: true } |
| `prisma/schema.prisma` | Message model | ✓ EXISTS + SUBSTANTIVE | Message model with id, content, userId, createdAt |

**Artifacts:** 2/4 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Chat.tsx | /api/chat GET | fetch | ✗ NOT WIRED | No fetch call in component |
| ChatInput | /api/chat POST | onSubmit | ✗ NOT WIRED | Handler only logs, doesn't fetch |
| /api/chat GET | database | prisma.message.findMany | ✗ NOT WIRED | Returns hardcoded [] |
| /api/chat POST | database | prisma.message.create | ✗ NOT WIRED | Returns { ok: true }, no DB call |

**Wiring:** 0/4 connections verified

## Acceptance Criteria Coverage

| Criterion | Status | Blocking Issue |
|-----------|--------|----------------|
| AC-1: User can send message | ✗ BLOCKED | API POST is stub |
| AC-2: User can view messages | ✗ BLOCKED | Component is placeholder |
| AC-3: Messages persist | ✗ BLOCKED | No database integration |

**Coverage:** 0/3 acceptance criteria satisfied

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/components/Chat.tsx | 8 | `<div>Chat will be here</div>` | 🛑 Blocker | No actual content |
| src/app/api/chat/route.ts | 5 | `return Response.json([])` | 🛑 Blocker | Hardcoded empty |
| src/app/api/chat/route.ts | 12 | `// TODO: save to database` | ⚠️ Warning | Incomplete |

**Anti-patterns:** 3 found (2 blockers, 1 warning)

## Diagnostics

### Failures

1. **Chat component is placeholder**
   - What failed: Chat.tsx renders static text instead of message list
   - Why: Component was scaffolded but never implemented
   - Where to look: `src/components/Chat.tsx:8`

2. **API routes are stubs**
   - What failed: GET returns empty array, POST returns hardcoded response
   - Why: Database integration was never wired
   - Where to look: `src/app/api/chat/route.ts:5-12`

3. **No frontend-backend wiring**
   - What failed: Components don't call API endpoints
   - Why: fetch calls were never added
   - Where to look: `src/components/Chat.tsx` (missing useEffect), `src/components/ChatInput.tsx` (onSubmit is console.log)

**Nothing staged.** The human decides next steps: fix manually, re-run the phase, adjust the plan, or accept as-is.

## Verification Metadata

**Verification approach:** Goal-backward (derived from phase goal)
**Must-haves source:** PHASE-3-PLAN.md frontmatter
**Automated checks:** 2 passed, 8 failed
**Total verification time:** 2 min

---
*Verified: 2025-01-15T14:30:00Z*
*Verifier: Claude (subagent)*
```
