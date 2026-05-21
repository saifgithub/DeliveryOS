# DeliveryOS Build Plan

**Scope:** Trimmed ship-well MVP (four stages, one specialist: Test Designer, two harness profiles: Claude Code + Codex, one demo: Bug Triage).
**Pace assumption:** 5 to 10 hours per week, planned around an average of 7 to 8 hours.
**Duration:** 14 weeks.
**Start:** week of 2026-05-25. **Target demo-ready:** week of 2026-08-24.
**Delivery mechanism:** sideloadable `.vsix` extension (see ADR-0001).
**Canonical execution order:** [`docs/planning/READY.md`](planning/READY.md) — chunk-level ordered build sequence, dependency map, and parallelisable-pairs declarations. This BUILD-PLAN is the week-by-week schedule; READY.md is the chunk-level "what next, in what order" reference. The two are kept in sync but READY.md wins for execution disputes (it carries the iteration-2 + iteration-3 audit verdicts).

## How to read this plan

Each phase ends with a demoable state. That is deliberate: at a light pace the real enemy is loss of momentum, so you should always be at most two weeks from "something works". If life gets in the way, you can pause at the end of any phase and still have something to show.

Each week lists a goal, the work, and a "done when" line that is a concrete, checkable outcome. If a week slips, push the whole tail by a week rather than compressing, and protect the phase boundaries.

## Phase 0: Extension skeleton (weeks 1 to 2)

Goal: an empty DeliveryOS shell that installs and opens in more than one editor.

**Week 1 (2026-05-25)** — Scaffold. **✅ Done — DOS:R1 (steps 1–3) + DOS:R2 (steps 4–13).** CHUNK-01 closed.
Set up the TypeScript VS Code extension project (the `yo code` generator or a manual scaffold). Add the activity-bar icon and a sidebar tree view showing the four stages (DISCOVER, DEFINE, EXECUTE, VERIFY) as static items. Get `vsce package` producing a `.vsix`.
Done when: the `.vsix` installs into VS Code and the DeliveryOS sidebar appears.

**Week 2 (2026-06-01)** — Webview and memory store, multi-editor check. **🟡 Partial — CHUNK-02 (webview) ✅ done DOS:R2. CHUNK-03 (memory store) + CHUNK-04 (multi-editor verify) pending → DOS:R3+.**
Add one webview panel rendering a React + Tailwind "hello" app. Wire a `sql.js` (WASM SQLite) store for project data — see PRD § 25.2 for why the native `better-sqlite3` binding is the wrong choice for a sideloaded cross-editor VSIX. Sideload the `.vsix` into Cursor as well, and at least one of Windsurf or VSCodium, to confirm cross-editor install works. Note the signature-verification behaviour on each.
Done when: the webview renders, a project record persists across editor restarts, and the extension installs in at least three editors.

Phase 0 demoable state: "Here is DeliveryOS installed in VS Code and Cursor from the same file."

## Phase 1: DISCOVER and DEFINE (weeks 3 to 6)

Goal: go from a raw idea to a PRD, requirements, and a test spec, inside the extension.

**Week 3 (2026-06-08)** — Raw idea and discovery.
Build the raw idea capture form and the discovery interview workspace. Manual mode: DeliveryOS generates the interview questions as a prompt, the user runs it in their AI tool, pastes answers back. Store the discovery record.
Done when: a raw idea plus pasted discovery answers produce a stored discovery summary.

**Week 4 (2026-06-15)** — PRD generation and editor.
Generate a draft PRD from the discovery summary (manual prompt mode). Build the PRD editor as a webview with editable sections.
Done when: a discovery summary produces an editable draft PRD.

**Week 5 (2026-06-22)** — Requirements catalogue.
Decompose the PRD into a requirements catalogue. Each requirement has type, priority, source PRD section, and an empty verification-criteria field.
Done when: an approved PRD produces a structured requirements list.

**Week 6 (2026-06-29)** — Test Designer specialist.
Build the one specialist: Test Designer. It takes a requirement and produces verification criteria and a test specification (manual prompt mode, using the Test Designer prompt template). Attach the output back to the requirement.
Done when: every requirement can be given verification criteria via the Test Designer.

Phase 1 demoable state: "Type an idea, walk through discovery, get a PRD, get requirements, get test specs. All inside the editor."

