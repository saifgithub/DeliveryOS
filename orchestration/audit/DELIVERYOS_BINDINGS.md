<!--
DELIVERYOS_BINDINGS.md — this project's resolution of ../audit/PROTOCOL.md (the v2 parallel-lane
  audit handshake, tier A). Named after the project per PORTABLE_MANIFEST.md so a re-copy of
  PROTOCOL.md can never clobber it.
  NOT the same file as docs/build/auditor/DELIVERYOS_BINDINGS.md — that binds the older, simpler
  "v1" single-lane kernel (docs/build/auditor/PROTOCOL.md) that this repo's own serial per-chunk
  MABP build still uses. The two kernels are intentionally left as separate, coexisting systems;
  see this file's own "Relationship to the existing per-chunk kernel" section below.
-->

# DeliveryOS bindings for orchestration/audit/PROTOCOL.md (v2)

## Token resolution

| Term | Binding |
|---|---|
| `<ITEM>` id format | `B-XXX` (from `docs/pm/BACKLOG.md`) for CR-equivalent planned items; the `id` field from `docs/build/bugs.json` for DEF-equivalent defects. Both share `orchestration/audit/cr/` as the one lane directory, per protocol. **Proposed — not yet exercised; confirm before the first item is dispatched.** |
| `<AUDIT_LANE_DIR>` | `orchestration/audit/cr` |
| `<AUDIT_ROOT>` | `orchestration/audit` |
| `<DISPATCH_ROOT>` | `orchestration/dispatch` (for `rotate_trail.py`, shared with the dispatch ledger) |
| SOURCE vs AUDITOR path split | Architect/builder edits everything except `orchestration/audit/**`, plus its own `<ITEM>.architect.md` and `orchestration/audit/cr/INDEX.md`. Auditor edits `orchestration/audit/**` only. |
| Independent regression suite | `npm run gate` (`scripts/gate.mjs`, no `--item`), run by the auditor from its own worktree/checkout — never trust the architect's pasted output. For a narrower re-run of just the changed surface: `npm run test --workspace=deliveryos` (extension) or `npm run typecheck --workspace=@deliveryos/webview` (webview). |
| The acceptance runner | `npm run gate -- --item <ITEM>` (`scripts/gate.mjs`). Runs the five fixed build steps, then executes **every check under `orchestration/audit/acceptance/<ITEM>/`** — files the auditor authored blind from the spec and that no coder instance's `owns:` set covers. Exit code is the verdict; no agent issues one. An absent or empty acceptance directory **fails**, so a vacuous pass is impossible. This is a different claim from the regression suite above, and the DoD has a separate row for each. |
| `<GATE_RUN_RECORD>` | `docs/build/gate/item-<ITEM>.json`. Result: `passed` (with `exitCode` and per-check `checks[]` for detail). Revision: `gitSha`. Untracked **by rule** (`.gitignore`), which is how it satisfies "under `<AUDIT_ROOT>/**` or untracked". In `--item` mode an unresolvable HEAD **fails the run** rather than recording a placeholder — a result that cannot name its revision is evidence about unidentified code. |
| Acceptance-check directory | `orchestration/audit/acceptance/<ITEM>/`. Verified disjoint from every coder instance's `owns:` set (all three own only `contracts/src/**`, `extension/**`, `webview/**`), which is what makes independence decidable here rather than promised. |
| Worktree under a machine gate | **Mandatory.** `<WORKTREE_DIR>` = `.claude/worktrees`; check the submitted SHA out there. `git archive` produces a tree with no `.git`, so `gate.mjs --item` cannot resolve HEAD inside one and refuses to run. |
| `<SYNC_COMMAND>` | `git fetch origin && git merge --ff-only origin/main` from the repo root. |
| Handover model | A round that ends mid-audit resumes from `orchestration/audit/runs/<date>_run-NN/` — but only the `<GATE_RUN_RECORD>` line is reusable, and only when its `gitSha` is the audited one. Every other step is re-run: the journal is the auditor's own claim about itself. |
| Deploy-target environment | N/A — DeliveryOS ships a packaged `.vsix` artifact, not a deployed service. "Live-stack verification" (`../dispatch/BINDINGS.md`) substitutes: load the `.vsix` in the VS Code Extension Development Host. |
| Device-only marker | N/A — no mobile/device surface in this project. |
| Auditor identity | `dispatch/roster/auditor.deliveryos.md` — one auditor, gating every coder instance, premium band, `turn_taking: invoked`, `lifetime: one-shot` (started per round by the Architect from the board, so it never spends its lifetime in a poll loop). **The entry is install-owned**: the Architect starts this instance and may not write, edit or retire its roster file, or repoint any coder's `auditor:` field. Known weakness recorded in that file: its `family` matches every coder it gates, so the fleet is not decorrelated. |
| Escalation precedents | None yet — this repo has no dispatch history to cite. Populate this row the first time an item is escalated past a spawned auditor, per `ARCHITECT_LOOP_PROMPT.md`'s "when to escalate" guidance (store submission, legal/compliance text, schema migration with data movement, money/entitlements, safety floor, or a user-facing claim about product behaviour — none of which currently apply to a pre-1.0 VSCode extension, but the row exists for when one does). |

## Gap-fills (PROTOCOL.md v2 is silent on these; DeliveryOS-specific)

1. **Concurrency cap.** 1 lane `AWAITING_AUDIT` at a time (see `../dispatch/BINDINGS.md` caps table) —
   matches this repo's own documented strict-serial precedent, not a v2 default.
2. **Stall window.** One full active session with no verdict movement at the cap, then escalate.

## Relationship to the existing per-chunk kernel (`docs/build/auditor/`)

**Superseded, and converging — not two systems to keep.** As of 2026-09-01 (`CLAUDE.md`) this tree
is the chassis and `docs/build/auditor/` is the duplicate to retire; the two are the same five files
at different maturity, and this one is the later. Migration step 1 is to repoint references at these
copies rather than to keep both in step.

- `docs/build/auditor/` — one lane at a time, one chunk or module per lane, wired into
  `docs/MULTI_AGENT_BUILD_PROCESS.md`'s serial per-chunk build loop. Still what has actually shipped.
- `orchestration/audit/` (this file) — many items concurrently, multiple instances, a dispatch layer
  assigning lanes to named instances, and the machine gate. No lane has run yet.

MABP stays the working process until one item completes end to end here. That is the only event that
turns this from design into process, and nothing else substitutes for it.
