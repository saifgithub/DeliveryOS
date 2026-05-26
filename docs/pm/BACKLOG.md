# DeliveryOS — P-track Backlog

Items the P-track owns or flags. Rough priority ordering within each status tier.
Add items here; use `/start-fresh P` to pick them up in a session.

---

## Open

| ID | Item | Priority | Notes |
| --- | --- | --- | --- |
| B-001 | Cast DeliveryOS into the DeliveryOS structure | 🔴 High | Use the tool to manage itself — true dogfood run. See § B-001 below. |
| B-002 | Reverse engineer: code → documentation (brownfield onboarding) | 🔴 High | Infer Intent + PRD + Requirements from existing codebase so DOS can manage future deliveries. See § B-002 below. |

---

## In progress

_Nothing in flight._

---

## Done

_Nothing closed yet._

---

## § B-001 — Cast DeliveryOS into the DeliveryOS structure

**What:** Run DeliveryOS development through the DeliveryOS SDLC workflow — use the extension to manage its own v0.2 (or next-feature) work from raw idea through verified release.

**Why:** The dogfooding claim in `docs/essay/meta-harness.md` is currently partial — the BUILD-PLAN + chunk specs were produced by the O/R/P multi-track session model, not by the extension UI itself. Closing the loop means the next feature cycle runs through the full in-extension workflow: raw idea → discovery → PRD → requirements catalogue → test spec → execution brief → harness run → result capture → diff → verification → release evidence.

**Pre-conditions:**
- v0.1.0 tagged and published (screenshots + video done, `git push`, GitHub release live).
- Extension installed from the published `.vsix` (not from source) into VS Code.

**Steps (one-time setup):**
1. Open this repo (`/Volumes/Extreme Pro/DeliveryOS`) in VS Code with the published extension active.
2. Run **DeliveryOS: Create Project** → name it "DeliveryOS".
3. Confirm `.deliveryos/memory.sqlite` initialises at the repo root.
4. Open the **Raw idea** panel — paste the v0.2 (or next-feature) raw intent.
5. Run the discovery interview; paste answers.
6. Generate PRD draft; iterate in the PRD editor.
7. Decompose PRD into requirements catalogue.
8. Run Test Designer for each requirement.
9. Compose an Execution Brief for the first requirement.
10. Select a harness profile (Claude Code); click **Run with Claude Code**.
11. Let Claude Code implement; capture result via the Result Capture panel.
12. Run the Allowed/Forbidden diff; check the diff-results panel.
13. Run Verification; complete the Memory Update gate; export Release Evidence.
14. Note: what broke, what was confusing, what was missing — these become b-track bugs or v0.3 requirements.

**Success signal:** at least one requirement implemented and verified with release evidence exported — all via the extension UI, not the command line.

**Session tag when picked up:** DOS:P5 (or a dedicated R-track session if implementation work is needed).

---

## § B-002 — Reverse engineer: code → documentation (brownfield onboarding)

**What:** A new DeliveryOS command — **Reverse Engineer Project** — that reads an existing codebase and synthesises the DeliveryOS documentation layer from the code outward: inferred Intent Memory, draft PRD, requirements catalogue, and codebase memory entry. Once populated, the project can continue forward through the normal DOS delivery cycle.

**Why:** DOS's natural direction is greenfield — idea → doc → code. But most real projects already have code and no structured documentation. Without a way to bootstrap the doc layer from code, DOS is inaccessible to brownfield teams. This feature makes DOS usable on any existing codebase, not just new ones started inside DOS.

The target case: a developer has a working app (like the Bug Triage backend in `examples/bug-triage/`), opens it in VS Code, runs **Reverse Engineer Project**, and within one session has a populated memory store they can immediately build from — adding new features the DOS way without rewriting history.

**Key design questions to resolve (for the O-track spec):**

1. **What does the AI read?** Candidate inputs: directory tree, README, existing docs, `git log --oneline`, key source files (entry points, models, routes), package manifests. Probably a two-pass approach: lightweight scan first (tree + README + manifests) to produce a draft; user can expand with specific files.

2. **What does it produce?** Minimum viable output:
   - `intent` memory row — `rawIdea` inferred from README/purpose + `discovery` partial (what it does, key constraints, tech stack)
   - `requirement` rows with `payload.kind = 'prd'` — PRD sections inferred from existing features
   - `requirement` rows (REQ-NNN) for each identifiable existing feature / module boundary
   - `codebase` memory row — folder structure, test runner, lint, conventions

3. **User review gate.** Nothing should be written to the memory store without the user reviewing and approving the inferred artifacts. The UI should present each inferred artifact as an editable draft before committing.

4. **Confidence signalling.** The AI cannot always infer intent reliably from code alone. Inferred fields should carry a `confidence` indicator (`high / low / inferred`) so the user knows what to scrutinise. Low-confidence fields should be pre-highlighted for editing.

5. **Existing `.deliveryos/` handling.** If a `.deliveryos/` memory store already exists for this project, the command should either (a) refuse + surface the existing data, or (b) offer a merge/supplement mode. No silent overwrites.

6. **Scope boundary.** Reverse engineering produces the doc layer only — it does NOT write code, does NOT generate test specs automatically, does NOT create execution briefs. Those remain user-driven after the doc layer exists. The goal is to get to the state equivalent to "PRD approved, requirements catalogued" so the next step is running Test Designer on each requirement.

**Rough implementation surface:**

- New command: `deliveryos.reverseEngineer` (contributes to the activity bar, gated on no existing `intent` row)
- New webview panel: `reverse-engineer/` — multi-step wizard (scan → review intent → review PRD → review requirements → review codebase memory → commit)
- Host-side: a `reverseEngineerPanel.ts` + `reverseEngineerHandlers` that orchestrate the AI inference pass, manage the draft state, and write to the memory store on user confirmation
- Contracts: new `contracts/src/reverseEngineer.ts` message types
- The inference prompt must be designed carefully — it will be the highest-stakes prompt in the system (wrong inferences here poison the entire downstream cycle)

**Relationship to B-001:** B-001 (dogfood DOS on DOS) exercises the forward path. B-002 is what makes DOS applicable to every project that already has code. These are complementary, not sequential — B-002 can be specced and built independently of B-001's outcome.

**Success signal:** Open `examples/bug-triage/` (which has real code but no `.deliveryos/` store) in VS Code, run **Reverse Engineer Project**, approve the inferred artifacts, and confirm that the resulting memory store is coherent enough to immediately compose an Execution Brief for a new requirement — without having done discovery from scratch.

**Session tag when picked up:** DOS:O6 for spec, then DOS:R18 for implementation.
