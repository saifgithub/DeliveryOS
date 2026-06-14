# Multi-Agent Build Process

> **Updated:** 2026-05-30 (v3) — evidence manifest and adversarial QA (B-016); project-agnostic generalization. Previous version archived at `docs/MULTI_AGENT_BUILD_PROCESS_v2.md`.

How an AI-assisted project ships code through coordinated agents.

This process is adapted from the AMI multi-agent build process (`ami_ai/core_platform/Docs/MULTI_AGENT_BUILD_PROCESS.md`, 3-role canonical). The shape is the same: separate decisioning from execution, use a sustained architect session and fresh sub-agents, run multiple verification cycles.

---

## 0. Governing principle: build a little, test a little, build the whole family

The trimmed MVP is too large to build in one pass. It will blow up if attempted that way. So the work is split into chunks (produced and validated by the planning loop), and each chunk goes fully through the build cycle, code, tests, smoke, QA, approval, before the next chunk starts.

One chunk at a time. Fully verified before moving on. The "family" is the complete set of chunks; it gets built one member at a time, never all at once.

Default execution is serial. Parallel chunk builds are possible only for chunks with no dependency relationship, and only once the process has been proven on the first few chunks. Do not start parallel.

---

## 1. Two phases

**Phase A, Planning.** Already defined in `docs/planning/claude-code-build-prompts.md`. A four-prompt loop (break into chunks, expand each chunk, validate cohesion, iterate) produces validated chunk specs in `docs/planning/chunks/` and a `docs/planning/READY.md` that lists the chunks in dependency order. Phase A writes no implementation code. It runs under track O (Docs); see section 12.

**Phase B, Build.** This document. It consumes the validated chunk specs and ships them one chunk at a time. It runs under track R (Development); see section 12.

The chunk specs are the contract between the two phases. A chunk spec that turns out wrong during Phase B is a BLOCKER: the architect fixes the chunk spec before continuing.

---

## 2. Why

A single human can think hard about direction, or type out 800 lines of TypeScript, not both. This process separates decisioning from execution: the stakeholder owns direction and final approval, the architect owns design specifics and orchestration, and sub-agents handle code, tests, and reports.

Trade-off: agents will sometimes get things wrong. The process has multiple verification cycles to catch that before it ships. The cycle cost is much less than the stakeholder typing the code.

The stakeholder expects to spend very little time. The process is designed so the stakeholder has exactly one keyboard touchpoint per chunk: the verdict.

---

## 3. Roles (3)

| Role | Who | Does | Doesn't |
| --- | --- | --- | --- |
| **Stakeholder** | Human stakeholder | Sets direction, approves trade-offs, final go/no-go authority, BLOCKER triage when the architect escalates | Draft invocations, dispatch toil, write code, run tests |
| **Architect** | sustained session — tier selected per task (see § 15) | Picks the next chunk from `BUILD_STATUS.md`; selects starting tier for the session and each sub-agent; runs and **interprets** the pre-fire factual audit; writes minimum-necessary builder and QA invocations (under 80 lines each) with a design quality stance; spawns sub-agents via the Agent tool; reads both reports side by side; approves or rejects structural trade-offs and registers approved shortcuts as `Structural debt:` in `BUILD_STATUS.md`; runs a cross-chunk cohesion review every four to five chunks; recommends a verdict; syncs `BUILD_STATUS.md` on approve; curates memory | Write extension code, run the test suite, edit code files, share state with sub-agents |
| **Builder / QA** | fresh sub-agent per chunk fire (Agent tool, `subagent_type: general-purpose`) | Re-runs the pre-fire audit (pastes output verbatim), writes TypeScript code and tests, runs the unit suite and the extension smoke in one session, files a report; OR writes a BLOCKER file and exits if any ambiguity surfaces | Use `AskUserQuestion` (sub-agents do not have it), share memory across fires, edit architect-owned docs, refactor outside the chunk scope |

Builders and QA never share memory across chunks. The architect is the only stateful agent. The chunk specs (`docs/planning/chunks/`) and `docs/build/BUILD_STATUS.md` are the only durable state.

