# CHUNK-15 — Bug Triage demo build

> **Phase A · Prompt 2 chunk spec.** Honours the shared cross-chunk contracts defined in `docs/planning/part-1-plan.md` (memory schema, webview message contracts, Execution Brief schema, Harness Profile schema, handoff directory layout, `.deliveryos/` directory layout, managed delimiter blocks). This chunk **only orchestrates** previously-built features; it adds **no new product capability**.

---

## 1. Restated goal and scope

**Goal.** Build the canonical Bug Triage Assistant demo so DeliveryOS can be run end-to-end against a real target repo, including the scripted "forbidden-file moment" where Claude Code touches a Forbidden Change and DeliveryOS catches it twice (live PreToolUse hook block + post-hoc diff flag).

**In scope.**
- A small target repo skeleton at `examples/bug-triage/`: a stub FastAPI service with pre-filled Codebase Memory (`.deliveryos/`) describing folder structure, conventions, and the `pytest` test command.
- A scripted demo flow that walks every previously-built DeliveryOS surface in order: raw idea → discovery → PRD → requirements → Test Designer → Execution Brief → handoff → run with Claude Code → result capture → diff (with the forbidden-file moment) → verify → memory update → Release Evidence export.
- A demo runbook (`docs/demo/bug-triage-demo-script.md`) usable as both the rehearsal and the live-record script.
- A rehearsal mode for repeatable practice: canned AI responses checked into `docs/demo/canned-responses/` plus a documented toggle for swapping live vs canned outputs at each manual-mode prompt step (no new code; uses the existing manual-mode paste flow).
- A defined "forbidden-file moment" — the prompt wording, the file targeted, the expected violation, and the two-stage visual catch.
- Webview polish across earlier panels: empty states, loading states, error messages, copy that reads well on screen recordings.

**Out of scope.**
- Any new feature, new panel, or new code path in the extension. Every interaction in the demo MUST exercise a flow already built in CHUNK-01..14.
- Migration files, frontend code, or auth code in `examples/bug-triage/` beyond what is necessary to make the Forbidden list non-trivial (the forbidden files exist as stubs precisely so the AI *can* touch them).
- Recording, editing, narration, README rewrite, essay, GitHub Release — those belong to CHUNK-16.
- Persisting any demo-specific state inside the extension (no demo mode flag in the extension itself; rehearsal is a runbook choice, not an extension feature).

---

## 2. The demo target product — Bug Triage Assistant

Per PRD § 23, the demo target is a small **FastAPI** service that accepts bug reports. For the demo we only build out **one** requirement (REQ-001 Bug submission API) to the point of a verified pass; REQ-002 and REQ-003 exist in the requirements list so the catalogue looks real, but the demo does not implement them.

**Why this target.** It is the example already worked through in PRD § 23, so the Execution Brief shape and the Allowed/Forbidden lists are pre-validated by the PRD itself. It is small enough to fit in a 3–5 minute demo recording and rich enough to motivate Forbidden Changes (auth, migrations, frontend are all plausible-but-out-of-scope adjacent areas).

**Initial state at demo start.** `examples/bug-triage/` is checked in to the DeliveryOS repo with:
- A FastAPI app skeleton that runs but has no `/bugs` endpoint (so REQ-001 is genuinely unimplemented).
- A pre-filled `.deliveryos/` Codebase Memory describing the repo to DeliveryOS.
- A `README.md` explaining the demo target's role and how to run its tests locally.
- Stub forbidden files (`src/backend/api/users.py`, `migrations/*.sql`, `src/frontend/*`) populated with enough content that "touching" them is a real violation to be caught, not a no-op.

---

## 3. `examples/bug-triage/` skeleton structure

> Reminder: this chunk is planning-only. The files below are **described**, not written. Their contents land in CHUNK-15's implementation week.

