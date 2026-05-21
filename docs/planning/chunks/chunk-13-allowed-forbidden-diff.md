# CHUNK-13 — Allowed/Forbidden Changes diff (the headline feature) + Claude Code PreToolUse hook

**Phase:** Phase 3, Week 11 (2026-08-03). **The headline week.**
**Effort:** 4–5 session-days.
**Dependencies (upstream):** CHUNK-12 (Result Memory + `git diff --name-only HEAD` files-changed list), CHUNK-09 (Execution Brief Sections 7 + 8 + `briefMarkdown.ts` parser), CHUNK-10 (Harness Profile schema + `managedBlock.ts`), CHUNK-11 (handoff directory paths), CHUNK-02 (webview + messenger), CHUNK-03 (memory persistence).
**Exposes (downstream):** the post-hoc `DiffOutcome` consumed by CHUNK-14 (verification + memory update + release evidence). User-visible: the diff-results panel (universal) and the Claude Code PreToolUse hook installer (bonus).

This spec is the per-chunk expansion of the row in [`docs/planning/part-1-plan.md` § CHUNK-13](../part-1-plan.md). It honours the shared cross-chunk contracts at the bottom of that file. It is the headline feature of the trimmed MVP: the universal Allowed/Forbidden diff is the **CORE**; the Claude Code PreToolUse hook is the **BONUS** per research finding #5.

---

## 1. Restated goal and scope

### Goal

Compare the files an external AI coding harness actually changed against the brief's Allowed (Section 7) and Forbidden (Section 8) lists. Produce a per-file classification and a top-level pass/fail verdict. Surface it as a clear pass/fail panel inside DeliveryOS.

Additionally, for the Claude Code profile only, generate a `PreToolUse` hook script and register it in `.claude/settings.json` so that any Edit / Write / MultiEdit attempt against a forbidden path is **hard-blocked in real time, before the model's permission-mode check** (research finding #5 — `--dangerously-skip-permissions` cannot bypass this).

This chunk closes the largest leak in PRD § 27 Risk 3 ("File-based handoff is leaky — agents may ignore the brief"). For Claude Code it elevates the mitigation from post-hoc detection to real-time enforcement; for Codex (which has no equivalent hook surface in 2026) the post-hoc diff remains the universal backstop.

### In scope