**Cold-start exception.** If the architect session itself saturates, the stakeholder wraps it with `/sm-handover` and opens the next with `/sm-start-fresh`. The fresh architect resumes from `BUILD_STATUS.md` and `docs/build/NEXT_SESSION.md`.

---

## 4. Session topology

```text
Stakeholder (human)
    │ talks only to the architect
    ▼
Architect (sustained Claude Code session)
    │ has AskUserQuestion → can escalate to the stakeholder
    │ has the Agent tool → spawns sub-agents
    │
    ├── Builder (sub-agent, fresh per chunk)
    │
    └── QA (sub-agent, fresh per chunk)
```

Stakeholder keyboard touchpoints per chunk: 1 (the verdict at step 11 of the build cycle). Everything else, audit, dispatch, report review, invocation drafting, code, tests, status sync, is the architect or its sub-agents.

---

## 5. Folder structure

Phase A output (already present or produced by the planning loop):

```text
docs/planning/
├── part-1-plan.md              # chunk breakdown + dependency map
├── chunks/
│   └── chunk-NN-<slug>.md      # one validated chunk spec per chunk (the build contract)
├── validation-report.md        # final cohesion audit (clean)
├── READY.md                    # chunks in dependency order, ready for build
└── claude-code-build-prompts.md # the four planning prompts
```

Phase B working area:

```text
docs/build/
├── BUILD_STATUS.md             # architect's cumulative live state (chunk ledger + decisions)
├── NEXT_SESSION.md             # architect's single-page "what now" cold-start brief
├── invocations/                # builder invocation prompts (one per chunk fire)
├── builder_reports/            # builder ships here (chunk_NN_<slug>.md; _v2/_v3 for re-runs, never overwrite)
├── qa_invocations/             # QA invocation prompts
├── qa_reports/                 # QA verdicts (chunk_NN_<slug>_qa.md)
├── fix_prompts/                # architect-authored revision briefs (60 lines or fewer each)
└── blockers/                   # builder-written BLOCKER notes (the only sub-agent escalation surface)
```

**State by role.**

| Role | Cumulative state | Per-session delta | Cold-start input |
| --- | --- | --- | --- |
| **Architect** | `docs/build/BUILD_STATUS.md` | session handover written by `/sm-handover` | `BUILD_STATUS.md` + `NEXT_SESSION.md` |
| **Builder / QA** | none, fresh per fire, no inter-session memory | the builder/QA report file is the per-chunk artifact | the invocation file is their only input |

---

## 6. The build cycle, end to end

1. **Architect** picks the next chunk from `BUILD_STATUS.md`, following the dependency order in `docs/planning/READY.md`.
2. **Architect** re-reads the chunk spec for chunk N, plus its pre-reads: the PRD sections it cites, the builder reports of chunks it depends on, and `CLAUDE.md`.
3. **Architect** runs the pre-fire factual audit (VS Code API checks, file existence checks, prior-chunk-output checks, chunk-spec line-reference verification) and **interprets** each result: one sentence per check stating what was expected, what was found, and whether it represents drift requiring action. Pasting output without interpretation is not a completed audit. Spec drift means the architect fixes the chunk spec, then re-runs the audit.
4. **Architect** writes the builder invocation inline following four rules: (1) **Under 80 lines** — do not paste the chunk spec verbatim; instead pre-resolve the three to five key design decisions, state scope constraints, and direct the builder to read the spec file. (2) **Open with a design quality stance**: "Build clean first. If the clean structure and the fast structure diverge, build the clean one. Structural shortcuts must be declared as blocking hot spots with the clean version described." (3) **Done criteria as a numbered checklist**, 10 lines maximum. (4) **State the builder's starting tier** (Economy / Standard / Premium — see § 15) and the escalation ladder that applies.
5. **Architect** spawns the builder via the Agent tool (`subagent_type: general-purpose`, prompt = step 4 output).
6. **Builder** re-runs the pre-fire audit (pastes output verbatim) → writes TypeScript code and tests in `src/test/chunk-NN-<slug>.test.ts` → runs the unit suite AND the extension smoke in one session → iterates on builder-owned errors (3-attempt budget) OR writes a BLOCKER file and exits (any unresolved ambiguity, contradiction, or missing dependency) → writes `builder_reports/chunk_NN_<slug>.md` with `## For QA — hot spots` filled before closing.
7. **Architect** reads the builder report. BLOCKER means resolve the spec issue and return to step 1 for a re-fire. Clean means continue. After QA returns (step 10), before recommending a verdict, the architect spot-checks 2–3 rows from the QA evidence manifest by re-running those commands independently. If any spot-check fails, the QA verdict is rejected and QA re-fires with a note on which rows failed.
8. **Architect** writes the QA invocation inline (hot-spots preamble with severity + primary-source verification commands + spot-check directives such as "break the impl, confirm the test fails, revert").
9. **Architect** spawns QA via the Agent tool (`subagent_type: general-purpose`, prompt = step 8 output).
10. **QA** re-runs every "done" criterion against primary sources (actual editor behaviour, not just exit codes), audits test quality, audits report completeness, reproduces each hot spot, writes `qa_reports/chunk_NN_<slug>_qa.md`, and ends with the mandatory 4-line verdict block.
11. **Architect** reads both reports side by side and recommends a verdict to the **stakeholder**, who decides:
    - **Approve** → architect syncs `BUILD_STATUS.md` (chunk status flip, chunk N entry appended with builder report path, QA report path, verdict, key facts, next-chunk pointer refreshed) and confirms the chunk's commit landed. The stakeholder's "approve" word is the sync command.
    - **Revise** → architect drafts `fix_prompts/chunk_NN_<slug>_v<K>.md` (60 lines or fewer); loop back to step 1 with the fix prompt as the new spec. No status sync, chunk N is still in flight.
    - **Escalate** → architect uses `AskUserQuestion` to surface options: keep iterating / redesign the chunk / re-plan / park.