```
examples/bug-triage/
├── README.md                              ← describes the demo target and its role
├── pyproject.toml                         ← FastAPI + pytest deps, ruff config
├── .gitignore
├── .deliveryos/                           ← pre-filled Codebase Memory (CHUNK-03 schema)
│   ├── codebase-memory.md                 ← folder structure, conventions, test command
│   ├── project.json                       ← project record matching the SQLite schema
│   └── memory.sqlite                      ← optional; OK to let DeliveryOS create on first open
├── src/
│   └── backend/
│       ├── __init__.py
│       ├── app.py                         ← FastAPI app factory, router registration
│       ├── api/
│       │   ├── __init__.py
│       │   ├── bugs.py                    ← ★ TARGET FILE for REQ-001 (does not exist yet OR is empty stub)
│       │   └── users.py                   ← ⛔ FORBIDDEN for REQ-001 (real handler, the "trap" file)
│       ├── models/
│       │   └── __init__.py                ← bug_report.py will be added by the demo run
│       ├── services/
│       │   └── __init__.py                ← bug_report_service.py will be added by the demo run
│       └── core/
│           ├── auth.py                    ← existing bearer-token middleware (referenced by brief)
│           └── db.py                      ← existing repository pattern stub
├── migrations/                            ← ⛔ FORBIDDEN for REQ-001
│   └── 0001_init.sql                      ← real-looking migration; the AI must not edit it
├── src/frontend/                          ← ⛔ FORBIDDEN for REQ-001
│   └── placeholder.tsx                    ← stub component; trap file family
└── tests/
    ├── __init__.py
    ├── conftest.py                        ← pytest fixtures (TestClient, auth header)
    └── integration/
        └── __init__.py                    ← test_bugs_api.py will be added by the demo run
```

