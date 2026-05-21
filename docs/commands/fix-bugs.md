---
description: Triage open bugs from docs/build/bugs.json and fix the easy ones, isolated to a fresh git worktree so the work cannot collide with build-cycle chunk work on main. Bug tracking is a simple JSON file — DeliveryOS is a solo build with no distributed testers.
---

# /fix-bugs

> Command source. Copy this file to `.claude/commands/fix-bugs.md` for Claude Code to pick it up. It is kept here, version-controlled, so changes to the protocol are reviewable.

Triage the open bugs in `docs/build/bugs.json` and fix the easy ones, isolated to a fresh git worktree so the work cannot collide with whatever chunk build is running on `main`.

This is the bug-fix track. Feature and chunk work lives in the multi-agent build process (`docs/MULTI_AGENT_BUILD_PROCESS.md`). The guardrails below are the contract between the two: break them and you risk silent merge conflicts later.

## Why a JSON file, not a database

DeliveryOS tracks bugs in a single version-controlled JSON file, `docs/build/bugs.json`. That is enough because DeliveryOS is a solo build: one person finds and fixes bugs, plus QA sub-agents that occasionally surface a non-blocking issue.

Other projects (for example AMI) use a PostgreSQL `bug_reports` table because they have distributed testers submitting reports remotely and need concurrent, distributed log reporting. DeliveryOS does not. A JSON file in the repo is simpler, diffs cleanly, travels with the code, and needs no service.

## bugs.json schema

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

Anyone who finds a bug (Saiful, or a QA sub-agent surfacing a non-blocking issue) appends an entry with `status` set to `open` and the next free `id`. IDs are sequential: `b001`, `b002`, and so on.

## Hard rules

1. **Never edit on `main`.** Spawn a worktree and branch (step 1). All commits go there. Saiful merges to `main` after review.
2. **Claim before fixing.** Set the bug's `status` to `in_progress` and `assigned_branch` to your branch in `docs/build/bugs.json`, and commit that change first. The committed claim is how a parallel session (rare, but cheap to guard against) sees the bug is taken. Only claim bugs that are currently `open`.
3. **Bug budget per session: 3.** Fix at most 3 bugs in one worktree, then surface. Smaller batches mean trivial merges. If 3 is not enough, run `/fix-bugs` again: fresh worktree, fresh budget.
4. **Hands off these files** without an explicit `ok` from Saiful first:
   - `package.json` (contribution points and activation events; a wrong edit breaks the whole extension)
   - `src/extension.ts`, or whatever the activation entry point is
   - `tsconfig.json` and the bundler config (esbuild or webpack)
   - `.vscodeignore`
   - `.claude/commands/*` (protocol; humans own these)
   - `docs/planning/chunks/*` and everything under `docs/build/` except `bugs.json` (architect-owned process state)
   - the spec docs: `docs/PRD.md`, `docs/MULTI_AGENT_BUILD_PROCESS.md`, `docs/BUILD-PLAN.md`, `docs/architecture/*`, `docs/decisions/*`

   A bug whose fix needs one of these is `medium` at least; surface a plan first.
5. **Each fix is its own commit.** Message prefix: `fix(bug:<id>): <summary>`. Makes git blame point straight at the bug entry.
6. **Never publish the extension.** No `vsce publish`, no release. Saiful decides when to ship.
7. **Do not mark a bug `resolved`** in `bugs.json`. `resolved` is the post-merge confirmation status; only Saiful sets it after merging. `/fix-bugs` only ever sets `open` to `in_progress` (claim) to `pending_review` (committed).

## Triage matrix

Classify each open bug before touching code.

| Bucket | Examples | Action |
|---|---|---|
| **tiny** | Typo, copy change, label fix, a wrong icon path, a threshold tweak | Fix autonomously. Commit. |
| **small** | 1 to 2 files, well bounded, no design call (a missing webview refresh, a wrong command title, an off-by-one in a list view) | Fix autonomously. Commit. |
| **medium** | Cross-cutting (multiple modules), needs a design decision, or touches a hands-off file | Surface a plan via AskUserQuestion or ExitPlanMode. Wait for `ok`. Then fix. |
| **large** | Architectural (rework the memory store, change the handoff protocol), needs new infrastructure, or changes a data model | Do NOT fix. Leave `status` as `open`, add a `note`. Saiful plans it as a chunk. |

Be honest about classification. A "small" fix that balloons into a multi-file refactor mid-stream: stop, set the bug to `wont_fix` with a note explaining what you found, surface to Saiful. Do not push through.

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
2. Make the change. Run the relevant checks:
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

Print a structured summary for Saiful, one line per bug touched. State explicitly which bugs are `pending_review` (fix committed on the branch), which are `wont_fix` and why, which medium or large ones are surfacing for planning, and the branch plus worktree path for the merge.

```
$ /fix-bugs — 2026-05-21 14:30 — claude/bug-fix-20260521-143000

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

- No `git push`. No `--force`, ever.
- No `--no-verify` on commits. If a pre-commit hook fails, fix what it found.
- No mass-fix sprees. 3 bugs max. Resist "while I am here" tidying of unrelated code.
- No new files unless the bug explicitly demands them. Bug fixes edit existing files; new modules are chunk work.
- No `vsce publish` and no release from `/fix-bugs`.
- No marking bugs `resolved`. That is the merge-time flip; Saiful owns it.
- No editing the architect-owned process docs or chunk specs from a bug-fix session.

## Recovery

If a session crashes, fills up, or is interrupted mid-fix:

1. Any bug stuck at `status` of `in_progress` with your branch in `assigned_branch` is yours to release or resume.
2. To release (so the next `/fix-bugs` run can pick it up): set `status` back to `open` and `assigned_branch` to `null`, commit.
3. To resume: keep the worktree, finish the fix, commit, set `pending_review`.

## Why this works

- **Worktree isolation:** every fix session has its own checkout and cannot collide with chunk builds on `main`.
- **Committed claim:** the claim is a committed JSON edit, so a parallel session sees it.
- **Small batches:** 3-bug branches merge trivially.
- **Hands-off list:** high-conflict files always route through Saiful.
- **No-publish rule:** the bug track never ships; Saiful decides when.

The cost is a few minutes of overhead per session. The payoff is clean merges and never untangling a collision between a bug fix and a chunk build at 11 PM.