Stakeholder keyboard touchpoints in the cycle: just step 11. One verdict word triggers everything downstream.

**Git discipline.** Each chunk lands as one cohesive set of commits with conventional messages (`feat(chunk-NN): ...`, `test(chunk-NN): ...`). For serial building the builder commits on the main branch (greenfield, solo, low collision risk). When parallel chunk builds are eventually used, each builder sub-agent runs in an isolated worktree (`isolation: worktree`) and the architect merges on approve; `/sm-handover` cleans up the `agent-*` worktrees.

---

## 7. BLOCKER file — the only sub-agent escalation surface

Sub-agents have no `AskUserQuestion`. Any ambiguity, contradiction, or missing dependency surfaces as a BLOCKER file:

`blockers/chunk_NN_<YYYYMMDD_HHMM>.md`:

```markdown
# BLOCKER — Chunk NN — <one-line summary>

## Issues found (enumerate ALL — a re-fire is expensive, find them all up front)

1. **<Ambiguity / contradiction / missing dependency>**
   - Where: <file path:line, or chunk-spec line ref>
   - What I checked: <verification commands run, with output>
   - What I need: <specific question or direction>
   - What I would have done if forced to guess: <so the architect can confirm or correct quickly>

2. ...

## Status
Exiting without writing code. Re-fire when the architect resolves the above.
```

**Critical:** every ambiguity found in pre-fire goes into this file, not just the first one. A single re-fire is cheap; multiple re-fires per chunk is the failure mode. The builder must exhaust the audit before exiting.

QA uses the same format if it discovers spec problems during verification (rare, QA is a verifier, not a builder).

The architect resolves the BLOCKER by editing the chunk spec (`docs/planning/chunks/chunk-NN-<slug>.md`) or the relevant source doc, re-running the pre-fire audit, then re-firing from step 1. If the fix materially changes the chunk's interface with other chunks, the architect re-checks cohesion against the neighbouring chunk specs before re-firing.

---

## 8. Testing control cycles

Six interleaved cycles, each catching a different failure class.

### Cycle 1 — Pre-fire factual audit (before code is written)

