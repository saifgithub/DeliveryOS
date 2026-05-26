# DeliveryOS — Release notes

This file is the body of every GitHub Release. The release workflow
(`.github/workflows/release.yml`) reads it verbatim via
`gh release create --notes-file RELEASE_NOTES.md`. Author and commit
**before** pushing the tag.

---

## v0.1.0 — First public proof of work

**What is this?**

DeliveryOS is a structured SDLC memory and orchestration harness — a meta-harness that sits above AI coding agents like Claude Code and Codex. It turns a raw idea into a verified Execution Brief for the coding harness, then captures the result, validates it against the test specification, and produces release evidence. The full idea-to-release loop closes. Every artefact is a readable markdown file on disk.

This is a sideloadable MVP: one `.vsix`, five supported editors, sixteen implementation chunks, one demo workspace.

### Install

#### macOS and Linux

```sh
curl -fsSL https://github.com/saifgithub/deliveryos/releases/download/v0.1.0/install.sh | sh
```

#### Windows (PowerShell)

```powershell
iwr -useb https://github.com/saifgithub/deliveryos/releases/download/v0.1.0/install.ps1 | iex
```

The script auto-detects `code`, `cursor`, `windsurf`, `codium`, and `antigravity` on your `PATH` and installs the `.vsix` into each. For manual sideload, see the [README install section](https://github.com/saifgithub/deliveryos#install).

### Verify

```sh
# macOS / Linux
shasum -a 256 -c SHA256SUMS.txt
```

```powershell
# Windows
Get-FileHash deliveryos-0.1.0.vsix -Algorithm SHA256
```

Expected SHA-256 for `deliveryos-0.1.0.vsix`: `<sha256-to-be-filled-on-release>`

The hash is also listed in `SHA256SUMS.txt`, attached to this release. DeliveryOS is sideloaded and not signed by a marketplace; verifying the hash confirms you have the artefact this workflow built.

### Demo video

Watch the 3-minute demo: [YouTube (unlisted)](https://youtu.be/PLACEHOLDER)

The headline moment is scene 8 (~2:35 in): DeliveryOS stops Claude Code from writing to a forbidden file before the write executes. The backup `.mp4` is attached to this release.

### Documentation

- [README](https://github.com/saifgithub/deliveryos#readme) — pitch, install, quick-start, screenshots, architecture
- [PRD](https://github.com/saifgithub/deliveryos/blob/main/docs/PRD.md) — full product requirements document
- [Meta-harness essay](https://github.com/saifgithub/deliveryos/blob/main/docs/essay/meta-harness.md) — the thesis, comparisons, and dogfooding evidence
- [Planning directory](https://github.com/saifgithub/deliveryos/tree/main/docs/planning) — verifiable dogfooding artefacts

### What's in v0.1.0

- **Four SDLC stages**: DISCOVER, DEFINE, EXECUTE, VERIFY — with a sidebar tree view in the VS Code activity bar.
- **Discovery interview**: structured AI-led discovery from a raw idea to a formal Discovery Record.
- **PRD editor**: section-by-section PRD authoring with word counts and empty-section placeholders.
- **Requirements catalogue**: PRD decomposition into traceable requirements.
- **Test Designer specialist**: generates a given/when/then test specification for any requirement.
- **Execution Brief composer**: 10-section handoff document with explicit Allowed and Forbidden file lists, validated by picomatch before the run.
- **Harness profiles**: Claude Code and Codex — each profile renders the brief in the format the harness expects.
- **PreToolUse hook**: writes a Claude Code hook to `.claude/settings.json` that blocks writes to Forbidden paths before they execute.
- **Result capture**: debounced, SHA-256-deduped `FileSystemWatcher` on `.deliveryos-handoff/result.md`.
- **Diff validation**: compares the set of modified files against the Allowed list; flags Forbidden violations.
- **Verification panel**: test-spec pass/fail, diff summary, all-green gate.
- **Release Evidence export**: full traceability chain from raw idea to verified commit, in a single markdown document.
- **Memory graph**: eight typed layers (Intent, Requirement, Design, Codebase, Execution, Result, Verification, Release) stored as SQLite, with all artefacts also readable as markdown.
- **Version check**: in-extension notification when a new GitHub Release is available.
- **Demo workspace**: `examples/bug-triage/` — a pre-seeded workspace that runs the full loop.
- **Install scripts**: `scripts/install.sh` and `scripts/install.ps1` for all five supported editors.

### Known limitations

- **Sideloaded `.vsix` does not auto-update.** The in-extension version check notifies when a new release is available; you re-run the install script to upgrade.
- **Not signed by a marketplace.** Verify using `SHA256SUMS.txt` (see above).
- **Manual AI flow only.** Copy prompts out, paste results back. No direct API calls in v0.1.0.
- **One specialist** (Test Designer). Security Analyst and Architecture Reviewer are planned for v0.2.
- **Two harness profiles** (Claude Code, Codex). Additional profiles planned for v0.2.
- **No MCP server mode.** The memory graph is local; MCP exposure is planned for v0.2.
- **No OpenVSX or Marketplace listing.** Sideload only for v0.1.0.

### What's next

- **API integration** — direct Claude API calls from within the brief composer and specialist panels.
- **MCP server mode** — memory graph as an MCP resource for any MCP-compatible tool.
- **Additional specialists** — Security Analyst, Architecture Reviewer.
- **OpenVSX publishing** — for editors that don't support the Microsoft Marketplace.
- **v0.2 dogfooding loop** — live recorded session of DeliveryOS planning its own v0.2 build.

---

## v0.0.1 — Phase 0 scaffold verification release

DeliveryOS at this tag is a Phase-0 verification artefact, not a
working product. It installs into VS Code + Cursor + a third
Code-OSS-derivative editor; the DeliveryOS activity-bar icon
appears and the sidebar tree renders the four stages (DISCOVER →
DEFINE → EXECUTE → VERIFY). The "DeliveryOS: Create Project"
command persists a project Intent into `.deliveryos/memory.sqlite`
and writes a `.deliveryos/README.md`. The "DeliveryOS: Open Hello"
command renders a React + Tailwind webview as a CSP-clean smoke
test. No user-facing features beyond that.

### Install (v0.0.1)

```sh
curl -fsSL https://github.com/saifgithub/DeliveryOS/releases/latest/download/install.sh | sh
```

Or download the `.vsix` and install manually with `<editor>
--install-extension deliveryos-0.0.1.vsix --force`.

### Verify (v0.0.1)

```sh
shasum -a 256 -c SHA256SUMS.txt
```