## Phase 2: Execution Brief and handoff (weeks 7 to 9)

Goal: generate a real Execution Brief and hand it to Claude Code or Codex.

**Week 7 (2026-07-06)** — Execution Brief composer.
Build the brief composer that assembles the 10-section Execution Brief (see `docs/architecture/execution-briefs.md`) from a requirement, its design context, and its test spec. Include the Allowed and Forbidden Changes sections.
Done when: a requirement produces a complete, well-formed Execution Brief.

**Week 8 (2026-07-13)** — Harness profiles.
Implement two profiles: Claude Code and Codex. Each renders the brief with its conventions and produces a suggested `CLAUDE.md` or `AGENTS.md` update.
Done when: the same brief renders correctly for both profiles.

**Week 9 (2026-07-20)** — File handoff and terminal integration.
Write the `.deliveryos-handoff/` directory into the workspace. Add a "Run with Claude Code / Codex" command that opens the integrated terminal with the harness command pre-typed. Add a file watcher on `.deliveryos-handoff/result.md`.
Done when: clicking a button writes the handoff folder and opens a terminal ready to run the harness.

Phase 2 demoable state: "Generate a brief, click a button, Claude Code runs in the same window against the brief."

## Phase 3: Result capture and the diff feature (weeks 10 to 12)

Goal: close the loop, and build the one feature nobody else has.

**Week 10 (2026-07-27)** — Result capture.
Capture the harness output: import `result.md` from the handoff folder (auto, via the watcher) or paste it. Parse summary, changed files, tests run. Store as a result record linked to the brief.
Done when: a harness run produces a stored, parsed result linked to its brief.

**Week 11 (2026-08-03)** — Allowed/Forbidden Changes diff.
The headline feature. Compare the files the harness actually changed against the brief's Allowed and Forbidden lists. Flag any forbidden file that was touched and any allowed file that was skipped. Show it as a clear pass/fail panel.
Done when: a harness run that touches a forbidden file is caught and flagged automatically.

**Week 12 (2026-08-10)** — Verification and release evidence.
Verify the result against the test spec. Update project memory. Build the release evidence export showing the chain from idea to verified result.
Done when: a completed requirement produces a release evidence document with the full traceability chain.

Phase 3 demoable state: the full loop, idea to verified release, with the diff feature catching a violation live.

## Phase 4: Demo and polish (weeks 13 to 14)

Goal: a proof of work a stranger can understand in two minutes.

**Week 13 (2026-08-17)** — Build the demo.
Run the Bug Triage Assistant project end to end through DeliveryOS. Script the demo so it includes a moment where Claude Code modifies a forbidden file and DeliveryOS catches it. Tidy the webview UI.
Done when: the Bug Triage demo runs cleanly start to finish.

**Week 14 (2026-08-24)** — Record and write.
Record a short demo video of the loop. Write the README and a short essay on the meta-harness thesis. Take screenshots. Publish the `.vsix` on GitHub Releases with the install script.
Done when: the repo has a working `.vsix`, a demo video, a README, and an essay.

## Dogfooding

Build DeliveryOS using Claude Code or Codex. From Phase 1 onward, manage the DeliveryOS build itself as a DeliveryOS project. The first real proof that the product works is that it was used to build itself, and that becomes a strong line in the writeup.

## Schedule risks

- **Signature verification.** If sideloading is blocked or heavily warned on a target editor, fall back to OpenVSX publishing. Budget half a week if this bites. Test in Week 2 so you find out early.
- **Webview message-passing.** The React-in-webview to extension-host boundary is fiddly. If Week 2 reveals friction, simplify the early UI to native tree views and add webviews only where the rich UI truly needs them.
- **Manual-mode fatigue.** The MVP relies on copy-paste to external AI tools. If that becomes the bottleneck during your own use, that is a signal, not a failure: it tells you where API integration should go first in the next build.
- **Momentum.** At 5 to 10 hours a week, two missed weeks is a month. If you stall, drop to the phase boundary nearest to done and ship that as a smaller proof of work rather than abandoning.

## What is explicitly not in this build

The remaining specialists, the full configurable stage library, all eight memory types as rich linked objects (this build uses a simpler subset), MCP server mode, API-based AI orchestration, and OpenVSX publishing for auto-update. These are the next build, justified only if the trimmed MVP gets a positive response.