- **Fires twice:** the architect (while drafting the invocation) and the builder (in their session, before any code change).
- **Catches:** stale chunk-spec claims that would burn hours on a wrong premise. For a VS Code extension the common ones are: a VS Code API that does not exist in the pinned `engines.vscode` version, a contribution-point key typo in `package.json`, a file that a prior chunk was supposed to create but did not, a shared type or interface named in the spec that has since drifted.
- **Rule:** every chunk spec has a `### Pre-fire audit` listing 5 to 10 commands. The builder pastes the output verbatim into the report **and writes one sentence per command** stating what was expected, what was found, and whether it represents drift. Paste-without-interpretation is not a completed audit. Any failure means a BLOCKER, no code written.
- **Typical commands:** check `package.json` `engines.vscode`; grep the installed `@types/vscode` surface for the APIs the chunk uses; confirm prior-chunk output files exist; confirm the chunk's declared dependency chunks are marked done in `BUILD_STATUS.md`; verify chunk-spec line references.

### Cycle 2 — Builder one-session test plus smoke (during the build)

- **Fires during the builder's session, before the report is closed.**
- **Catches:** "unit test passed, extension broke" splits, for example the extension fails to activate or a webview throws on load even though the pure logic tests pass.
- **Rule:** the builder runs BOTH the unit suite AND the extension smoke in ONE session, one report. The extension smoke is either the `@vscode/test-electron` integration test (which launches a real VS Code instance) or a `vsce package` followed by a sideload (`code --install-extension`) and a manual exercise of the chunk's feature. No splitting unless the smoke wall-clock exceeds 30 minutes.
- **Evidence manifest (required):** before closing the report the builder appends a table with one row per done-criterion item — verbatim output only, no paraphrase:

  | Artifact | Verification command | Output (first 3 lines) |
  | --- | --- | --- |
  | function X exported | `grep -r "export function X" src/` | `src/foo.ts:12: export function X` |
  | tests pass | `npm test 2>&1 \| tail -5` | `378 passing (2s)` |

  Missing manifest = architect rejects without reviewing code. Paraphrased or summarised output does not satisfy this requirement.

### Cycle 3 — Iteration budget (during the build)

- **Fires when a criterion fails.**
- **Catches:** infinite "diagnose, fix, rerun" loops where the diagnosis has drifted.
- **Rule:** the iteration budget is a tiered escalation ladder — the builder's starting tier (set by the architect in the invocation) determines the sequence. External, infrastructure, or ambiguous failures get a BLOCKER immediately at any tier (0 retries). Unclear is treated as external.

| Starting tier | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 |
| --- | --- | --- | --- | --- |
| **Economy** | Economy | Standard | Premium | BLOCKER → human |
| **Standard** | Standard | Standard (retry — first failure may be noise) | Premium | BLOCKER → human |
| **Premium** | Premium | Premium (single retry) | BLOCKER → human | — |

Economy failure is never retried at the same tier — it signals the task needs more capability, not another attempt. Standard and Premium each get one same-tier retry before escalating.

**Structural shortcut rule:** a structural shortcut (denormalised schema, missing constraint, magic number, leaky abstraction) taken to meet the attempt budget is not a valid resolution at any tier. It is a BLOCKER with a description of what clean resolution requires. The architect decides whether to approve the shortcut; if approved, it is registered as `Structural debt:` in `BUILD_STATUS.md`.

- Iteration history (command, diagnosis, fix, rerun) goes into the builder report per criterion.
- The tier used for each attempt is recorded in the report.

### Cycle 4 — Hot-spots self-declaration (closing the build)

- **Fires as the builder closes the report.**
- **Catches:** the gap between "all criteria pass" and "the builder is genuinely confident". Tests can pass for the wrong reasons.
- **Rule:** every report must have `## For QA — hot spots`. If there genuinely are none, write `None — all criteria clean on first attempt`. Otherwise 2 to 5 bullets pointing to partial acceptances, material deviations, unverifiable assumptions, tests that might pass incidentally, or stale invocation facts.
- **Structural shortcut severity:** any hot spot that is a structural shortcut (denormalised schema, missing constraint, magic number, inconsistent naming, leaky abstraction introduced for speed) is **blocking** severity unless the builder states (a) what the clean version would have been and (b) why it was not feasible within the attempt budget. Advisory is not available for structural issues without that explicit justification.
- QA reads this section **after** completing its own independent pass (see Cycle 5).

### Cycle 5 — QA independent re-verification (after the build closes)

