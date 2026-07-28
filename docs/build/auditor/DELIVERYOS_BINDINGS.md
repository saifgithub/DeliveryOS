<!--
DELIVERYOS_BINDINGS.md — this project's own resolution of the portable PROTOCOL.md kernel beside it.
DeliveryOS is the canonical origin of that kernel (not a downstream consumer), so this file has no
upstream to diverge from — it's both DeliveryOS's real bindings AND the reference template a
downstream project copies when it adopts the kernel. This file, the two loop prompts, and the lane
files are the only DeliveryOS-authored parts of the handshake — re-copying PROTOCOL.md never clobbers
them. Section numbers below match PROTOCOL.md's for easy cross-reference.
-->

# DeliveryOS bindings for PROTOCOL.md

| Term (PROTOCOL.md §) | DeliveryOS binding |
| --- | --- |
| Lane directory (§2) | `docs/build/auditor/lanes/` |
| The gate (§5.3, implicitly) | `npm run gate` (`scripts/gate.mjs`: clean → build → typecheck → test → package). Result at `docs/build/gate/last-run.json`. |
| Branch (§2 "delivery is on origin") | `main` directly — no dedicated handshake branch. DeliveryOS ships a packaged `.vsix`, not a deployed service, so there's no auto-deploy risk from lane files landing on `main`. |
| Ledger (§5.3) | `docs/build/EXPERIMENT_LOG.md` §4.3. |
| Anchor doc | `CLAUDE.md` (repo root) → `docs/MULTI_AGENT_BUILD_PROCESS.md` + `docs/build/README.md`'s ownership table for build-cycle detail. |
| Real measurement | `docs/MULTI_AGENT_BUILD_PROCESS.md` §16.5 delivery surfaces — drive the actual surface, not an internal call. |
| Auditor tiers (§1) | `own` (Claude peer) / `foreign` / `human` — see `docs/MHBP_LAB.md` §6 for the full pluggable-auditor rules. |
| Baseline build-process doc (§1, §4) | `docs/MULTI_AGENT_BUILD_PROCESS.md` (the 3-role architect/builder/auditor contract). A downstream project reusing the kernel either points this at its own equivalent baseline doc or adopts DeliveryOS's directly. |
| Cross-harness / lab doc (§1, §4) | `docs/MHBP_LAB.md` (auditor-tier rules §6, Tester rules §7). Experimental, not baseline — see that doc's own banner. |

## Gap fills (PROTOCOL.md is silent on these; DeliveryOS-specific)

1. **Concurrency model.** DeliveryOS runs guardrail 1 strictly serial (`docs/MHBP_LAB.md` invariant
   3 — a prior parallel-lanes attempt stalled). A downstream project may instead run a capped-parallel
   model (e.g. at most N lanes `AWAITING_AUDIT` at once); that only changes guardrail 1's binding, not
   the file format or derived-state logic in §2–§4.
2. **Depth cap.** Round `v4` for either a chunk or a module escalates to the human rather than
   iterating further — matches `docs/MULTI_AGENT_BUILD_PROCESS.md` §8 Cycle 6's cap.

## Relationship to existing DeliveryOS governance

- **This handshake is additive.** It layers independent re-verification on top of
  `docs/MULTI_AGENT_BUILD_PROCESS.md`'s existing gate (§16) and `docs/MHBP_LAB.md`'s existing
  experimental structure — it does not replace either.
- **`docs/build/EXPERIMENT_LOG.md`** is the single ledger for this handshake specifically; it is also
  the pre-registered-evidence log for the `docs/MABP_LAB.md` / `docs/MHBP_LAB.md` arms more broadly.
- **Propagation.** As the canonical origin, changes to PROTOCOL.md's *mechanism* (§1–§6) should be
  made here first, then `cp`'d to any downstream project's copy. Changes to *this file* are local by
  definition — a downstream project's own bindings file is theirs to own, not something DeliveryOS
  pushes to.
