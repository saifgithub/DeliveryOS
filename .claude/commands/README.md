# Command sources

Canonical sources for the Claude Code slash commands this project uses. They are version-controlled here so changes to the protocol are reviewable.

**To install:** copy these into `.claude/commands/` in the repo root. Claude Code reads commands from there.

```bash
mkdir -p .claude/commands
cp docs/commands/*.md .claude/commands/
```

| Command | Purpose |
|---|---|
| `sm-checkpoint.md` | Context continuity across `/compact` — save a memo before, restore after. Also this project's session-boundary continuity mechanism: RESTORE doubles as the cold-start entry point. See `docs/MULTI_AGENT_BUILD_PROCESS.md` §12 for the DeliveryOS-specific convention layered on top (identity marker, archive-commit-by-pathspec, relocated housekeeping). |
| `sm-handover.md` | Cross-session continuity. Writes the same memo `sm-checkpoint.md` SAVE writes, but into the project's checkpoint archive and committed, so a *different* session — another machine, another instance, a fresh session after a crash — can resume it. |
| `sm-takeover.md` | The receiving half of `sm-handover.md`. Resolves an archived memo by ID, verifies its commit is present locally, and resumes. With no argument, lists what is available. |
| `sm-fix-bugs.md` | Bug-fix track. Triages `docs/build/bugs.json`, fixes the easy ones in an isolated worktree. |

`sm-checkpoint.md` is fully generic — copy it into any project's `.claude/commands/` unedited; do not hand-edit it to add project-specific behaviour (that belongs in the project's own agent guide instead, per `docs/MULTI_AGENT_BUILD_PROCESS.md` §12). `sm-handover.md` and `sm-takeover.md` are generic on the same terms but portable to any **git** project specifically — they commit the memo, which is the whole point, so they have no `$HOME` fallback for the archive directory. `sm-fix-bugs.md` encodes DeliveryOS's own bug-tracking convention (a flat JSON file, `docs/build/bugs.json`) as a documented default; adapt its file paths, hands-off list, and verification commands per project.

**On the name `sm-handover`.** The `sm-session-setup` / `sm-start-fresh` / `sm-handover` trio that
used to live here was retired in favor of the checkpoint-based mechanism above — see
`docs/pm/BACKLOG.md` §B-004. That retirement stands: the config-driven machinery it carried
(`.claude/session-config.yml`, the track registry, status-doc rotation) is gone and is not coming
back. Today's `sm-handover.md` reuses only the name. It is a prompt-only, single-purpose companion
to `sm-checkpoint.md` and shares no mechanism with its predecessor.
