# DeliveryOS skills

Agent skills that ship **with** DeliveryOS. These are the methodology skills the project was built
on and dogfoods: the MABP build process and the BA elicitation interview. They are a first-class
deliverable, versioned alongside `extension/`, `contracts/`, and `webview/`.

A skill is a `SKILL.md` (frontmatter `name` + `description`, then instructions) plus optional bundled
files (`REFERENCE.md`, scripts). An agent harness — Claude Code, or any tool that reads
`~/.claude/skills/` — loads them by `name` and invokes them as `/<name>`.

## The skills

| Skill | What it does |
|---|---|
| [`sm-elicitation`](sm-elicitation/) | Business-analysis elicitation interview. Grills you one question at a time across problem, stakeholders, scope, goals, constraints, assumptions and risks, then persists the specification, the full question log, and every decision to a transcript artifact **and** DeliveryOS memory (`intent` + `design` entries). |
| [`sm-mabp-plan`](sm-mabp-plan/) | MABP Phase A — turn a DeliveryOS project (PRD + approved requirements) into a Phase B-ready build workspace: chunk specs, `READY.md`, `BUILD_STATUS.md`, `CLAUDE.md`. |
| [`sm-mabp-run`](sm-mabp-run/) | MABP Phase B — execute a chunk via the 3-role pattern (pre-fire audit → builder sub-agent → QA sub-agent → stakeholder verdict). |

`sm-elicitation` and `sm-mabp-*` write into the DeliveryOS memory store via lossless markdown body
files under `.deliveryos/memory/`; the extension's **"Rebuild Memory Index from Markdown"** command
ingests them into `memory.sqlite`. See each skill's `REFERENCE.md` for exact formats.

> Project-scoped *slash commands* for developing this repo (session handover, bug-fix worktree, etc.)
> live separately under [`.claude/commands/`](../.claude/commands/) — those drive the DeliveryOS build,
> they are not shipped to end users.

## Deploy to your machine

These skills are read from `~/.claude/skills/`. After cloning or downloading DeliveryOS, deploy them
with the installer:

```sh
# macOS / Linux
scripts/install-skills.sh            # copy skills/* -> ~/.claude/skills/
scripts/install-skills.sh --dry-run  # show what would be copied, change nothing
```

```powershell
# Windows
scripts\install-skills.ps1
scripts\install-skills.ps1 -DryRun
```

`scripts/install.sh` / `install.ps1` (the `.vsix` installer) call this automatically at the end;
pass `--no-skills` to skip. Re-running is safe — existing skills are overwritten in place.

After deploying, open a new agent session and run `/sm-elicitation` (or `/sm-mabp-plan`,
`/sm-mabp-run`).
