# Command sources

Canonical sources for the Claude Code slash commands this project uses. They are version-controlled here so changes to the protocol are reviewable.

**To install:** copy these into `.claude/commands/` in the repo root. Claude Code reads commands from there.

```bash
mkdir -p .claude/commands
cp docs/commands/*.md .claude/commands/
```

| Command | Purpose |
|---|---|
| `sm-session-setup.md` | One-time bootstrap of `.claude/session-config.yml`. Run first. |
| `sm-start-fresh.md` | Session-entry protocol. Run at the start of each build session. |
| `sm-checkpoint.md` | Context continuity across `/compact` — save a memo before, restore after. |
| `sm-handover.md` | Session-exit protocol. Run to wrap a session cleanly. |
| `sm-fix-bugs.md` | Bug-fix track. Triages `docs/build/bugs.json`, fixes the easy ones in an isolated worktree. |

`sm-session-setup.md`, `sm-start-fresh.md`, `sm-checkpoint.md`, and `sm-handover.md` are fully generic and config-driven — copy them into any project's `.claude/commands/` unedited. `sm-fix-bugs.md` encodes DeliveryOS's own bug-tracking convention (a flat JSON file, `docs/build/bugs.json`) as a documented default; adapt its file paths, hands-off list, and verification commands per project.
