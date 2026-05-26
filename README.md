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
5. Walk through **DEFINE → EXECUTE → VERIFY** using the manual AI flow — copy prompts out, paste results back.
6. Export Release Evidence at the end of each requirement cycle.

The whole loop runs in about 30 minutes for a small requirement. The only tool you need besides this extension is whatever AI chat you already use.

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

The install script detects every supported editor on your `PATH` and installs DeliveryOS into each one automatically. Run it again later to upgrade.

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

Expected hash for `deliveryos-0.1.0.vsix`: `<sha256-to-be-filled-on-release>`

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

This is a sideloadable MVP. The full idea-to-release loop closes. Sixteen chunks across four phases. No API integration — manual copy-paste is deliberate in v0.1.0; it keeps the harness boundaries honest. One specialist (Test Designer). Two harness profiles (Claude Code, Codex). One demo (Bug Triage Assistant).

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