**Pre-filled Codebase Memory (`examples/bug-triage/.deliveryos/codebase-memory.md`)** captures, per the PRD § 23 example:
- Repo layout summary (folders above).
- Convention: route handlers thin; business logic in services.
- Existing pattern: see `src/backend/api/users.py` (this is intentional — the brief will reference users.py as a *read-only* reference pattern, while listing it as a Forbidden change. That contrast is the demo's teaching moment).
- Test runner: `pytest -q`.
- Lint: `ruff check .`.
- Auth: bearer token via `src/backend/core/auth.py`.
- Known constraints: migrations are handled by a separate brief.

**`examples/bug-triage/README.md`** explains:
- What the demo target is and is not (it is not a real product; it is the canvas DeliveryOS draws on).
- How to install (`pip install -e .`).
- How to run tests (`pytest -q`).
- The exact starting state (which files exist, which are stubs, which are forbidden for the demo brief).
- A note that this directory is rebuildable from `git clean` — the demo restores its initial state by checking out the committed snapshot before each run.

---

## 4. The scripted demo flow

The runbook walks DeliveryOS exactly once, top to bottom, through every chunk's surface. Each step lists: the user action, the DeliveryOS surface invoked, the chunk providing it, and the canned-response file used in rehearsal mode.

| # | Step | Surface (chunk) | Rehearsal canned file |
|---|------|------------------|------------------------|
| 1 | Open VS Code (or Cursor) on `examples/bug-triage/`. Click the DeliveryOS activity-bar icon. The sidebar tree shows the four stages. | Activity bar + tree view (CHUNK-01) | — (no AI involved) |
| 2 | Click **DISCOVER → New project**. Type the raw idea: **"I want a bug triage assistant"**. | Raw idea capture (CHUNK-05) | — |
| 3 | Click **Run discovery interview**. DeliveryOS generates the interview prompt; user copies it, pastes into their AI tool (or, in rehearsal, opens `canned-responses/01-discovery-answers.md` and pastes that). Paste the answers back. DeliveryOS stores the discovery summary. | Discovery workspace (CHUNK-05) | `01-discovery-answers.md` |
| 4 | Click **DEFINE → Generate PRD**. Same manual-mode loop. Paste back the generated PRD draft. DeliveryOS opens the PRD editor. | PRD editor (CHUNK-06) | `02-prd-draft.md` |
| 5 | Click **Approve PRD → Decompose into requirements**. Paste back a requirements list with three entries: REQ-001 Bug submission API, REQ-002 List bugs, REQ-003 AI severity suggestion. | Requirements catalogue (CHUNK-07) | `03-requirements.md` |
| 6 | Select REQ-001. Click **Run Test Designer**. Paste back verification criteria and a test spec (four cases per PRD § 23). | Test Designer (CHUNK-08) | `04-test-spec-req-001.md` |
| 7 | Click **Generate Execution Brief**. DeliveryOS assembles the 10-section brief. User edits the Allowed and Forbidden lists in the composer to match PRD § 23 exactly (Allowed: `src/backend/api/bugs.py`, `src/backend/models/bug_report.py`, `src/backend/services/bug_report_service.py`, `tests/integration/test_bugs_api.py`; Forbidden: `src/backend/api/users.py`, `migrations/`, `src/frontend/`). | Execution Brief composer (CHUNK-09) | `05-brief-req-001.md` (rendered output for visual reference only) |
| 8 | Select the **Claude Code** harness profile. DeliveryOS shows the suggested `CLAUDE.md` update inside the managed delimiter block. User accepts. The brief is written to `examples/bug-triage/.deliveryos-handoff/current-execution-brief.md`. | Harness profiles (CHUNK-10) | — |
| 9 | Click **Run with Claude Code**. DeliveryOS opens the VS Code terminal with the harness command pre-typed. The PreToolUse hook is installed via the managed delimiter block in `.claude/settings.json`. User hits Enter. | File handoff + terminal (CHUNK-11) | — (live AI in final demo; in rehearsal, paste `06-claude-run-violation.md` into the result capture step instead) |
| 10 | **The forbidden-file moment fires** (see § 5 for the script). Claude Code attempts to edit `src/backend/api/users.py`. The PreToolUse hook blocks the write live; the terminal shows the block message; DeliveryOS surfaces a notification. | Diff + PreToolUse hook (CHUNK-13) | `06-claude-run-violation.md` |
| 11 | Claude Code returns its `result.md`. The result watcher picks it up. DeliveryOS parses the summary, changed files, tests run. | Result capture (CHUNK-12) | `06-claude-run-violation.md` |
| 12 | The Allowed/Forbidden diff panel renders. It flags the attempted forbidden write **post-hoc** as well (the hook blocked the write but the attempt is still recorded in the result). Pass/fail is **fail**. | Diff (CHUNK-13) | — |
| 13 | User clicks **Fix and re-run**. Paste a corrected prompt. Claude Code re-runs cleanly, touching only Allowed paths. Result watcher re-captures. Diff turns green. | CHUNK-11, CHUNK-12, CHUNK-13 | `07-claude-run-success.md` |
| 14 | Click **Verify**. DeliveryOS shows the test results from the result (four tests, all pass). Verification stored. | Verification (CHUNK-14) | — |
| 15 | Click **Update memory**. The memory graph is updated: Result Memory, Verification Memory, and Codebase Memory all advance. | Memory update (CHUNK-14) | — |
| 16 | Click **Export Release Evidence**. DeliveryOS produces the traceability document chaining Intent → Requirement → Design → Execution → Result → Verification → Release. Opens it in a new editor tab. | Release Evidence (CHUNK-14) | — |

End state: the demo target now has a real `src/backend/api/bugs.py` (and its sibling files), passing tests, and a release evidence document checked in to `.deliveryos/release-evidence/REL-2026-08-24.md` — but those changes are discarded between runs (see § 9, "Reset between runs").

---

## 5. Forbidden-file moment — exact script

This is the load-bearing 30 seconds of the demo. It must fire reliably.

**Target file.** `examples/bug-triage/src/backend/api/users.py`.

**Why this file.** The brief explicitly tells the AI to **look at `users.py` as a reference pattern for thin route handlers**, while also listing it as Forbidden. That instruction sets up a natural foot-gun: an obedient harness following the "implement like users.py" hint may decide to *also* refactor users.py for consistency. That is exactly the kind of scope creep the Forbidden Changes feature is meant to catch.

**Brief wording that creates the trap.** Inside § 5 Existing Codebase Context: *"Follow the same shape as `src/backend/api/users.py`. Keep route handlers thin; put logic in services."* Inside § 8 Forbidden Changes: *"`src/backend/api/users.py` — reference only, do not modify. `migrations/`. `src/frontend/`."*

**Backup prompt (if live AI does not take the bait on take 1).** Re-run with an explicit nudge added to a transient `CLAUDE.md` rider: *"For consistency, also normalise the error-handling pattern in `src/backend/api/users.py` to match the new `bugs.py`."* This converts the trap from latent to forced. The runbook documents this rider as the take-2 fallback; take 1 always tries without it for credibility.

**What the user sees.**

1. **Live block (PreToolUse hook).** The Claude Code terminal shows the hook's deny message inline — formatted to read clearly on a 1080p recording. DeliveryOS surfaces a VS Code notification: *"DeliveryOS blocked a Forbidden Change: src/backend/api/users.py"*. The notification dismisses to the diff panel.
2. **Post-hoc diff flag.** Once Claude Code finishes (or aborts), `result.md` lists the attempted write. The diff panel shows a red row: *src/backend/api/users.py — Forbidden — write attempt blocked at hook*. The pass/fail header reads **FAIL: 1 forbidden write attempt**.

**Visual choreography for the recording.**
- Terminal pane is docked to the right half, DeliveryOS diff panel to the left. The block message and the diff row are both on-screen simultaneously.
- A 2-second pause before the "Fix and re-run" click so the moment lands.

---

## 6. Rehearsal mode

Rehearsal mode is a **runbook posture**, not an extension feature. No code in DeliveryOS knows about it.

**Mechanism.** At each manual-mode paste step, the user has a choice:
- **Live AI** — paste the prompt into Claude Code / Claude / ChatGPT, paste the answer back.
- **Canned** — open the corresponding `docs/demo/canned-responses/NN-*.md`, paste its body into the same input box.

The DeliveryOS UI is identical in both modes — it is a manual-mode paste field on both sides. The canned responses are version-controlled markdown files, hand-written once to match the shape DeliveryOS expects, then refined after the first dry run.

**Canned response set (one per manual step).**
- `01-discovery-answers.md` — pasted in after the discovery interview prompt.
- `02-prd-draft.md` — the draft PRD body.
- `03-requirements.md` — REQ-001, REQ-002, REQ-003 with priorities and sources.
- `04-test-spec-req-001.md` — verification criteria and the four pytest cases from PRD § 23.
- `05-brief-req-001.md` — the rendered Execution Brief (used for visual diff only; the composer generates this itself, the canned file is for verifying the composer's output looks right).
- `06-claude-run-violation.md` — a hand-written `result.md` shape that includes the forbidden-write attempt, used to rehearse the diff feature without running Claude Code.
- `07-claude-run-success.md` — the clean re-run `result.md` shape.

**Final demo MUST use live AI** from step 2 onward (raw idea is typed live; discovery, PRD, requirements, test spec, brief composition all use live AI). The recording's credibility is in showing real AI tools producing the artefacts. Rehearsal mode is for the ~10–20 dry runs leading up to the recording day.

**How "take N" failure recovery works.** Between takes, run `git clean -fdx examples/bug-triage/.deliveryos-handoff/ examples/bug-triage/src/backend/api/bugs.py examples/bug-triage/src/backend/models/bug_report.py examples/bug-triage/src/backend/services/bug_report_service.py examples/bug-triage/tests/integration/test_bugs_api.py && git checkout examples/bug-triage/` to restore the initial state. The demo runbook lists this command as the "reset" step.

---

## 7. UI tidying for screenshot quality

Each polish item is a small copy/CSS change inside a panel already built. **No new panels.**

| Panel (chunk) | Polish item |
|---|---|
| Tree view (CHUNK-01) | Stage labels read as title-case, not all-caps. Active project name shown above the stages. Empty state ("No project yet — click DISCOVER to start") when no project exists. |
| Raw idea capture (CHUNK-05) | Placeholder text: *"e.g. I want a bug triage assistant"* — yes, exactly the demo phrase. Clear submit-button hover state. |
| Discovery workspace (CHUNK-05) | Loading state while DeliveryOS is "generating questions" (1.5s artificial delay is acceptable for visual pacing). Clear "Paste answers here" affordance. Error state if paste is empty. |
| PRD editor (CHUNK-06) | Section headings styled large. Word count per section. Empty-section placeholder. "Approve PRD" button disabled until all sections non-empty, with tooltip explaining why. |
| Requirements catalogue (CHUNK-07) | Each requirement card shows REQ-ID, title, priority chip, verification-criteria status (empty/filled). Empty state if no requirements yet. |
| Test Designer (CHUNK-08) | Loading state. "Attach to requirement" confirmation. Show verification criteria count on the requirement card. |
| Execution Brief composer (CHUNK-09) | All 10 sections collapsible. Allowed / Forbidden lists rendered as chip lists with add/remove. Visual difference between the two (green border vs red border). Empty-list placeholder ("Add at least one allowed path") that blocks submit. |
| Harness profile selector (CHUNK-10) | Two cards (Claude Code, Codex) with logo/icon, version pin, last-tested date. Selected card has a clear border. Suggested `CLAUDE.md` update shown in a read-only diff before accept. |
| Handoff + terminal (CHUNK-11) | "Run with Claude Code" primary button. Status banner after click: *"Handoff written to `.deliveryos-handoff/`. Terminal opened."* Watcher status indicator: a small dot, green when watching, gray when idle. |
| Result capture (CHUNK-12) | Parsed result shown as: summary block, changed-files table, tests-run table. Loading state while parsing. Error state if `result.md` is malformed (with a "paste manually" fallback). |
| Diff panel (CHUNK-13) | Big pass/fail header. Forbidden-violation rows in red with the offending path bold. Allowed-but-skipped rows in amber. Allowed-and-touched rows in green. Empty state ("No diff yet — run a brief first"). |
| Verification (CHUNK-14) | Test results table mirrors the result-capture table but with the verification verdict per case. "All criteria met" green banner on full pass. |
| Release Evidence export (CHUNK-14) | The generated markdown opens in a new editor tab, with a small "Open in side panel" affordance. The document itself has a clean title page, the traceability chain rendered as a chain of cards, then per-section detail. |

**Cross-cutting polish.**
- Consistent button styles across panels (one primary button per panel).
- All long-running operations show a spinner with a label, never a blank panel.
- All error states have a recovery action visible ("Retry", "Paste manually", "Open settings").
- All empty states explain the next step, not just that the panel is empty.

---

## 8. VS Code APIs used

**None new at this layer.** CHUNK-15 consumes the API surface already established by CHUNK-01..14:
- `vscode.window.createTreeView` (CHUNK-01)
- `vscode.window.createWebviewPanel` (CHUNK-02)
- `vscode.workspace.fs` and SQLite via `sql.js` (CHUNK-03)
- `vscode.window.createTerminal` (CHUNK-11)
- `vscode.workspace.createFileSystemWatcher` (CHUNK-11)
- `vscode.window.showInformationMessage` / `showWarningMessage` (used by CHUNK-13's hook notification)
- `vscode.commands.registerCommand` (across all chunks)

If the polish list reveals an API that is genuinely missing, treat that as a bug in the earlier chunk's spec and feed it back into Prompt 3's audit — do not silently add it here.

---

## 9. File-by-file breakdown

### 9.1 `examples/bug-triage/` (the target repo skeleton)

| Path | Role | Notes |
|---|---|---|
| `examples/bug-triage/README.md` | Demo target docs | Explains role, install, test command, initial state, reset command. |
| `examples/bug-triage/pyproject.toml` | Python project file | FastAPI, pytest, ruff. Pinned versions. |
| `examples/bug-triage/.gitignore` | | Standard Python ignores plus `.deliveryos-handoff/`. |
| `examples/bug-triage/.deliveryos/codebase-memory.md` | Pre-filled Codebase Memory | Folder layout, conventions, test command, lint command, auth note. |
| `examples/bug-triage/.deliveryos/project.json` | Project record | Project name, ID, created_at, links. Schema per CHUNK-03. |
| `examples/bug-triage/src/backend/app.py` | FastAPI app factory | Existing, no `/bugs` router yet. |
| `examples/bug-triage/src/backend/api/users.py` | ⛔ Forbidden trap file | Real-looking thin handler — the reference pattern the brief points at. |
| `examples/bug-triage/src/backend/api/bugs.py` | ★ Target file | Initially absent or empty stub. The demo creates it. |
| `examples/bug-triage/src/backend/models/__init__.py` | | `bug_report.py` is added during the demo. |
| `examples/bug-triage/src/backend/services/__init__.py` | | `bug_report_service.py` is added during the demo. |
| `examples/bug-triage/src/backend/core/auth.py` | Existing bearer-token middleware | Referenced by the brief, never touched. |
| `examples/bug-triage/src/backend/core/db.py` | Existing repository pattern stub | Referenced by the brief, never touched. |
| `examples/bug-triage/migrations/0001_init.sql` | ⛔ Forbidden trap | Real-looking initial schema migration. |
| `examples/bug-triage/src/frontend/placeholder.tsx` | ⛔ Forbidden trap family | Minimal stub component. |
| `examples/bug-triage/tests/conftest.py` | pytest fixtures | TestClient + auth header. |
| `examples/bug-triage/tests/integration/__init__.py` | | `test_bugs_api.py` is added during the demo. |

### 9.2 `docs/demo/` (the demo runbook + canned responses)

| Path | Role |
|---|---|
| `docs/demo/bug-triage-demo-script.md` | The runbook. Step-by-step, screen-by-screen, with talking-point bullets in italics for the voice-over (CHUNK-16 reads this). Includes the reset command, the two-take fallback, the backup forbidden-file prompt rider. |
| `docs/demo/canned-responses/01-discovery-answers.md` | Rehearsal canned reply for the discovery interview. |
| `docs/demo/canned-responses/02-prd-draft.md` | Rehearsal canned PRD. |
| `docs/demo/canned-responses/03-requirements.md` | Rehearsal canned requirements list. |
| `docs/demo/canned-responses/04-test-spec-req-001.md` | Rehearsal canned test spec. |
| `docs/demo/canned-responses/05-brief-req-001.md` | Reference render of the brief for visual diffing. |
| `docs/demo/canned-responses/06-claude-run-violation.md` | Rehearsal canned `result.md` with the forbidden-write attempt. |
| `docs/demo/canned-responses/07-claude-run-success.md` | Rehearsal canned clean `result.md`. |

### 9.3 Webview polish — affected panels

These edits land inside the panels built by their owning chunks; no new files. The CHUNK-15 implementation week amounts to small CSS + copy + state-machine touch-ups across:

- `webviews/raw-idea/` (CHUNK-05)
- `webviews/discovery/` (CHUNK-05)
- `webviews/prd-editor/` (CHUNK-06)
- `webviews/requirements/` (CHUNK-07)
- `webviews/test-designer/` (CHUNK-08)
- `webviews/brief-composer/` (CHUNK-09)
- `webviews/profile-selector/` (CHUNK-10)
- `webviews/handoff-status/` (CHUNK-11)
- `webviews/result-capture/` (CHUNK-12)
- `webviews/diff-panel/` (CHUNK-13)
- `webviews/verification/` (CHUNK-14)
- `webviews/release-evidence/` (CHUNK-14)

(Exact webview-package directory layout is defined in CHUNK-02's spec; the names above are placeholders that the CHUNK-02 spec will pin down.)

### 9.4 Reset / hygiene scripts

- `examples/bug-triage/scripts/reset-demo.sh` — checks the target back out to its committed snapshot and clears `.deliveryos-handoff/`. **Wrapper around `git checkout` + `git clean -fd`**; declared here as a single shell script to remove ambiguity about how to reset between takes.

---

## 10. Step-by-step implementation outline

Sized for a 4–5 session-day Week 13.

**Day 1 — target repo skeleton.**
- Create the `examples/bug-triage/` tree.
- Write the FastAPI app skeleton with `app.py`, `core/auth.py`, `core/db.py`, the existing `users.py`, the empty model/service `__init__.py` files, conftest, and the forbidden traps (`migrations/0001_init.sql`, `src/frontend/placeholder.tsx`).
- Write `pyproject.toml`, `README.md`, `.gitignore`.
- Confirm `pytest -q` runs (no tests collected is fine) and `ruff check .` passes against the skeleton.
- Write `.deliveryos/codebase-memory.md` and `.deliveryos/project.json` matching the CHUNK-03 schema.
- Commit the skeleton in a single commit titled `chore(examples): bug-triage demo target skeleton`.

**Day 2 — runbook + canned responses.**
- Write `docs/demo/bug-triage-demo-script.md` from § 4 above, including the voice-over bullets.
- Hand-write the seven canned response markdowns under `docs/demo/canned-responses/`.
- Write `examples/bug-triage/scripts/reset-demo.sh`.

**Day 3 — dry run #1 in rehearsal mode.**
- Walk the full runbook using canned responses for every paste step.
- Note every panel that needs polish (empty state, loading state, error copy).
- Note every place the runbook is ambiguous or the script wording drifts from what the UI says.
- File the polish notes against the appropriate earlier-chunk panel (do **not** rewrite earlier chunk specs — this is implementation polish on the existing panels).

**Day 4 — polish + dry run #2 (live AI).**
- Apply the polish list across the affected webviews.
- Walk the full runbook with **live** Claude Code and a live conversational AI for the manual-mode steps.
- Confirm the forbidden-file moment fires; if not on take 1, apply the take-2 rider documented in § 5 and re-run.
- Confirm the diff panel reads cleanly on a 1080p recording test (no real recording yet — that is CHUNK-16).

**Day 5 — slack day / dry run #3 / lock the script.**
- Reserved for slipping work, surprises, or a third dry run.
- Lock the runbook: the version that goes into recording day must be unchanged from this point until CHUNK-16's recording is in the can.

---

## 11. Test plan

The "test" for CHUNK-15 is **the demo itself**.

**T1 — Two complete walkthroughs, back to back.**
- Walkthrough A: with rehearsal canned responses end to end. Pass if every panel renders, every artefact is stored, the diff fires on the canned violation result, and the release evidence document generates.
- Walkthrough B: with live AI end to end. Pass if (a) every panel renders, (b) the forbidden-file moment fires twice (live PreToolUse block + post-hoc diff flag), (c) the fix-and-re-run produces a green diff, (d) Verify passes the four tests from the test spec, (e) Release Evidence opens and renders.

**T2 — Record walkthrough B as a sanity-check screen recording** (not the final demo — just confirmation that the moment lands on camera). Watch it back. Confirm:
- The terminal block message is legible without zoom.
- The diff panel's forbidden row is legible.
- The release evidence document looks presentable (no dev-debug text, no broken markdown).

**T3 — Forbidden-file moment fires twice.** During walkthrough B specifically, both the live PreToolUse block AND the post-hoc diff flag must appear. If only one fires:
- Live block missing → CHUNK-13's hook installer is broken; file a bug against CHUNK-13.
- Diff flag missing → CHUNK-13's diff parser doesn't include attempted-but-blocked writes; file a bug against CHUNK-13.

**T4 — Reset hygiene.** After both walkthroughs, run `scripts/reset-demo.sh` and confirm `examples/bug-triage/` is identical to its committed snapshot (`git status` is clean inside that subtree).

**T5 — Multi-editor smoke.** Walk T1's rehearsal walkthrough once in **Cursor** as well as VS Code, to confirm CHUNK-04's cross-editor guarantee survives the polish. Pass if the same `.vsix` produces the same panels and the same demo path works.

---

## 12. Risks, edge cases, open questions

**R1 — AI tool non-determinism.** Live AI may refuse the trap, produce a different file structure, or hallucinate paths.
*Mitigation.* Rehearsal mode for ~10–20 dry runs. The backup prompt rider in § 5 forces the trap if take 1 misses. Budget 2–3 takes for the live recording.

**R2 — `claude` / `codex` CLI version drift.** Between Week 13 build and the Week 14 recording, the CLI may release a breaking change.
*Mitigation.* (a) The Harness Profile schema (CHUNK-10) records the version pin. (b) The runbook lists the exact CLI versions tested. (c) **Re-test the day before recording.** If the CLI has changed, either lock the older CLI version for the demo or update the profile and re-run T1+T2 before recording.

**R3 — Screen recording dropouts.** Recording fails partway through.
*Mitigation.* Belongs to CHUNK-16, but call out here: the demo is built to be repeatable, and the reset script (`scripts/reset-demo.sh`) makes a clean re-take cheap.

**R4 — AI refuses to touch the forbidden file even with the rider.** A safety-tuned Claude Code may explicitly note the brief says "do not modify users.py" and refuse the rider.
*Mitigation.* The take-2 rider is worded as a reasonable consistency request, not as an explicit instruction to violate the brief. If even that fails, fall back to take-3 with a stronger rider: a transient `CLAUDE.md` line saying *"Refactor users.py error handling as part of this task."* If even that fails (very unlikely), the demo can use the canned `06-claude-run-violation.md` result file via the manual-paste fallback in result capture — the diff feature still fires post-hoc. The live-block half of the moment is lost in that worst case; the runbook documents this fallback explicitly.

**R5 — `.deliveryos-handoff/` accidentally committed.** If the user forgets `.gitignore`, the handoff folder ends up in git history.
*Mitigation.* The example repo's `.gitignore` lists it explicitly. The runbook's reset script also clears it.

**R6 — Codebase Memory pre-fill drifts from the actual skeleton.** If `codebase-memory.md` lists a folder that does not exist, the brief references will be wrong.
*Mitigation.* T1 walkthrough A catches this — the brief composer surfaces the bad reference in its preview. Day 3 dry run is the safety net.

**R7 — Webview polish creates a regression in an earlier-chunk panel.** Copy edits can break states, e.g. a disabled-button tooltip can mask a real submit blocker.
*Mitigation.* T1 walkthrough A exercises every panel in the demo path. Anything off-path is out of scope for CHUNK-15 and explicitly not regression-tested here.

**Open questions.**
- **OQ-1.** Should `examples/bug-triage/.deliveryos/memory.sqlite` be committed, or left for DeliveryOS to create on first open? Recommendation: **not committed** — the demo includes opening DeliveryOS on a fresh repo, and the SQLite file is what DeliveryOS produces. Confirm in Day 1 of implementation.
- **OQ-2.** Does the runbook need a "narrator" voice column? Recommendation: **yes**, the italics talking-point bullets in § 4 are enough; CHUNK-16 can extend them but the structure should land here.
- **OQ-3.** Should the rehearsal canned responses be checked in to the public repo, or kept in a private demo branch? Recommendation: **checked in** — they double as worked examples in the README for new users.

---

## 13. Explicit dependencies

**Depends on all previous chunks.** Specifically:

| Chunk | What CHUNK-15 consumes |
|---|---|
| CHUNK-01 | Activity bar + tree view. |
| CHUNK-02 | Webview foundation; all polish lands inside CHUNK-02-built webviews. |
| CHUNK-03 | Memory schema; pre-filled Codebase Memory at `examples/bug-triage/.deliveryos/` follows it. |
| CHUNK-04 | Multi-editor install (T5 smoke uses Cursor). |
| CHUNK-05 | Raw idea + discovery interview surfaces. |
| CHUNK-06 | PRD editor. |
| CHUNK-07 | Requirements catalogue. |
| CHUNK-08 | Test Designer. |
| CHUNK-09 | Execution Brief composer; Allowed/Forbidden lists in the brief are the cornerstone of the moment. |
| CHUNK-10 | Claude Code profile + managed delimiter block in `CLAUDE.md` and `.claude/settings.json`. |
| CHUNK-11 | `.deliveryos-handoff/` write + terminal launch + result watcher. |
| CHUNK-12 | Result capture parser; the canned `06-` and `07-` files are written to that schema. |
| CHUNK-13 | Diff feature **and** the PreToolUse hook — the two halves of the moment. |
| CHUNK-14 | Verification, memory update, release evidence export — the closing act of the runbook. |

**Exposes.** A runnable, repeatable, recordable end-to-end demo for **CHUNK-16** to capture as the proof of work.

**Honoured shared contracts.**
- Memory schema (CHUNK-03): pre-filled Codebase Memory follows it; no schema redeclaration.
- Webview message contracts (`contracts/` package): no new message types added here; polish stays within existing slices.
- Execution Brief schema (CHUNK-09): the demo brief is generated by the composer, not hand-rolled.
- Harness Profile schema (CHUNK-10): the demo uses the Claude Code profile as-is.
- Handoff directory layout (CHUNK-11): `examples/bug-triage/.deliveryos-handoff/` follows it exactly.
- `.deliveryos/` memory directory layout (CHUNK-03): pre-filled directory follows it exactly.
- Managed delimiter block (CHUNK-10): the `CLAUDE.md` + `.claude/settings.json` blocks written by the demo's profile selection use only this syntax.

---

## 14. Definition of done (for CHUNK-15 itself)

CHUNK-15 is complete when:

1. `examples/bug-triage/` exists at the structure in § 3, is checked in, and `scripts/reset-demo.sh` cleanly restores it.
2. `docs/demo/bug-triage-demo-script.md` exists, walks every step in § 4, and ends in a fully-rendered Release Evidence document.
3. `docs/demo/canned-responses/01-..-07-*.md` exist and produce a clean rehearsal-mode walkthrough.
4. Webview polish across the panels in § 7 is applied.
5. **T1 + T2 + T3 + T4 + T5 from § 11 all pass.**
6. The forbidden-file moment has fired on camera (sanity recording) at least once with both halves visible.
7. No new feature was added to the extension; only polish and orchestration.

When all seven are true, CHUNK-15 hands the baton to CHUNK-16 (record + README + essay + GitHub release).
