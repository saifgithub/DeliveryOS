# History — track O (Documentation)

Older "what just landed" sections from `PLANNING_STATUS.md`, newest on top.

---

## DOS:O1  (2026-05-21)

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
