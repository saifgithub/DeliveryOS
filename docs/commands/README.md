---
description: Index of this project's command sources — not a runnable command.
disable-model-invocation: true
user-invocable: false
---

# Command sources

Canonical sources for the Claude Code slash commands this project uses. They are version-controlled here so changes to the protocol are reviewable.

This file lives in `.claude/commands/` alongside them, where every `.md` is registered as a slash command by filename — so it carries frontmatter that withdraws it from both surfaces (`disable-model-invocation` keeps its description out of the agent's context; `user-invocable: false` drops it from the `/` menu). Without that it registers as a phantom `/README`.

**To install:** copy these into `.claude/commands/` in the repo root. Claude Code reads commands from there.

```bash
mkdir -p .claude/commands
cp docs/commands/*.md .claude/commands/
```

**Three locations, not two.** Command resolution is Enterprise → Personal (`~/.claude/commands/`) → Project (`.claude/commands/`), and **personal wins**. If a copy of one of these exists in your home directory, it shadows the repo's — editing the repo copy alone changes nothing on that machine. Whenever you change a file here, propagate it to both targets and diff all three:

```bash
cp docs/commands/*.md .claude/commands/
cp docs/commands/sm-savepoint.md docs/commands/sm-readpoint.md docs/commands/sm-handover.md docs/commands/sm-takeover.md ~/.claude/commands/
```

Two pairs, each a writer and a reader. `sm-savepoint` → `sm-readpoint` carries context across a
`/compact` **within** one session; `sm-handover` → `sm-takeover` carries it **between** sessions,
machines, or instances.

`sm-savepoint`/`sm-readpoint` also has an optional automated companion: a `PreCompact` +
`SessionStart` hook pair that runs the same cycle around every compaction without a slash command —
see `docs/hooks/README.md`.

| Command | Purpose |
|---|---|
| `sm-savepoint.md` | Writes a continuity memo to `~/.claude/` before a `/compact`, so the work survives the context being cleared. |
| `sm-readpoint.md` | Reads that memo back afterwards, archives it, and resumes. With no working copy it falls back to the newest archived memo for this identity, which is how a brand-new session cold-starts. See `docs/MULTI_AGENT_BUILD_PROCESS.md` §12 for the DeliveryOS convention layered on top (identity marker, archive-commit-by-pathspec, relocated housekeeping). |
| `sm-handover.md` | Cross-session continuity. Writes the same memo `sm-savepoint.md` writes, but into the project's checkpoint archive and committed, so a *different* session — another machine, another instance, a fresh session after a crash — can resume it. |
| `sm-takeover.md` | The receiving half of `sm-handover.md`. Resolves an archived memo by ID, verifies its commit is present locally, and resumes. With no argument, lists what is available. |
| `sm-fix-bugs.md` | Bug-fix track. Triages `docs/build/bugs.json`, fixes the easy ones in an isolated worktree. |

**Model overrides.** The two *writers* — `sm-savepoint.md` and `sm-handover.md` — set `model: sonnet`; everything else inherits the session model. Writing a memo is a fixed-shape extraction over the largest context the session holds, which is where their cost sits, and both commands end by handing back to the user, so the override cannot leak into real work. The two *readers* are deliberately left alone: reading a memo is immediately followed by acting on it, and an override applies for the rest of the turn.

That asymmetry is why the writer and reader are separate commands rather than one self-detecting command. Frontmatter is static — resolved before the command body runs — so a single file serving both phases cannot set a model for one of them; it would apply to both or neither.

`sm-savepoint.md` and `sm-readpoint.md` are fully generic — copy them into any project's `.claude/commands/` unedited. Do not hand-edit them to add project-specific behaviour (that belongs in the project's own agent guide instead, per `docs/MULTI_AGENT_BUILD_PROCESS.md` §12). `sm-handover.md` and `sm-takeover.md` are generic on the same terms but portable to any **git** project specifically — they commit the memo, which is the whole point, so they have no `$HOME` fallback for the archive directory. `sm-fix-bugs.md` encodes DeliveryOS's own bug-tracking convention (a flat JSON file, `docs/build/bugs.json`) as a documented default; adapt its file paths, hands-off list, and verification commands per project.

**On the name `sm-handover`.** The `sm-session-setup` / `sm-start-fresh` / `sm-handover` trio that
used to live here was retired in favor of the checkpoint-based mechanism above — see
`docs/pm/BACKLOG.md` §B-004. That retirement stands: the config-driven machinery it carried
(`.claude/session-config.yml`, the track registry, status-doc rotation) is gone and is not coming
back. Today's `sm-handover.md` reuses only the name. It is a prompt-only, single-purpose companion
to `sm-savepoint.md` and shares no mechanism with its predecessor.

**On the retired `sm-checkpoint`.** Until this split, one self-detecting `sm-checkpoint.md` served
both phases: it probed for a working copy and branched to SAVE or RESTORE. It was replaced by
`sm-savepoint` + `sm-readpoint` so the expensive half could carry a model override the cheap half
must not have. Two latent defects went with it — cold start never actually worked (a new session has
a new session id, so the probe found no working copy and took the *SAVE* branch, overwriting nothing
but restoring nothing either), and a RESTORE that resumed work did so under whatever override the
file carried. `sm-readpoint` fixes both.
