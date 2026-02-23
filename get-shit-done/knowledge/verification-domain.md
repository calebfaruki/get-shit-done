# Verification Domain Knowledge

Agents load this document when verifying plan execution. It covers goal-backward verification methodology, stub detection, staging rules, and verification tool usage.

**When to load**: Verifier agents read this before checking executor work. Planners reference when creating must_haves.

---

<verification_methodology>

## Verification Methodology

**Core Principle: Existence ≠ Implementation**

A file existing does not mean the feature works. Verification must check:
1. **Exists** - File is present at expected path
2. **Substantive** - Content is real implementation, not placeholder
3. **Wired** - Connected to the rest of the system
4. **Functional** - Actually works when invoked

Levels 1-3 can be checked programmatically. Level 4 often requires human verification.

### Goal-Backward Verification

Start from what the phase SHOULD deliver, verify it actually exists in the codebase.

**Process:**
1. What must be TRUE for the goal to be achieved?
2. What must EXIST for those truths to hold?
3. What must be WIRED for those artifacts to function?

Then verify each level against the actual codebase.

**Verification against must_haves:**

Plans define `must_haves` with three components:
- **truths**: Observable behaviors that must be true when phase is done
- **artifacts**: Files that must exist with substantive implementation
- **key_links**: Critical connections that wire artifacts together

The verifier checks each component:
1. **Truths**: Check if supporting artifacts and wiring enable the behavior
2. **Artifacts**: Three-level check (exists, substantive, wired)
3. **Key Links**: Pattern matching to verify connections exist

**Verification status:**

- ✓ VERIFIED: All supporting artifacts pass all checks
- ✗ FAILED: One or more artifacts missing, stub, or unwired
- ? UNCERTAIN: Can't verify programmatically (needs human)

### Report-Only Principle

The verifier reports diagnostics and stops. No automated fix loops.

**On pass:**
1. Stage the executor's changed files via `git add <file>`
2. Write verification report with all checks passed
3. Return to orchestrator

**On fail:**
1. Write diagnostics: what failed, why, where to look
2. DO NOT stage any files
3. Return report to orchestrator
4. Human decides next steps (fix manually, re-run phase, adjust plan)

**The verifier never attempts to fix issues.** That creates a conflict of interest — an agent grading its own work.

### Artifact Substantiveness Checks

**Level 1: Exists**
```bash
# File is present at expected path
[ -f "path/to/file" ]
```

**Level 2: Substantive**

Check file has real implementation, not placeholder:
- More than minimal lines (>10 for most files)
- Contains expected patterns (imports, exports, logic)
- No stub markers (TODO, FIXME, placeholder comments)
- No empty implementations (return null, return {}, pass)
- No hardcoded values where dynamic expected

**Level 3: Wired**

Check file is connected to the system:
- Imported by other files (not orphaned)
- Actually used beyond imports (called, referenced, rendered)
- Exports consumed elsewhere

### Wiring Verification

Wiring verification checks that components actually communicate. This is where most stubs hide.

Four universal wiring patterns:

**Pattern: Component → API**
- Component makes fetch/axios call to API endpoint
- Response is awaited/handled
- Response data is used (setState, setData, etc.)

**Pattern: API → Database**
- API route queries database
- Query is awaited
- Query result is returned (not static response)

**Pattern: Form → Handler**
- Form has onSubmit handler
- Handler calls API or dispatches action
- Handler does more than just preventDefault

**Pattern: State → Render**
- Component declares state variable
- State variable appears in JSX
- Content is dynamic (mapped/interpolated), not hardcoded

</verification_methodology>

---

<stub_detection>

## Stub Detection

Universal stub patterns that indicate placeholder code, regardless of file type.

### Comment-Based Stubs

```bash
# Common stub comments
TODO
FIXME
XXX
HACK
PLACEHOLDER
placeholder
implement
add later
coming soon
will be
```

These comments indicate the code is incomplete. Flag any file with these patterns.

### Empty Implementations

```bash
# Functions that do nothing
return null
return undefined
return {}
return []
=> {}
pass
...
```

Empty returns often indicate stub implementations — the function exists but doesn't do anything.

### Console-Only Implementations

