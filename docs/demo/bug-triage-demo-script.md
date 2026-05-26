# Bug Triage Demo Script

**Version:** 1.0 — DeliveryOS CHUNK-15
**Workspace:** `examples/bug-triage/`
**Duration:** ~20 minutes (rehearsed)
**Recording checklist:** pre-seeded memory in `.deliveryos/`, Claude Code installed, DeliveryOS dev build running (F5)

---

## Step 1 — Open the workspace

**User action:** Open VS Code on `examples/bug-triage/`. Click the DeliveryOS activity bar icon.

**DeliveryOS surface:** Tree-view sidebar (CHUNK-01)

**Canned file:** —

*The sidebar appears showing the SDLC stage ladder. The pre-seeded project "Bug Triage Assistant" is already visible at the top.*

---

## Step 2 — Enter the raw idea

**User action:** Click **Discover** in the stage list. The Discover panel opens showing the "Raw Idea" tab pre-populated with the seeded idea text "I want a bug triage assistant".

**DeliveryOS surface:** Raw idea capture (CHUNK-05)

**Canned file:** —

*The placeholder text "e.g. I want a bug triage assistant" is visible before the seed data loads. Once loaded, the idea field shows the seeded text. This demonstrates a returning user picking up where they left off.*

---

## Step 3 — Run discovery interview

**User action:** Click the **Prompt** tab. Click **Generate questions**. Copy the generated prompt. Paste it into an AI chat. Copy the AI's answers. Return to the **Answers** tab and paste answers into the text area. Click **Save answers**.

**DeliveryOS surface:** Discovery workspace (CHUNK-05)

**Canned file:** `canned-responses/01-discovery-answers.md` *(paste verbatim into the AI chat; copy the answer block)*

*The loading spinner appears while questions are generated. The "Paste answers here" affordance is clearly visible. After saving, a toast confirms the answers were stored.*

---

## Step 4 — Generate the PRD

**User action:** Open the **PRD Editor** panel. Click **Generate PRD prompt**. Copy the prompt. Paste into AI chat. Copy the AI's PRD draft. Return to the PRD Editor and paste it into the import box. Click **Import**.

**DeliveryOS surface:** PRD editor (CHUNK-06)

