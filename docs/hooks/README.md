# Continuity hooks

An optional automation layer over the `/sm-savepoint` → `/compact` → `/sm-readpoint` cycle
(`docs/commands/README.md`). Where those commands are invoked by hand, this pair runs
automatically around every compaction — manual or unattended auto-compact — via Claude Code's
`PreCompact` and `SessionStart` hooks.

| Script | Hook | Matcher | What it does |
|---|---|---|---|
| `sm-precompact-snapshot.sh` | `PreCompact` | `manual\|auto` | If a working memo already exists at `~/.claude/sm_checkpoint_$SESSION_ID.md` (written by `/sm-savepoint`, or by this script on an earlier compaction this session), it's a no-op — it never overwrites a memo already written. Otherwise it writes a fast mechanical fallback (git branch/status/diff-stat + a transcript tail) to that same path, so there's always something to restore even when nobody ran `/sm-savepoint` first. |
| `sm-sessionstart-restore.sh` | `SessionStart` | `compact` | Fires right after compaction. Finds the working memo, prints it to stdout (Claude Code injects `SessionStart` stdout straight into context — no `/sm-readpoint` call needed), then archives it exactly like `/sm-readpoint` Step 3 (same three-way `checkpoint_history/` resolution) and deletes the working copy. |

Both are global, not project-scoped — they're written to run identically in every repo, on every
session, on this machine, which is why they live here in `docs/` next to the generic command
sources rather than under this project's own `.claude/`.

**To install:**

```bash
mkdir -p ~/.claude/hooks
cp docs/hooks/sm-precompact-snapshot.sh docs/hooks/sm-sessionstart-restore.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/sm-precompact-snapshot.sh ~/.claude/hooks/sm-sessionstart-restore.sh
```

Then merge the `hooks` key from `docs/hooks/settings.hooks.json` into `~/.claude/settings.json`.
There's no safe generic merge command for this — `settings.json` carries other keys (permissions,
env, your own other hooks) that a blind overwrite would clobber, and a naive `PreCompact`/
`SessionStart` array merge can silently drop an existing entry for the same event. Open both files
and merge by hand: add the two hook entries under the matching event key, creating `hooks` /
`PreCompact` / `SessionStart` if they don't already exist, and combining arrays rather than
replacing them if you already have hooks registered on either event.

**Depends on:** `bash`, `jq`, `git` (only `sm-precompact-snapshot.sh` needs `git`). Missing `jq`
degrades both scripts to silent no-ops (`exit 0`) rather than failing loud — `PreCompact` in
particular is synchronous and can fire mid-tool-loop, so a hook here must never block or error.

**Safety notes:**

- Neither script ever overwrites a memo you or Claude already wrote — `sm-precompact-snapshot.sh`
  checks for an existing working copy first, every time.
- `sm-sessionstart-restore.sh` only acts on `source == "compact"` — a fresh session or `/clear`
  does not trigger it, matching `/sm-readpoint`'s own cold-start-vs-restore distinction
  (`docs/MULTI_AGENT_BUILD_PROCESS.md` §12).
- The mechanical PreCompact fallback is deliberately low-fidelity (git state + a transcript tail,
  not a curated memo) — it exists only to catch an unplanned auto-compact, not to replace running
  `/sm-savepoint` yourself when you can.
- `sm-precompact-snapshot.sh`'s `settings.local.json`-style permission gating (auto-compact
  window/threshold, if you tune one) is a separate, deliberately scoped concern — not something
  this hook pair reads or manages.

**On genericizing before landing here.** The tested/running copies of these two scripts carry no
project-specific content by design (see "Both are global" above); the copies in this directory
are kept byte-identical to that global, portable form — no DeliveryOS-specific content, and no
name of any other project either, per this repo's own rule against a protocol file leaking a
source project's name (`CLAUDE.md`).