```bash
# Log-only functions
console.log('clicked')
console.log('submitted')
console.warn('not implemented')
```

If the only logic is console output, it's likely a stub placeholder.

### Hardcoded Values

```bash
# Hardcoded where dynamic expected
id = "123"
user = "test@example.com"
count = 42
items = ["Item 1", "Item 2"]
```

Hardcoded values in places that should be dynamic (fetched from API, computed from state) indicate incomplete implementation.

### Placeholder Text in Output

```bash
# UI placeholders
placeholder
lorem ipsum
coming soon
under construction
sample
example
test data
dummy
```

Placeholder text in rendered output or responses indicates the feature isn't complete.

### Language-Specific Stubs

**JavaScript/TypeScript:**
```javascript
// RED FLAGS:
return <div>Component</div>
return <div>Placeholder</div>
return <div>{/* TODO */}</div>
return null
return <></>

onClick={() => {}}
onChange={() => console.log('clicked')}
onSubmit={(e) => e.preventDefault()}  // Only prevents default

export async function POST() {
  return Response.json({ message: "Not implemented" })
}

export async function GET() {
  return Response.json([])  // Empty array with no DB query
}
```

**Python:**
```python
# RED FLAGS:
def handler():
    pass

def process(data):
    return None

def get_items():
    return []  # Empty list with no query
```

**Go:**
```go
// RED FLAGS:
func Handler(w http.ResponseWriter, r *http.Request) {
    // TODO: implement
}

func GetItems() []Item {
    return nil
}
```

### Wiring Red Flags

**Fetch exists but response ignored:**
```javascript
fetch('/api/messages')  // No await, no .then, no assignment
```

**Query exists but result not returned:**
```javascript
await prisma.message.findMany()
return Response.json({ ok: true })  // Returns static, not query result
```

**Handler only prevents default:**
```javascript
onSubmit={(e) => e.preventDefault()}  // No API call, no dispatch
```

**State exists but not rendered:**
```javascript
const [messages, setMessages] = useState([])
return <div>No messages</div>  // Always shows "no messages", never maps state
```

### Detection Strategy

For each artifact in must_haves:
1. **Read the file** using Read tool
2. **Check for stub patterns** — search for comment markers, empty returns, placeholders
3. **Check substantiveness** — count lines, verify expected patterns exist
4. **Check wiring** — verify imports/exports, look for usage in other files
5. **Categorize result** — VERIFIED, STUB, MISSING, ORPHANED

Report findings with:
- File path
- Stub pattern found (if any)
- Line numbers where issues occur
- Severity (blocker vs warning)

</stub_detection>

---

<staging_rules>

## Git Staging Safety

The verifier stages executor's changes on successful verification. Staging must be explicit and safe.

### Core Rules

**Always `git add <file>` via Bash (explicit files only)**

```bash
# CORRECT: Explicit file staging
git add src/components/Chat.tsx
git add src/api/messages.ts
git add tests/messages.test.ts
```

**NEVER `git add -A` or `git add .`**

```bash
# WRONG: Bulk staging
git add .
git add -A
git add --all
```

Bulk staging can accidentally include:
- Sensitive files (.env, credentials)
- Large binaries
- Generated files
- Unrelated changes

**Always stage files individually by path.**

### Working Tree Safety

The pipeline manages `.planning/` files only. It never commits, resets, checks out, stashes, or discards working tree content.

**Allowed operations:**
- `git add <file>` (explicit staging by verifier on pass)
- `git status` (checking state)
- `git diff` (viewing changes)
- `git diff --cached` (viewing staged changes)

**Prohibited operations:**
- `git commit` (human commits, not agents)
- `git reset` (could lose work)
- `git checkout` (could lose work)
- `git stash` (could lose work)
- `git clean` (could lose work)
- `git restore` (could lose work)

**The sole git write operation is `git add` by the verifier on successful verification.**

### Two Views for Human

After verification stages changes:

**Current phase (unstaged):**
```bash
git diff
```
Shows current executor's work that hasn't been verified yet.

**All verified phases (staged):**
```bash
git diff --cached
```
Shows all changes that passed verification and are ready to commit.

This separation allows the human to:
1. Review verified work in staging area
2. See current unverified work in working directory
3. Decide when to commit (after one phase, after all phases, or never)