**Canned file:** `canned-responses/02-prd-draft.md` *(paste verbatim as the AI's response)*

*Section headings render large. Each section shows its word count. Empty-section placeholders guide the user. The "Approve PRD" button is disabled until all sections are non-empty.*

---

## Step 5 — Approve PRD and decompose into requirements

**User action:** Click **Approve PRD**. Then click **Decompose PRD** in the Requirements Catalogue panel. Paste the AI's decomposition output.

**DeliveryOS surface:** Requirements catalogue (CHUNK-07)

**Canned file:** `canned-responses/03-requirements.md` *(paste verbatim as the decomposition response)*

*Three requirement cards appear: REQ-001 Bug Submission API (High), REQ-002 List Bugs (Medium), REQ-003 AI Severity Suggestion (Low). Each card shows its REQ-ID, title, priority chip, and verification-criteria status.*

---

## Step 6 — Run the Test Designer

**User action:** Click **REQ-001** in the requirements list to select it. Click **Run Test Designer**. Click **Generate test prompt**. Copy prompt. Paste into AI chat. Copy the test spec. Return to the **Result** tab. Paste test spec. Click **Save test spec**.

**DeliveryOS surface:** Test Designer (CHUNK-08)

**Canned file:** `canned-responses/04-test-spec-req-001.md` *(paste verbatim as the AI's test spec response)*

*The loading spinner appears while the prompt is generated. The requirement card at the top shows "0 verification criteria" before saving and "4 criteria" after. A toast confirms "Saved TS-REQ-001 — 4 criteria · 4 test cases."*

---

## Step 7 — Generate and edit the Execution Brief

**User action:** With REQ-001 still selected, click **Compose Execution Brief**. Review the auto-populated sections. Edit the **Allowed Changes** chip list to contain exactly:
- `src/backend/api/bugs.py`
- `src/backend/models/bug_report.py`
- `src/backend/services/bug_report_service.py`
- `tests/integration/test_bugs_api.py`

Edit the **Forbidden Changes** chip list to contain:
- `src/backend/api/users.py`
- `migrations/`
- `src/frontend/`

Click **Save and lock brief**.

**DeliveryOS surface:** Execution Brief composer (CHUNK-09)

**Canned file:** `canned-responses/05-brief-req-001.md` *(reference render — not pasted; shows what the locked brief looks like)*

*The 10 brief sections render as collapsible panels. Allowed paths appear with a green border; Forbidden paths with a red border. The "Save and lock" button is disabled until all required sections are non-empty. Chip list add/remove works inline.*

---

## Step 8 — Select harness profile and accept CLAUDE.md update

**User action:** In the brief composer right rail, select the **Claude Code** profile card. The suggested CLAUDE.md update appears read-only. Click **Accept** to apply the update to the workspace CLAUDE.md.

**DeliveryOS surface:** Harness profile selector (CHUNK-10)

**Canned file:** —

*Two profile cards are shown: Claude Code and Codex, each with icon, version, and last-tested date. The selected card has a visible accent border. The suggested CLAUDE.md diff renders read-only. Clicking Accept applies it without a dialog.*

---

## Step 8a — Install the PreToolUse hook

**User action:** In the **Diff Results** panel, navigate to the **Hook Install** tab. Review the hook plan. Click **Apply**.

**DeliveryOS surface:** Diff panel hook install tab (CHUNK-13)

**Canned file:** —

*The Hook Install tab shows the proposed `.claude/settings.json` diff. Clicking Apply writes the hook and shows a confirmation: "Hook installed."*

---

## Step 9 — Run with Claude Code

**User action:** In the brief composer, click **Run with Claude Code**. A terminal opens with the harness command pre-typed. Press **Enter** to start the run.

**DeliveryOS surface:** Handoff + terminal (CHUNK-11)

**Canned file:** —

*The "Run with Claude Code" primary button is clearly prominent. After click, a status banner appears: "Handoff written to `.deliveryos-handoff/`. Terminal opened." The watcher status dot turns green.*

---

## Step 10 — THE MOMENT: Hook fires and blocks the forbidden write

**User action:** Watch the terminal. Claude Code attempts to edit `src/backend/api/users.py`. The PreToolUse hook fires before the write executes. A VS Code notification appears: "DeliveryOS: write blocked — `src/backend/api/users.py` is in the Forbidden list."

**DeliveryOS surface:** VS Code notification + hook system (CHUNK-13)

**Canned file:** —

*The terminal shows Claude Code's tool call attempt followed immediately by the hook rejection message. The notification appears in the VS Code corner. This is the key teaching moment: policy enforcement fires before the file is touched.*

---

## Step 11 — Result captured

**User action:** After the run ends (whether the agent self-corrects or aborts), the result watcher detects `result.md`. The Result Detail panel updates automatically.

**DeliveryOS surface:** Result capture (CHUNK-12)

**Canned file:** `canned-responses/06-claude-run-violation.md` *(for rehearsal: place this at `.deliveryos-handoff/result.md` to simulate the violation result)*

*The result summary block, changed-files table, and tests-run table populate. The parser confidence indicator shows "medium" (some sections present). A loading state is shown during parsing.*

---

## Step 12 — Diff panel shows FAIL

**User action:** Open the **Diff Results** panel. The pass/fail header shows FAIL in red. The `src/backend/api/users.py` row appears in the Forbidden Touches section with a bold red path.

**DeliveryOS surface:** Diff panel (CHUNK-13)

**Canned file:** —

*Big FAIL header. Forbidden rows in red with bold path. Allowed-but-skipped rows in amber. Empty-state is replaced by the violation summary.*

---

## Step 13 — Fix and re-run; clean result

**User action:** Reset the demo (or manually remove the violation). Click **Run with Claude Code** again. This time the agent follows the brief correctly. After the run, the result watcher picks up the clean result.

**DeliveryOS surface:** Handoff + terminal → Result capture → Diff panel

**Canned file:** `canned-responses/07-claude-run-success.md` *(for rehearsal: place at `.deliveryos-handoff/result.md` to simulate the clean result)*

*The Diff Results panel now shows PASS in green. The changed-files table shows exactly the four allowed files. Tests row shows 4 passed.*

---

## Step 14 — Click Verify

**User action:** Click the **Verify** button in the result panel. The Verification panel opens showing test results per criterion. Click **Approve**.

**DeliveryOS surface:** Verification (CHUNK-14)

**Canned file:** —

*A test results table appears with a verdict per case. All 4 criteria show "passed". The "All criteria met" green banner appears at the top. Clicking Approve stores the verification record.*

---

## Step 15 — Update memory

**User action:** In the Memory Update form that appears after approval, fill in any codebase or design notes. Click **Apply update**.

**DeliveryOS surface:** Verification → Memory Update form (CHUNK-14)

**Canned file:** —

*The memory update form prompts for design context, codebase context, and requirement assumptions. After submit, a confirmation appears: "Memory updated."*

---

## Step 16 — Export Release Evidence

**User action:** Click **Export Release Evidence**. The traceability document is generated and opens in a side panel.

**DeliveryOS surface:** Release Evidence (CHUNK-14)

**Canned file:** —

*The "Open in side panel" affordance is visible. The traceability chain renders as a chain of cards: Idea → PRD → REQ-001 → Test Spec → Execution Brief → Result → Verification → Release Evidence. An "Export ZIP" button is available for download.*
