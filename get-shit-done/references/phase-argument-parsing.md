# Phase Argument Parsing

Parse and normalize phase arguments for commands that operate on phases.

## Extraction

From `$ARGUMENTS`:
- Extract phase number (first numeric argument)
- Extract flags (prefixed with `--`)
- Remaining text is description (for insert/add commands)

## Phase Resolution

Phase resolution is now handled directly by workflows reading PROJECT-PLAN.md.

The workflow logic:
- Reads PROJECT-PLAN.md frontmatter to extract phase list
- Normalizes phase numbers (zero-pad to 2 digits, preserve decimals)
- Validates phase exists in PROJECT-PLAN.md
- Locates PHASE-N-PLAN.md files in .planning/project/

## Manual Normalization (Legacy)

Zero-pad integer phases to 2 digits. Preserve decimal suffixes.

```bash
# Normalize phase number
if [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  # Integer: 8 → 08
  PHASE=$(printf "%02d" "$PHASE")
elif [[ "$PHASE" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  # Decimal: 2.1 → 02.1
  PHASE=$(printf "%02d.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
fi
```

## Validation

Workflows validate phases by reading PROJECT-PLAN.md:

1. Parse PROJECT-PLAN.md frontmatter for phase list
2. Check if requested phase exists in the list
3. Verify corresponding PHASE-N-PLAN.md file exists in .planning/project/

No external tools needed — workflows use native file operations and frontmatter parsing.
