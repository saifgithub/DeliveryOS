# Command sources

Canonical sources for the Claude Code slash commands this project uses. They are version-controlled here so changes to the protocol are reviewable.

**To install:** copy these into `.claude/commands/` in the repo root. Claude Code reads commands from there.

```bash
mkdir -p .claude/commands
cp docs/commands/*.md .claude/commands/
```

| Command | Purpose |
|---|---|
| `sm-sm-session-setup.md` | One-time bootstrap of `.claude/session-config.yml`. Run first. |
| `sm-sm-start-fresh.md` | Session-entry protocol. Run at the start of each build session. |
| `sm-sm-handover.md` | Session-exit protocol. Run to wrap a session cleanly. |
| `sm-sm-fix-bugs.md` | Bug-fix track. Triages `docs/build/bugs.json`, fixes the easy ones in an isolated worktree. |

`sm-sm-session-setup.md`, `sm-sm-start-fresh.md`, and `sm-sm-handover.md` are generic and config-driven, copied as-is from the AMI project. `sm-sm-fix-bugs.md` is adapted for DeliveryOS (JSON bug tracking instead of a remote database).
