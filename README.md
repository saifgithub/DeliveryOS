# DeliveryOS

> A harness around your harness.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/saifgithub/deliveryos)](https://github.com/saifgithub/deliveryos/releases/latest)
[![Demo video](https://img.shields.io/badge/Demo-YouTube-red)](https://youtu.be/PLACEHOLDER)

---

## Hero

![DeliveryOS activity bar](docs/screenshots/01-activity-bar.png)

*One icon, five editors.*

---

## What is DeliveryOS?

DeliveryOS turns raw software intent into verified Execution Briefs for AI coding agents, then preserves the memory, validation, and release evidence around their work.

The thesis is simple. Claude Code's `CLAUDE.md` is a harness — it gives the model context, file conventions, and behavioural rules that make the difference between a useful coding assistant and a dangerous one. But that harness only covers one session. It doesn't know your requirements. It doesn't know your test spec. It doesn't carry the decisions from last month's sprint into this one. It doesn't prevent the agent from touching the user auth module when you told it not to.

DeliveryOS is the harness above that harness. It covers the SDLC layer: raw idea → discovery interview → structured PRD → requirement catalogue → test specification → Execution Brief (with explicit allowed and forbidden file lists) → harness handoff → result capture → diff validation → verification → memory update → release evidence. Every artefact is a readable markdown file on disk. The model is interchangeable.

Who this is for: an AI-native solo builder who runs Claude Code or Codex as a primary coding tool. A technical PM or solution architect who wants structured, auditable AI-assisted delivery. Anyone who has learned, the hard way, that an unconstrained coding agent is not the same thing as a well-briefed one.

---

## The five-minute quick-start

1. [Install the `.vsix`](#install) — one command or one file drag.
2. Open any VS Code-family editor (VS Code, Cursor, Windsurf, VSCodium, Antigravity) in a project folder.
3. Click the DeliveryOS icon in the activity bar.
4. Paste a raw idea into **DISCOVER**.
5. Walk through **DEFINE → EXECUTE → VERIFY** — copy prompts out and paste results back, or use one-click **Run with AI**.
6. Export Release Evidence at the end of each requirement cycle.

The whole loop runs in about 30 minutes for a small requirement. The only tool you need besides this extension is whatever AI chat you already use.

For the complete step-by-step manual, see [Using DeliveryOS: the full walkthrough](#using-deliveryos-the-full-walkthrough).

---

## Demo video

[![Demo video](docs/screenshots/05-diff-violation.png)](https://youtu.be/PLACEHOLDER)

Three and a half minutes, end to end, including the moment DeliveryOS catches Claude Code touching a forbidden file.

The demo uses the Bug Triage Assistant workspace in `examples/bug-triage/`. Claude Code attempts to edit `src/backend/api/users.py` — a file in the Forbidden list. The PreToolUse hook fires before the write executes. The file is never touched.

If the video is unavailable, the backup `.mp4` is attached to the [v0.1.0 GitHub Release](https://github.com/saifgithub/deliveryos/releases/tag/v0.1.0).

---

## Install

### Recommended: install script

#### macOS and Linux

```sh
curl -fsSL https://github.com/saifgithub/deliveryos/releases/download/v0.1.0/install.sh | sh
```

#### Windows (PowerShell)

```powershell
iwr -useb https://github.com/saifgithub/deliveryos/releases/download/v0.1.0/install.ps1 | iex
```

The install script detects every supported editor on your `PATH` and installs DeliveryOS into each one automatically. It also deploys the bundled [DeliveryOS skills](#skills) to `~/.claude/skills/` (pass `--no-skills` / `-NoSkills` to skip). Run it again later to upgrade.

### Manual sideload

Download `deliveryos-0.1.0.vsix` from the [latest release](https://github.com/saifgithub/deliveryos/releases/latest), then run the command for each editor you want to use:

| Editor | Command |
| --- | --- |
| VS Code | `code --install-extension deliveryos-0.1.0.vsix --force` |
| Cursor | `cursor --install-extension deliveryos-0.1.0.vsix --force` |
| Windsurf | `windsurf --install-extension deliveryos-0.1.0.vsix --force` |
| VSCodium | `codium --install-extension deliveryos-0.1.0.vsix --force` |
| Antigravity | `antigravity --install-extension deliveryos-0.1.0.vsix --force` |

Or use each editor's "Install from VSIX" command from the command palette (`Cmd/Ctrl+Shift+P`).

### Antigravity path note

The Antigravity binary may not be on `PATH` by default. Typical install path on macOS:

```text
/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity
```

Add that directory to your `PATH`, then re-run the install script. Antigravity 2.x dropped the CLI binary entirely — the install script prints a specific skip reason when the `.app` bundle is present without a CLI on `PATH`. In that case, install manually: open the app → Extensions → `...` menu → "Install from VSIX".

<details>
<summary>Troubleshooting</summary>

**`command not found: code`** (or `cursor` / `windsurf` / `codium` / `antigravity`)**:** Open the editor, press `Cmd/Ctrl+Shift+P`, search for `Shell Command: Install '<editor>' command in PATH`. Re-run the install script after that.

**Activity-bar icon doesn't appear after install:** Reload the window — `Cmd/Ctrl+Shift+P → Developer: Reload Window`. Some editors require a reload before custom activity-bar contributions render.

**The extension is not signed:** The sideloadable `.vsix` is unsigned. The "Install from VSIX" GUI path presents a one-click trust prompt. The install-script path also accepts it automatically. Signature verification in the VS Code-family applies to Marketplace-installed extensions; sideloaded ones bypass it by design. Verify the SHA-256 hash instead (see below).

**Activity-bar icon missing after reload:** Press `Cmd/Ctrl+Shift+P` → `DeliveryOS: Show DeliveryOS` to force the view container open.

</details>

---

## Skills

DeliveryOS ships a set of agent **skills** — the methodology it was built on and dogfoods — under [`skills/`](skills/). They run in Claude Code (or any harness that reads `~/.claude/skills/`) and write into the same `.deliveryos/` memory store the extension uses.

| Skill | What it does |
| --- | --- |
| `/sm-elicitation` | Business-analysis elicitation interview — grills you one question at a time across problem, stakeholders, scope, goals, constraints, assumptions and risks, then persists the specification, the full question log, and every decision to a transcript artifact **and** DeliveryOS memory (`intent` + `design` entries). |
| `/sm-mabp-plan` | MABP Phase A — turn a project (PRD + approved requirements) into a Phase B-ready build workspace. |
| `/sm-mabp-run` | MABP Phase B — execute a chunk via the 3-role pattern (audit → builder → QA → verdict). |

The install script deploys these automatically; to (re)deploy by hand:

```sh
scripts/install-skills.sh              # macOS / Linux  →  ~/.claude/skills/
scripts/install-skills.ps1             # Windows
```

See [`skills/README.md`](skills/README.md) for details.

## Verify the download (SHA-256)

The hash for each release is in `SHA256SUMS.txt`, attached as a release asset alongside the `.vsix`.

### Verify on macOS and Linux

```sh
# Download the hash file and the .vsix, then:
shasum -a 256 -c SHA256SUMS.txt
```

Or check the single file manually:

```sh
shasum -a 256 deliveryos-0.1.0.vsix
# Compare the output against SHA256SUMS.txt from the release page.
```

### Verify on Windows

```powershell
Get-FileHash deliveryos-0.1.0.vsix -Algorithm SHA256
# Compare the output against SHA256SUMS.txt from the release page.
```

Expected hash for `deliveryos-0.1.0.vsix`: `6e9704e75b2657e7b868fb8ed03273fc86feb98cd16be66055965b8f243953c8`

DeliveryOS is sideloaded, not signed by a marketplace. Verifying the hash confirms you have the same `.vsix` the [release workflow](.github/workflows/release.yml) built from this commit.

---

## Screenshots

### Activity bar in any VS Code-family editor

![Activity bar icon](docs/screenshots/01-activity-bar.png)

*Full VS Code chrome with the DeliveryOS icon highlighted. One click opens the SDLC sidebar.*

### Stage tree view

![Stage tree view](docs/screenshots/02-tree-view.png)

*Four-stage tree fully populated — DISCOVER, DEFINE, EXECUTE, VERIFY — with the Bug Triage project half-complete.*

### PRD editor

![PRD editor](docs/screenshots/03-prd-editor.png)

*PRD editor with a section being edited. Word counts and empty-section placeholders guide the author.*

### Execution Brief composer

![Execution Brief composer](docs/screenshots/04-brief-composer.png)

*Execution Brief with Allowed and Forbidden file sections visible. Green border = allowed, red border = forbidden.*

### Diff violation panel — the headline moment

![Diff violation panel](docs/screenshots/05-diff-violation.png)

*Diff panel showing a blocked write to a forbidden file. The file was never touched; the hook fired first.*

### Release Evidence

![Release Evidence](docs/screenshots/06-release-evidence.png)

*Release Evidence markdown in the webview preview. Full traceability chain from raw idea to verified result.*

---

## Using DeliveryOS: the full walkthrough

This is the complete manual for the idea-to-release loop. It assumes DeliveryOS is installed and you've opened a project folder in a VS Code-family editor. Every step writes readable markdown into a `.deliveryos/` folder in your project — nothing is hidden in a database you can't read.

### The Stages sidebar

Click the DeliveryOS icon in the activity bar to open the **Stages** tree. It has four stages, each expanding to the actions available at that point:

- **DISCOVER** — capture the raw idea, run a discovery interview, or reverse-engineer a PRD from existing code.
- **DEFINE** — draft the PRD, decompose it into a requirement catalogue, generate test specs, log change requests and bugs.
- **EXECUTE** — compose an Execution Brief, hand it to your AI coding harness, capture the result, validate the diff.
- **VERIFY** — record a verdict and export Release Evidence.

Clicking a tree item opens the panel for that step or runs the command. Everything is also available from the Command Palette (`Cmd/Ctrl+Shift+P`) under the **DeliveryOS:** prefix — see the [Command reference](#command-reference) below. If the tree ever looks stale, run **DeliveryOS: Refresh Stage Tree**.

### Two ways to run AI

Most steps produce a **prompt** you run against an AI model. DeliveryOS gives you two ways to do that:

1. **Copy-paste (zero config, the v0.1.0 default).** Each panel has a copy button. Copy the prompt into whatever AI chat you already use, then paste the response back into the panel. The copy-paste boundary is deliberate — it keeps the harness honest and model-agnostic.
2. **Run with AI (one click).** Panels that support it — Discover, PRD, Requirements, Change Request — have a **Run with AI** button that executes the prompt and parses the result back in place. It tries, in order:
   - your editor's built-in language model (`vscode.lm`, e.g. Copilot if present),
   - a local CLI you configure in **`deliveryos.aiCliCommand`** (default `claude --print`; it must read the prompt on stdin and write the response to stdout — e.g. `llm -m gpt-4o`, `sgpt --no-md`),
   - and if neither is available, it falls back to copying the prompt to your clipboard so you can paste it manually.

   Set `deliveryos.aiCliCommand` to blank to skip the CLI tier. Either way the result lands in the same place; **Run with AI** just removes the round-trip.

### Step 1 — Create a project

Run **DeliveryOS: Create Project** (or the DISCOVER → Create entry). This initialises the `.deliveryos/` memory store in your workspace and creates the project's root **Intent** entry. You do this once per project.

### DISCOVER — from a raw idea to a shared understanding

Goal: turn a vague idea into a problem statement, goals, non-goals, and success criteria.

1. **Open Discover** (`DeliveryOS: Open Discover`) and paste your raw idea into the **Idea** tab.
2. **Run the discovery interview.** Generate the interview prompt, run it (copy-paste or **Run with AI**), and paste the model's questions back. Answer them in the **Answers** / **Interview** tab — the interview drives out the problem, the users, and the constraints the idea didn't state.
3. **(Optional) Reverse from code.** For an existing codebase, run **DeliveryOS: Reverse — Derive PRD from Codebase** to seed discovery from what already exists instead of a blank idea.

Everything you capture is written to the project's **Intent** memory entry.

> **Prefer a deeper, BA-style elicitation?** Run the [`/sm-elicitation`](#skills) skill in Claude Code. It grills you one question at a time across problem, stakeholders, scope, goals, constraints, assumptions and risks, then writes the specification and every decision straight into the same `.deliveryos/` memory store (as `intent` + `design` entries). Run **DeliveryOS: Rebuild Memory Index from Markdown** afterwards to fold it into the index — see [Where your work lives](#where-your-work-lives).

### DEFINE — PRD, requirements, and test specs

Goal: a structured PRD, a numbered requirement catalogue, and a test spec per requirement.

1. **Draft the PRD.** Run **DeliveryOS: Generate PRD Draft Prompt** to produce the drafting prompt, run it, then open **DeliveryOS: Open PRD Editor** to edit the eight sections. The editor auto-saves ~500ms after you stop typing (there is no Save button — the per-section "Saved" indicator confirms it). Approve the PRD when the sections are complete.
2. **Decompose into requirements.** Run **DeliveryOS: Decompose PRD into Requirements** to turn the PRD into a numbered catalogue (REQ-001, REQ-002, …), then review and edit them in **DeliveryOS: Open Requirements Catalogue**. Each requirement carries a category (functional / non-functional) and a priority (must / should / could).
3. **Generate test specs.** Run **DeliveryOS: Run Test Designer** on a requirement to produce its test specification — scenarios, cases, and verification criteria. This is the one specialist shipped in v0.1.0.
4. **Log changes and bugs as you go.** **DeliveryOS: Log Change Request** captures a scope change against the PRD; **DeliveryOS: Log Bug** records a defect. Both become first-class memory entries (CR-NNN / BUG-NNN) linked to what they affect.

### EXECUTE — brief, handoff, capture, validate

Goal: hand a tightly-scoped brief to your AI coding harness and prove it stayed inside the lines.

1. **Compose the Execution Brief.** Run **DeliveryOS: Compose Execution Brief** for a requirement. The brief is a 10-section handoff document with explicit **Allowed** and **Forbidden** file lists (validated by picomatch before the run starts). **DeliveryOS: Open Execution Brief Markdown** shows the file on disk.
2. **Install the guard rail.** Run **DeliveryOS: Install Claude Code PreToolUse Hook** to write a hook into `.claude/settings.json`. It fires before every file write and aborts any write to a Forbidden path — the headline safety feature.
3. **Hand off to your harness.** The brief is rendered in the format your target harness expects (Claude Code or Codex profiles in v0.1.0). Run your coding agent against it.
4. **Capture the result.** Drop the harness's `result.md` into `.deliveryos-handoff/` — a watcher picks it up automatically (SHA-256 deduped, no polling) — or paste it via **DeliveryOS: Paste Harness Result**.
5. **Validate the diff.** **DeliveryOS: Open Diff Results** shows what changed and flags any Forbidden-path violations. **DeliveryOS: Re-run Diff** recomputes after further edits.

### VERIFY — verdict and release evidence

Goal: close the loop with a recorded verdict and an auditable evidence trail.

1. **Record a verdict.** Open **DeliveryOS: Open Verification Panel**, review the result against the test spec, and approve it (or send it back for rework). Approving forces a memory-update pass.
2. **Export Release Evidence.** Run **DeliveryOS: Open Release Evidence Document** to generate a markdown document that walks the typed memory graph backwards — from Verification all the way to the original Intent — showing every link. This is the artefact you ship as proof the requirement was delivered as specified.

### Where your work lives

DeliveryOS keeps everything in a `.deliveryos/` folder in your project, designed to be committed to git:

- **`memory.sqlite`** — the query/graph index. It is *not* the source of truth; it can be deleted and rebuilt.
- **`memory/<type>/*.md`** — one markdown file per memory entry (Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release, plus test-spec / change-request / bug). Each file's frontmatter carries the full payload, so the markdown alone is lossless.
- **`memory/INDEX.md`, `memory/LINKS.md`** — a generated, read-only projection of every entry and link. This is the grep-friendly read path for you, the AI, or any tooling — no database driver needed. Don't edit these (edit the body files instead).

If the index is ever lost — or you've hand-written body files (e.g. from [`/sm-elicitation`](#skills)) — run **DeliveryOS: Rebuild Memory Index from Markdown** to rebuild `memory.sqlite` and regenerate the projection from disk.

### Command reference

Every command, by stage (Command Palette → type "DeliveryOS"):

| Stage | Command | What it does |
| --- | --- | --- |
| — | Create Project | Initialise `.deliveryos/` and the project Intent |
| — | Refresh Stage Tree | Re-read state and redraw the sidebar |
| — | Rebuild Memory Index from Markdown | Recover `memory.sqlite` from the markdown bodies |
| DISCOVER | Open Discover | Raw idea + discovery interview |
| DISCOVER | Reverse — Derive PRD from Codebase | Seed discovery from existing code |
| DEFINE | Generate PRD Draft Prompt | Produce the PRD drafting prompt |
| DEFINE | Open PRD Editor | Edit and approve the eight PRD sections |
| DEFINE | Decompose PRD into Requirements | Generate the REQ-NNN catalogue |
| DEFINE | Open Requirements Catalogue | Review / edit requirements |
| DEFINE | Run Test Designer | Generate a test spec for a requirement |
| DEFINE | Log Change Request | Record a scope change (CR-NNN) |
| DEFINE | Log Bug | Record a defect (BUG-NNN) |
| EXECUTE | Compose Execution Brief | Build the 10-section handoff with Allowed/Forbidden lists |
| EXECUTE | Open Execution Brief Markdown | View the brief file on disk |
| EXECUTE | Install Claude Code PreToolUse Hook | Write the forbidden-path guard into `.claude/settings.json` |
| EXECUTE | Paste Harness Result | Paste a `result.md` manually |
| EXECUTE | Open Diff Results | Show changes + Forbidden-path violations |
| EXECUTE | Re-run Diff | Recompute the diff |
| VERIFY | Open Verification Panel | Record the verdict against the test spec |
| VERIFY | Open Release Evidence Document | Export the end-to-end traceability document |

### Workflow troubleshooting

- **A stage action does nothing / the tree is stale** — run **DeliveryOS: Refresh Stage Tree**, or reload the window (`Developer: Reload Window`).
- **Run with AI falls back to clipboard every time** — no `vscode.lm` model is available and the `deliveryos.aiCliCommand` CLI isn't on your `PATH`. Install the CLI (default `claude`), point the setting at it, or just use copy-paste.
- **PRD edits seem not to save** — they auto-save ~500ms after you stop typing; watch for the per-section "Saved" indicator. There is no Save button by design.
- **Entries written outside the extension don't appear** — run **DeliveryOS: Rebuild Memory Index from Markdown** to ingest hand-written body files.
- **A forbidden write wasn't blocked** — confirm you ran **Install Claude Code PreToolUse Hook** and that your harness reads `.claude/settings.json`.

---

## Architecture at a glance

- **Three npm workspaces**: `extension/` (VS Code extension host), `webview/` (React + Tailwind webview), `contracts/` (shared TypeScript types).
- **Four SDLC stages**: DISCOVER, DEFINE, EXECUTE, VERIFY. Configurable mid-stages can be added per project type (Security, Privacy, Compliance, and others).
- **Memory graph**: eight typed memory layers — Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release. Stored as SQLite on disk; all artefacts are also readable markdown files.
- **Execution Briefs**: formal 10-section handoff documents with explicit Allowed and Forbidden file lists. Validated by picomatch before the run starts.
- **Harness profiles**: Claude Code and Codex profiles in v0.1.0. Each profile renders the brief in the format the target harness expects and suggests the appropriate `CLAUDE.md` / `AGENTS.md` updates.
- **PreToolUse hook**: a Claude Code hook written to `.claude/settings.json` that fires before every file write and aborts writes to Forbidden paths.
- **Result capture**: a debounced, SHA-256-deduped `FileSystemWatcher` on `.deliveryos-handoff/result.md`. No polling.
- **Sideloadable**: one `.vsix` file installs into VS Code, Cursor, Windsurf, VSCodium, and Antigravity.

Full spec: [docs/PRD.md](docs/PRD.md)

Full architecture: [docs/architecture/](docs/architecture/)

---

## The meta-harness essay

The model is not the product. The harness around the model is the product — and the SDLC harness is the layer that's been missing.

I wrote a longer argument about why this matters, how DeliveryOS compares to Linear, Devin, and raw harnesses like Claude Code, and what the dogfooding evidence actually shows: [docs/essay/meta-harness.md](docs/essay/meta-harness.md).

---

## Dogfooding

DeliveryOS planned its own build using the same discipline it enforces on other projects.

- [docs/PRD.md](docs/PRD.md) is a DeliveryOS PRD — written in the format the product itself produces.
- [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md) is a phased build schedule of the same kind DeliveryOS generates for its users.
- [docs/planning/part-1-plan.md](docs/planning/part-1-plan.md) is the chunk-by-chunk breakdown produced by the planning loop.
- [docs/planning/chunks/](docs/planning/chunks/) holds the per-chunk spec for each of the 16 implementation chunks — including the spec for this release preparation step.
- [docs/decisions/](docs/decisions/) holds Architecture Decision Records in the format DeliveryOS templates for user projects.

The planning artefacts are verifiable in two clicks.

---

## Project status

`v0.1.0, proof of work.`

This is a sideloadable MVP. The full idea-to-release loop closes. Sixteen chunks across four phases. No baked-in API integration — manual copy-paste is the deliberate default (with an optional one-click **Run with AI** via your editor's language model or a local CLI on the Discover, PRD, Requirements, and Change Request panels); the copy-paste boundary keeps the harness honest. One specialist (Test Designer). Two harness profiles (Claude Code, Codex). One demo (Bug Triage Assistant).

Full MVP scope: [docs/PRD.md § 15](docs/PRD.md)

---

## Roadmap

- **API integration** — direct Claude API calls from within the brief composer and specialist panels, removing the copy-paste step.
- **MCP server mode** — DeliveryOS memory graph as an MCP resource, accessible from any MCP-compatible tool.
- **OpenVSX publishing** — publish to the Open VSX Registry for editors that don't support the Microsoft Marketplace.
- **Additional specialists** — Security Analyst, Architecture Reviewer, and others as mid-stage plugins.
- **v0.2 dogfooding loop** — use DeliveryOS to plan and execute its own v0.2 development in a live, recorded session.

Full roadmap: [docs/PRD.md § 26](docs/PRD.md)

---

## Contributing

This is a personal proof-of-work build. Issues are welcome. Pull requests are not actively solicited until v0.2 — the codebase is still moving fast enough that coordinating outside contributions would slow the core work down.

---

## License

MIT. See [LICENSE](LICENSE).

---

## Acknowledgements

Built with [Claude Code](https://claude.ai/claude-code). Harness profiles target [Claude Code](https://claude.ai/claude-code) and [OpenAI Codex](https://openai.com/codex). Runs in [VS Code](https://code.visualstudio.com/), [Cursor](https://cursor.sh/), [Windsurf](https://windsurf.ai/), [VSCodium](https://vscodium.com/), and [Antigravity](https://antigravity.dev/).
