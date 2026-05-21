# Phase 0 audit — third validation pass (DOS:O4)

**Audit date:** 2026-05-21
**Session:** DOS:O4
**Scope:** Phase 0 of the planning corpus — CHUNK-01..04 + source-of-truth docs they reference.
**Prior state:** [`validation-report.md`](../validation-report.md) iteration-2 final (DOS:O3) signed off the full 16-chunk corpus as clean (zero blockers, zero majors).
**Trigger:** DOS:R1 executed CHUNK-01 steps 1–3 (first real-world test of the planning corpus). This pass re-validates Phase 0 against that build evidence + audits the producer↔consumer contract surface that Phase 1+ chunks depend on.

---

## Iteration 3 summary

Four independent cohesion-audit subagents ran in parallel — one per dimension (Coverage, Structure + Dependencies, Contracts, Verification). Each got the Phase 0 chunk set + the consumer chunks that reference Phase 0 contracts (CHUNK-05, -09, -12, -14) + the source-of-truth docs Phase 0 references. The Contracts dimension surfaced **3 new blockers** that iteration-2 missed because that pass audited the corpus as a whole rather than tracing producer→consumer contract surfaces explicitly.

| Dimension | Blockers | Majors | Minors |
|---|---|---|---|
| 1. Coverage | 0 | 2 | 5 |
| 2. Structure + dependencies | 0 | 1 | ~5 friction + ~10 positive (no-drift) |
| 3. Contracts | **3** | 6 | 4 |
| 4. Verification | 0 | 8 | 14 |
| **Total** | **3** | **17** | **~34** |

The DOS:R1 evidence revealed one major (CHUNK-01 § 4 doesn't actually sanction the wrap notes' claim that pre-including `activationEvents` at step 1 is acceptable) — Track R inferred a correct policy, but the chunk doesn't state it. This is a high-leverage one-line fix.

---

## Blockers (3)

### B-01 · `targets` and `references-codebase` link kinds have ZERO writers

**Source:** Subagent 3 finding 1
**Location:** [`chunk-09-execution-brief-composer.md`](../chunks/chunk-09-execution-brief-composer.md) § 7.2; [`chunk-03-memory-store.md`](../chunks/chunk-03-memory-store.md) § 5.4 (`LINK_KIND_EDGES`); [`chunk-14-verification-release.md`](../chunks/chunk-14-verification-release.md) §§ 4.x walker.

CHUNK-03's `LINK_KIND_EDGES` lists `targets` (Execution → Requirement) and `references-codebase` (Execution → Codebase) as canonical edges, and CHUNK-14's walker hops both of them. But CHUNK-09 § 7.2 (the brief writer) lists only `derives-from` and `supersedes` — nobody writes `targets` or `references-codebase`. CHUNK-14's release evidence document will emit `"missing link"` warnings on every release for kinds with no writer. Iteration-2's [`validation-report.md`](../validation-report.md) line 70 marked this "deferred" but iteration-2 did not actually add the writer documentation; iteration-3 confirms it's still genuinely unresolved.

**Resolution chosen:** Simplify the walker — drop `targets` and `references-codebase` from `LINK_KINDS` for v1. CHUNK-14's walker derives `Execution → Requirement` from the existing `derives-from` edge (Brief → Requirement) and `Execution → Codebase` is deferred until a Codebase Memory writer exists. This reduces the Phase 0 contract surface and removes the "missing-link warning on every release" defect.

---

### B-02 · CHUNK-03 imports use subpaths (`@deliveryos/contracts/memory`, `…/links`) that CHUNK-02's contracts package.json doesn't resolve

**Source:** Subagent 3 finding 2; Subagent 2 finding 14
**Location:** [`chunk-03-memory-store.md`](../chunks/chunk-03-memory-store.md) §§ 2.6, 14 (lines 53, 93, 261, 545, 893, 926–927); [`chunk-02-webview-foundation.md`](../chunks/chunk-02-webview-foundation.md) § 3.1 (lines 186–202); [`chunk-14-verification-release.md`](../chunks/chunk-14-verification-release.md) line 533.

CHUNK-03 mandates `import { MemoryEntry } from '@deliveryos/contracts/memory'` (and `…/links`). CHUNK-14 line 533 actually writes this import. But CHUNK-02's `contracts/package.json` declares only `"main": "dist/index.js"` — no `exports` map. The subpath import will not resolve under Node16/NodeNext or bundler resolution. CHUNK-02 also establishes namespaced re-exports (`Hello.GetHelloText`), which is a different pattern.