- **Fires as a separate sub-agent, fresh session, after the builder report is closed.**
- **Catches:** narrative mismatch, builders can paste stale output, paraphrase, or omit failures.
- **Rule:** QA works in two passes in this order:

  **Pass 1 — Independent verification (before reading the builder's hot spots):** QA's default stance is **FAILED until evidence proves otherwise**. QA does not read the builder report in Pass 1. QA reproduces every "done" criterion against primary sources (actual editor behaviour, the actual installed extension, not just exit codes). QA spot-checks test quality (temporarily break the implementation, confirm the test fails, revert). QA runs the structural quality sweep (see below). QA records its own findings in its own evidence manifest (same table format as the builder manifest — one row per criterion, verbatim command output).

  **Pass 2 — Hot spot reconciliation:** QA reads the builder's `## For QA — hot spots` section and reconciles: findings that appear in both are confirmed; hot spots QA cannot reproduce are flagged as unverified; findings QA made independently that the builder did not flag are elevated — these are the highest-signal findings. QA manifest rows not matched by the builder manifest are also elevated.

  QA also: audits report completeness (deviations, sign-off, architect-owned docs untouched); confirms the extension packages cleanly with `vsce package`; assigns severity (`blocking` / `advisory` / `cleared`) to each finding.

- **Structural quality sweep (mandatory, every chunk):** review changed files for:
  - **Schema:** normalised form respected, all constraints named, foreign keys explicit, no nullable columns where the domain forbids null
  - **Code:** no magic numbers, no hardcoded strings that belong in config, no TODO/FIXME committed, no dead code
  - **Naming:** consistent with the codebase's existing conventions (grep three comparable files to establish the baseline before reviewing)
  - **Abstractions:** no leaky abstractions introduced for the sake of speed

  Schema and constraint findings are blocking severity by default. Any structural finding not declared by the builder in hot spots is a high-signal independent finding.
- **Isolation sweep:** confirm the chunk's tests did not write into the developer's real workspace or project memory store. Tests must use a temp workspace or an in-memory store. Any real-state write is a blocking finding.
- **Mandatory 6-line verdict block** ends QA's turn:

  ```text
  Chunk: NN
  QA report: <abs path>
  Builder report reviewed: <abs path> (v<K>)
  Verdict: approve | revise | escalate
  Evidence manifest: <N rows — every done criterion covered>
  QA-only findings (not in builder hot spots): <list or 'none'>
  ```

  No narrative. The architect opens both files. A verdict block missing the evidence manifest line is invalid.

### Cycle 6 — Revision loop with depth cap (after the QA verdict)

- **Fires when the verdict is `revise` or `escalate`.**
- **Catches:** patches-without-thinking, multiple iterations accumulating without anyone noticing the chunk spec is wrong.
- **Rule:** the architect writes `fix_prompts/chunk_NN_<slug>_v<K>.md` (60 lines or fewer). Every revision report re-runs ALL of the chunk's criteria (a regression gate). At `_v4`, the architect stops and escalates to the stakeholder via `AskUserQuestion`: keep iterating / redesign the chunk / re-plan / park.

### Test isolation discipline

- Tests live per chunk: `src/test/chunk-NN-<slug>.test.ts`.
- Pure logic uses a fast unit runner (vitest or mocha). Anything touching the VS Code API uses `@vscode/test-electron`, which launches a real editor.
- Tests never write to the developer's real workspace or real memory store. Use a temp directory or an in-memory store, and clean up in teardown.

### Test execution discipline

`@vscode/test-electron` downloads a VS Code build on first run and launches a real editor, so the integration suite is slower than a plain unit run and can exceed a few minutes, especially the first time.

When a builder or QA sub-agent runs the integration suite via the Bash tool, write the output to a log file and read it after the command returns. Do not pipe through `| tail`: piping buffers all output until the producer exits, which hides progress and can read as a 0-byte file on a long run.

```bash
# DO: redirect to a file, then tail the file after the command returns.
npm run test:integration > /tmp/<project>_chunk_NN_test.log 2>&1
tail -120 /tmp/<project>_chunk_NN_test.log
```

```bash
# DO NOT: pipe straight through tail — buffering hides progress until exit.
npm run test:integration 2>&1 | tail -120
```

Where a chunk only adds a few tests on top of a long pre-existing suite, prefer scoping the run to the new tests rather than re-running everything. The builder's full-run evidence covers the rest.

---

## 9. Architect role contract

The architect is the only sustained-context AI session. Its responsibilities per cycle:

- **Chunk selection and pre-read.** Picks the next chunk in dependency order from `BUILD_STATUS.md` and `READY.md`. Re-reads the chunk spec plus its cited PRD sections and the builder reports of dependency chunks.
- **Pre-fire audit ownership.** Before drafting an invocation, the architect runs the audit against real state (VS Code API surface, file system, line refs, prior-chunk outputs). Drift means the architect edits the chunk spec to match reality, then re-audits. The builder still runs the audit again in their session; two passes are cheaper than one wrong premise.
- **Invocation drafting.** Builder invocations are written inline: under 80 lines, no chunk spec verbatim paste (direct the builder to read the spec file), design quality stance in the opening paragraph, key design decisions pre-resolved, done criteria as a numbered checklist (10 lines max), starting tier and escalation ladder stated. QA invocations: hot-spots preamble with severity + primary-source verification commands + structural quality sweep directive.
- **Sub-agent orchestration.** Spawns builder and QA via `Agent(subagent_type: general-purpose, ...)`. Reads the report file directly when the sub-agent returns; the chat summary is not authoritative.
- **BLOCKER resolution.** Reads `blockers/chunk_NN_*.md`, edits the chunk spec or pre-reads, re-checks cohesion with neighbouring chunks if the interface changed, re-fires.
- **Verdict and sync.** Recommends a verdict to the stakeholder. On approve, the architect immediately syncs `BUILD_STATUS.md` and confirms the chunk's commit landed.
- **Cross-chunk cohesion review.** Every four to five chunks, before firing the next builder, the architect greps for the three most common patterns introduced in recent chunks (naming conventions, error-handling shapes, data-access patterns) and confirms they are consistent. If drift is found, a targeted fix prompt is raised before continuing. The review is logged in `BUILD_STATUS.md` as a `Cohesion check:` entry.
- **Structural debt register.** The architect is the only agent who can approve a structural shortcut. When approving a chunk whose hot spots include a structural shortcut, the `BUILD_STATUS.md` entry for that chunk must include a `Structural debt:` field: what was cut, what the clean version looks like, and which future chunk should address it. Debt not registered does not exist as far as future architects are concerned.
- **Tier selection.** The architect selects the session tier and each sub-agent's starting tier based on task complexity (see § 15). The default for routine build sessions is Standard. Economy is for mechanical tasks only. Premium is for design work, BLOCKER resolution, and the Advisor role.
- **Memory curation.** When something non-obvious is learned, the architect saves it as a `feedback_*` or `memory_*` note in the Claude Code memory directory and adds a one-line pointer to the index.

What the architect does NOT do: write extension code, run the test suite, edit code files. If it catches itself reaching for Edit or Write on a `.ts` file, that is a BLOCKER for the builder, not work for the architect.

---

## 10. Failure modes the process catches

| Failure mode | Caught by |
| --- | --- |
| Chunk spec references a VS Code API absent from the pinned engine version | Cycle 1 (architect + builder pre-fire) |
| Chunk spec assumes a file a prior chunk should have created but did not | Cycle 1 (prior-chunk-output check) |
| Builder hits an ambiguity or contradiction mid-run | BLOCKER file (section 7) |
| Unit test passes but the extension fails to activate or a webview throws | Cycle 2 (one-session test plus smoke) |
| Test passes by accident (mock leakage, trivial fixture) | Cycle 5 (test-quality spot-check) |
| Builder claims a criterion passes but it is broken | Cycle 5 (QA re-runs every criterion against the real editor) |
| Builder-owned bug misclassified as infra, infinite retry | Cycle 3 (3-attempt budget) |
| Multiple revisions accumulating without rethinking the chunk spec | Cycle 6 (depth cap at v4) |
| A chunk spec turns out wrong only when its dependents are built | BLOCKER + architect re-checks cohesion before re-fire |
| Test writes into the developer's real workspace or memory store | Cycle 5 (isolation sweep) |
| Architect-owned doc silently edited by a sub-agent | Cycle 5 (scope audit) |
| Builder fabricates completion (claims criterion passes without executing it) | Cycle 2 (evidence manifest requires verbatim output) + Cycle 5 (QA independent manifest) + Step 7 architect spot-check |
| QA confirms fabricated completion (anchors on builder prose, skips re-verification) | Cycle 5 (adversarial default — FAILED until proven) + Step 7 architect spot-check |

**The process cannot catch:** the architect designing the wrong chunk (correct execution of an incorrect spec); a bug class none of the tests detect (tests prove the chunk spec is met, not that the spec is right); cross-chunk interactions that emerge only when several ship together. The cohesion validation in Phase A and a periodic review of `BUILD_STATUS.md` surface these, not the per-chunk cycles.

---

## 11. Memory and durable feedback

Sub-agents have no memory between fires. The architect builds it deliberately as durable feedback notes in the Claude Code memory directory:

- **`feedback_*`** — rules of behaviour, each with a `**Why:**` and a `**How to apply:**` line. Future agents read the index and avoid repeating mistakes.
- **`memory_*`** — reference state (VS Code API quirks, packaging facts, harness-convention notes).

When something non-obvious is learned, the architect saves it as feedback and adds a one-line pointer to the memory index.

---

## 12. Session management

Sessions are managed by the config-driven `.claude` commands (`/sm-session-setup`, `/sm-start-fresh`, `/sm-handover`).

**Track configuration.** Track count and labels are project-specific. The config-driven `.claude` commands support any number of named tracks with separate handover docs. A common pattern for a build project is one planning track and one development track — for example, tagged `<PREFIX>:O<N>` (Docs) and `<PREFIX>:R<N>` (Development). Fill in the project prefix when running `/sm-session-setup`. Separate handover docs keep planning narratives and build narratives from interleaving. The planning track leads, since it produces the chunk specs; the development track follows. Once the build is underway the two can run in either order, because the planning track is then mostly doc maintenance.

A chunk-spec fix raised by a BLOCKER during a development session touches planning-track files but is made by the architect in-session; it does not require switching tracks.

**One-time setup.** Run `/sm-session-setup`: set the project prefix, configure tracks (planning + development at minimum), set handover paths. If the bug-list block is not yet relevant (greenfield project with no shipped product), leave it disabled.

**Each session.** Open with `/sm-start-fresh <track>` and wrap with `/sm-handover <track>`. `/sm-start-fresh` reads that track's handover doc, surfaces what is next, and enters plan mode. `/sm-handover` rotates state, runs a consistency scan, and leaves a clean tree.

**When the architect saturates.** Wrap with `/sm-handover <track>`, then `/sm-start-fresh <track>` opens a fresh architect that resumes from the track's handover doc and `NEXT_SESSION.md`.

---

## 13. Why this works (and where it does not)

**Works because:** each cycle catches a different failure class; the architect keeps decision authority but offloads execution to fresh sub-agents; builder and QA are independent with no shared memory; the chunk specs and `BUILD_STATUS.md` are the single source of truth, chat is scaffolding; iteration budgets prevent infinite loops; the depth cap prevents unbounded revision; BLOCKER-file-only escalation forces exhaustive ambiguity discovery up front; one chunk at a time keeps every failure small and contained.

**Does not work for:** one-off small fixes (cycle overhead exceeds the work); genuinely exploratory design (write the chunk spec first); rapidly shifting requirements (stabilise the chunk spec first).

**Cannot catch:** the architect designing the wrong chunk; a bug class no test detects; cross-chunk interactions that only emerge when several ship together.

---

## 14. Quick reference

Stakeholder triggers (the architect interprets them):

```text
# Dispatch a builder for a chunk
"build chunk 3"
# → architect drafts the invocation, runs the audit, spawns the builder via the Agent tool,
#   reads back builder_reports/chunk_03_<slug>.md

# Dispatch QA (after the builder report lands)
"QA chunk 3"
# → architect drafts the QA invocation with hot-spots and severity, spawns QA,
#   reads back qa_reports/chunk_03_<slug>_qa.md

# Dispatch a revision (assumes fix_prompts/chunk_03_<slug>_v2.md exists)
"chunk 3 v2"
# → architect uses the fix prompt as the new spec, re-fires the builder

# Re-read state mid-session
"read again"
# → architect re-reads the active chunk spec + PRD + BUILD_STATUS.md end to end

# Sign off (after both reports land)
"approve"
# → architect syncs BUILD_STATUS.md (chunk status flip + chunk entry + next-chunk pointer)
#   and confirms the chunk commit landed

# Ask for a revision
"revise"
# → architect drafts fix_prompts/chunk_NN_<slug>_v<K>.md (60 lines or fewer)

# Escalate
"escalate"
# → architect uses AskUserQuestion: keep iterating / redesign the chunk / re-plan / park
```

---

---

## 15. Model tier reference

All model references in this document use capability tiers, not provider names or version strings. The team fills each tier with whatever model their chosen provider offers at that capability level. Never name a specific model in an invocation — name the tier.

### Tier definitions

| Tier | Capability profile | When to use |
| --- | --- | --- |
| **Economy** | Fast, low context, good at mechanical and deterministic tasks | Pre-fire audit execution, status reads, log parsing, boilerplate scaffolding, config-only chunks, `BUILD_STATUS.md` updates |
| **Standard** | Strong reasoning, large context, good at implementation | Writing code, running tests, standard analysis — most builder and QA work, routine architect sessions |
| **Premium** | Highest reasoning, best at complex design and judgment | Architecture decisions, BLOCKER resolution, Advisor role, escalated builder attempts, complex chunk design |

_Current provider examples (not normative — update as models evolve):_
Economy = Haiku-class · Standard = Sonnet-class · Premium = Opus-class

**When to start a builder at Economy:** the chunk has no design decisions — the output is fully determined by the spec (boilerplate generation, config changes, pre-defined migration). Any chunk that requires the builder to choose between approaches is Standard or higher.

### Architect tier selection

| Architect task | Tier |
| --- | --- |
| `BUILD_STATUS.md` update, status sync, log parsing | Economy |
| Routine implementation chunk — open session, build | Standard |
| Cross-chunk cohesion review | Standard |
| Fix-prompt drafting for a simple revision | Standard |
| BLOCKER resolution or chunk redesign | Premium |
| Invocation drafting for a complex chunk with non-obvious design decisions | Premium |
| Spawning the Advisor role (objective failure only) | Premium |

Default for routine build sessions: **Standard**. When in doubt, start Standard and escalate if the session's analysis proves insufficient.

### Escalation ladders

The builder's starting tier determines the attempt sequence. QA tier follows the builder's final attempt tier.

**Economy-start** (no design decisions; mechanical chunk):

| Attempt | Tier | Rationale |
| --- | --- | --- |
| 1 | Economy | First pass |
| 2 | Standard | Economy failure = task needs reasoning, not just execution |
| 3 | Premium | Standard failed — problem is genuinely complex |
| 4+ | BLOCKER → human | Premium failed — requires human judgement |

**Standard-start** (most implementation chunks):

| Attempt | Tier | Rationale |
| --- | --- | --- |
| 1 | Standard | First pass |
| 2 | Standard | Retry — first failure may be noise or a minor miss |
| 3 | Premium | Two standard failures = capability ceiling — escalate |
| 4+ | BLOCKER → human | Premium failed — requires human judgement |

**Premium-start** (complex chunks where design risk is high from the outset):

| Attempt | Tier | Rationale |
| --- | --- | --- |
| 1 | Premium | First pass |
| 2 | Premium | Single retry |
| 3+ | BLOCKER → human | Premium twice is the maximum reasonable spend |

Economy failure is never retried at the same tier — it signals a capability mismatch, not noise. Standard and Premium each get one same-tier retry before escalating. The escalation ladder is a signal, not a penalty: it tells you what the chunk actually required.

---

**Created:** 2026-05-21.
**Updated:** 2026-05-30 (v3 — B-016 evidence manifest and adversarial QA; project-agnostic generalization).
**Adapted from:** the AMI multi-agent build process (3-role canonical, 2026-04-29).
**Phase A planning loop:** `docs/planning/claude-code-build-prompts.md`.
