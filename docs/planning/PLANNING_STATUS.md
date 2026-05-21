# Handover — Documentation (DOS:O)

**Last updated:** 2026-05-21 (end of DOS:O1 — bootstrap two-track session model)

Read this file **first** when starting a new Documentation session (`/start-fresh O`). It is the single rolling source of truth for track O: state, narrative, and carry-overs all in one doc. Older "what just landed" sections rotate out to `docs/planning/PLANNING_HISTORY.md` newest-on-top.

---

## What's on disk + what's running

| Thing | State |
|---|---|
| Repo HEAD | `5cca542` — `chore(session): bootstrap two-track session model (O = Docs, R = Development)` |
| Commit count | 3 |
| Tags | none yet |
| Session model definition | `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12 |
| Session config | `.claude/session-config.yml` (prefix `DOS`, tracks O + R) |
| PRD | `docs/PRD.md` v0.3 (2026-05-20, delivery decisions added 2026-05-21) |
| Build plan | `docs/BUILD-PLAN.md` — 14 weeks, week 1 starts 2026-05-25, demo target 2026-08-24 |
| Phase A planning state | **not started** — `docs/planning/claude-code-build-prompts.md` defines the four-prompt loop; no chunks under `docs/planning/chunks/` yet, no `docs/planning/READY.md` yet |
| Phase B build state | not started (week 1 of BUILD-PLAN has not begun) |
| Open bugs | 0 — `docs/build/bugs.json` is `{"bugs": []}` |

---

## What just landed (this session — DOS:O1)

Bootstrap session. Two parallel things happened:

1. **`/session-setup` ran first** and wrote `.claude/session-config.yml` from defaults. It used `HANDOVER_O.md` / `HANDOVER_R.md` as the handover paths because I hadn't yet seen the in-flight doc edits that specified otherwise.
2. **`/start-fresh O` immediately found the in-flight doc edits** to `docs/CHANGELOG.md` and `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12, which intentionally name `docs/planning/PLANNING_STATUS.md` and `docs/build/BUILD_STATUS.md` as the handover docs (AMI single-doc-per-track convention). The doc and the just-written config disagreed.

The session work was reconciling the two. The doc won — it captures intentional design and the AMI convention the project is explicitly mirroring (§ 13 calls `BUILD_STATUS.md` "the single source of truth"). Concretely:

- `.claude/session-config.yml` rewritten: track O `handover_path` → `docs/planning/PLANNING_STATUS.md`, history → `docs/planning/PLANNING_HISTORY.md`, `project_plan_path` omitted (the handover doc absorbs the backlog in this model). Track R `handover_path` → `docs/build/BUILD_STATUS.md`, history → `docs/build/BUILD_HISTORY.md`, `project_plan_path` kept as `docs/BUILD-PLAN.md` (the 14-week static roadmap is genuinely a separate doc from the rolling status).
- `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12 picked up the two-track description and the per-track handover paths (this was the user's in-flight edit; just landed it intact).
- `docs/CHANGELOG.md` entry added recording the model + the `Eval/DeliveryOS` → drive-root + git-init promotion.

All three landed as one wrap commit: **`5cca542`**.

This file (`docs/planning/PLANNING_STATUS.md`) was created on the second wrap of this session — `/handover O` is its canonical author, this is the first instance.

### Gotchas the next session should know

- **`/remote-control` and `/rename` are not Skill targets in the VSCode extension environment.** `/start-fresh` and `/handover` skip them silently; rename the chapter manually from FleetView if you want session tags on chapters.
- **Track R has no rolling status doc yet either** — `docs/build/BUILD_STATUS.md` will be created by `/handover R` on the first development session, the same way this file was created today. Until then, `/start-fresh R` will surface that the file doesn't exist (alongside the three sanity checks, which are pre-build-friendly and only the lint check will print the "not yet wired" message).
- **The bug-list block in config is enabled for Track R** even though `bugs.json` is currently empty. That's fine — `/start-fresh R` will report 0 open bugs until the build starts producing them.
- **`docs/build/**` is in `scan_excludes`.** That means consistency scans skip `BUILD_STATUS.md`, `BUILD_HISTORY.md`, and the build artefact subdirs. Intentional: rolling status narratives shouldn't trigger scan flags. Just be aware that scans run from Track O will not catch stale refs *inside* Track R's handover doc — that's Track R's wrap's job.

---

## How to start the next session

```
/start-fresh O
```

Session name to use: **DOS:O2**

Likely substantive work for DOS:O2 is the **Phase A planning loop** — running the four prompts in `docs/planning/claude-code-build-prompts.md` against the PRD + BUILD-PLAN, with the goal of producing:

- `docs/planning/part-1-plan.md` (Prompt 1 output)
- `docs/planning/chunks/chunk-NN-*.md` (Prompt 2 output)
- `docs/planning/validation-report.md` (Prompt 3 output, overwritten each iteration)
- `docs/planning/READY.md` (Prompt 4 final output)

Once `READY.md` exists, Track R can open its first session (`/start-fresh R` → DOS:R1) and pick a chunk to build.

### Carry-overs for DOS:O2

- Run the four-prompt planning loop end-to-end; produce chunks + READY.md.
- Decide whether `docs/BUILD-PLAN.md` (14-week phased plan) and the chunk dependency order in `READY.md` should be reconciled — they describe overlapping but differently-sliced views of the same scope. May need a one-liner in BUILD-PLAN pointing at READY.md as the canonical execution order.
- The Phase A loop spawns subagents per § 7 of `docs/MULTI_AGENT_BUILD_PROCESS.md`. Spawned worktrees clean up on `/handover` (step 2 of this skill).
