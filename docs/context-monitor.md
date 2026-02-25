# Context Window Monitor

A PostToolUse hook that warns the agent when context window usage is high.

## Problem

The statusline shows context usage to the **user**, but the **agent** has no awareness of context limits. When context runs low, the agent continues working until it hits the wall — potentially mid-task with no state saved.

## How It Works

1. The statusline hook writes context metrics to `/tmp/claude-ctx-{session_id}.json`
2. After each tool use, the context monitor reads these metrics
3. When remaining context drops below thresholds, it injects a warning as `additionalContext`
4. The agent receives the warning in its conversation and can act accordingly

## Thresholds

| Level | Remaining | Agent Behavior |
|-------|-----------|----------------|
| Normal | > 35% | No warning |
| WARNING | <= 35% | Finish current action, do not start new work, update PROJECT-SUMMARY.md |
| CRITICAL | <= 25% | Stop after current operation, save state, inform user session must end |
| EXHAUSTED | <= 15% | Stop immediately, no more tool calls, summarize to user |

## Debounce

To avoid spamming the agent with repeated warnings, debounce is level-aware:

| Level | Min tool uses between warnings |
|-------|-------------------------------|
| WARNING | 5 |
| CRITICAL | 2 |
| EXHAUSTED | 1 (fires every time) |

- First warning always fires immediately
- Severity escalation (e.g. WARNING -> CRITICAL) bypasses debounce

## Architecture

```
Statusline Hook (gsd-statusline.js)
    | writes
    v
/tmp/claude-ctx-{session_id}.json
    ^ reads
    |
Context Monitor (gsd-context-monitor.js, PostToolUse)
    | injects
    v
additionalContext -> Agent sees warning
```

The bridge file is a simple JSON object:

```json
{
  "session_id": "abc123",
  "remaining_percentage": 28.5,
  "used_pct": 71,
  "timestamp": 1708200000
}
```

## Example Messages

**WARNING (35%):**
```
---CONTEXT MONITOR---
CONTEXT WINDOW WARNING — 32% remaining.

Stop what you are planning and follow these steps in order:
1. Finish your current in-progress action (complete the file edit or test you started).
2. Do NOT begin new file modifications or start new subtasks.
3. Update PROJECT-SUMMARY.md with: what you completed, what remains, and any state the next session needs.
4. Tell the user that context is running low and that they must start a fresh session after this task.
---END CONTEXT MONITOR---
```

**CRITICAL (25%):**
```
---CONTEXT MONITOR---
CONTEXT WINDOW CRITICAL — 22% remaining.

These instructions override your current task. You must stop after your current action. Do the following immediately:
1. Complete only the single operation you are currently performing. Do not start another.
2. Write your progress to PROJECT-SUMMARY.md: completed work, incomplete work, next steps, and any relevant file paths or error states.
3. Tell the user: context is nearly exhausted, the session must end, and provide a summary of what was accomplished and what remains.
4. Do not make any further tool calls after the summary unless the user explicitly asks.
---END CONTEXT MONITOR---
```

**EXHAUSTED (15%):**
```
---CONTEXT MONITOR---
CONTEXT WINDOW EXHAUSTED — 12% remaining.

These instructions override your current task. STOP. Do not make any more tool calls. Your only remaining action is to write a message to the user summarizing session state. If you have not updated PROJECT-SUMMARY.md, include all progress notes in your message directly.

Do not make any tool calls. Write your summary message now.
---END CONTEXT MONITOR---
```

## Integration with GSD

Planning files persist on disk, so no explicit state-save is needed beyond PROJECT-SUMMARY.md. The WARNING message tells the agent to wrap up. The CRITICAL message instructs the agent to stop after the current task. The EXHAUSTED message demands an immediate halt.

## Setup

Both hooks are automatically registered during `npx get-shit-done-cc` installation:

- **Statusline** (writes bridge file): Registered as `statusLine` in settings.json
- **Context Monitor** (reads bridge file): Registered as `PostToolUse` hook in settings.json

Manual registration in `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/hooks/gsd-statusline.js"
  },
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/gsd-context-monitor.js"
          }
        ]
      }
    ]
  }
}
```

## Safety

- The hook wraps everything in try/catch and exits silently on error
- It never blocks tool execution — a broken monitor should not break the agent's workflow
- Stale metrics (older than 60s) are ignored
- Missing bridge files are handled gracefully (subagents, fresh sessions)
