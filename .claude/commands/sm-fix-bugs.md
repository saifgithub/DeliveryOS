---
description: Triage open bugs from docs/build/bugs.json and fix the easy ones, isolated to a fresh git worktree so the work cannot collide with build-cycle chunk work on main. Bug tracking is a flat JSON file — enough for a solo build or small team without a distributed tracker.
---

# /sm-fix-bugs

> Command source. Canonical copy in `docs/commands/`; active copy in `.claude/commands/sm-fix-bugs.md`, which Claude Code reads. Version-controlled so protocol changes are reviewable.

Triage the open bugs in `docs/build/bugs.json` and fix the easy ones, isolated to a fresh git worktree so the work cannot collide with whatever chunk build is running on `main`.

This is the bug-fix track. Feature and chunk work lives in the multi-agent build process (`docs/MULTI_AGENT_BUILD_PROCESS.md`). The guardrails below are the contract between the two: break them and you risk silent merge conflicts later.

## bugs.json schema

> This file's path (`docs/build/bugs.json`) and schema are this project's own convention — swap the
> path and fields for whatever tracker a different project uses. `/sm-readpoint` only
> surfaces a count + titles at session start (`docs/MULTI_AGENT_BUILD_PROCESS.md` §12); this command
> needs the full read/claim/write protocol below, so it isn't wired through that surface.

Bugs live in one version-controlled JSON file — `docs/build/bugs.json` — which is enough for a solo build (one person, plus QA sub-agents that occasionally surface a non-blocking issue). One entry per bug:

```json
{
  "bugs": [
    {
      "id": "b001",
      "title": "one-line summary",
      "category": "activation | ui | webview | handoff | memory | packaging | profile | verification | build | docs | other",
      "status": "open | in_progress | pending_review | resolved | wont_fix",
      "steps": "how to reproduce",
      "created_at": "YYYY-MM-DD",
      "assigned_branch": null,
      "note": "",
      "fixed_commit": null
    }
  ]
}
```

Anyone who finds a bug (the project owner, or a QA sub-agent surfacing a non-blocking issue) appends an entry with `status` set to `open` and the next free `id`. IDs are sequential: `b001`, `b002`, and so on.

## Hard rules

1. **Never edit on `main`.** Spawn a worktree and branch (step 1). All commits go there. The project owner merges to `main` after review.
2. **Claim before fixing.** Set the bug's `status` to `in_progress` and `assigned_branch` to your branch in `docs/build/bugs.json`, and commit that change first. The committed claim is how a parallel session (rare, but cheap to guard against) sees the bug is taken. Only claim bugs that are currently `open`.
3. **Bug budget per session: 3.** Fix at most 3 bugs in one worktree, then surface. Smaller batches mean trivial merges. If 3 is not enough, run `/sm-fix-bugs` again: fresh worktree, fresh budget.
4. **Hands off these files** without an explicit `ok` from the project owner first. This is
   DeliveryOS's own list — replace with your project's entry point, build config, packaging
   manifest, and architect-owned process docs:
   - `package.json` (contribution points and activation events; a wrong edit breaks the whole extension)
   - `src/extension.ts`, or whatever the activation entry point is
   - `tsconfig.json` and the bundler config (esbuild or webpack)
   - `.vscodeignore`
   - `.claude/commands/*` (protocol; humans own these)
   - `docs/planning/chunks/*` and everything under `docs/build/` except `bugs.json` (architect-owned process state)
   - the spec docs: `docs/PRD.md`, `docs/MULTI_AGENT_BUILD_PROCESS.md`, `docs/BUILD-PLAN.md`, `docs/architecture/*`, `docs/decisions/*`

   A bug whose fix needs one of these is `medium` at least; surface a plan first.
5. **Each fix is its own commit.** Message prefix: `fix(bug:<id>): <summary>`. Makes git blame point straight at the bug entry.
6. **Never publish the extension.** No `vsce publish`, no release. The project owner decides when to ship.
7. **Do not mark a bug `resolved`** in `bugs.json`. `resolved` is the post-merge confirmation status; only the project owner sets it after merging. `/sm-fix-bugs` only ever sets `open` to `in_progress` (claim) to `pending_review` (committed).

## Triage matrix

Classify each open bug before touching code.

