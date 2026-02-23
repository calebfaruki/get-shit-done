# Summary Template

Template for phase completion blocks appended to `.planning/project/PROJECT-SUMMARY.md`.

---

## Phase Block Format

Each `/execute-phase` appends (or overwrites on re-run) a block:

```markdown
## Phase N: [Name]
**Status:** Complete | Failed (step X) | Stopped (Rule 4)
**Files changed:** [list]
**Deviations:** [list or "None"]
**Decisions:** [any runtime decisions made]
**Notes:** [anything the human should know when reviewing the diff]
```

---

## Guidelines

**Status values:**
- `Complete` — All tasks executed successfully
- `Failed (step X)` — Execution stopped at a specific step
- `Stopped (Rule 4)` — Architectural concern found, execution halted for user decision

**Files changed:** List every file created or modified during the phase.

**Deviations:** Document any auto-fixes (Rules 1-3) with:
- Which rule triggered
- What was found
- What was done
- Files affected

If no deviations: "None — plan executed as written"

**Decisions:** Key runtime decisions with brief rationale, or "None — followed plan as specified"

**Notes:** Anything the human should know when reviewing the diff — gotchas, things that look wrong but are intentional, areas that need attention.

---

## Example

```markdown
## Phase 1: Foundation
**Status:** Complete
**Files changed:** prisma/schema.prisma, src/app/api/auth/login/route.ts, src/app/api/auth/logout/route.ts, src/middleware.ts, src/lib/auth.ts
**Deviations:**
- [Rule 2] Added bcrypt password hashing — plan didn't specify, but storing plaintext would be a security flaw
- [Rule 3] Installed missing jose dependency — import was failing
**Decisions:** Used jose instead of jsonwebtoken (ESM-native, Edge-compatible). 15-min access tokens with 7-day refresh tokens.
**Notes:** Refresh tokens stored in database for revocation capability. This adds a DB query on every request — acceptable for now but worth noting for performance review.

## Phase 2: Chat Interface
**Status:** Complete
**Files changed:** src/components/Chat.tsx, src/components/ChatInput.tsx, src/app/api/chat/route.ts
**Deviations:** None — plan executed as written
**Decisions:** None — followed plan as specified
**Notes:** None
```