**Resolution chosen:** Update CHUNK-02's `contracts/package.json` sketch to include an `exports` map: `{ ".": "./dist/index.js", "./memory": "./dist/memory.js", "./links": "./dist/links.js", "./*": "./dist/panels/*.js" }`. Preserves the cleaner subpath syntax consumer chunks already use; minimal change to CHUNK-02.

---

### B-03 · CHUNK-09 imports type names that CHUNK-03 does not export

**Source:** Subagent 3 finding 3
**Location:** [`chunk-09-execution-brief-composer.md`](../chunks/chunk-09-execution-brief-composer.md) lines 490–492.

CHUNK-09 imports `Requirement`, `CodebaseMemory`, `TestSpecMemory` from `@deliveryos/contracts/memory`. CHUNK-03 exports `MemoryEntryOfType<'requirement'>`, `RequirementPayload`, etc. — but NOT the top-level aliases CHUNK-09 names. CHUNK-12 by contrast correctly uses `MemoryEntryOfType<'result'>`.

**Resolution chosen:** Add canonical type aliases in CHUNK-03's `contracts/src/memory.ts`: `RequirementMemory = MemoryEntryOfType<'requirement'>`, `CodebaseMemory = MemoryEntryOfType<'codebase'>`, `TestSpecMemory = MemoryEntryOfType<'test-spec'>`, `IntentMemory`, `DesignMemory`, etc. for every type. Cheaper than rewriting every consumer chunk's import list.

---

## Majors (17)

Grouped by file for execution efficiency.

### CHUNK-01

- **M-01a (S2-1 + S4-1) · CHUNK-01 § 4 does not actually sanction DOS:R1's pre-include of `activationEvents` at step 1.** The wrap notes in [`BUILD_STATUS.md`](../../build/BUILD_STATUS.md) line 43 cite "spec § 4" but § 4 is "VS Code APIs used" and says nothing about step ordering. Track R inferred a correct policy. **Fix:** add a one-sentence clarification to CHUNK-01 § 7 step 6 that pre-including at step 1 is acceptable when the step-1 scope has no contributes to trigger implicit activation. **Fix-in-session: yes.**
- **M-01b (S4-2) · § 8.1 expected `.vsix` contents assume all 13 steps complete in one session.** DOS:R1 ran 1–3 only and the 3.79 KB result legitimately excludes icons/LICENSE/README. **Fix:** annotate § 8.1's expected-contents list with which step in § 7 introduces each entry. **Fix-in-session: yes.**
- **M-01c (S4-3) · No documented expected `.vsix` size band.** CHUNK-01 says &lt;1MB; CHUNK-03 says &lt;5MB. A future regression to 4.5 KB or 30 KB has no baseline to flag. **Fix:** add an expected-size band per step-slice in § 8.1. **Fix-in-session: yes.**
- **M-01d (S1-2) · Activity-bar icon is a placeholder `media/deliveryos-logo.png`** with no replacement plan named in CHUNK-01. The Phase 0 demoable state ships with a stock Lucide rocket. **Fix:** one-line note in CHUNK-01 § 1 confirming CHUNK-16 owns the final icon. **Fix-in-session: yes.**

### CHUNK-02

- **M-02a (S3-7) · `vscode-messenger` version pin is enforced only at CHUNK-02; consumer chunks reference it unversioned.** A 0.5.x release during build could break four consumer chunks silently. **Fix:** add a one-line "pinned by CHUNK-02 to ^0.4.5; do not upgrade without re-auditing" note to each consumer chunk's dependencies section. **Fix-in-session: partial — note in CHUNK-02 § 4.2 + cross-reference; consumer-chunk edits deferred to build.**

### CHUNK-03

- **M-03a (S1-1) · CHUNK-03 ships the full 9-arm payload union + 13-link vocabulary + walker for Phase 0** when BUILD-PLAN week 2 only promises "a project record persists". The scoping is deliberate (freeze the canonical contract) but Track R will see ~931 lines and feel work that isn't gated by the Phase 0 done-when. **Fix:** add an in-scope note in CHUNK-03 § 1 acknowledging Phase 0 only exercises `create`/`read` of the Intent entry; the rest is contract-freeze for downstream chunks. **Fix-in-session: yes.**
- **M-03b (S3-5) · `IntentPayload` is restated in CHUNK-05 with extra panel-local fields (`rawAnswersPaste`, `unmatchedText`, etc.) that the host adapter silently discards on save** — contradicting CHUNK-05's own Risk 3 mitigation ("save raw answers paste separately"). **Fix:** extend `DiscoveryRecord` in CHUNK-03 with optional `rawAnswersPaste?: string` and `unmatchedText?: string`, OR remove the Risk 3 mitigation claim from CHUNK-05. **Fix-in-session: yes (CHUNK-03 edit) — the additive option preserves the mitigation.**

