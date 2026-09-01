<!--
BINDINGS.md — DeliveryOS's resolution of DISPATCH_PROTOCOL.md's generic tokens, plus caps,
  the hot-file registry, and hosting notes. Local to this project; a re-copy of DISPATCH_PROTOCOL.md
  (or any other tier-A file) never touches this file. See ../PORTABLE_MANIFEST.md for the tier split.
-->

# DeliveryOS bindings for DISPATCH_PROTOCOL.md

Adopted 2026-07-27 per this tree's `PORTABLE_MANIFEST.md`.
Stood up ahead of need — DeliveryOS is currently a single-maintainer project with no lanes dispatched
yet. This is available headroom for future multi-instance work, not something in active use today.

## Token resolution table

| Token | Binding |
|---|---|
| `<ORCH_ROOT>` | `orchestration` |
| `<DISPATCH_ROOT>` | `orchestration/dispatch` |
| `<AUDIT_ROOT>` | `orchestration/audit` |
| `<AUDIT_LANE_DIR>` | `orchestration/audit/cr` |
| `<WORKTREE_DIR>` | `.claude/worktrees` (lane worktrees: `<instance-id>-<ITEM>`) |
| `<TAG_PREFIX>` | `DOS` — commit tag `(DOS:<instance-id> <ITEM>)`, reuses this repo's existing session-tag prefix |
| `<ITEM>` id format | `B-NNN` for backlog rows, `bNNN` for bug records. One format per register; see the register table below |
| `<TZ>` | `Asia/Kuala_Lumpur` (UTC+8) — both ledger headers stamp in it |
| `<SYNC_COMMAND>` | `git fetch origin && git merge --ff-only origin/main` from the repo root |
| `<GATE_RUN_RECORD>` | `docs/build/gate/item-<ITEM>.json`, written by `scripts/gate.mjs --item <ITEM>`. Result field: `passed` (boolean) — `exitCode` and per-check `checks[]` carry the detail. Revision field: `gitSha`. **Untracked by rule, not by accident** (`.gitignore`), satisfying the constraint that the record lands under `<AUDIT_ROOT>/**` or on an untracked path |
| `<DOD_BINDINGS_PATH>` | `docs/governance/DEFINITION_OF_DONE_BINDINGS.md` |
| The stakeholder | Saiful — sole human-in-the-loop |
| Shared branch | `main` directly, delivery = pushed to `origin`. DeliveryOS ships a packaged `.vsix`, not a deployed service, so there is no auto-deploy risk from lane files landing on `main` (same reasoning as `docs/build/auditor/DELIVERYOS_BINDINGS.md`'s existing branch binding for the older per-chunk kernel) |
| Architect's inner process | `docs/MULTI_AGENT_BUILD_PROCESS.md` — this repo's own build process, which the orchestration chassis layers over rather than replaces |
| Continuity / status record | `docs/build/CHUNK_LEDGER.md` + the `/sm-savepoint` → `/sm-readpoint` memo cycle (`docs/commands/`) |

## Registers (DISPATCH_PROTOCOL.md §1a)

| Register id | `<REGISTER_PATH>` | `<ITEM_KIND>` | `<STATUS_VOCAB>` | `<SPEC_POINTER>` | `<DOD_APPLIES>` |
|---|---|---|---|---|---|
| `backlog` | `docs/pm/BACKLOG.md`; a row is addressed by its `B-NNN` id | planned change | its three section headings — *Ready* (not started) · *In progress* (being worked) · *Done* (closed). A row's status is which section it sits under | the `## § B-NNN` section in the same file | **yes** |
| `bugs` | `docs/build/bugs.json`; a row is the object in the `bugs` array whose `id` matches | defect | `open` (not started or being worked) · `resolved` (closed) | the bug record itself — its `summary`, `repro` and `expected` fields are the spec | **no** |

Both registers share `orchestration/audit/cr/` as the one lane directory, per protocol.

**`<DOD_APPLIES>` is a human decision, made here, per kind.** A planned change renders the full DoD:
it can touch docs, a register row and a user-facing surface, so every row is answerable. A defect
does not: its scope is "this specific thing was wrong and now is not", and requiring the Docs,
Register-row-and-manual and band-justification rows on a one-line fix produces a column of `N/A`s —
which is exactly how a reviewer learns to wave `N/A`s through. A defect still carries the chunk
evidence list, is still audited, and is still gated.

**Proposed convention, not an established one** — this repo has never run register ids through a
shared lane directory. Confirm before the first lane dispatches.
| Test command — extension surface | `npm run test --workspace=deliveryos` (`tsx --tsconfig test/tsconfig.json --test test/*.test.ts`) |
| Test command — webview surface | `npm run typecheck --workspace=@deliveryos/webview` (`tsc --noEmit`) — **no unit tests exist for this surface**; typecheck is the only automated gate today |
| Test command — contracts surface | `npm run build:contracts` (`tsc -p tsconfig.json`) — a shared type-definitions package with no tests of its own; correctness is verified by its consumers' typecheck |
| The contract check | `npm run build:contracts && npm run typecheck --workspace=deliveryos` — rebuilds `contracts/dist` and typechecks the extension against it. `extension` consumes `contracts/dist`, not `contracts/src`, so a contract change that isn't rebuilt first is invisible to the extension's own typecheck — this is DeliveryOS's real cross-lane coupling point, and the reason `contracts/src/index.ts` is a hot file below |
| The long-running test command | `npm run gate` (`scripts/gate.mjs`: clean → build → typecheck → test → package) — the full self-build regression suite. **Not** an acceptance gate over independently-authored per-item checks: `gate.mjs` states it gates building this project only, and the per-delivery acceptance-check generation is unbuilt |
| The content self-test | N/A — no content corpus in this project |
| Live-stack verification | Load the packaged `.vsix` in the VS Code Extension Development Host and exercise the golden-path panel for the changed feature. This project has no deployed host to curl or ssh into, so this is its nearest equivalent |
| The device-only marker | N/A — no mobile/device-only surface in this project |
| Per-instance WIP cap | 1 active lane per instance |
| Global audit cap | 1 lane `IN_AUDIT` at a time |
| Stall window | One full active session with no verdict movement at a cap, then escalate to the stakeholder |

**Caps and the stall window are conservative defaults, not measured incident evidence** — DeliveryOS
has no dispatch history yet to calibrate against. They intentionally match this project's own
documented precedent: `docs/MHBP_LAB.md` invariant 3 records that a prior parallel-lanes attempt
stalled (Run-1), and `docs/build/auditor/DELIVERYOS_BINDINGS.md` gap-fill 1 already runs that
protocol's guardrail 1 strictly serial for the same reason. Raise the caps once real lane throughput
justifies it, not before.

## Hot-file registry

Serialize any lane touching these via `DEPENDS-ON` (guardrail 3) — never work them in parallel:

| File | Why |
|---|---|
| `extension/src/webview/messenger.ts` | Single 2,300+ line file; every feature panel registers its message handlers here. Every `coder.features` vertical slice touches it. |
| `contracts/src/index.ts` | Barrel re-export for all 20 contract modules; every new/changed contract type touches this file. |
| `extension/src/extension.ts` | Activation entry point; every new command/panel registration touches this file. |

These three are why the `coder.features` roster instance (see `roster/coder.features.md`) is scoped to
run one lane at a time in practice, not why it is split further — see that file's own note.

## Implementation profiles (DISPATCH_PROTOCOL.md §2)

One row per distinct way an instance can run here. Every de-harnessed string from the portable files
lands in this table; no tier-A file names any of these values.

| Column | `agentic-premium` |
|---|---|
| `id` | `agentic-premium` |
| `kind` | `process` — an independent Claude Code session, not a subagent of the Architect |
| `launch_template` | `claude -p --session-id <uuid> --permission-mode acceptEdits --add-dir <repo> "<pointer payload>"`, started in the background. **The template mints `<uuid>` and returns it**; the Architect records what it returns |
| `resume_template` | `claude --resume <uuid>` |
| `watch_capable` | yes — can hold a blocking `dispatch.sh inst <id>` watch, but not under `lifetime: one-shot` |
| `anchor` | `CLAUDE.md`, auto-loaded from the repo root. A loop prompt still has to be handed in explicitly; only the agent guide is automatic |
| `context_policy` | auto-compaction, always on, unattended. Fires near ~1M tokens — a backstop, not the operating point |
| `fanout` | available (`Workflow` / `Agent`), **granted per launch**, never standing. Withholding it per lane is how the Architect protects the shared quota |
| `timeout_ceiling` | 600000 ms per command; past the default a command is auto-backgrounded, which ends a one-shot instance mid-lane |
| `result_convention` | commits + pushes its own paths; the lane files are the hand-off |
| `version_pin` | none set — a known gap. Two instances on different releases of the same tool are two profiles, and nothing here would currently distinguish them |

**Not adopted:** a launch helper script. The template above is the binding; a helper would only save
typing (optional per `PORTABLE_MANIFEST.md`'s tier-B′ note).

**The live doorbell is `SendMessage` to the `live_handle`.** Available on this profile, and used only
as a doorbell: status, a clarification, a simple hand-off. Never large context, never a command to
execute — the file is truth.

## Capability bands (ROLES.md)

| Band | Fills with, here |
|---|---|
| Economy | Haiku-class |
| Standard | Sonnet-class |
| Premium | Opus-class |

**The fleet cannot decorrelate today.** Every roster entry is `family: claude`, auditor included.
Other families are available to this project and documented (`docs/MHBP_LAB.md` §1 — a separate
agentic CLI on a different family, and two local OpenAI-compatible endpoints the architect calls
directly), and none has ever been wired into a lane. Recorded here as a known gap rather than left
for someone to infer from a roster of identical `family:` values.

## Definition-of-Done bindings

Not in this file, per `PORTABLE_MANIFEST.md`'s own instruction ("lives with the project's governance
docs, not in this tree"): see `docs/governance/DEFINITION_OF_DONE_BINDINGS.md`.
