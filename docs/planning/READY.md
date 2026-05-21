# READY — Part 1, the whole trimmed MVP

**Status:** Planned and ready for implementation.
**Date:** 2026-05-21 (end of DOS:O3).
**Scope:** The whole trimmed MVP (BUILD-PLAN Phases 0 through 4). 4 default stages (DISCOVER, DEFINE, EXECUTE, VERIFY), 1 specialist (Test Designer), 2 harness profiles (Claude Code, Codex), 1 demo (Bug Triage Assistant), Allowed/Forbidden diff + Claude Code PreToolUse hook as the headline feature.
**Window:** 14 weeks, 5–10 hrs/week. Start 2026-05-25. Demo 2026-08-24. Phase 3 (after CHUNK-14) is the minimum acceptable ship if the timeline slips.

Track R can now open `DOS:R1` and pick a chunk to build.

---

## Statement of readiness

This is the output of the Phase A planning loop run as four prompts (see `claude-code-build-prompts.md`):

1. **Prompt 1** — produced `part-1-plan.md`: 16 chunks spanning BUILD-PLAN Phases 0–4, ordered build sequence, dependency map, 12 research-driven changes flagged for Prompt 4.
2. **Prompt 2** — 16 worktree-isolated parallel subagents produced `docs/planning/chunks/chunk-NN-*.md`: ~11,300 lines of file-by-file specifications + `chunks/README.md` cross-chunk index.
3. **Prompt 3** — 4 parallel audit subagents produced `docs/planning/validation-report.md` covering coverage gaps, structural overlaps, contract drift, verification checkability. Initial audit: 5 blockers / 18 majors / 16 minors.
4. **Prompt 4** — two iteration rounds reconciled CHUNK-03 as the canonical owner of `MEMORY_TYPES` (9 entries) and `LINK_KINDS` (13 entries via `contracts/src/links.ts`), reconciled CHUNK-10 as the canonical owner of `HarnessProfile` schema and managed-block delimiter syntax (md / json sentinel-key / gitignore formats), reconciled CHUNK-11 as the canonical owner of the `.deliveryos-handoff/` layout, and folded the 12 research-driven changes into PRD / BUILD-PLAN / ADR-0001 / `architecture/*.md`. Final state: **zero blockers, zero majors, residual minors documented as justified** in `validation-report.md`.

The plan is internally consistent and externally aligned with the v0.3 PRD and the 14-week BUILD-PLAN. The chunks honour the trimmed MVP scope explicitly — every out-of-scope item (additional specialists, MCP server mode, API-based orchestration, OpenVSX publishing, full configurable stage library) is deferred and noted in every chunk that touches an adjacent surface.

## Final ordered chunk list

| Week | Date | Chunk | Title | Effort (session-days) | Direct deps |
|---|---|---|---|---|---|
| 1 | 2026-05-25 | [CHUNK-01](chunks/chunk-01-scaffold.md) | Extension scaffold + activity-bar + static stage tree | 4–6 | — |
| 2 | 2026-06-01 | [CHUNK-02](chunks/chunk-02-webview-foundation.md) | Webview foundation (Vite + React + Tailwind + CSP + messenger) | 3–5 | 01 |
| 2 | 2026-06-01 | [CHUNK-03](chunks/chunk-03-memory-store.md) | Memory store (`sql.js` + workspace `.deliveryos/` + schema) | 3–4 | 01, 02 |
| 2 | 2026-06-01 | [CHUNK-04](chunks/chunk-04-multi-editor-verify.md) | Multi-editor sideload + install scripts + GitHub Release scaffold | 1–2 | 01, 02, 03 |
| 3 | 2026-06-08 | [CHUNK-05](chunks/chunk-05-discover-capture.md) | Raw idea + Discovery interview | 4–5 | 02, 03 |
| 4 | 2026-06-15 | [CHUNK-06](chunks/chunk-06-prd-editor.md) | Draft PRD generation + PRD editor | 4–5 | 02, 03, 05 |
| 5 | 2026-06-22 | [CHUNK-07](chunks/chunk-07-requirements-catalogue.md) | Requirements catalogue | 4–5 | 02, 03, 06 |
| 6 | 2026-06-29 | [CHUNK-08](chunks/chunk-08-test-designer.md) | Test Designer specialist | 3–4 | 02, 03, 07 |
| 7 | 2026-07-06 | [CHUNK-09](chunks/chunk-09-execution-brief-composer.md) | Execution Brief composer (10-section schema) | 4–5 | 02, 03, 07, 08 |
| 8 | 2026-07-13 | [CHUNK-10](chunks/chunk-10-harness-profiles.md) | Harness profiles (Claude Code + Codex) + CLAUDE/AGENTS update | 4 | 02, 03, 09 |
| 9 | 2026-07-20 | [CHUNK-11](chunks/chunk-11-file-handoff-watcher.md) | File handoff + terminal integration + result watcher | 4–5 | 02, 03, 09, 10 |
| 10 | 2026-07-27 | [CHUNK-12](chunks/chunk-12-result-capture.md) | Result capture (parse `result.md` + paste fallback) | 3–4 | 02, 03, 09, 11 |
| 11 | 2026-08-03 | [CHUNK-13](chunks/chunk-13-allowed-forbidden-diff.md) | **Allowed/Forbidden diff + Claude Code PreToolUse hook ⭐** | 4–5 | 02, 03, 09, 10, 11, 12 |
| 12 | 2026-08-10 | [CHUNK-14](chunks/chunk-14-verification-release.md) | Verification + memory update + release evidence | 5 | 02, 03, 08, 12, 13 |
| 13 | 2026-08-17 | [CHUNK-15](chunks/chunk-15-bug-triage-demo.md) | Bug Triage demo end-to-end | 4–5 | all prior |
| 14 | 2026-08-24 | [CHUNK-16](chunks/chunk-16-demo-recording.md) | Demo recording + README + essay + GitHub Release `v0.1.0` | 4–5 | 15, 04 |

