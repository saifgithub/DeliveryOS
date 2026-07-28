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
| The stakeholder | Saiful — sole human-in-the-loop |
| Shared branch | `main` directly, delivery = pushed to `origin`. DeliveryOS ships a packaged `.vsix`, not a deployed service, so there is no auto-deploy risk from lane files landing on `main` (same reasoning as `docs/build/auditor/DELIVERYOS_BINDINGS.md`'s existing branch binding for the older per-chunk kernel) |
| Change registers | `docs/pm/BACKLOG.md` (`B-XXX` — CR-equivalent, planned changes) and `docs/build/bugs.json` (`id` field — DEF-equivalent, defects). **Proposed convention, not an established one** — this repo has never run CR/DEF ids through a shared lane directory before; confirm before the first lane dispatches. |
| Test command — extension surface | `npm run test --workspace=deliveryos` (`tsx --tsconfig test/tsconfig.json --test test/*.test.ts`) |
| Test command — webview surface | `npm run typecheck --workspace=@deliveryos/webview` (`tsc --noEmit`) — **no unit tests exist for this surface**; typecheck is the only automated gate today |
| Test command — contracts surface | `npm run build:contracts` (`tsc -p tsconfig.json`) — a shared type-definitions package with no tests of its own; correctness is verified by its consumers' typecheck |
| The contract check | `npm run build:contracts && npm run typecheck --workspace=deliveryos` — rebuilds `contracts/dist` and typechecks the extension against it. `extension` consumes `contracts/dist`, not `contracts/src`, so a contract change that isn't rebuilt first is invisible to the extension's own typecheck — this is DeliveryOS's real cross-lane coupling point, and the reason `contracts/src/index.ts` is a hot file below |
| The long-running test command | `npm run gate` (`scripts/gate.mjs`: clean → build → typecheck → test → package) — the existing full self-build gate, already used as the non-agentic acceptance gate for MABP chunks |
| The content self-test | N/A — no content corpus in this project (no lesson/copy corpus analogous to AMI's) |
| Live-stack verification | Load the packaged `.vsix` in the VS Code Extension Development Host and exercise the golden-path panel for the changed feature. DeliveryOS has no deployed host to curl or ssh into — this is the closest equivalent to AMI's live-stack check |
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

## Hosting

No standing launch helpers yet — Tier B′ (`dispatch_launch.sh` and friends) was deliberately not
adopted in this pass (optional per `PORTABLE_MANIFEST.md` §"Standing it up" step 1). Until it is,
launch an instance the same way any other Claude Code session is launched in this project, and record
its `live_handle` by hand in its roster file.

## Definition-of-Done bindings

Not in this file, per `PORTABLE_MANIFEST.md`'s own instruction ("lives with the project's governance
docs, not in this tree"): see `docs/governance/DEFINITION_OF_DONE_BINDINGS.md`.