- **The diff engine** (universal — Claude Code + Codex):
  - Inputs: a saved Execution Brief (Sections 7 + 8, parsed via CHUNK-09's `briefMarkdown.ts`) and the Result Memory's `filesChanged` field (CHUNK-12's `FilesChangedList`, sourced from `git diff --name-only HEAD`).
  - Cross-OS glob matching using `picomatch` (small, fast, well-tested on Windows path separators).
  - **Four diff-outcome classes** — three per-file classes plus one per-pattern class:
    1. `allowed-and-touched` — path matches an Allowed pattern; no Forbidden match. **OK.**
    2. `allowed-but-not-touched` — *per-pattern, not per-file.* An Allowed bullet for which no actual changed file matched. **Informational; possibly under-scoped work.**
    3. `forbidden-but-touched` — path matches a Forbidden pattern. **FAIL.** Forbidden wins ties.
    4. `unclassified-but-touched` — changed path matches neither Allowed nor Forbidden. **Warning, fail-open** — surfaced as a soft note (the brief did not explicitly mention this path) but does not flip the verdict to fail.
  - Top-level verdict `pass | fail` (fail iff at least one `forbidden-but-touched`).
  - Pure function; no I/O. Easily unit-testable.
- **The diff outcome storage**:
  - The `DiffOutcome` object is attached to the existing Result Memory record on CHUNK-03's `ResultPayload.diffOutcome` slot, not stored as a separate memory type. Written via `MemoryStore.update(resultId, { payload: { ..., diffOutcome } })` from `extension/src/diff/persist.ts`. CHUNK-14 (verification) reads it via `result.payload.diffOutcome`.
- **Diff results panel** (webview):
  - Pass/fail banner at the top (green / red).
  - List of forbidden-but-touched files (the FAIL section, expanded by default if non-empty).
  - List of allowed-but-not-touched files (the informational "possibly under-scoped work" section, collapsed by default).
  - List of allowed-and-touched files (collapsed by default — the "boring good case").
  - Each row shows: workspace-relative path, the rule that matched (or "no rule matched"), and a copy-path button.
  - "Open in editor" link per file (uses `vscode.commands.executeCommand('vscode.open', uri)` via a webview message round-trip).
- **VERIFY tree node** wiring:
  - Under each Result Memory entry, a child node "Diff outcome — PASS / FAIL".
  - Clicking it opens the diff results panel scoped to that result.
- **Claude Code PreToolUse hook generator** (research finding #5 — Claude Code profile only):
  - Generates `.claude/hooks/deliveryos-forbidden-paths.sh` (POSIX) and `.claude/hooks/deliveryos-forbidden-paths.ps1` (Windows). Both are written by default; `.claude/settings.json` registers whichever matches the host platform.
  - The script reads `.deliveryos-handoff/current-execution-brief.md`, locates the `## 8. Forbidden Changes` section, extracts the bullet list of patterns, and exits 2 if the tool's target path matches any pattern.
  - Registers the `PreToolUse` entry for the Edit / Write / MultiEdit tools by calling CHUNK-10's `applyManagedBlock(existing, body, 'json')` — CHUNK-10 owns the canonical JSON managed-block syntax (a single sentinel key `"deliveryos.managed": { ... }`, with hook content nested at `deliveryos.managed.hooks` per CHUNK-10 § 5.3). CHUNK-13 does **NOT** add new managed-block primitives — it consumes CHUNK-10's API verbatim.
  - User-visible install UX: a "Hook install" tab on the diff results panel (and a shortcut from the brief composer profile picker). Diff against the existing `.claude/settings.json` if present, "Apply" button, never silent — same UX shape as CHUNK-10's CLAUDE.md updater.
- **Cross-OS glob behaviour**:
  - All matching goes through a tiny `picomatchAdapter.ts` wrapper that normalises Windows backslash paths to forward slashes before matching, and configures `picomatch` with `dot: true` (so `.deliveryos-handoff/**` matches), `nocase: false` (paths are case-sensitive on Linux), and `posixSlashes: true`.
- **Hook script safety**:
  - The script reads brief patterns at runtime — DeliveryOS does NOT inline patterns into the script body. This keeps the attack surface minimal: a malicious brief cannot inject shell at hook-generation time.
  - The script greps for `## 8. Forbidden Changes` and reads the bullet list with a small inline awk / PowerShell parser; it does NOT pull in jq, node, or any other runtime dependency.
  - Pattern matching inside the script is line-by-line glob via shell builtin (`case "$path" in pattern)` for POSIX) and `-like` (for PowerShell). This is a deliberate semantic compromise — see § 9.

### Out of scope (deferred to later chunks or future builds)

- **Codex enforcement hooks.** Codex has no `PreToolUse` equivalent in 2026 (research finding §5). Post-hoc diff is the universal backstop and that is by design.
- **Verification against the test spec.** The diff answers "did the harness obey the boundary?". It does NOT answer "did the harness pass its tests?". That is CHUNK-14.
- **Memory update prompt after diff fail.** CHUNK-14 owns the memory-update workflow.
- **Auto-applying the hook on profile selection.** All hook installs go through the same diff-and-apply UX as CHUNK-10's CLAUDE.md update. Never silent.
- **Multi-result diff comparison** ("did this result reduce forbidden touches vs the previous attempt?"). Single-result-at-a-time for MVP.
- **Allowed-but-not-touched as a fail signal.** Treated as informational only — under-scoped work is a user judgement call, not a contract violation.
- **Per-rule severity** (HIGH / MEDIUM / LOW). All forbidden touches are equally fatal in MVP.
- **Hook for Bash tool / other tool surfaces.** Edit / Write / MultiEdit only — these are the file-mutating tools. Bash can also touch files (`rm`, `mv`) but instrumenting all of Bash is a much larger surface area and is deferred to a follow-up.
- **PostToolUse hook to also log a violation if PreToolUse was somehow skipped.** Belt-and-braces but not needed for MVP — PreToolUse is the load-bearing layer.
- **Per-project Claude settings precedence** (`.claude/settings.local.json` vs `.claude/settings.json`). We always write to `.claude/settings.json` (shared, committed) and document the override path in the README.

---

## 2. The diff engine

### 2.1 Inputs

```ts
interface DiffInput {
  /** Parsed Section 7 Allowed list — one entry per bullet in the brief.
   *  Globs arrive already-normalised from CHUNK-09's parser (trailing-slash
   *  shorthand `dir/` rewritten to `dir/**` at parse time). */
  allowedPatterns: string[];
  /** Parsed Section 8 Forbidden list — one entry per bullet in the brief.
   *  Same parse-time normalisation as `allowedPatterns`. */
  forbiddenPatterns: string[];
  /** The structured files-changed shape from CHUNK-12. The diff engine
   *  flattens to a `string[]` of workspace-relative, forward-slash paths
   *  internally via `filesChanged.fromGit.map(c => c.path)`. */
  filesChanged: FilesChangedList; // re-exported from CHUNK-12
}

// From CHUNK-12 (do NOT redefine):
//   interface FilesChangedList {
//     fromGit: GitFileChange[];           // [{ path, status }, ...]
//     fromHarness: ClaimedFileChange[];
//     gitAvailable: boolean;
//   }
```

The engine performs one normalisation step at the top of `runDiff()`:

```ts
const paths: string[] = input.filesChanged.fromGit.map(c => c.path);
// All paths from CHUNK-12 are already forward-slash and workspace-relative;
// the picomatchAdapter still defensively normalises in case the harness-
// claimed list (fromHarness) is ever folded in.
```

The patterns are bullet-list entries from the brief. Examples that must work cleanly:

- `src/**/*.ts` → standard recursive glob.
- `src/legacy/**` → "the whole directory" form. CHUNK-09's parser **pre-normalises** the trailing-slash shorthand `src/legacy/` to `src/legacy/**` at parse time (see M16 reconciliation), so the diff engine never sees a raw trailing-slash pattern.
- `package.json` → exact-path match.
- `!src/legacy/no-touch.ts` → leading `!` is a negation (a forbidden pattern wins inside an otherwise-allowed area, and vice versa). Documented in CHUNK-09's brief schema.
- `tests/**/*.spec.ts` → glob with multiple segments.

Patterns from CHUNK-09's `briefMarkdown.ts` parser already arrive trimmed (leading `- `, trailing whitespace, surrounding backticks stripped) **and trailing-slash normalised** to `dir/**`. This chunk does not re-parse and does not re-normalise; it consumes the already-parsed, already-normalised string array.

### 2.2 Algorithm

```
for each path in filesChanged:
  let allowed = false
  let forbidden = false
  let matchedRule = null

  for each pattern in forbiddenPatterns:
    if picomatch.isMatch(path, pattern):
      forbidden = true
      matchedRule = pattern  // forbidden wins ties; recorded for UX
      break

  if not forbidden:
    for each pattern in allowedPatterns:
      if picomatch.isMatch(path, pattern):
        allowed = true
        matchedRule = pattern
        break

  classify:
    if forbidden:                  → 'forbidden-but-touched'
    else if allowed:               → 'allowed-and-touched'
    else:                          → 'allowed-but-not-touched' is for *brief* paths,
                                     not for changed paths. A changed file that
                                     matched neither allowed nor forbidden is a
                                     SEPARATE class: 'unclassified-but-touched'.

then for each pattern in allowedPatterns:
  if no path in filesChanged matched it:
    emit 'allowed-but-not-touched' for that pattern (informational).

verdict = filesChanged.any(v => v.classification === 'forbidden-but-touched')
          ? 'fail' : 'pass'
```

Note the correction in the algorithm vs the part-1-plan summary: `allowed-but-not-touched` is per-pattern (a pattern the brief allowed but no actual file matched), not per-file. A changed file that matches no rule is its own class `unclassified-but-touched` and is surfaced as a soft warning ("the brief did not explicitly allow or forbid this path"). Verdict is still driven by `forbidden-but-touched`.

### 2.3 Forbidden-wins semantics

If a path matches both an allowed pattern and a forbidden pattern, **forbidden wins**. This is the safer default and matches the user's expectation when reading the brief top-to-bottom. The matched rule recorded for UX is always the forbidden one in that case — so the panel can show "blocked by Section 8 rule `src/legacy/`" instead of a misleading "matched Section 7 rule".

### 2.4 Output

```ts
interface DiffOutcome {
  verdict: 'pass' | 'fail';
  /** Per-file classifications for every entry in filesChanged. */
  files: FileVerdict[];
  /** Per-allowed-pattern that no file matched (informational). */
  unmatchedAllowedPatterns: string[];
  /** Diagnostics surfaced at the panel level. */
  notes: DiffNote[];
  /** Echo of the inputs for traceability / debugging. */
  inputs: DiffInput;
  /** Diff-engine version — bumped when the algorithm changes so old results
   *  surface as "diffed with engine vN; current engine is vM, re-run?". */
  engineVersion: 1;
  /** Wall-clock time the diff was computed. */
  computedAt: number;
}

interface FileVerdict {
  path: string;
  classification:
    | 'allowed-and-touched'
    | 'forbidden-but-touched'
    | 'unclassified-but-touched';
  matchedRule: string | null;
  /** Which section the rule came from. Useful for UX copy. */
  matchedSection: 7 | 8 | null;
}

interface DiffNote {
  level: 'info' | 'warn' | 'error';
  message: string;
  /** Optional file path the note relates to. */
  path?: string;
}
```

---

## 3. Claude Code PreToolUse hook generator

### 3.1 Background — why PreToolUse is the unique strength

From research finding #5:

> Claude Code's `.claude/settings.json` supports `PreToolUse` hooks — scripts that run before any Edit/Write and can block via exit code 2. **Critically, PreToolUse fires before permission-mode checks; it cannot be bypassed by `--dangerously-skip-permissions`.**

That last clause is the load-bearing one. Other defences (the brief itself, the suggested `CLAUDE.md` block, permission-mode review prompts) all live inside Claude Code's cooperative loop. PreToolUse is the first thing that runs and the model has no way to skip it. Codex has no equivalent surface in 2026, so this is genuinely a Claude-Code-only superpower — and naming it explicitly in the README and the demo is the headline story.

### 3.2 The generated hook script — POSIX

`.claude/hooks/deliveryos-forbidden-paths.sh`:

```bash
#!/usr/bin/env bash
# Managed by DeliveryOS. Do not edit by hand; re-generate from the
# diff-results panel "Hook install" tab.
#
# Claude Code invokes this script before any Edit / Write / MultiEdit tool
# call. We read the active Execution Brief's Forbidden Changes section and
# exit 2 if the tool's target path matches one of the patterns.
#
# Exit code contract:
#   0  → allow the tool call
#   2  → block the tool call (Claude Code surfaces our stderr to the model)
#   *  → other non-zero codes are treated as "tool error" by Claude Code,
#         which is louder than 2 — we deliberately use 2.

set -euo pipefail

BRIEF=".deliveryos-handoff/current-execution-brief.md"

# Claude Code passes the tool call as JSON on stdin. We pluck out the file path
# without pulling in jq — a small awk parser handles the shape we expect.
INPUT=$(cat)
TARGET=$(printf '%s' "$INPUT" | awk '
  /"file_path"[[:space:]]*:/ {
    sub(/^[^:]*:[[:space:]]*"/, "");
    sub(/".*$/, "");
    print; exit
  }')

if [ -z "${TARGET:-}" ]; then
  # No file_path in the tool call (shouldn't happen for Edit/Write/MultiEdit).
  # Allow rather than block on parse failure — fail-open is the right default
  # so a malformed brief or a Claude Code version bump doesn't brick the loop.
  exit 0
fi

if [ ! -f "$BRIEF" ]; then
  # No active brief → no Forbidden list to enforce. Allow.
  exit 0
fi

# Normalise the target to workspace-relative, forward-slash form.
TARGET="${TARGET#./}"
TARGET="${TARGET//\\//}"

# Extract the bullet list under "## 8. Forbidden Changes" up to the next ## heading.
PATTERNS=$(awk '
  /^## 8\. Forbidden Changes/ { capture = 1; next }
  /^## / { capture = 0 }
  capture && /^[[:space:]]*[-*][[:space:]]/ {
    sub(/^[[:space:]]*[-*][[:space:]]+/, "");
    sub(/[[:space:]]+$/, "");
    gsub(/`/, "");
    print
  }
' "$BRIEF")

while IFS= read -r PATTERN; do
  [ -z "$PATTERN" ] && continue
  # CHUNK-09 renders an empty Forbidden list as the sentinel "- (none)".
  # Skip it explicitly so the literal token is never matched against $TARGET.
  [ "$PATTERN" = "(none)" ] && continue
  # Trailing-slash normalisation is done by CHUNK-09 at parse time, so the
  # brief on disk only ever contains pre-normalised patterns. The hook
  # script does not re-normalise.
  # Shell glob match via `case` builtin. ${TARGET} is never expanded as code.
  # shellcheck disable=SC2254
  case "$TARGET" in
    $PATTERN)
      printf 'DeliveryOS: blocked write to "%s" — matches Forbidden rule "%s" in current brief.\n' \
        "$TARGET" "$PATTERN" >&2
      exit 2
      ;;
  esac
done <<< "$PATTERNS"

exit 0
```

Key design points:

- **Reads the brief at runtime**, never inlines patterns into the script body. A future brief change is picked up automatically; a malicious brief cannot inject shell at script-generation time.
- **`case "$TARGET" in $PATTERN)`** uses POSIX shell glob, not full picomatch semantics. This is deliberately conservative. `**` collapses to `*` (single-segment only) and brace expansion `{a,b}` is not honoured. Trailing-slash normalisation is **done upstream** by CHUNK-09's parser (M16) — the hook script does not re-normalise. The capability gap is documented in § 9 ("Known limitation") as load-bearing, and the post-hoc diff catches whatever the hook under-matches.
- **Sentinel `(none)` skip.** CHUNK-09 renders an empty Forbidden list as a bullet with the literal text `(none)`. The script early-skips this token so it is never glob-matched (m08).
- **`printf '%s'`** for all user-derived strings. Never `echo -e`, never anything that respects backslash escapes.
- **`exit 2`** specifically — Claude Code's documented "block" code. `exit 1` is interpreted as "tool error" which we do not want.
- **Fail-open on parse failure or missing brief.** The hook is a safety net, not a kill-switch. If DeliveryOS hasn't written a brief yet, we don't want every Edit attempt to error.

### 3.3 The generated hook script — Windows PowerShell

`.claude/hooks/deliveryos-forbidden-paths.ps1`:

```powershell
# Managed by DeliveryOS. Do not edit by hand; re-generate from the
# diff-results panel "Hook install" tab.

$ErrorActionPreference = 'Stop'

$brief = '.deliveryos-handoff/current-execution-brief.md'
$input = [Console]::In.ReadToEnd()

# Pull out file_path without bringing in JSON parsing dependencies.
$match = [regex]::Match($input, '"file_path"\s*:\s*"([^"]+)"')
if (-not $match.Success) { exit 0 }
$target = $match.Groups[1].Value -replace '\\', '/'
$target = $target -replace '^\./', ''

if (-not (Test-Path $brief)) { exit 0 }

# Extract Forbidden section.
$capture = $false
$patterns = @()
foreach ($line in Get-Content $brief) {
  if ($line -match '^##\s*8\.\s*Forbidden Changes') { $capture = $true; continue }
  if ($capture -and $line -match '^##\s') { break }
  if ($capture -and $line -match '^\s*[-*]\s+(.+?)\s*$') {
    $patterns += ($matches[1] -replace '`', '')
  }
}

foreach ($pattern in $patterns) {
  if ([string]::IsNullOrWhiteSpace($pattern)) { continue }
  # Skip the CHUNK-09 empty-list sentinel — m08.
  if ($pattern -eq '(none)') { continue }
  $p = $pattern
  # Trailing-slash normalisation happens at brief-parse time in CHUNK-09 (M16);
  # the script does not re-normalise.
  # PowerShell -like uses * and ? glob, no recursive **.
  # Same semantic gap as POSIX; documented in § 9.
  $likePattern = $p -replace '\*\*', '*'
  if ($target -like $likePattern) {
    [Console]::Error.WriteLine("DeliveryOS: blocked write to `"$target`" — matches Forbidden rule `"$pattern`" in current brief.")
    exit 2
  }
}

exit 0
```

### 3.4 `.claude/settings.json` registration

The hook generator does **not** define its own managed-block syntax. It calls into CHUNK-10's `applyManagedBlock(existing, body, 'json')` (located at `extension/src/profiles/managedBlock.ts`), which is the **canonical** owner of managed-block primitives for the project. CHUNK-10 chose a single sentinel-key convention for JSON: a top-level key `"deliveryos.managed"` whose object value carries every DeliveryOS-managed sub-tree. CHUNK-10 § 5.3 already stubbed the `deliveryos.managed.hooks` path as the home for hook registrations; CHUNK-13 writes into exactly that slot.

The shape under `deliveryos.managed.hooks` follows Claude Code's own `.claude/settings.json` hook entry shape — an array of hook entries keyed by tool name. For DeliveryOS, that array contains a single `PreToolUse` entry matching `Edit|Write|MultiEdit`:

```jsonc
{
  "deliveryos.managed": {
    // ...other CHUNK-10-managed sub-trees (e.g. profile metadata) ...
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Edit|Write|MultiEdit",
          "hooks": [
            {
              "type": "command",
              "command": ".claude/hooks/deliveryos-forbidden-paths.sh"  // or .ps1 on Windows
            }
          ]
        }
      ]
    }
  }
}
```

CHUNK-13's responsibility is to:

1. Build the `hooks` sub-object above (`PreToolUseHookFragment`).
2. Hand it to `applyManagedBlock(existing, body, 'json')` together with the existing `.claude/settings.json` contents.
3. Render whatever `ManagedBlockPlan` CHUNK-10 returns in the diff-and-apply UX.

If a user (or another tool) later writes their own `hooks` block at the top level of `.claude/settings.json`, Claude Code merges it with the managed one — that is Claude Code's own settings-merge behaviour, not CHUNK-13's concern.

The generator picks `.sh` or `.ps1` based on `process.platform`. If the user opens the workspace on a different OS later they can re-run the installer; the diff UX will show the swap.

### 3.5 PreToolUse return-code contract

| Exit code | Claude Code interpretation                                     |
|-----------|----------------------------------------------------------------|
| `0`       | Allow the tool call. stdout/stderr ignored.                    |
| `2`       | **Block.** stderr is surfaced to the model. **This is us.**    |
| other     | Tool error. Louder than 2; will derail the loop. Avoid.        |

DeliveryOS's hook only ever uses 0 or 2. Any unexpected condition (missing brief, parse failure) fails open with 0 — the post-hoc diff is the universal backstop, so failing open at the hook layer is safe.

---

## 4. File-by-file breakdown

All paths are relative to the monorepo root (the `extension/` + `webview/` split established in CHUNK-02).

| Path | Purpose | New / Modified |
|------|---------|----------------|
| `extension/src/diff/types.ts` | `DiffInput`, `DiffOutcome`, `FileVerdict`, `DiffNote` type definitions. Shared with `contracts/`. | new |
| `extension/src/diff/picomatchAdapter.ts` | Thin wrapper over `picomatch`. Normalises paths to forward slashes and applies our flags (`dot: true`, `posixSlashes: true`, `nocase: false`). Single `isMatch(path, pattern)` export. Trailing-slash directory shorthand (`dir/` → `dir/**`) is **no longer** the adapter's job — CHUNK-09 pre-normalises patterns at parse time (M16). | new |
| `extension/src/diff/engine.ts` | The pure diff algorithm. `runDiff(input: DiffInput): DiffOutcome`. No I/O. Easily unit-testable. | new |
| `extension/src/diff/index.ts` | Barrel export. | new |
| `extension/src/diff/runForResult.ts` | Glue: takes a Result Memory id, loads the linked brief via CHUNK-09's parser, runs the engine, hands the outcome to `diff/persist.ts` for persistence. Called from the result-capture pipeline and from a "Re-run diff" command. | new |
| `extension/src/diff/persist.ts` | Small write-only module that persists a `DiffOutcome` via `MemoryStore.update(resultId, { payload: { ..., diffOutcome } })`. The optional `diffOutcome` slot lives on CHUNK-03's `ResultPayload` (NOT on a CHUNK-12 `ParsedResult` — that file does not exist). | new |
| `extension/src/hooks/forbiddenPathsScript.ts` | Static template strings + version stamps for the POSIX and PowerShell hook scripts. Pure constants — no logic. The generator picks one and writes it verbatim. | new |
| `extension/src/hooks/preToolUseGenerator.ts` | The hook installer. Picks platform, writes `.claude/hooks/deliveryos-forbidden-paths.sh` and/or `.ps1` (always writes both — registration picks one), then calls CHUNK-10's `managedBlock.ts` to upsert the registration block in `.claude/settings.json`. Returns a `HookInstallPlan` for the diff-and-apply UX. | new |
| `extension/src/hooks/hookInstallPlan.ts` | `HookInstallPlan` type — list of file operations the installer is about to perform, with before/after diffs. The "Apply" button consumes this; the panel renders it. | new |
| `extension/src/panels/diff-results/diffResultsHost.ts` | Host-side panel controller. Spawns the `deliveryos.diff-results` webview, wires the messenger (CHUNK-02 contract), serves the `DiffOutcome` for a selected result, accepts `applyHookInstall` and `openFile` messages. | new |
| `extension/src/panels/diff-results/diffResultsCommand.ts` | Registers `deliveryos.diff.openForResult(resultId)`. Wired from the tree view item. | new |
| `extension/src/diff/diffTreeContribution.ts` | Exports a `diffOutcomeChildBuilder(resultNode)` function imported by `extension/src/tree/stageTreeProvider.ts` (the canonical single tree-provider file declared by CHUNK-02). Adds the "Diff outcome — PASS / FAIL" child as a sub-node of each Result Memory tree item — Results live under EXECUTE per CHUNK-12, so the diff-outcome child inherits that placement (NOT under VERIFY). Reads `MemoryEntryOfType<'result'>.payload.diffOutcome` (CHUNK-03's `ResultPayload.diffOutcome`) to colour the icon and the label. | new |
| `extension/src/diff/recompute.ts` | "Re-run diff" command — re-runs the engine if the engine version has bumped since the result was first diffed. | new |
| `webview/src/panels/diff-results/main.tsx` | Vite entry for the diff-results webview. Mounts `<DiffResultsApp />`. | new |
| `webview/src/panels/diff-results/DiffResultsApp.tsx` | Top-level component. Owns the messenger subscription, requests the `DiffOutcome` on mount, renders the banner, the three classification sections, and the hook-install tab. | new |
| `webview/src/panels/diff-results/PassFailBanner.tsx` | The big green / red banner. Two states, no in-between. Shows the headline "PASS — 12 files changed, all within allowed scope" or "FAIL — 1 file touched a forbidden path". | new |
| `webview/src/panels/diff-results/PerFileVerdict.tsx` | A single row in the file list. Renders path, classification icon, matched rule, copy-path button, open-in-editor button. | new |
| `webview/src/panels/diff-results/FileSection.tsx` | A collapsible section grouping `PerFileVerdict` rows by classification. Header shows count + icon. | new |
| `webview/src/panels/diff-results/HookInstallTab.tsx` | The PreToolUse hook installer UI. Renders the `HookInstallPlan` as a side-by-side diff (existing `.claude/settings.json` vs proposed), an "Apply" button, an "Open the generated script" link, an explainer paragraph that names the `--dangerously-skip-permissions` strength. Disabled if the active profile is not Claude Code. | new |
| `webview/src/panels/diff-results/UnclassifiedNote.tsx` | Small notice when there are `unclassified-but-touched` files — "The brief did not explicitly mention these paths. Consider tightening Section 7 or 8 of the next brief." | new |
| `contracts/src/diff.ts` | Webview ↔ host message contract for the diff panel. `RequestDiffOutcome`, `DiffOutcomeResponse`, `RequestHookInstallPlan`, `HookInstallPlanResponse`, `ApplyHookInstall`, `OpenFile`, `CopyPath`. Re-exports the `DiffOutcome` / `FileVerdict` / `HookInstallPlan` types from `extension/src/diff/types.ts` and `extension/src/hooks/hookInstallPlan.ts`. | new |
| `contracts/src/index.ts` | Add `export * from './diff';`. | modified |
| `extension/package.json` | Add `picomatch` dependency (small, no transitive deps that pull in native modules). Add `@types/picomatch` to devDependencies. Register the `deliveryos.diff.openForResult`, `deliveryos.diff.installClaudeHook`, and `deliveryos.diff.recompute` commands. | modified |
| `extension/src/extension.ts` | Wire the new commands and the tree-node provider extension. | modified |
| `contracts/src/memory.ts` (CHUNK-03 file) | The optional `diffOutcome?: DiffOutcome` slot is **declared by CHUNK-03 on `ResultPayload`** (CHUNK-03 owns the canonical memory shapes). CHUNK-13 imports the type from there; CHUNK-13 does not modify this file. | (not modified by CHUNK-13) |
| `extension/test/diff/engine.spec.ts` | Unit tests — see § 9. | new |
| `extension/test/diff/picomatchAdapter.spec.ts` | Cross-OS path normalisation tests. | new |
| `extension/test/hooks/preToolUseGenerator.spec.ts` | Tests the installer writes the right files, the platform branch is correct, and the managed-block plan diff matches expectations. | new |
| `extension/test/hooks/forbiddenPathsScript.shellcheck.ts` | Runs `shellcheck` on the POSIX template at test time (skipped if shellcheck not installed locally). | new |

**Note on the picomatch dependency.** `picomatch` (~25kb, zero runtime deps, MIT) is the same engine used inside `micromatch`, `chokidar`, `globby`, and VS Code's `vscode-uri` matchers. Cross-OS-safe by virtue of operating on string patterns, not by shelling out to the filesystem. Tree-shakes well; no native modules. Strictly preferred over `minimatch` (older, Windows quirks) and `micromatch` (bigger, pulls extras).

---

## 5. Key interfaces and types

These types are exported from `extension/src/diff/types.ts` and re-exported through `contracts/src/diff.ts` so the webview imports them from a single canonical source.

### 5.1 `DiffOutcome` and friends

```ts
// extension/src/diff/types.ts

export interface DiffInput {
  /** Already-normalised patterns from CHUNK-09's parser. */
  allowedPatterns: string[];
  forbiddenPatterns: string[];
  /** Structured shape from CHUNK-12. The engine flattens
   *  `filesChanged.fromGit.map(c => c.path)` internally. */
  filesChanged: FilesChangedList; // re-exported from CHUNK-12's contracts module
}

export type FileClassification =
  | 'allowed-and-touched'
  | 'forbidden-but-touched'
  | 'unclassified-but-touched';

export interface FileVerdict {
  path: string;
  classification: FileClassification;
  matchedRule: string | null;
  matchedSection: 7 | 8 | null;
}

export interface DiffNote {
  level: 'info' | 'warn' | 'error';
  message: string;
  path?: string;
}

export interface DiffOutcome {
  /** Identifier of the Result Memory entry this outcome is attached to. */
  resultId: string;
  verdict: 'pass' | 'fail';
  files: FileVerdict[];
  unmatchedAllowedPatterns: string[];
  notes: DiffNote[];
  inputs: DiffInput;
  engineVersion: 1;
  computedAt: number;
}

export interface BriefDiff {
  /** A summary view for the tree node. */
  resultId: string;
  briefId: string;
  verdict: 'pass' | 'fail';
  /** Count of forbidden-but-touched files — drives the icon. */
  forbiddenTouchedCount: number;
  /** Total files changed. */
  filesChangedCount: number;
}
```

### 5.2 `HookInstallPlan`

```ts
// extension/src/hooks/hookInstallPlan.ts

export interface HookInstallPlan {
  profile: 'claude-code';
  platform: NodeJS.Platform;
  /** One entry per file the installer will write. */
  fileOps: HookFileOp[];
  /** The managed-block proposal for .claude/settings.json — produced by
   *  CHUNK-10's managedBlock.ts. We just pass it through to the panel. */
  settingsJsonPlan: ManagedBlockPlan;
}

export interface HookFileOp {
  /** Workspace-relative path. */
  path: string;
  /** Whether the file currently exists. */
  exists: boolean;
  /** The bytes we are about to write. */
  proposedContent: string;
  /** The current bytes, if any — for the diff renderer. */
  currentContent: string | null;
  /** 0o755 for the .sh, 0o644 for the .ps1, 0o644 for settings.json. */
  mode: number;
}

// ManagedBlockPlan comes from CHUNK-10's managedBlock.ts; do NOT redefine here.
// Canonical path: extension/src/profiles/managedBlock.ts (CHUNK-10 owns it).
// CHUNK-10 exports:
//   export type ManagedBlockAction = 'create' | 'append-block' | 'replace-block' | 'noop';
//   export interface ManagedBlockPlan {
//     action: ManagedBlockAction;
//     next: string;
//     blockBody: string;
//   }
import type { ManagedBlockPlan } from '../profiles/managedBlock'; // CHUNK-10 path
```

### 5.3 Webview ↔ host messages

```ts
// contracts/src/diff.ts

export type DiffPanelInbound =
  | { kind: 'requestDiffOutcome'; resultId: string }
  | { kind: 'requestHookInstallPlan'; resultId: string }
  | { kind: 'applyHookInstall'; resultId: string }
  | { kind: 'openFile'; path: string }
  | { kind: 'copyPath'; path: string }
  | { kind: 'recomputeDiff'; resultId: string };

export type DiffPanelOutbound =
  | { kind: 'diffOutcome'; outcome: DiffOutcome }
  | { kind: 'hookInstallPlan'; plan: HookInstallPlan | null }   // null = profile not Claude Code
  | { kind: 'hookInstalled'; appliedAt: number }
  | { kind: 'error'; message: string };
```

### 5.4 PreToolUse hook return-code contract

This is the contract between DeliveryOS-generated scripts and Claude Code itself. Recorded here so the test plan (§ 8) and any future hook can honour it.

| Exit code | Meaning                              | DeliveryOS use            |
|-----------|--------------------------------------|---------------------------|
| `0`       | Allow tool call.                     | Default + fail-open path. |
| `2`       | Block. stderr shown to the model.    | The forbidden-path hit.   |
| other     | Tool error.                          | **Never use.**            |

---

## 6. Data model touched

The diff outcome is stored **on the existing Result Memory record**, not as a new memory type. Specifically:

- CHUNK-03 defines the canonical `ResultPayload` shape (the payload of `MemoryEntryOfType<'result'>`).
- The optional `diffOutcome?: DiffOutcome` slot is declared on `ResultPayload` by CHUNK-03 (not by CHUNK-12 and not by CHUNK-13).
- CHUNK-13's `diff/persist.ts` writes the outcome via `MemoryStore.update(resultId, { payload: { ..., diffOutcome } })`. CHUNK-03's persistence layer (`sql.js` row + JSON-blob body per research finding #1) round-trips the field as part of the existing serialisation. No schema migration is required because the field is optional and additive.

CHUNK-14 reads `result.payload.diffOutcome` to gate the verification step ("you cannot mark this verified if there are forbidden touches").

### What this chunk does NOT touch

- Execution Memory (briefs) — read-only.
- Codebase Memory — read-only.
- The memory links table (CHUNK-03) — no new link kinds.
- Verification Memory — does not exist yet; CHUNK-14 creates it.

---

## 7. VS Code APIs used

| API | Used for |
|-----|----------|
| `vscode.window.registerWebviewPanelSerializer` | Persisting the diff-results panel across reloads. |
| `vscode.window.createWebviewPanel` | Opening the panel from the tree item. |
| `vscode.commands.registerCommand` | `deliveryos.diff.openForResult`, `deliveryos.diff.installClaudeHook`, `deliveryos.diff.recompute`. |
| `vscode.commands.executeCommand('vscode.open', uri)` | "Open in editor" from a per-file row. |
| `vscode.workspace.fs.writeFile` | Writing the `.sh` / `.ps1` hook scripts and the patched `.claude/settings.json`. Always `Uint8Array` payload. |
| `vscode.workspace.fs.readFile` | Reading existing `.claude/settings.json` for the diff. Tolerate `FileNotFound` → treat as empty. |
| `vscode.workspace.fs.stat` | Pre-checking whether the hook scripts already exist (for the UX label "create" vs "update"). |
| `vscode.window.showWarningMessage` | Before writing — confirm overwrite when the user has edited the file outside the managed block. |
| `vscode.env.clipboard.writeText` | "Copy path" button on per-file rows. |
| `vscode.Uri.joinPath` | Building workspace-relative URIs for the hook scripts. |
| `vscode.workspace.workspaceFolders[0].uri` | Resolving the workspace root. Single-root only for MVP (multi-root deferred). |
| `process.platform` | Choosing `.sh` vs `.ps1` registration. |

We do **not** use `vscode.workspace.applyEdit` for the script writes — these are managed files, not source files, and writing them through `WorkspaceEdit` would put them on the undo stack inappropriately.

### File permissions on POSIX

`.sh` files must be executable. `vscode.workspace.fs.writeFile` does not expose `chmod`. Workaround: after writing, spawn `chmod +x` via `child_process.exec` (one call, await it). On Windows the `.ps1` has no executable bit; PowerShell associates by extension. Document this in the README — Mac/Linux users may need to "allow" the script the first time their OS asks (Gatekeeper / SELinux).

---

## 8. Diff-results panel UX

### 8.1 Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  [Tab: Diff Results]    [Tab: Hook Install]                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ╔═════════════════════════════════════════════════════════════╗  │
│  ║   FAIL — 1 forbidden touch in 12 changed files             ║  │
│  ║   Brief: "Refactor triage scoring" (v1, 2026-08-04 14:21)  ║  │
│  ╚═════════════════════════════════════════════════════════════╝  │
│                                                                   │
│  ▼ Forbidden touches (1)                              ✕           │
│      src/legacy/scorer.ts                                         │
│         Matched rule: `src/legacy/` (Section 8)                   │
│         [ Open ] [ Copy path ]                                    │
│                                                                   │
│  ▼ Unclassified (0)                                               │
│      (none)                                                       │
│                                                                   │
│  ▶ Allowed touches (11)                               ✓           │
│                                                                   │
│  ▶ Allowed but not touched (3)                        i           │
│         tests/triage/**/*.spec.ts                                 │
│         docs/triage.md                                            │
│         …                                                         │
│                                                                   │
│  [ Re-run diff ]   [ Open brief ]   [ Open result.md ]            │
└───────────────────────────────────────────────────────────────────┘
```

### 8.2 Banner

- Green if `verdict === 'pass'`, red if `verdict === 'fail'`. No "warning yellow" — this is a binary call.
- Headline copy:
  - PASS: `"PASS — {n} files changed, all within allowed scope"`.
  - FAIL: `"FAIL — {k} forbidden touch{s} in {n} changed files"`.
- Subtitle: brief title + version + timestamp (links to the brief).

### 8.3 Sections (top-down)

1. **Forbidden touches** — expanded by default if non-empty. Red icon. This is the section that matters.
2. **Unclassified touches** — collapsed by default; shows count. Yellow icon. Includes the small `<UnclassifiedNote />` "consider tightening the next brief".
3. **Allowed touches** — collapsed by default; shows count. Green icon. The "boring good case".
4. **Allowed but not touched** — collapsed by default; shows count. Info icon. Informational only — does NOT affect the verdict.

### 8.4 Per-file row

- Monospace path, left-aligned.
- Classification icon at the start of the line (Lucide `x-octagon`, `alert-triangle`, `check`, `info`).
- Matched rule on the second line in muted text.
- Right-side action buttons: "Open" and "Copy path" — both go through the messenger to the host.

### 8.5 Empty states

- Zero files changed: a single info panel "The harness reported no file changes. Did the run actually do anything?". Verdict still PASS by definition.
- No brief found for the result: error banner "Cannot diff — the brief linked to this result is missing.", with a "Re-run from brief" link that takes the user back to the brief composer.

---

## 9. Hook installer UX

### 9.1 Where it lives

A second tab on the diff-results panel labelled "Hook Install". The tab is **always present** for the Claude Code profile (regardless of whether the current diff is pass or fail — the hook is preventative, not reactive) and **disabled with an explanation** for the Codex profile ("Codex has no PreToolUse-equivalent hook in 2026; the post-hoc diff is the universal backstop.").

A second entry point: a button "Install forbidden-paths hook" on the brief composer's profile picker, shown when Claude Code is selected. Opens the same tab.

### 9.2 Tab contents

```
┌───────────────────────────────────────────────────────────────────┐
│   [Tab: Diff Results]    [Tab: Hook Install]                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Claude Code PreToolUse hook                                     │
│                                                                   │
│   This installs a small script that hard-blocks any Edit, Write,  │
│   or MultiEdit attempt against a path listed in the active        │
│   brief's Section 8 Forbidden Changes. It runs BEFORE Claude      │
│   Code's permission-mode check and cannot be bypassed by          │
│   `--dangerously-skip-permissions`.                               │
│                                                                   │
│   Files to be written (3):                                        │
│     • .claude/hooks/deliveryos-forbidden-paths.sh   (new, 755)    │
│     • .claude/hooks/deliveryos-forbidden-paths.ps1  (new, 644)    │
│     • .claude/settings.json                         (modified)    │
│                                                                   │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │ .claude/settings.json — proposed change                   │   │
│   │                                                           │   │
│   │   {                                                       │   │
│   │     "deliveryos.managed": {                               │   │
│   │ +     "hooks": {                                          │   │
│   │ +       "PreToolUse": [                                   │   │
│   │ +         { "matcher": "Edit|Write|MultiEdit",            │   │
│   │ +           "hooks": [ { "type": "command",               │   │
│   │ +             "command": ".claude/hooks/...sh" } ] }      │   │
│   │ +       ]                                                 │   │
│   │ +     }                                                   │   │
│   │     }                                                     │   │
│   │   }                                                       │   │
│   └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│   [ Apply ]    [ Cancel ]    [ View script ]                      │
└───────────────────────────────────────────────────────────────────┘
```

### 9.3 Apply flow

1. User clicks "Apply".
2. Host shows `showWarningMessage("DeliveryOS will write 3 files into .claude/. Continue?", { modal: false }, "Yes, write", "Cancel")`.
3. On confirm: write the two hook scripts (`vscode.workspace.fs.writeFile`), then `chmod +x` the `.sh` on POSIX, then write the updated `.claude/settings.json` (CHUNK-10's `managedBlock.ts` patches it).
4. Send `{ kind: 'hookInstalled', appliedAt: Date.now() }` back to the webview.
5. Webview re-fetches the plan; the tab now shows "Installed. Re-install to update." with the timestamp.

If the user has edited the managed block by hand, CHUNK-10's `managedBlock.ts` is expected to detect that (the existing block doesn't match the previous-generation hash) and offer a 3-way merge or refuse. CHUNK-13 surfaces whatever CHUNK-10 says.

### 9.4 Never silent

No write happens without an explicit "Apply" click after the user has seen the diff. Matches CHUNK-10's CLAUDE.md updater UX.

### 9.5 Known limitation — hook glob is weaker than picomatch (M17)

The brief composer (CHUNK-09) saves Forbidden patterns using the full **`picomatch`** grammar — `**` recursion, `{a,b}` brace expansion, character classes `[abc]`, leading `!` negation. The **post-hoc diff engine** honours all of that.

The **real-time Claude Code PreToolUse hook scripts**, however, can only run inside the host shell (POSIX `case`, PowerShell `-like`). Both are strictly weaker than picomatch:

| Construct                   | Post-hoc diff (picomatch) | Real-time hook (shell) |
|-----------------------------|---------------------------|------------------------|
| `*`, `?` single-segment     | Yes                       | Yes                    |
| `**` recursive              | Yes                       | **Collapses to `*`** (single segment only) |
| `{a,b}` brace expansion     | Yes                       | **Not supported** (treated literally) |
| `[abc]` character classes   | Yes                       | Partial (POSIX only)   |
| `!` negation                | Yes                       | **Not supported**      |

A Forbidden pattern that exercises `**`, `{a,b}`, or `!` is enforced **post-hoc but NOT in real time**. The hook fails open on under-match and the post-hoc diff catches the violation after the fact — the harness has already written the file, but the verdict still surfaces as FAIL and CHUNK-14 still blocks the release.

**UX requirement.** CHUNK-09's brief composer (which already validates Forbidden globs at save time) **warns** when a Forbidden pattern uses any construct the Claude Code PreToolUse hook cannot enforce in real time. Suggested copy:

> "This pattern uses `**` (or `{a,b}`, or `!`), which the Claude Code PreToolUse hook cannot enforce in real time. The post-hoc diff will still catch a violation, but the harness may have already written the file. Consider rewriting as one or more single-segment globs for stronger real-time protection."

This is **docs-only / UX-only** — the diff engine itself is unaffected, and the hook scripts above already silently collapse `**` → `*`. The warning sets the user's expectation correctly; the README captures the same caveat (CHUNK-16).

---

## 10. Step-by-step implementation outline

A suggested order for the 4–5 session-days.

### Day 1 — engine

- Add `picomatch` and `@types/picomatch` to `extension/package.json`.
- Write `extension/src/diff/picomatchAdapter.ts` with the path-normalisation logic.
- Write `extension/src/diff/types.ts`.
- Write `extension/src/diff/engine.ts` — the pure `runDiff(input)` function.
- Write `extension/test/diff/engine.spec.ts` and `picomatchAdapter.spec.ts` covering: matching, negation, trailing-slash directories, Windows-style backslash inputs, forbidden-wins-over-allowed, the three classifications, and the unmatched-allowed list.

### Day 2 — wire into Result Memory + tree

- Confirm CHUNK-03's `ResultPayload` declares the optional `diffOutcome?: DiffOutcome` slot (CHUNK-03 owns this — CHUNK-13 does not edit `contracts/src/memory.ts`).
- Write `extension/src/diff/runForResult.ts` — load brief, run diff, hand the outcome to `diff/persist.ts`.
- Write `extension/src/diff/persist.ts` — single `persistDiffOutcome(resultId, outcome)` call that delegates to `MemoryStore.update(resultId, { payload: { ..., diffOutcome } })`.
- Wire it into CHUNK-12's result-capture pipeline so every new result auto-diffs. Also expose `deliveryos.diff.recompute` for the "Re-run diff" button.
- Write `extension/src/diff/diffTreeContribution.ts` exporting `diffOutcomeChildBuilder(resultNode)`; `extension/src/tree/stageTreeProvider.ts` (CHUNK-02's canonical single tree-provider file) imports it to attach the diff-outcome child to each Result Memory tree item. Results live under EXECUTE per CHUNK-12, so the diff-outcome child inherits that placement (reads `payload.diffOutcome`).

### Day 3 — webview panel

- Write `contracts/src/diff.ts` and register it in `contracts/src/index.ts`.
- Write `extension/src/panels/diff-results/diffResultsHost.ts` and `diffResultsCommand.ts`.
- Build the React panel:
  - `webview/src/panels/diff-results/main.tsx`
  - `DiffResultsApp.tsx`, `PassFailBanner.tsx`, `FileSection.tsx`, `PerFileVerdict.tsx`, `UnclassifiedNote.tsx`
  - Hook the Open / Copy buttons through the messenger.
- Manual smoke test: open on a real Result Memory entry, confirm the layout, confirm Open/Copy work.

### Day 4 — hook generator (POSIX)

- Write `extension/src/hooks/forbiddenPathsScript.ts` with the POSIX template string.
- Write `extension/src/hooks/hookInstallPlan.ts` and `preToolUseGenerator.ts`. The generator consumes CHUNK-10's `applyManagedBlock(existing, body, 'json')` from `extension/src/profiles/managedBlock.ts` for the settings.json patch.
- Build `webview/src/panels/diff-results/HookInstallTab.tsx`.
- Manual end-to-end test on macOS / Linux:
  - Brief forbids `src/legacy/`.
  - Install the hook.
  - In the Claude Code terminal, ask Claude to `Edit src/legacy/foo.ts`.
  - Confirm Claude reports the block with our stderr message.
  - Confirm `--dangerously-skip-permissions` does NOT bypass it (the load-bearing finding).
- Run `shellcheck` on the generated script.

### Day 5 — Windows + polish + tests

- Add the PowerShell template; branch the generator on `process.platform`.
- Cross-OS test the diff engine (CI matrix or local VM).
- Test on a Windows host: install hook, trigger Claude Code, confirm block.
- Run `extension/test/hooks/preToolUseGenerator.spec.ts` against fixture briefs (including ones with shell metacharacters in pattern bullets — see § 11 risks).
- Add the demo seed: `examples/demo-brief-forbids-legacy.md` + a small script that drives the BugTriage demo to produce a forbidden touch. This dovetails with CHUNK-15 (demo build) but lives here as a regression check.
- Update VERIFY tree icons / colour for pass vs fail.

---

## 11. Test plan

The test plan combines fast unit tests, a `shellcheck` pass, and two end-to-end demos. CHUNK-15 (demo build) reuses the end-to-end harness.

### 11.1 Unit tests — `extension/test/diff/engine.spec.ts`

| Test | Setup | Expected |
|------|-------|----------|
| Empty inputs | `{ allowed: [], forbidden: [], filesChanged: { fromGit: [], fromHarness: [], gitAvailable: true } }` | `verdict: 'pass'`, no files. |
| Pure allowed | allow `src/**`, change `src/a.ts` | `verdict: 'pass'`, classification `allowed-and-touched`. |
| Pure forbidden | forbid `src/legacy/`, change `src/legacy/foo.ts` | `verdict: 'fail'`, classification `forbidden-but-touched`, matchedRule `src/legacy/`, matchedSection `8`. |
| Forbidden wins over allowed | allow `src/**`, forbid `src/legacy/`, change `src/legacy/foo.ts` | `verdict: 'fail'`, matchedSection `8`. |
| Unclassified | allow `src/**`, change `docs/readme.md` | `verdict: 'pass'`, classification `unclassified-but-touched`. |
| Allowed but not touched | allow `tests/**`, change `src/a.ts` | `verdict: 'pass'`, `unmatchedAllowedPatterns: ['tests/**']`, plus an `unclassified-but-touched` entry. |
| Negation | allow `src/**`, forbid `!src/safe.ts`, change `src/safe.ts` | Negation handling — see § 11.5. |
| Pre-normalised directory glob | forbid `node_modules/**` (the post-CHUNK-09-parse form of the trailing-slash shorthand), change `node_modules/foo/bar.js` | Block. The engine never sees the raw `node_modules/` form — that normalisation lives in CHUNK-09. |
| Exact-path match | forbid `package.json`, change `package.json` | Block. |
| Windows-style input | change `src\\legacy\\foo.ts` (backslash) | Normalised to forward slash before matching; block triggers. |
| Stable ordering | identical inputs run twice | Identical outputs (no Map iteration determinism issues). |

### 11.2 `picomatchAdapter.spec.ts`

| Test | Setup | Expected |
|------|-------|----------|
| Forward-slash invariance | Same pattern, paths `src/a` and `src\\a` | Both match. |
| Dotfile match | Pattern `**/*`, path `.deliveryos-handoff/x.md` | Matches (we set `dot: true`). |
| Case sensitivity | Pattern `Src/a.ts`, path `src/a.ts` | Does NOT match (Linux-style). |
| Pattern with leading `./` | `./src/a.ts` and `src/a.ts` should normalise equivalently | Both match. |

### 11.3 Hook installer tests — `preToolUseGenerator.spec.ts`

| Test | Setup | Expected |
|------|-------|----------|
| Platform branch | Stub `process.platform = 'darwin'` | Plan registers the `.sh`. |
| Platform branch | Stub `process.platform = 'win32'` | Plan registers the `.ps1`. |
| Always writes both scripts | Either platform | Both files appear in `fileOps`. |
| First-time install | No existing `.claude/settings.json` | Plan creates it with the managed block only. |
| Update install | Existing settings.json with our previous managed block | Plan replaces only the block. |
| Conflict | User edited inside the managed block | CHUNK-10's `managedBlock.ts` flags conflict; we surface a warning. |
| Pattern with shell metacharacters in brief | Brief Section 8 contains `src/*; rm -rf /` | The script does NOT execute it; pattern is treated literally by `case ... in PATTERN)`. Verified by writing the brief, running the script with a benign target, and asserting `rm` never ran. |
| Apostrophe / backtick in pattern | Brief Section 8 contains `src/a's b.ts` | Script handles the apostrophe (single-quoted via `printf '%s'`); pattern matched literally. |

### 11.4 `shellcheck` pass

`extension/test/hooks/forbiddenPathsScript.shellcheck.ts` writes the POSIX template to a tempfile and runs `shellcheck -s bash`. The template must be `shellcheck`-clean (we accept `# shellcheck disable=` annotations where shellcheck cannot prove safety — see the inline note above the `case "$TARGET" in $PATTERN)` line).

### 11.5 Negation semantics

Negation patterns (`!pattern`) on the forbidden list mean "this is an exception to a broader forbidden rule" — i.e. unblock. On the allowed list, `!pattern` means "do not auto-allow this even though a broader pattern would". `picomatch` supports `!` as a leading character in patterns when called via `picomatch.matcher`. We unit-test:

- Allowed `src/**`, forbidden `src/legacy/**`, negation `!src/legacy/escape-hatch.ts` on the forbidden list, change `src/legacy/escape-hatch.ts` → allowed (verdict pass).
- Same setup, change `src/legacy/danger.ts` → forbidden (verdict fail).

The negation marker is documented in CHUNK-09's brief schema; this chunk's only responsibility is to honour it.

### 11.6 End-to-end demo — Claude Code (the headline test)

1. Open the demo workspace. Set the active profile to Claude Code.
2. Generate a brief that includes:
   ```
   ## 8. Forbidden Changes
   - `src/legacy/`
   - `package.json`
   ```
3. Save the brief.
4. Open the diff-results panel for any prior result and install the hook.
5. Launch Claude Code via "Run with Claude Code" (CHUNK-11). Type into the Claude Code terminal: "Edit src/legacy/foo.ts to add a comment."
6. **Expected:** Claude Code reports an immediate block with our stderr message: `DeliveryOS: blocked write to "src/legacy/foo.ts" — matches Forbidden rule "src/legacy/" in current brief.`
7. Repeat with `claude --dangerously-skip-permissions ...`. **Expected:** still blocked. This is the load-bearing finding.
8. Ask Claude to modify an allowed file (`src/triage/scorer.ts`). **Expected:** succeeds.
9. After completion, open the diff-results panel for the new result. **Expected:** PASS (no forbidden touch, because the hook blocked it).

### 11.7 End-to-end demo — Codex (the backstop test)

1. Open the same workspace. Set the active profile to Codex.
2. Save the same brief.
3. Note that the "Hook Install" tab is disabled with the Codex explainer copy.
4. Launch Codex via "Run with Codex" (CHUNK-11) and ask it to "modify src/legacy/foo.ts".
5. Codex obliges (no real-time block — there is no hook layer).
6. The `result.md` arrives; the diff engine runs automatically.
7. **Expected:** diff results panel opens (or surfaces a notification) with FAIL: `src/legacy/foo.ts — Section 8 rule "src/legacy/"`.

### 11.8 Cross-OS glob test (Windows)

On a Windows host:

1. Brief forbids `src/legacy/`.
2. Trigger a result whose `filesChanged.fromGit` contains `[{ path: 'src\\legacy\\foo.ts', status: 'modified' }]` (matches CHUNK-12's canonical `GitFileChange.status` union — full-word strings, not single letters; Git on Windows still reports forward slashes, but defensively test both — see CHUNK-12's normalisation).
3. **Expected:** the diff engine still flags it (the adapter normalises before matching).

### 11.9 Hook-escape test

A brief whose Forbidden section contains shell metacharacters:

```
## 8. Forbidden Changes
- `src/a;rm -rf /`
- `src/$(touch /tmp/pwned).ts`
- `src/\`echo hi\``
```

Run the generated `.sh` against a benign target (`src/safe.ts`). **Expected:** no side effects in `/tmp`, no `pwned` file, no shell expansion happens. The patterns are passed to `case "$TARGET" in $PATTERN)` which only treats `*`, `?`, `[...]` as metacharacters — `;`, `$`, backtick are literal. Same defence applies on PowerShell side because we use `-like` which only honours `*` and `?`.

---

## 12. Risks, edge cases and open questions

### Glob semantics across OSes

`picomatch` is well-tested on Windows (forward-slash internal model, backslash inputs normalised). Risk is residual: case sensitivity differs (HFS+ case-insensitive, ext4 case-sensitive, NTFS configurable). MVP picks `nocase: false` — the deterministic Linux-style behaviour — and surfaces an info note in the diff panel if it detects a Windows host running case-insensitive matches that would have produced different results. Defer fancy detection to v2.

The POSIX shell `case` glob inside the hook script is strictly weaker than picomatch (no `**` recursion, no negation, no brace expansion). Trailing-slash shorthand is normalised by CHUNK-09 at parse time (M16) — the hook script does not see it. For everything else, the hook rewrites `**` to `*` (single-segment match) and treats `{a,b}` / `!` literally. The detailed gap table lives in § 9.5 (Known limitation). For deep recursive patterns the hook will under-match — i.e. some forbidden touches will get through the hook, fall to the harness, and get caught by the post-hoc diff. That's acceptable: the hook is a **first line of defence**, not a **complete** defence. CHUNK-14 verification still gates release. **Documented in § 9.5, in the brief composer warning copy (CHUNK-09), and in the README (CHUNK-16).**

### Hook script exploitability if the brief contains shell metacharacters

Mitigated by:

- Pattern bullets are read at runtime, never inlined into the script body. A shell-metacharacter brief is read into `$PATTERN`, which is then used in `case ... in $PATTERN)` — `case` only honours `*`, `?`, `[...]` regardless of the rest of the string.
- `printf '%s'` everywhere; no `echo -e`.
- No `eval`, no command substitution applied to brief content.
- Test § 11.9 verifies this explicitly with adversarial briefs.

Residual risk: if someone tampers with `.deliveryos-handoff/current-execution-brief.md` directly (outside DeliveryOS), they could potentially write a pattern that exploits a yet-unknown corner of POSIX shell glob. Mitigation is the workspace-trust gate (CHUNK-01 sets `untrustedWorkspaces.supported: false`); the threat model assumes the workspace is trusted.

### `.claude/settings.json` managed-block convention

`.claude/settings.json` is JSON, not JSONC. CHUNK-10 (the canonical owner of managed-block syntax) chose a **single sentinel-key** convention: a top-level key `"deliveryos.managed"` whose object value contains every DeliveryOS-managed sub-tree (profile metadata, hooks, etc.). CHUNK-10 § 5.3 stubbed `deliveryos.managed.hooks` as the hook-registration path; CHUNK-13 writes into exactly that slot via `applyManagedBlock(existing, body, 'json')`.

CHUNK-13 does **not** define its own managed-block primitives, **does not** use HTML-comment-style markers (`<!-- DELIVERYOS:BEGIN ... -->`), and **does not** use the older BEGIN/END string-key form (`"// DELIVERYOS:BEGIN <id>"` / `"// DELIVERYOS:END <id>"`) — those were removed in Prompt 4 to reconcile with CHUNK-10 (audit finding B01). If CHUNK-10's syntax ever changes, this chunk follows without any local edits.

### Codex has no equivalent enforcement

By design and per research finding #5. Post-hoc diff is the universal backstop. We surface a clear explainer in the Hook Install tab (Codex profile) so the user understands why the tab is disabled — this is a *correct* design decision, not a missing feature.

### Multi-root workspaces

Not supported in MVP. The diff engine and hook installer assume `vscode.workspace.workspaceFolders[0]`. Detect multi-root on activation and show a one-time notice "DeliveryOS targets a single workspace folder; multi-root projects are a future feature." (Inherited from CHUNK-01 / CHUNK-02 — confirm with those chunks.)

### Re-diffing after engine version bump

If we change the diff algorithm post-release (engineVersion 1 → 2), existing Result Memory records still carry their v1 outcome. The "Re-run diff" button always re-computes against the current engine. The tree node surfaces a subtle "outdated diff" indicator when `parsedResult.diffOutcome.engineVersion < CURRENT_ENGINE_VERSION`.

### Open questions (resolved at implementation time, not now)

- Should the hook also block on `Bash` tool calls that look like file mutations (`rm`, `mv`, `cp`, `>>`, `>` redirect)? **Deferred.** The Edit/Write/MultiEdit trio covers 95% of Claude Code's file-touching behaviour. Bash instrumentation is large and noisy.
- Should the diff also surface "files the harness *claimed* it changed in `result.md` but that don't appear in `git diff`"? Possibly informative — defer to CHUNK-14.
- Should `.gitignore`d files in `filesChanged` (e.g. `dist/foo.js`) be silently dropped? Probably yes. Defer to CHUNK-12's git capture layer — CHUNK-13 trusts whatever list it gets.

---

## 13. Explicit dependencies and downstream exposure

### Upstream (must land first)

- **CHUNK-02** — webview shell + messenger contract. The diff-results panel and hook-install tab plug into the existing messenger pattern.
- **CHUNK-03** — memory persistence. The `DiffOutcome` rides on Result Memory's existing storage.
- **CHUNK-09** — `briefMarkdown.ts` parser exposes parsed Section 7 + Section 8 bullet arrays. Brief Section 8 must be a markdown bullet list; the parser handles `-`, `*`, leading whitespace, trailing whitespace, and backtick-wrapped patterns.
- **CHUNK-10** — Harness Profile schema (we read `profile.name === 'claude-code'` to decide whether to enable the hook tab) AND `extension/src/profiles/managedBlock.ts` (we call `applyManagedBlock(existing, body, 'json')`; it returns a `ManagedBlockPlan` — `{ action, next, blockBody }` — that we render and apply). CHUNK-13 writes hook content into `deliveryos.managed.hooks` per CHUNK-10 § 5.3.
- **CHUNK-11** — handoff directory constants (`.deliveryos-handoff/current-execution-brief.md` path). The hook script's brief path matches.
- **CHUNK-12** — `ResultPayload.filesChanged` (the canonical `FilesChangedList { fromGit, fromHarness, gitAvailable }` shape) populated from `git diff --name-only HEAD`. The diff engine flattens `fromGit.map(c => c.path)` internally.

### Downstream (this chunk exposes)

- **CHUNK-14** — verification reads `result.payload.diffOutcome.verdict` to gate the "Mark verified" action. A FAIL outcome should require an explicit "override" with a justification recorded into Verification Memory (CHUNK-14 owns that policy).
- **CHUNK-15** — Bug Triage demo. The scripted demo deliberately produces a forbidden touch to showcase both the real-time block (Claude Code) and the post-hoc diff (Codex). Demo seed brief lives under `examples/`.
- **CHUNK-16** — README, essay, GitHub Release. The PreToolUse hook + `--dangerously-skip-permissions` story is the lead anecdote.

### Cross-chunk contracts honoured (not redefined)

- Memory schema → CHUNK-03.
- Webview message contract style → CHUNK-02.
- Execution Brief markdown schema → CHUNK-09.
- Harness Profile schema → CHUNK-10.
- Managed-block syntax (`<!-- DELIVERYOS:BEGIN ... -->` markers for markdown, single sentinel key `"deliveryos.managed": { ... }` for JSON) → CHUNK-10. CHUNK-13 consumes `applyManagedBlock(existing, body, 'json')` only.
- Handoff directory layout → CHUNK-11.
- `ResultPayload` shape → CHUNK-03; the optional `diffOutcome` slot is declared by CHUNK-03 (M05 reconciliation), not added by CHUNK-13.

---

## Appendix A — Quick reference: the four diff-outcome classes

| Classification              | Triggered by                                              | Counts toward FAIL? | Default panel state |
|-----------------------------|-----------------------------------------------------------|---------------------|---------------------|
| `allowed-and-touched`       | path matches an allowed pattern, no forbidden match       | no                  | collapsed           |
| `allowed-but-not-touched`   | *per-pattern* — an allowed bullet for which no file matched | no (info only)    | collapsed           |
| `forbidden-but-touched`     | path matches a forbidden pattern (overrides allowed)      | **yes**             | expanded            |
| `unclassified-but-touched`  | path matches neither allowed nor forbidden                | no (warn, fail-open) | collapsed           |

---

## Appendix B — When this chunk is done

- A harness run that touches a Forbidden path is caught by the post-hoc diff and surfaced as a clear FAIL panel — both profiles.
- A harness run that touches only Allowed paths is captured as a clear PASS panel — both profiles.
- For Claude Code: the generated PreToolUse hook successfully blocks a real `Edit` attempt on a Forbidden path. Confirmed with and without `--dangerously-skip-permissions`. **This is the headline demo moment.**
- The "Hook Install" tab is enabled for the Claude Code profile and disabled (with explainer) for Codex.
- VERIFY tree node shows the diff outcome under each result.
- `DiffOutcome` is persisted on the existing Result Memory and survives a window reload.
- All Day-1 / Day-3 unit tests green; the `shellcheck` pass is clean; the cross-OS glob test green on macOS, Linux, and Windows.
- **BUILD-PLAN Phase 3 / Week 11 demoable state achieved:** "a harness run that touches a forbidden file is caught and flagged automatically — and on Claude Code, blocked in real time before the model ever touches the file."

Hand off to CHUNK-14 (verification + memory update + release evidence).
