---
phase: {N}
status: draft
created: {date}
---

# Phase {N} — Validation Strategy

> Generated during `/research-phase {N}` or `/plan-phase {N}`.
> Reviewed by `gsd-plan-checker` during plan verification.
> Governs feedback sampling during `/execute-phase {N}`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | {pytest 7.x / jest 29.x / vitest / go test / other} |
| **Config file** | {path/to/pytest.ini or "none — needs creation"} |
| **Quick run command** | `{e.g., pytest -x --tb=short}` |
| **Full suite command** | `{e.g., pytest tests/ --tb=short}` |
| **Estimated runtime** | ~{N} seconds |
| **CI pipeline** | {.github/workflows/test.yml — exists / needs creation} |

---

## Sampling Rate

> The minimum feedback frequency required to reliably catch errors in this phase.

- **After every task:** Run `{quick run command}`
- **After all tasks complete:** Run `{full suite command}`
- **Before `/verify-phase`:** Full suite must be green
- **Maximum acceptable task feedback latency:** {N} seconds

---

## Per-Task Verification Map

| Task ID | Acceptance Criterion | Test Type | Automated Command | File Exists | Status |
|---------|---------------------|-----------|-------------------|-------------|--------|
| {N}-01 | AC-{X} | unit | `pytest tests/test_{module}.py::test_{name} -x` | ✅ / ❌ | ⬜ pending |
| {N}-02 | AC-{X} | integration | `pytest tests/test_{flow}.py -x` | ✅ / ❌ | ⬜ pending |
| {N}-03 | AC-{X} | smoke | `curl -s {endpoint} \| grep {expected}` | ✅ N/A | ⬜ pending |

*Status values: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test Setup Requirements

> Test scaffolding needed BEFORE any implementation task.

- [ ] `{tests/test_file.py}` — stubs for AC-{X}, AC-{Y}
- [ ] `{tests/conftest.py}` — shared fixtures
- [ ] `{framework install}` — if no framework detected

*If none required: "Existing infrastructure covers all phase acceptance criteria — no setup tasks needed."*

---

## Manual-Only Verifications

> Behaviors that genuinely cannot be automated, with justification.
> These are surfaced during `/verify-phase`.

| Behavior | Acceptance Criterion | Why Manual | Test Instructions |
|----------|---------------------|------------|-------------------|
| {behavior} | AC-{X} | {reason: visual, third-party auth, physical device...} | {step-by-step} |

*If none: "All phase behaviors have automated verification coverage."*

---

## Validation Sign-Off

Updated by `gsd-plan-checker` when plans are approved:

- [ ] All tasks have `<verify>` commands
- [ ] No 3 consecutive implementation tasks without automated verify (sampling continuity)
- [ ] No watch-mode flags in any automated command
- [ ] Feedback latency per task: < {N}s ✅

**Plan-checker approval:** {pending / approved on YYYY-MM-DD}

---

## Execution Tracking

Updated during `/execute-phase {N}`:

| Task | Tests Run | Pass | Fail | Sampling Status |
|------|-----------|------|------|-----------------|
| {N}-01 | {command} | {N} | {N} | ✅ sampled |
| {N}-02 | {command} | {N} | {N} | ✅ sampled |

**Phase validation complete:** {pending / YYYY-MM-DD HH:MM}