### CHUNK-04

- **M-04a (S4-4 + S4-21) · Phase 0 demoable-state boundary has no consolidated rehearsal checklist;** the four chunks each have their own § 8/11/13 done-when. **Fix:** add a `## Phase 0 done-when` section to [`READY.md`](../READY.md) (or expand CHUNK-04 § 11.5 into a 10–15 line checklist enumerating every sub-check: icon visible, tree renders, project create works, webview opens, CSP clean, memory.sqlite created, intent body file persists, reopen survives, sig-warn observed per editor). **Fix-in-session: yes (READY.md).**
- **M-04b (S4-5) · § 11.1 step 1 "From a fresh editor state" precondition is non-actionable.** The install script uses `--force`; "fresh editor state" is misleading. **Fix:** rewrite step 1 to match script behaviour ("from any state — `--force` handles reinstall"). **Fix-in-session: yes.**
- **M-04c (S4-7) · § 11.2 install-script expected summary disagrees with the canonical example in § 4.5** (one-line summary vs. 5-line block). **Fix:** point § 11.2 at § 4.5 as the canonical output; assert `exit 0` + content checks. **Fix-in-session: yes.**
- **M-04d (S4-8) · § 15 done-when "signature-verification observation row recorded" has no failure mode** if a sig-warn *blocks* install on a required editor (VS Code or Cursor). **Fix:** add a sub-bullet defining what to do — swap third editor if Windsurf/VSCodium/Antigravity refuses; escalate to ADR-0001 revision if Cursor/VS Code refuses. **Fix-in-session: yes.**
- **M-04e (S3-1 walker simplification follow-on)** — see B-01 above; CHUNK-14 walker spec needs the simplification applied.
- **M-04f (S1-4) · § 15 done-when references `RELEASE_NOTES.md` and `demo.mp4` (CHUNK-16 deliverables) without Phase-0-specific fallback.** **Fix:** clarify that Phase 0 ships with a one-paragraph minimal `RELEASE_NOTES.md`; `demo.mp4` genuinely optional. **Fix-in-session: yes.**

### Consumer chunks

- **M-09a (S3-6) · `subject-of-decision` (Verification → Requirement) is semantically identical to `verifies`** under the current spec. CHUNK-14 writes both, doubling rows. **Fix:** fold `subject-of-decision` into `verifies` and drop from `LINK_KIND_EDGES`. **Fix-in-session: yes (small spec edit in CHUNK-03 + CHUNK-14).**
- **M-09b (S3-4) · `derives-from execution → test-spec` row in `LINK_KIND_EDGES` is written by CHUNK-09 but never read by CHUNK-14's walker** (which reaches Test Spec via `Requirement → has-test-spec`). Wasted SQL writes. **Fix:** drop the row from `LINK_KIND_EDGES`, stop CHUNK-09 writing it. **Fix-in-session: yes.**
- **M-12a (S3-8) · CHUNK-12 calls `MemoryStore.link({ from_id, to_id, kind })` (object arg) but CHUNK-03's API is `link(from, to, kind)` (positional).** Five sites. **Fix:** update CHUNK-12 to positional form. **Fix-in-session: yes.**
- **M-09c (S3-9) · CHUNK-09 + CHUNK-08 call `MemoryStore.create("execution", …)` (positional) but CHUNK-03's API is `create({ type, title, payload, body })` (object arg).** **Fix:** expand calls to object-arg form. **Fix-in-session: yes.**

### READY.md

- **M-R-01 (S2-13) · "Parallelisable pairs" claim contradicts CHUNK-03's own dependency declaration.** READY.md line 46 says CHUNK-02 and CHUNK-03 can be done in parallel "both depend only on the scaffold" but CHUNK-03 explicitly declares CHUNK-02 as a prereq. **Fix:** rewrite line 46 to "CHUNK-03 can be drafted in parallel with CHUNK-02 (skeleton `contracts/src/memory.ts` slice can land before CHUNK-02's runtime wiring)." **Fix-in-session: yes.**

---

## Minors (~34) — triage

Most cluster into three groups. Severity is minor — Track R can absorb during the relevant chunk's build.

### Group A · Cross-reference + filename hygiene (fix-in-session — cheap)