| Bucket | Examples | Action |
|---|---|---|
| **tiny** | Typo, copy change, label fix, a wrong icon path, a threshold tweak | Fix autonomously. Commit. |
| **small** | 1 to 2 files, well bounded, no design call (a missing webview refresh, a wrong command title, an off-by-one in a list view) | Fix autonomously. Commit. |
| **medium** | Cross-cutting (multiple modules), needs a design decision, or touches a hands-off file | Surface a plan via AskUserQuestion or ExitPlanMode. Wait for `ok`. Then fix. |
| **large** | Architectural (rework the memory store, change the handoff protocol), needs new infrastructure, or changes a data model | Do NOT fix. Leave `status` as `open`, add a `note`. The project owner plans it as a chunk. |

Be honest about classification. A "small" fix that balloons into a multi-file refactor mid-stream: stop, set the bug to `wont_fix` with a note explaining what you found, surface to the project owner. Do not push through.

## Step by step

### 1. Spawn an isolated worktree

```bash
TS=$(date +%Y%m%d-%H%M%S)
BRANCH="claude/bug-fix-${TS}"
WT_PATH=".claude/worktrees/bug-fix-${TS}"
git worktree add -b "${BRANCH}" "${WT_PATH}" main
cd "${WT_PATH}"
```

Record the branch name. Every claim in step 3 writes it to the bug's `assigned_branch`.

### 2. Read the open bugs

```bash
cat docs/build/bugs.json
```

Filter to entries with `status` set to `open`.

### 3. Triage all, then claim only what you will work this session

Bucket every open bug with the triage matrix. Then, before editing any code, claim the ones you will fix (up to 3): edit `docs/build/bugs.json`, set each claimed bug's `status` to `in_progress` and `assigned_branch` to `${BRANCH}`, and commit:

```bash
git add docs/build/bugs.json
git commit -m "chore(bugs): claim bNNN, bNNN for ${BRANCH}"
```

If a bug you wanted is no longer `open` when you read the file, someone else claimed it; skip it.

### 4. Fix, test, commit, one bug at a time

For each claimed bug:

1. Read enough of the codebase to understand the scope. If it balloons past your triage, stop: reclassify, surface, and either release the claim (set `status` back to `open`, `assigned_branch` to `null`) or set `wont_fix` with a note.
2. Make the change. Run the relevant checks — these are DeliveryOS's own stack (npm/TypeScript/VS
   Code); swap for your project's build/lint/test commands:
   - TypeScript compiles: `npm run compile`
   - Lint clean: `npm run lint`
   - Unit tests: `npm test`
   - If the change touches the VS Code API surface, the extension integration suite: `npm run test:integration`
3. Commit the code fix:
   ```bash
   git add <only the files for this bug>
   git commit -m "fix(bug:<id>): <one-line summary>

   <2 to 4 line body: root cause and the change>
   Bug: <id>"
   ```
4. Update `docs/build/bugs.json`: set the bug's `status` to `pending_review` and `fixed_commit` to the commit hash. Commit that:
   ```bash
   git add docs/build/bugs.json
   git commit -m "chore(bugs): <id> pending_review"
   ```

### 5. Surface the report

Print a structured summary for the project owner, one line per bug touched. State explicitly which bugs are `pending_review` (fix committed on the branch), which are `wont_fix` and why, which medium or large ones are surfacing for planning, and the branch plus worktree path for the merge.

```
$ /sm-fix-bugs — 2026-05-21 14:30 — claude/bug-fix-20260521-143000

Fixed (pending_review on claude/bug-fix-20260521-143000):
  b004  Sidebar icon missing after sideload into Cursor      [tiny]
  b007  Webview does not refresh after a brief is generated  [small]

Surfaced (awaiting your call):
  b009  Memory store schema needs a migration path           [medium]
        Plan in chat above. ok = I fix it. plan = adjust scope.

Deferred (large; needs planning as a chunk):
  b011  Rework handoff protocol for multi-root workspaces

To merge:
  git merge --no-ff claude/bug-fix-20260521-143000
  git worktree remove .claude/worktrees/bug-fix-20260521-143000
```

## What NOT to do

Beyond the hard rules above: no `git push` or `--force`; no `--no-verify` (if a pre-commit hook fails, fix what it found); no mass-fix sprees or "while I am here" tidying of unrelated code; no new files unless the bug explicitly demands them (new modules are chunk work).

## Recovery

If a session crashes, fills up, or is interrupted mid-fix:

1. Any bug stuck at `status` of `in_progress` with your branch in `assigned_branch` is yours to release or resume.
2. To release (so the next `/sm-fix-bugs` run can pick it up): set `status` back to `open` and `assigned_branch` to `null`, commit.
3. To resume: keep the worktree, finish the fix, commit, set `pending_review`.
