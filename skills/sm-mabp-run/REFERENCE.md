# MABP Reference — Detailed Cycle Procedures

Companion to [SKILL.md](SKILL.md). Full source of truth: `docs/MULTI_AGENT_BUILD_PROCESS.md` in the DeliveryOS meta-project.

---

## § Builder invocation rules

1. **Under 80 lines.** Do not paste the chunk spec verbatim — tell the builder to read it at `docs/planning/chunks/chunk-NN-<slug>.md`.
2. **Design quality stance** (opening paragraph): "Build clean first. If the clean and fast structures diverge, build the clean one. Structural shortcuts must be declared as blocking hot spots with the clean version described."
3. **Pre-resolve the 3–5 key design decisions** (data types, algorithm, integration points, file breakdown) — the builder shouldn't have to invent these.
4. **Done criteria as numbered checklist** — 10 items max. Each item must be verifiable (a command, an observable behaviour — not "code is written").
5. **State starting tier** (Economy / Standard / Premium) and the escalation ladder that applies:

| Starting tier | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 |
|---|---|---|---|---|
| Economy | Economy | Standard | Premium | BLOCKER → human |
| Standard | Standard | Standard (retry) | Premium | BLOCKER → human |
| Premium | Premium | Premium (single retry) | BLOCKER → human | — |

Economy = mechanical/boilerplate chunks (no design decisions).
Standard = most implementation chunks.
Premium = complex design, BLOCKER resolution, Advisor role.

---

## § Builder contract

Builder sub-agent responsibilities:
- Re-runs the pre-fire audit (pastes output verbatim) before writing any code
- Writes code and tests in `src/test/chunk-NN-<slug>.test.ts`
- Runs the unit suite AND the extension smoke in one session before closing
- Iterates on builder-owned errors within the attempt budget
- On any ambiguity, contradiction, or missing dependency: writes `docs/build/blockers/chunk_NN_<YYYYMMDD_HHMM>.md` and exits — no code written
- Fills `## For QA — hot spots` (2–5 bullets or "None — all criteria clean on first attempt") before closing
- Appends evidence manifest (see § Evidence manifest) before closing the report

Builder never:
- Uses `AskUserQuestion`
- Edits architect-owned docs (`BUILD_STATUS.md`, chunk specs, PRD)
- Shares state with other sub-agents

---

## § Evidence manifest (required in every builder report)

One row per done-criterion item. Verbatim command output only — no paraphrase.

```
| Artifact | Verification command | Output (first 3 lines) |
|---|---|---|
| function X exported | grep -r "export function X" src/ | src/foo.ts:12: export function X |
| tests pass | npm test 2>&1 \| tail -5 | 378 passing (2s) |
```

Missing manifest = architect rejects without reviewing code.

**Test execution discipline:** write output to a log file, then read it — don't pipe through `| tail`:
```bash
# DO: redirect → tail after
npm run test:integration > /tmp/project_chunk_NN_test.log 2>&1
tail -120 /tmp/project_chunk_NN_test.log
# NOT: piped tail (buffers all output, reads as 0 bytes on long runs)
```

---

## § BLOCKER file format

`docs/build/blockers/chunk_NN_<YYYYMMDD_HHMM>.md`:

```markdown
# BLOCKER — Chunk NN — <one-line summary>

## Issues found (enumerate ALL — a re-fire is expensive, find them all up front)

1. **<Ambiguity / contradiction / missing dependency>**
   - Where: <file path:line, or chunk-spec line ref>
   - What I checked: <verification commands run, with output>
   - What I need: <specific question or direction>
   - What I would have done if forced to guess: <so architect can confirm quickly>

2. ...

## Status
Exiting without writing code. Re-fire when the architect resolves the above.
```

---

## § QA invocation rules

QA invocation must include:
1. **Hot-spots preamble** — paste builder's `## For QA — hot spots` with severity labels (`blocking` / `advisory`)
2. **Primary-source verification commands** for every done criterion (actual editor behaviour, not exit codes)
3. **Structural quality sweep** directive:
   - Schema: normalised form, all constraints named, no nullable where domain forbids null
   - Code: no magic numbers, no hardcoded strings, no TODO/FIXME committed, no dead code
   - Naming: consistent with existing conventions (grep 3 comparable files first)
   - Abstractions: no leaky abstractions introduced for speed
4. **Isolation sweep** — confirm tests don't write to the real workspace or memory store
5. **Spot-check directive**: "For 2–3 criteria: break the implementation, confirm the test fails, revert"

QA's default stance: **FAILED until evidence proves otherwise.** QA does not read the builder report in Pass 1 — independent verification first.

**Two passes:**
- Pass 1: Independent verification (before reading builder hot spots)
- Pass 2: Hot-spot reconciliation (QA-only findings are the highest-signal output)

**Mandatory 6-line verdict block** (end of QA report):
```
Chunk: NN
QA report: <abs path>
Builder report reviewed: <abs path> (v<K>)
Verdict: approve | revise | escalate
Evidence manifest: <N rows — every done criterion covered>
QA-only findings (not in builder hot spots): <list or 'none'>
```

Missing evidence manifest line = invalid verdict.

---

## § BUILD_STATUS.md scaffold

Create this if `docs/build/BUILD_STATUS.md` doesn't exist:

```markdown
# BUILD_STATUS.md

**Project:** <name>
**Phase B started:** <date>
**Chunk specs:** docs/planning/READY.md

---

## Chunk ledger

| # | Slug | Status | Builder report | QA report | Verdict | Notes |
|---|---|---|---|---|---|---|
| 01 | <slug> | pending | — | — | — | — |
| 02 | <slug> | pending | — | — | — | — |
...

---

## Decisions + structural debt

<!-- Architect-only section. Builder/QA sub-agents never write here. -->
<!-- Format per entry: -->
<!-- Chunk NN: <decision made>. Structural debt: <what was cut> / <clean version> / <which chunk should fix it>. -->

---

## Cohesion checks

<!-- Log every 4–5 chunks: date, patterns checked, result. -->
```

---

## § Revision loop depth cap

| Fix prompt version | Action |
|---|---|
| v2, v3 | Architect writes fix prompt (≤ 60 lines), re-fires builder |
| v4 | **Stop. Escalate via AskUserQuestion.** Options: keep iterating / redesign the chunk / re-plan / park. Do not iterate further without stakeholder decision. |

Every revision run re-runs ALL done criteria (regression gate). Never scope a re-run to only the fixed criterion.

---

## § Structural debt register

When approving a chunk whose hot spots include a structural shortcut:
- `BUILD_STATUS.md` chunk entry must include `Structural debt:` field
- Format: what was cut / what the clean version looks like / which future chunk should address it
- Debt not registered does not exist as far as future architects are concerned