### Staging Protocol

When verifier determines all must_haves are satisfied:

1. **Get list of changed files** from executor's work
2. **For each file:**
   ```bash
   git add path/to/file
   ```
3. **Verify staging succeeded:**
   ```bash
   git diff --cached --name-only
   ```
4. **Write verification report** noting files staged
5. **Return to orchestrator** with success status

When verifier finds gaps:

1. **Do NOT stage any files**
2. **Write verification report** with diagnostics
3. **Return to orchestrator** with failure status and gap details

**Never stage partial results.** Either all checks pass and all files are staged, or nothing is staged.

</staging_rules>

---

<tool_guidance>

## Tool Guidance for Verification

Verifiers use native Claude Code tools for all operations. NEVER use bash grep/find commands when native tools exist.

### Stub Detection

Use **Grep** to search for stub patterns:

```bash
# Search for stub comments
Grep: pattern="TODO|FIXME|XXX|HACK|PLACEHOLDER" path="src/" output_mode="content"

# Search for placeholder text
Grep: pattern="placeholder|coming soon|lorem ipsum" path="src/" output_mode="content" -i="true"

# Search for empty implementations
Grep: pattern="return null|return \{\}|return \[\]" path="src/" output_mode="content"

# Search for console-only implementations
Grep: pattern="console\.(log|warn|error)" path="src/" output_mode="content" -A="2" -B="2"
```

**NEVER use bash grep:**
```bash
# WRONG:
grep -E "TODO|FIXME" src/**/*.ts

# CORRECT:
Grep: pattern="TODO|FIXME" path="src/" output_mode="content"
```

### Finding Files to Verify

Use **Glob** to find files by pattern:

```bash
# Find all source files in a directory
Glob: pattern="src/**/*.ts"

# Find all test files
Glob: pattern="**/*.test.ts"

# Find all components
Glob: pattern="src/components/**/*.tsx"
```

**NEVER use bash find:**
```bash
# WRONG:
find src/ -name "*.ts"

# CORRECT:
Glob: pattern="src/**/*.ts"
```

### Checking File Content

Use **Read** to check file content:

```bash
# Read a file to check implementation
Read: path/to/file.ts

# Read multiple files for wiring verification
Read: src/components/Chat.tsx
Read: src/api/messages.ts
```

After reading, analyze content for:
- Stub patterns (TODO, FIXME, placeholders)
- Substantiveness (line count, real logic)
- Wiring (imports, exports, usage patterns)

### Git Operations

Use **Bash** only for git commands:

```bash
# Check status
git status

# View unstaged changes
git diff

# View staged changes
git diff --cached

# Stage a file (on verification pass)
git add path/to/file.ts

# List staged files
git diff --cached --name-only
```

**Prohibited git operations:**
- `git commit` (human commits)
- `git reset` (could lose work)
- `git checkout` (could lose work)
- `git stash` (could lose work)

### Writing Reports

Use **Write** to create verification reports:

```bash
# Create verification report
Write: .planning/phases/XX-name/XX-VERIFICATION.md
```

**NEVER use heredoc or cat:**
```bash
# WRONG:
cat << 'EOF' > VERIFICATION.md

# CORRECT:
Write: .planning/phases/XX-name/XX-VERIFICATION.md
```

### Verification Workflow

1. **Read phase plan** to get must_haves
2. **For each artifact:**
   - Use **Read** to check file exists and read content
   - Use **Grep** to search for stub patterns
   - Analyze substantiveness (line count, patterns)
3. **For each key link:**
   - Use **Read** to check both files
   - Use **Grep** to verify connection pattern exists
4. **Determine status** (passed/failed)
5. **If passed:**
   - Use **Bash** to `git add` each changed file
   - Use **Write** to create verification report
6. **If failed:**
   - Use **Write** to create verification report with diagnostics
   - Do NOT stage any files

### Tool Usage Principles

1. **Use native tools**: Grep over bash grep, Glob over find
2. **Read before verifying**: Always read files to check content
3. **Explicit staging**: Individual `git add <file>`, never bulk
4. **No automated fixes**: Report diagnostics, never attempt to fix
5. **Write reports**: Use Write tool for all report creation

</tool_guidance>