- **m-01 (S2-2) · Broken markdown link `chunk-01-extension-scaffold.md` in CHUNK-02 line 6 and CHUNK-03 line 6.** Actual filename is `chunk-01-scaffold.md`. **Fix-in-session.**
- **m-02 (S4-12) · CHUNK-04 § 11.1 step 6 "Close the editor. Reopen it." doesn't specify "the same workspace folder".** **Fix-in-session.**
- **m-03 (S4-22) · CHUNK-04 § 11.5 says "install in parallel" which misleads; the script installs sequentially in one invocation.** **Fix-in-session.**
- **m-04 (S4-16) · CHUNK-03 § 11.1 step 4 calls the input "the idea" but CHUNK-01 prompts for "project name".** Vocabulary alignment. **Fix-in-session.**

### Group B · Build-friction minors (fix-in-session — small, prevents Track R rework)

- **m-05 (S2-4) · Contracts-slice placement convention: domain types at top level, panels at `panels/<panel>.ts`.** Add parenthetical to CHUNK-02 § 4.1. **Fix-in-session.**
- **m-06 (S2-12) · `PersistedProjectRegistry` seam ambiguity** — CHUNK-01 promises the class, CHUNK-03 § 2.11 rebinds the command directly. Pick one. **Fix-in-session — choose direct rebind (simpler).**
- **m-07 (S2-17) · `sql.js` wasm copy strategy under `--no-dependencies`** packaging. Note in CHUNK-03 § 2.12. **Fix-in-session.**
- **m-08 (S2-11) · `stages/` → `tree/` directory rename in CHUNK-02 not signposted at table header.** **Fix-in-session.**

### Group C · Verification framing minors (defer to build OR fix opportunistically)

The remaining ~26 minors are framing tweaks to test plans that Track R can absorb when reaching the relevant chunk's `§ 11`. They include:

- per-editor install command stdout capture conventions (S4-18)
- README troubleshooting entry for "Cursor refused install" (S4-19)
- verbose-mode test in install script smoke (S4-20)
- third-editor lineage criteria in CHUNK-04 smoke instruction (S4-14)
- "warnings are expected" note in § 11.1 step 7 (S4-13)
- two-tag chicken-and-egg in § 11.4 preamble (S4-15) — already a justified residual (V2-02)
- placeholder troubleshooting entries (S4-19)
- CHUNK-02 § 13 cross-editor verification deferral note (S4-9)
- `unzip -l` pre/post-monorepo path (S4-10) — covered by m-08
- CSP error inspection cross-reference in CHUNK-04 step 4 (S4-11)
- vite manifest recovery instruction in CHUNK-02 § 10.1 (S4-17)
- CHUNK-04 updater scope-drift note in § 1 (S1-6) — accepted as-is
- BUILD-PLAN week 2 done-when sig-warn alignment (S1-7) — already justified residual m04
- CHUNK-02 self-acknowledged seams scope-drift (S1-5) — accepted as-is
- CHUNK-04 § 11.5 phrasing of cumulative demoable state (S1-3) — folded into M-04a
- Two `LinkKind` import paths claimed canonical (S3-12) — resolved by B-02 fix
- `.deliveryos/` `releases/` constant location (S3-10) — defer to CHUNK-14 build
- CHUNK-01 `ProjectRecord.description` field mapping (S3-13) — minor; defer
- Positive-finding minors (no-drift confirmations on `StageTreeProvider`, command IDs, activate hook, `.deliveryos/` vs `.deliveryos-handoff/`) — recorded for completeness, no action

**Deferred to build** with rationale matching existing [`validation-report.md`](../validation-report.md) "Justified residual minors" framing.

---

## Iteration 3 sign-off

The Phase 0 corpus had **3 blockers, 17 majors, and ~34 minors** when iteration-3 started. The blockers all live in the producer↔consumer contract surface that iteration-2 didn't trace explicitly. None of the blockers prevented DOS:R1 from shipping (R1 only exercised CHUNK-01 steps 1–3, well upstream of the contract-consumer interface).

**Fix plan executed in this session:**

- All 3 blockers fixed (B-01: walker simplified; B-02: `exports` map added; B-03: type aliases added).
- ~12 majors fixed (every spec-level edit ≤ 5 lines).
- 5 majors require multi-site edits across consumer chunks (CHUNK-09/12/14 link + create call shapes) — fixed in session.
- 8 minors in Groups A + B fixed in session.
- ~26 verification-framing minors deferred to build, documented above.

**Status:** Phase 0 corpus is internally consistent and externally aligned post-iteration-3. Track R can resume DOS:R2 (CHUNK-01 steps 4–6) without re-reading the affected specs — but the affected `§§` are flagged in PLANNING_STATUS.md so a future session can refer back.

---

## Files touched by iteration-3 fixes

Phase 0 chunks:

- [`docs/planning/chunks/chunk-01-scaffold.md`](../chunks/chunk-01-scaffold.md) — § 2 icon-placeholder note (M-01d); § 7 step 6 activation-event ordering clarification (M-01a); § 8.1 expected-contents per step-slice + size-band annotation (M-01b, M-01c); § 3.1 `PersistedProjectRegistry` seam clarification (m-06).
- [`docs/planning/chunks/chunk-02-webview-foundation.md`](../chunks/chunk-02-webview-foundation.md) — § 3.1 `exports` map added (B-02); § 3.5 stages→tree rename header rule (m-08); § 4.2 vscode-messenger pin cross-chunk enforcement (M-02a); broken link to `chunk-01-scaffold.md` fixed (m-01).
- [`docs/planning/chunks/chunk-03-memory-store.md`](../chunks/chunk-03-memory-store.md) — § 1 Phase-0 scope note (M-03a); § 5.3 `DiscoveryRecord` extended with `rawAnswersPaste` + `unmatchedText` (M-03b); § 5.4 per-type aliases added (B-03); § 5.5 `LINK_KINDS` tuple + edges table reduced from 13→10 (B-01, M-09a, M-09b); "Explicitly removed" table extended; § 2.12 sql.js wasm packaging note (m-07); § 11.1 step 4 vocabulary alignment with CHUNK-01 (m-04); count references updated from "13 canonical" → "10 canonical"; broken link to `chunk-01-scaffold.md` fixed (m-01).
- [`docs/planning/chunks/chunk-04-multi-editor-verify.md`](../chunks/chunk-04-multi-editor-verify.md) — § 11.1 fresh-state precondition rewritten (M-04b); third-editor lineage criteria (S4-14); sig-warn expected-behaviour note (S4-13); failure-mode escalation block (M-04d); § 11.2 install-script summary canonical reference + verbose-mode case (M-04c, S4-20); § 11.4 two-tag chicken-and-egg preamble (S4-15); § 11.5 consolidated Phase 0 rehearsal checklist (M-04a + S4-21); § 15 Phase-0-fallback for `RELEASE_NOTES.md` + `demo.mp4` (M-04f); CSP cross-reference (S4-11); same-workspace reopen wording (m-02); "in parallel" rewrite (m-03).

Consumer chunks:

- [`docs/planning/chunks/chunk-08-test-designer.md`](../chunks/chunk-08-test-designer.md) — § 11 step 2 `memory.create(...)` object-arg shape (M-09c).
- [`docs/planning/chunks/chunk-09-execution-brief-composer.md`](../chunks/chunk-09-execution-brief-composer.md) — § 7.2 Execution → Test-Spec edge dropped (M-09b); § 8 `Requirement` → `RequirementMemory` import + alias usage (B-03); § 7 `brief.save` flow documenting `MemoryStore.create` object-arg + `MemoryStore.link` positional shape (M-09c).
- [`docs/planning/chunks/chunk-12-result-capture.md`](../chunks/chunk-12-result-capture.md) — five `MemoryStore.link(...)` call sites converted from object-arg to positional shape (M-12a).
- [`docs/planning/chunks/chunk-14-verification-release.md`](../chunks/chunk-14-verification-release.md) — § 2.3 `subject-of-decision` edge dropped from canonical write set; § 4.1 walker diagram + prose updated to drop `targets`/`references-codebase` hops; § 7 + § 9.1 + § 12.1 link-kind enumeration updated (B-01).

Index + sign-off docs:

- [`docs/planning/READY.md`](../READY.md) — § "Canonical contracts" link-kind count `13 → 10` (B-01); § "Justified minor residue" walker-writer-gap line marked RESOLVED; § "Final ordered chunk list" parallelisable-pairs claim rewritten (M-R-01).
- [`docs/planning/chunks/README.md`](../chunks/README.md) — § 1 link-kind taxonomy reduced to 10 with retirement note; § "Open questions" item 10 updated.
- [`docs/planning/validation-report.md`](../validation-report.md) — appended Iteration 3 sign-off section linking this audit.

**Untouched (intentionally):**

- PRD, BUILD-PLAN, architecture/*, ADR-0001 — no content drift surfaced for these docs at Phase 0 (iteration-2 alignment table remains valid).
- `docs/build/BUILD_STATUS.md` — Track R's territory; the citation typo (BUILD_STATUS line 43 cites CHUNK-01 § 4 instead of § 5/§ 7) is documented in this audit as a Track R hygiene fix, not edited from Track O.
- CHUNK-05/06/07/10/11/13/15/16 specs — outside Phase 0 scope.
