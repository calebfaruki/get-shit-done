# Phase 1: Characterization Tests and Safe Deletion - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Delete ~55 dead GSD files from the repository while keeping the existing test suite and Claude Code installation fully functional. Strangler fig approach — incremental deletion waves with verification between each. Also remove config.json and all workflow configuration code (STATE-04).

</domain>

<decisions>
## Implementation Decisions

### Deletion wave strategy
- Claude decides grouping strategy (by module, risk, dependency — whatever analysis reveals is best)
- 5-7 deletion waves for medium granularity — balance of safety and speed
- No git commits during execution — deletions are working tree changes only
- Recovery approach at Claude's discretion per situation (restore-and-skip vs fix-references-first)

### Characterization test scope
- Medium confidence threshold — reasonable checks but trust the analysis; fix if something breaks
- Trust the research list of ~55 dead files as-is; only investigate individual files if tests break after deletion
- Claude decides what testing approach is appropriate based on what's actually in the codebase

### Cross-platform verification
- Claude Code only — OpenCode and Gemini are not actively used and can be verified in Phase 7
- Verification means running a full workflow test (e.g., /gsd:progress) to confirm everything hangs together after deletions

### config.json removal
- Delete config.json completely — nothing in it matters for the fork
- Bundle config.json removal with other state management file deletions (same wave)
- Remove all code paths that read/write config.json entirely — no stubs, no defaults, just delete

### Claude's Discretion
- Deletion wave grouping strategy and specific wave composition
- Test approach and what characterization tests to write (if any)
- Recovery approach when a deletion breaks something
- How to verify installation works after each wave

</decisions>

<specifics>
## Specific Ideas

- "No commits" — user wants deletions as working tree changes, not per-wave commits
- Trust-but-verify mindset: lean on the research, investigate only on failure
- config.json is dead weight — aggressive removal, no preservation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-characterization-tests-and-safe-deletion*
*Context gathered: 2026-02-22*
