<!--
CLAUDE.md — repo-root agent anchor. Auto-loaded every session. Keep this lean; it gets re-read into
  context constantly, so it points rather than duplicates. Fill in project-specific build/test
  commands as they stabilize — the mission statement below matters more than a command list and
  should not get crowded out by one.
-->

# DeliveryOS

A VSCode meta-harness for AI-assisted delivery — but the repo's actual subject is **how to do
development with AI agents**. The `.vsix` extension is one deliverable; the build methodology itself
(MABP/MHBP, and now the portable `orchestration/` protocol) is another, versioned and shipped
alongside it (see `skills/README.md`).

## One process, converging — `orchestration/` is the chassis

Two coordination mechanisms live here. As of 2026-09-01 they converge on one: the direction is
decided, the migration is not done.

- **`orchestration/` is the chassis** — four roles (Architect / Auditor / Coder / Non-coder), parallel
  lanes with disjoint write-paths and round-watermark state, intake, rotated ledgers, and a portable
  install recipe (`orchestration/PORTABLE_MANIFEST.md`). Entry: `orchestration/README.md`.
- **MABP §16 is the verification engine** — the only part of either system that makes "done"
  un-fabricable: acceptance checks authored by an independent verifier from the spec, uneditable by the
  implementer, adjudicated by a non-agentic runner whose exit code is the verdict (`npm run gate` →
  `docs/build/gate/last-run.json`). Orchestration's auditor re-runs the suite the *builder* wrote — a
  weaker claim. The gate binds **into** orchestration; it is not replaced by it.
- **MABP is what has actually shipped** (`docs/MULTI_AGENT_BUILD_PROCESS.md`) — 16 chunks and the
  extension. It stays the working process until a CR completes end-to-end under orchestration. State:
  `docs/build/CHUNK_LEDGER.md`, `STRUCTURAL_DEBT.md`, `COHESION_LOG.md`.

**Migration order.**
1. **Retire the duplicate audit kernel** — `docs/build/auditor/` and `orchestration/audit/` are the
   same five files at different maturity; orchestration's v2 wins, repoint references. *Not done.*
   They have now diverged 2–5× in length; `docs/build/auditor/README.md` records the divergence and
   which one a change belongs in. They stay until step 4 makes the migration real.
2. ~~**Bind the gate.**~~ **Done 2026-09-01.** `GATE: machine` is a derived state in `dispatch.sh`
   (a project hook's exit code, not a word on a lane); the Auditor authors acceptance checks from the
   spec *before* reading the implementation, into `orchestration/audit/acceptance/<ITEM>/`; and
   `npm run gate -- --item <ID>` executes them and records its own verdict with the revision it ran
   at. The DoD's *Tests* row (the project's own suite) and its new *Acceptance gate* row are
   deliberately different claims, answerable by different commands.
3. **Collapse `docs/MHBP_LAB.md` + `docs/MABP_LAB.md`** — they answer one question, *who verifies*,
   which is now `impl.family` + `BAND:` in roster/BINDINGS data, not two lab docs. *Not done.*
4. **Run one item end-to-end.** No lane has ever completed in this repo, and until one does the rest
   is design, not process. This is also what unblocks steps 1 and 3.

**How a project adopts it:** `cp -r orchestration/`, scrub the inherited tier-B/C files, run
`orchestration/install/INSTALL_INTERVIEW.md`, and stop when `install/check_bindings.sh` exits 0.
The only code an adopting project writes is its own `gate_check.sh`.

**Packaging is a requirement, not a follow-on.** The methodology ships to other projects, so the
portable/bindings split is load-bearing: a portable file names no project, host, person, path outside
its tree, or work-item id, and states the rule rather than the incident that produced it. Anything
DeliveryOS-specific belongs in a BINDINGS file.

**DeliveryOS is the canonical keeper**, regardless of where either was refined. MABP originated and
stays here; the audit-layer kernel originated here too, and its dispatch layer matured through real use
elsewhere before this adoption pass brought the fuller protocol back.

**Rule that follows from this:** never name another project in DeliveryOS's own protocol/process
docs, even as attribution — a portable file that leaks a source project's name is a defect in the
split (see `orchestration/PORTABLE_MANIFEST.md`'s own "keeping the split honest" section), and
DeliveryOS's non-portable docs (MABP/MHBP) shouldn't carry it either, since this repo is the
reference version other projects pull from, not a downstream consumer citing where it got something.

## Continuity

Session-boundary continuity runs on the `/sm-savepoint` → `/compact` → `/sm-readpoint` cycle — see
`docs/MULTI_AGENT_BUILD_PROCESS.md` §12 for the DeliveryOS-specific convention layered on top
(identity-marker cold start, no `LATEST.md` pointer), and `docs/hooks/README.md` for an optional
`PreCompact`/`SessionStart` hook pair that runs the same cycle automatically. That cycle is intra-session only, since it
keys on `$CLAUDE_CODE_SESSION_ID`; handing work to a *different* session — the other machine,
another instance, a fresh session after a crash — is `/sm-handover` → `/sm-takeover <ID>`, which
routes the same memo through the committed `.deliveryos/checkpoint_history/` archive. The retired
trio is the old config-driven `/sm-handover` / `/sm-start-fresh` / `/sm-session-setup`; today's
`/sm-handover` shares its name and nothing else.

## Repo layout

npm workspaces: `contracts/` (shared types) → `extension/` (VS Code host) + `webview/` (React panels).
`npm run gate` is the self-build acceptance gate (clean → build → typecheck → test → package).
`docs/build/README.md` has the full ownership table for `docs/build/`'s working files.
