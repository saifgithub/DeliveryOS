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
| Independent regression suite | `npm run gate` (`scripts/gate.mjs`), run by the auditor from its own worktree/checkout — never trust the architect's pasted output. For a narrower re-run of just the changed surface: `npm run test --workspace=deliveryos` (extension) or `npm run typecheck --workspace=@deliveryos/webview` (webview). |
| Deploy-target environment | N/A — DeliveryOS ships a packaged `.vsix` artifact, not a deployed service. "Live-stack verification" (`../dispatch/BINDINGS.md`) substitutes: load the `.vsix` in the VS Code Extension Development Host. |
| Device-only marker | N/A — no mobile/device surface in this project. |
| Auditor identity | Spawned fresh per audit round (own tier — a Claude peer session), no standing roster entry. Matches the source protocol's own convention (its `roster/` has no `auditor.*` file either) and this repo's existing `docs/build/auditor/DELIVERYOS_BINDINGS.md` binding ("own (Claude peer) / foreign / human"). |
| Escalation precedents | None yet — this repo has no dispatch history to cite. Populate this row the first time an item is escalated past a spawned auditor, per `ARCHITECT_LOOP_PROMPT.md`'s "when to escalate" guidance (store submission, legal/compliance text, schema migration with data movement, money/entitlements, safety floor, or a user-facing claim about product behaviour — none of which currently apply to a pre-1.0 VSCode extension, but the row exists for when one does). |

## Gap-fills (PROTOCOL.md v2 is silent on these; DeliveryOS-specific)

1. **Concurrency cap.** 1 lane `AWAITING_AUDIT` at a time (see `../dispatch/BINDINGS.md` caps table) —
   matches this repo's own documented strict-serial precedent, not a v2 default.
2. **Stall window.** One full active session with no verdict movement at the cap, then escalate.

## Relationship to the existing per-chunk kernel (`docs/build/auditor/`)

This is a **second, independent audit mechanism**, not a replacement or upgrade of
`docs/build/auditor/PROTOCOL.md` (the "v1" single-lane kernel this repo's own commit `416e238`
declared canonical origin for). The two differ in scope, not just maturity:

- `docs/build/auditor/` — one lane at a time, one chunk or module per lane, wired into
  `docs/MULTI_AGENT_BUILD_PROCESS.md`'s serial per-chunk build loop. Actively used today.
- `orchestration/audit/` (this file) — many `CR`/`DEF` work items concurrently, multiple instances,
  a dispatch layer assigning lanes to named instances. Not in active use yet; adopted for future
  headroom.

Do not merge them. If DeliveryOS ever moves its chunk-by-chunk build onto this dispatch protocol,
that is a deliberate future migration with its own plan — not a byproduct of this adoption.