⭐ = headline / unique feature.

**Parallelisable pairs**: CHUNK-02 and CHUNK-03 can be done in parallel after CHUNK-01 (both depend only on the scaffold). CHUNK-04 depends on both CHUNK-02 and CHUNK-03 because its smoke test exercises both. Everything from CHUNK-05 onwards is strictly sequential.

**Critical path**: CHUNK-01 → 02 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16. 14 chunks on the critical path, fits the 14-week schedule when CHUNK-03 and CHUNK-04 land in parallel with CHUNK-02.

## Phase boundaries (demoable states)

| Phase | After | Demoable state |
|---|---|---|
| 0 | CHUNK-04 | "Installed in VS Code AND Cursor from the same file." |
| 1 | CHUNK-08 | "Type an idea → PRD → requirements → test specs." |
| 2 | CHUNK-11 | "Click a button → Claude Code runs against the brief." |
| 3 | CHUNK-14 | "Full loop, idea to verified release, diff feature catches a violation live." ← **minimum acceptable ship** |
| 4 | CHUNK-16 | Shipped — public proof of work. |

## Canonical contracts (one source per concern)

Every consumer chunk imports — never redefines:

- **Memory schema** (CHUNK-03 via `contracts/src/memory.ts`): polymorphic `memory_entries` + `memory_links` tables; 9 canonical memory types (`intent`, `requirement`, `design`, `codebase`, `execution`, `result`, `verification`, `release`, `test-spec`); `MemoryStore` API. Discovery folds into `IntentPayload.discovery`; PRD is `requirement` with `payload.kind === 'prd'`; bypasses are at `VerificationPayload.bypasses[]`. NO separate `discovery` / `prd` / `bypass` types.
- **Memory link kinds** (CHUNK-03 via `contracts/src/links.ts`): 13 canonical kinds. Spelling: `derives-from` (with -s), `produced` (NOT `result-of`), `has-test-spec`. The `LINK_KIND_EDGES` table specifies every legal from-type → to-type edge.
- **Webview message contracts** (CHUNK-02 via `contracts/`): one file per panel; `vscode-messenger` 0.4.x; nonce-based CSP; Radix UI + Tailwind + Lucide React (NOT the deprecated `@vscode/webview-ui-toolkit`).
- **Execution Brief markdown schema** (CHUNK-09 via `extension/src/brief/briefMarkdown.ts`): 10 H2 sections, frozen; `BRIEF_SCHEMA_VERSION = 1`; `RESULT_MD_SECTION_NAMES` constant embedded into Section 9 and consumed by CHUNK-12's parser; trailing-slash glob normalisation at parse time.
- **Harness Profile schema** (CHUNK-10): `name, display_name, instruction_file, handoff_dir, brief_style, include_*, output_format, mcp_capable, command_template?, harness_version_pin?` — two MVP profiles (`claude-code`, `codex`).
- **Managed delimiter block syntax** (CHUNK-10 via `extension/src/profiles/managedBlock.ts`): three formats — `'md'` (`<!-- DELIVERYOS:BEGIN --> ... <!-- DELIVERYOS:END -->`), `'json'` (sentinel key `"deliveryos.managed": { ... }`), `'gitignore'` (`# DELIVERYOS:BEGIN ... # DELIVERYOS:END`). Idempotent applier; never silently rewrites user content.
- **Handoff directory layout** (CHUNK-11 via `extension/src/handoff/paths.ts`): `.deliveryos-handoff/` dotfile root; flat `current-*` files; `history/<timestamp>-*` committed audit trail; `FileSystemWatcher` on `result.md` as the completion signal (`onDidWriteTerminalData` rejected per research finding #12).
- **Workspace `.deliveryos/` memory directory layout** (CHUNK-03): `.deliveryos/memory.sqlite` + `.deliveryos/memory/<type>/<id>.md` + `.deliveryos/releases/<release-id>.md`.
- **Files-actually-changed source** (CHUNK-12 convention): `git diff --name-only HEAD` is the ground truth; harness self-report is stored for context but never trusted alone.

## Research-driven changes — folded into source-of-truth docs

All 12 research findings from `part-1-plan.md` § "Research-driven changes" have landed in the source docs (verified in iteration 2):

| # | Finding | Where it landed |
|---|---|---|
| 1 | `sql.js` (WASM) not `better-sqlite3` | PRD § 25.2; BUILD-PLAN Week 2 |
| 2 | Radix UI + Tailwind + Lucide React (NOT `@vscode/webview-ui-toolkit`) | PRD § 25.2 |
| 3 | Sideloaded VSIX bypasses sig verification by design | ADR-0001 Consequences |
| 4 | Codex `-o/--output-last-message` | `architecture/harness-profiles.md`; PRD § 23 example |
| 5 | Claude Code `PreToolUse` hooks (cannot be bypassed by `--dangerously-skip-permissions`) | PRD § 27 Risk 3; `architecture/harness-profiles.md` |
| 6 | `.deliveryos-handoff/` dotfile naming | PRD §§ 9, 12, 17, 18, 22 (slash-prefix replaced); `architecture/execution-briefs.md` |
| 7 | Workspace trust capabilities declared | PRD § 25.2 |
| 8 | `current-*` regenerable + `history/` committed split | PRD § 18.Y; chunk-11 spec |
| 9 | AGENTS.md as Linux Foundation open standard (context) | `architecture/harness-profiles.md` |
| 10 | MCP positioning v2 (context) | No PRD edit required; remains "Future phase" per FR25 |
| 11 | `onStartupFinished` activation | CHUNK-01 spec |
| 12 | `onDidWriteTerminalData` rejected (proposed-only API) | CHUNK-11 spec |

## Recommended implementation order

Build chunks in the order above. Each chunk has its own concrete "Done when" criteria and test plan. Between chunks:
- Commit per chunk with the message format `feat(chunk-NN): <title>` so the build history mirrors the planning structure.
- Run the corresponding chunk's verification checks before declaring done.
- At each phase boundary, run the demoable-state check (see table above) — this is the gate, not just "tests pass".
- If a chunk's implementation surfaces an interface mismatch with the spec, **update the chunk spec first**, then implement. The chunks are the source of truth for the build; drift between spec and code is a planning failure, not an implementation choice.

The parallelisable pairs (CHUNK-02 + CHUNK-03 in week 2; CHUNK-04 in the polish day) are optional optimisations — the solo-dev timeline doesn't strictly require parallelism, but the option exists if a week is short.

## Justified minor residue

`validation-report.md` documents ~22 residual minors that the planning loop deliberately deferred. The full list with rationale is in that file; the high-level buckets:

- **Command-ID naming convention** (m10): dotted vs camelCase mixed across UI chunks. Deferred to the build phase — the consistent sweep is cheaper during integration than during planning.
- **Cross-platform stance** (V2-01, V2-06, V2-10): macOS is primary, Linux opportunistic, Windows opportunistic for v0.1.0. Documented in CHUNK-04 + CHUNK-13; surfaced to users in the README.
- **Test-plan framing** (V2-03, V2-04, V2-05, V2-08, V2-11, V2-12): the fixtures exist in every relevant spec; the explicit "live AI is non-deterministic; deterministic fixtures are the gate" framing can land alongside the first failing test in each chunk.
- **Architecture doc nits** (memory-layers.md "one SQLite table per type" leftover prose; CHUNK-08 audit-trail footnote): one-line edits Track-R can absorb during the corresponding chunk's build.
- **Walker writer gap** (CHUNK-14 reads `targets` + `references-codebase` but no chunk explicitly writes them yet): Track-R should either have CHUNK-09 write these when persisting a brief, or simplify CHUNK-14's walker. Either is correct; the spec leaves the choice to implementation.

## Methodology note — dogfooding

This plan was produced by DeliveryOS's own chunk → expand → validate → iterate loop, applied to building DeliveryOS:

- Prompt 1 broke the work into chunks via 6 parallel research subagents (VS Code extension architecture, webviews, packaging, persistence, terminal integration, harness conventions).
- Prompt 2 fanned out to 16 worktree-isolated parallel subagents, each owning one chunk spec.
- Prompt 3 ran 4 parallel cohesion-audit subagents to surface drift.
- Prompt 4 ran two iteration rounds with parallel fix subagents — first reconciling taxonomies + interface contracts, then closing the 5 majors + 1 blocker that survived re-audit.

The 16 chunk specs + this `READY.md` + the `validation-report.md` are the dogfooding evidence that DeliveryOS's planning discipline works — and they exist in `docs/planning/` not because of plan-mode ceremony but because they are the artefact the chunk-expand-validate-iterate loop produces by design.

When Track R writes the first chunk, the meta-harness will start running on itself in earnest: the same execution brief shape, the same allowed/forbidden diff, the same memory + release evidence machinery — applied to the next chunk in the sequence.

---

**Track R: open `DOS:R1` and start at CHUNK-01.** The build begins 2026-05-25.
