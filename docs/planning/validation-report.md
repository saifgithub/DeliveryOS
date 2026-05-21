# Validation report — Phase A, Prompt 3 (final)

**Status:** Iteration 2 (clean). Iteration 3 not needed.
**Date:** 2026-05-21 (DOS:O3).
**Final verdict:** zero blockers, zero majors, residual minors justified below.

## Iteration history

| Iter | Blockers | Majors | Minors | Notes |
|---|---|---|---|---|
| 1 (initial) | 5 | 18 | 16 | Initial audit found taxonomy + path drift across the 16 chunk specs. |
| 2 (post fix-pass 1) | 1 | 5 | 26 | Iteration-1 fix-pass landed cleanly except for a tree-provider regression (CHUNK-12), a missed PRD path replace, and a parallel tree contribution file (CHUNK-13). |
| **Final (post fix-pass 2)** | **0** | **0** | **~22 documented as justified** | All blockers + majors cleared. Residual minors documented below. |

## Iteration-2 fix summary (applied this session)

These edits cleared all remaining blockers + majors after the re-audit:

| Iter-2 finding | Severity | Fix |
|---|---|---|
| S2-01 (Structure) | Blocker | `chunk-12-result-capture.md` lines 110, 342: replaced `executeTreeProvider.ts` references with `stageTreeProvider.ts` + canonical child-builder pattern. |
| C2-001 (Coverage) | Major | `docs/PRD.md`: global `sed` replace `/deliveryos-handoff/` → `.deliveryos-handoff/` (7 occurrences fixed across §§ 9, 12, 17, 18.X, 18.Y, 22). 0 slash-prefix remain; 19 dotfile references. |
| S2-02 + S2-10 (Structure) | Major + Minor | `chunk-13-allowed-forbidden-diff.md`: renamed `extension/src/diff/treeNodes.ts` → `extension/src/diff/diffTreeContribution.ts` and reframed as a child-builder function imported by `stageTreeProvider.ts` (per CHUNK-02's canonical contract). |
| S2-03 (Structure) | Major | `chunk-13-allowed-forbidden-diff.md`: changed "diff outcome under VERIFY" → "diff-outcome child of Result Memory tree item (under EXECUTE, inheriting placement from CHUNK-12)". |
| S2-04 (Structure) | Major | `chunk-07-requirements-catalogue.md`: replaced `extension/src/tree/projectTree.ts` → `extension/src/tree/stageTreeProvider.ts` (CHUNK-02's canonical path; also added a pre-monorepo rename note). |
| S2-05 + S2-06 + S2-07 (Structure) | Major | `chunk-03-memory-store.md` `LINK_KIND_EDGES` table: added two missing edge rows (`derives-from execution → test-spec`, `derives-from requirement(prd) → intent`); disambiguated the row-1 from-side payload discriminator (`requirement(kind=requirement-item) → requirement(kind=prd)`). |
| K2-01 (Contracts) | Minor | `chunk-12-result-capture.md`: corrected the `RESULT_MD_SECTION_NAMES` import path from `@deliveryos/contracts/briefMarkdown` → `../brief/briefMarkdown` (the actual location declared by CHUNK-09). |
| C2-002 + C2-006 + K2-03 (Contracts) | Minor cluster | `chunk-05-discover-capture.md`: renamed panel-local view models to non-colliding names (`RawIdea` → `RawIdeaView`, `DiscoveryRecord` → `DiscoveryDraft`, `DiscoveryAnswer` → `DiscoveryAnswerInput`). Added an explicit projection diagram between view models and CHUNK-03's canonical types. |
| C2-003 (Coverage) | Minor | `chunk-13-allowed-forbidden-diff.md`: changed test-fixture `status: 'M'` → `status: 'modified'` (matches CHUNK-12's canonical `GitFileChange.status` full-word union). |
| C2-005 (Coverage) | Minor | `docs/planning/part-1-plan.md` line 602: updated "Three classifications per file" → "Four classifications" (added the `unclassified-but-touched` warning class to match CHUNK-13's actual implementation and the README). |

## Final findings — justified residual minors

The audits surfaced ~22 small framing-and-naming items that are deliberately deferred to the build phase or accepted as known-state. Each is documented with rationale so they don't get re-surfaced during implementation.

### Naming + style

- **m10 / C2-004 / S2-09 — Command-ID naming convention.** Command IDs across UI chunks mix dotted (`deliveryos.project.create`, `deliveryos.prd.generate`) and camelCase (`deliveryos.openHello`, `deliveryos.openDiscover`, `deliveryos.decomposePrd`) styles. **Deferred to the build phase.** Rationale: zero functional impact in the planning corpus; consistent during the first integration sweep is cheaper than three more re-audit iterations now. Track-R should pick a single convention (`deliveryos.<area>.<verb>` with camelCase verbs) when wiring CHUNK-01's `package.json` and stay consistent in every subsequent chunk's `contributes.commands`.

- **m13 / m14 / V2-01 — Cross-platform verification stance for the install path.** CHUNK-04 verifies on macOS primarily (POSIX install script tested first-class); Linux is opportunistic; Windows install script + cross-OS smoke is deferred. **Accepted.** Rationale: the meta-harness primary user is a developer on macOS/Linux; CHUNK-04's "at least three editors" rule (with VS Code AND Cursor required) is the demoable bar. README documents the OS-coverage stance.

- **V2-02 — Version-check verification requires a previous tagged release.** CHUNK-04's version-check done-when is verifiable on the 2nd tagged release, not the first (the GitHub API returns 404 silently for the very first tag push). **Accepted as a chicken-and-egg artefact.** Document in CHUNK-04's risks during implementation.

### Test-plan framing

- **V2-03 — Live-AI vs deterministic fixtures framing.** CHUNK-08, CHUNK-13, CHUNK-14 each have fixture-based unit tests (verified). The audit asked for an explicit named paragraph framing "deterministic fixtures are the load-bearing verification; live AI is a separate dress-rehearsal smoke that's permitted to be flaky." **Deferred.** The fixtures exist; the framing is implicit. Track-R can add the framing paragraph when writing the corresponding test file's docblock.

- **V2-04 — Phase-1 boundary live-AI dependency.** CHUNK-08 § 9 step 6 expects "high confidence" parser banner from a live AI response. Workaround: the parser fixtures cover all parse-confidence levels, and the user can hand-edit the parsed output when live AI lands in `low` or `raw`. **Accepted as implicit fallback;** Track-R should make the fallback explicit in the user-facing copy.

- **V2-05 — PreToolUse hook regression coverage.** CHUNK-13 § 11.6 step 7 verifies that PreToolUse can't be bypassed by `--dangerously-skip-permissions` as a manual smoke. **Deferred to CHUNK-15 rehearsal-mode pre-demo checks.** The property is load-bearing for the headline feature; the manual check happens before each demo recording, and a future Claude Code update breaking this property would be caught by the rehearsal.

- **V2-07 — CHUNK-14 walker cycle test duplication.** Unit test (`memoryGraphWalker.test.ts` covers cycle, missing link, multi-result warnings) is the actual gate; § 11.4 manual step is for E2E confidence. **Documented; no spec edit needed.**

- **V2-08 — CHUNK-14 lacks a consolidated `## Definition of done` section.** CHUNK-14's done-when criteria are spread across § 1.3, § 11.2, § 13.2 instead of one consolidated list. **Accepted.** The criteria are present and complete; the consolidation can happen during build.

- **V2-09 — Single-reader sampling for outside-reader test.** CHUNK-16 § 11.1 outside-reader pass criterion uses N=1. **Accepted as proof-of-work-scale evidence;** can scale to N=2 if a second reader is available.

- **V2-10 — Pinned-version table location.** No single chunk owns the canonical pinned-version table for editor + harness CLI versions. **Deferred to CHUNK-16 README implementation;** the README is where users will look, and pinning happens at demo-build time anyway.

- **V2-11 — `renderMemorySummary` truncation determinism test.** CHUNK-09 lists a 50-line cap but no explicit fixture for byte-stable truncation order. **Accepted;** add when writing the test.

- **V2-12 — FileSystemWatcher latency budget.** CHUNK-11 unit tests cover debounce + dedup but not the 1-second wall-clock budget. The integration test would need `@vscode/test-electron`. **Deferred to build phase;** manual check remains the gate.

### Misc lint and prose

- **memory-layers.md leftover "one SQLite table per memory type" prose** (flagged in K2-* census). Contradicts CHUNK-03's deliberate polymorphic single-table strategy. **Documented; one-line edit Track-R can absorb.**

- **CHUNK-08 § 5 prose still references the old `'verifies'` mis-attribution as a "corrected earlier draft" footnote** (S2-08). **Accepted as audit-trail documentation;** no edit.

- **CHUNK-03 has `targets` and `references-codebase` link kinds with no explicit writer in any chunk yet.** These edges are read by CHUNK-14's walker but the corresponding writer chunk (presumably CHUNK-09 for both) doesn't document writing them. **Deferred;** Track-R should either have CHUNK-09 write them when persisting a brief, or simplify CHUNK-14's walker to derive the relationship from existing `derives-from` edges.

## Censuses (post-iteration-2 state)

### Memory-type census — clean

All references to memory types across the 16 chunks use only the canonical 9-entry `MEMORY_TYPES` tuple: `intent`, `requirement`, `design`, `codebase`, `execution`, `result`, `verification`, `release`, `test-spec`. Zero references to `discovery`, `prd`, or `bypass` as a `memory_entries.type`. Discovery is at `IntentPayload.discovery`; PRD is `requirement` with `payload.kind === 'prd'`; bypasses are at `VerificationPayload.bypasses[]`.

### Link-kind census — clean

All references use only the canonical 13-entry `LINK_KINDS` tuple defined in CHUNK-03's `contracts/src/links.ts`. Zero references to the retired 11 strings (`derived-from`, `result-of`, `produced-by`, `sourced-from`, `uses-test-spec`, `fulfills`, `designed-by`, `refines-from`, `snapshot-of`, `has-bypass`, `belongs-to`). The `LINK_KIND_EDGES` table now has 19 rows covering every write/read declared by the consumer chunks.

## Phase-boundary check — all pass

| Phase | Boundary chunk | Demoable state | Verdict |
|---|---|---|---|
| 0 | CHUNK-04 | "Installed in VS Code AND Cursor from the same file" | ✅ Pass — done-when requires both. |
| 1 | CHUNK-08 | "Type an idea → PRD → requirements → test specs" | ✅ Pass. |
| 2 | CHUNK-11 | "Click a button → Claude Code runs against the brief" | ✅ Pass. |
| 3 | CHUNK-14 | "Full loop, idea to verified release, diff feature catches a violation live" | ✅ Pass — minimum acceptable ship state. |
| 4 | CHUNK-16 | Public proof of work | ✅ Pass. |

## Source-of-truth doc alignment

| Doc | Alignment with chunk specs | Verdict |
|---|---|---|
| `docs/PRD.md` | All handoff paths use `.deliveryos-handoff/` dotfile form (19 references, 0 slash-prefix); § 25.2 names `sql.js` (WASM) + Radix UI + Tailwind + Lucide React + workspace-trust capabilities; § 27 Risk 3 references PreToolUse hook; § 21 marks Memory Workspace deferred. | ✅ |
| `docs/BUILD-PLAN.md` | Week 2 names `sql.js` with cross-editor ABI rationale. | ✅ |
| `docs/decisions/0001-vsix-extension-not-fork.md` | Signature-verification risk reframed as "future tightening, not present-day breakage"; SHA-256 hash mitigation documented. | ✅ |
| `docs/architecture/harness-profiles.md` | Profile schema includes `command_template?: string` + `harness_version_pin?: string`; Codex `-o` flag documented; Claude PreToolUse hook documented; AGENTS.md Linux-Foundation context note present. | ✅ |
| `docs/architecture/execution-briefs.md` | Handoff path is dotfile; Section 9 embeds `RESULT_MD_SECTION_NAMES`; brief immutability via `locked_at` documented. | ✅ |
| `docs/architecture/memory-layers.md` | Lists the 9 canonical types; declares Discovery folded into Intent; bypasses inline; references `contracts/src/links.ts`. | ✅ (one prose nit deferred; see "memory-layers.md leftover" above) |
| `docs/architecture/stage-configuration.md` | No edits needed; doesn't reference rejected APIs. | ✅ |

## Sign-off

The 16 chunk specs + `chunks/README.md` + source-of-truth docs are **internally consistent and externally aligned**. All blockers and majors are resolved. The residual ~22 minors are either:
- naming-convention sweeps that belong in the build phase (m10),
- cross-platform stance choices already implicit in the trimmed-MVP scope (V2-01, V2-06, V2-10),
- test-plan framing tightening that can land alongside the first failing test (V2-03, V2-04, V2-05, V2-08, V2-11, V2-12),
- audit-trail prose that does not affect the implementation (S2-08, K2 censuses).

`docs/planning/READY.md` may now be written.

---

## Iteration 3 — DOS:O4 Phase 0 audit (third pass)

**Trigger:** DOS:R1 built CHUNK-01 steps 1–3 (first real-world test of the planning corpus). DOS:O4 ran a focused third audit pass scoped to Phase 0 (CHUNK-01..04 + the source-of-truth docs they reference + the consumer chunks that consume Phase 0 contracts).

**Findings:** 3 blockers + 17 majors + ~34 minors. All blockers + majors fixed in-session; Group A + B minors landed; ~26 verification-framing minors deferred to build with rationale.

The blockers all lived in the producer↔consumer contract surface that iteration-2 didn't trace explicitly:

- **B-01.** `targets` and `references-codebase` link kinds had zero writers; `subject-of-decision` was semantically identical to `verifies`. **Resolution:** `LINK_KINDS` reduced from 13 to 10 — `targets` (subsumed by `derives-from`), `references-codebase` (deferred until a Codebase Memory writer chunk lands), and `subject-of-decision` (collapsed into `verifies`) retired. CHUNK-14 walker simplified accordingly.
- **B-02.** CHUNK-03's subpath imports (`@deliveryos/contracts/memory`) wouldn't resolve under CHUNK-02's `contracts/package.json` shape. **Resolution:** added `exports` map to CHUNK-02 § 3.1 covering `./memory`, `./links`, `./panels/*`.
- **B-03.** CHUNK-09 imported `Requirement`, `CodebaseMemory`, `TestSpecMemory` type names that CHUNK-03 didn't export. **Resolution:** added canonical per-type aliases (`IntentMemory`, `RequirementMemory`, `DesignMemory`, …) in CHUNK-03's `contracts/src/memory.ts`.

**Full report:** [`docs/planning/audits/phase-0-audit.md`](audits/phase-0-audit.md) — iteration-2's sign-off above is no longer the latest state of the corpus; iteration-3 is.

`docs/planning/validation-report.md` line 80 ("13-entry `LINK_KINDS` tuple") is **superseded** by iteration-3 — the tuple is now 10 entries; the 11-entry retired-strings list in that same line has grown to 14 (the three iteration-3 retirements are documented in CHUNK-03 § 5.5's "Explicitly removed" table).
