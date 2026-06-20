---
name: sm-mabp-run
description: Multi-Agent Build Process (MABP) architect — execute Phase B (Build) for a project with approved chunk specs in docs/planning/chunks/. Run /sm-mabp-run to pick up the next pending chunk; /sm-mabp-run <N> to target a specific chunk; /sm-mabp-run all to run all pending chunks sequentially. Follows the 3-role MABP pattern: pre-fire audit → builder sub-agent → QA sub-agent → stakeholder verdict. Use when starting or resuming an MABP Phase B build on any project that has a docs/planning/READY.md and validated chunk specs.
---

# /sm-mabp-run — MABP Phase B: Build

Architect entry point. One chunk at a time. Fully verified before the next.

**Prerequisite:** `docs/planning/READY.md` must exist (Phase A complete). Detailed cycle rules: see [REFERENCE.md](REFERENCE.md).

---

## Step 0 — Locate state

```bash
test -f docs/planning/READY.md   && echo "READY: ok" || echo "READY: MISSING — run Phase A first"
test -f docs/build/BUILD_STATUS.md && echo "STATUS: exists" || echo "STATUS: will create"
ls docs/planning/chunks/ | head -20
```

If `BUILD_STATUS.md` does not exist: create it using the scaffold in REFERENCE.md § Scaffold.

**Resolve target chunk:**
- No arg → first chunk in `READY.md` order NOT marked `done` in `BUILD_STATUS.md`
- `/sm-mabp-run 3` → chunk 03, regardless of status (explicit re-run or fix-prompt run)
- `/sm-mabp-run all` → run all pending chunks serially; stop at any BLOCKER or `revise` verdict

---

## Step 1 — Pre-fire audit

Read chunk spec at `docs/planning/chunks/chunk-NN-<slug>.md`.

Run every command in the spec's `### Pre-fire audit` block. **Interpret each result** — one sentence: expected / found / drift-or-clean. Paste without interpretation is not a completed audit.

Also confirm manually:
- All dependency chunks are `done` in `BUILD_STATUS.md`
- Any files the spec says a prior chunk should have created actually exist

Drift in any check → fix the chunk spec, re-run audit. No code until audit is clean.

---

## Step 2 — Spawn the builder

Write the builder invocation inline (do NOT save to a file unless you want a record). Rules — see REFERENCE.md § Builder invocation rules. Short version:

- Under 80 lines
- Open: "Build clean first. Structural shortcuts are blocking hot spots."
- Pre-resolve 3–5 key design decisions; direct builder to read the spec file for the rest
- Done criteria as numbered checklist (≤ 10 items)
- State starting tier (Economy / Standard / Premium) + escalation ladder

Then spawn:
```
Agent(subagent_type: general-purpose, prompt: <invocation>)
```

Read `docs/build/builder_reports/chunk_NN_<slug>.md` after return — **not** the chat summary.

BLOCKER file in `docs/build/blockers/`? → Resolve the spec issue, edit the chunk spec, re-audit (Step 1).

---

## Step 3 — Architect spot-check (before QA)

Independently re-run 2–3 rows from the builder's evidence manifest. If any fail: reject the report, write `docs/build/fix_prompts/chunk_NN_<slug>_v2.md` (≤ 60 lines), loop to Step 1.

---

## Step 4 — Spawn QA

Write the QA invocation inline. Must include:
- Hot-spots preamble (from builder report, with severity)
- Primary-source verification commands for every done criterion
- Structural quality sweep + isolation sweep directives
- Spot-check directive: "break the impl, confirm test fails, revert"

See REFERENCE.md § QA invocation rules.

```
Agent(subagent_type: general-purpose, prompt: <QA invocation>)
```

Read `docs/build/qa_reports/chunk_NN_<slug>_qa.md` after return. Spot-check 2–3 rows of QA's evidence manifest independently.

---

## Step 5 — Recommend verdict

Present both reports. State:
- Builder hot spots (severity)
- QA independent findings (severity)
- QA-only findings (highest signal — list or "none")
- **Your recommendation: approve / revise / escalate**

Stakeholder's one-word verdict triggers:

| Word | Action |
|---|---|
| `approve` | Sync `BUILD_STATUS.md` (flip chunk → done, append chunk entry, refresh next-chunk pointer). Confirm commit landed. Pick next chunk. |
| `revise` | Write `fix_prompts/chunk_NN_<slug>_v<K>.md` (≤ 60 lines). Loop to Step 1. At v4: always escalate. |
| `escalate` | Use AskUserQuestion: keep iterating / redesign / re-plan / park |

---

## Hard constraints

- Architect **never** edits `.ts`, `.tsx`, `.js`, `.py` source files. If you catch yourself reaching for Edit on a source file: write a BLOCKER for the builder instead.
- Sub-agents have no `AskUserQuestion`. All ambiguity → BLOCKER file.
- One chunk at a time. Parallel builds only after chunk 3 is proven, only for dependency-free chunks.
- Every 4–5 chunks: run a cohesion review (grep 3 common patterns across recent chunks for consistency). Log as `Cohesion check:` in `BUILD_STATUS.md`.
