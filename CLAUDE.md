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

## Two orchestration systems, both DeliveryOS's to keep

This repo runs two distinct multi-agent coordination mechanisms. They are not layers of one system —
know which one a given piece of work belongs to before touching it.

- **MABP / MHBP** — the actively-used, DeliveryOS-specific chunk-by-chunk build process. One
  Architect, serial, one chunk in flight at a time. Entry point: `docs/MULTI_AGENT_BUILD_PROCESS.md`
  (baseline) → `docs/MHBP_LAB.md` (experimental variant, non-normative). State lives in
  `docs/build/CHUNK_LEDGER.md`, `docs/build/STRUCTURAL_DEBT.md`, `docs/build/COHESION_LOG.md`. This is
  what actually builds the extension today.
- **`orchestration/`** — a portable, project-agnostic dispatch + audit protocol (four-role model:
  Architect / Auditor / Coder / Non-coder) adopted 2026-07-27 as headroom for future multi-instance
  parallel work. Entry point: `orchestration/README.md`. **Not currently wired into the active
  build** — no lanes have been dispatched; DeliveryOS's chunks are not dispatch-protocol work items.
  Its tier-A files (see `orchestration/PORTABLE_MANIFEST.md`) are portable core: they must stay
  free of DeliveryOS-specific content so they can be `cp`'d into another project unedited. Project
  specifics live in the `BINDINGS.md` / `DELIVERYOS_BINDINGS.md` files beside them.

**DeliveryOS is the canonical keeper of both**, regardless of where either was refined. MABP
originated and stays here. The audit-layer kernel behind `orchestration/`'s audit protocol also
originated here (`docs/build/auditor/PROTOCOL.md`, canonical-origin per its own header) — its dispatch
layer matured through real use elsewhere before this adoption pass brought the fuller protocol back.
Treat both as one coherent domain to maintain coherently, not two things that happen to coexist.

**Rule that follows from this:** never name another project in DeliveryOS's own protocol/process
docs, even as attribution — a portable file that leaks a source project's name is a defect in the
split (see `orchestration/PORTABLE_MANIFEST.md`'s own "keeping the split honest" section), and
DeliveryOS's non-portable docs (MABP/MHBP) shouldn't carry it either, since this repo is the
reference version other projects pull from, not a downstream consumer citing where it got something.

## Continuity

Session-boundary continuity runs on `/sm-checkpoint`'s SAVE → `/compact` → RESTORE cycle — see
`docs/MULTI_AGENT_BUILD_PROCESS.md` §12 for the DeliveryOS-specific convention layered on top
(identity-marker cold start, no `LATEST.md` pointer). The `/sm-handover` / `/sm-start-fresh` trio
this replaced is retired.

## Repo layout

npm workspaces: `contracts/` (shared types) → `extension/` (VS Code host) + `webview/` (React panels).
`npm run gate` is the self-build acceptance gate (clean → build → typecheck → test → package).
`docs/build/README.md` has the full ownership table for `docs/build/`'s working files.
