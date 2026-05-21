# ADR-0001: Ship DeliveryOS as a sideloadable VSIX extension, not a VS Code fork

**Status:** Accepted
**Date:** 2026-05-21
**Deciders:** Saiful

## Context

DeliveryOS is a meta-harness: an SDLC memory and orchestration layer that sits above coding harnesses (Claude Code, Codex, Cursor agent, etc.). It needs a home inside the developer's working environment so that briefs, results, verification, and memory live where the code lives.

Three delivery options were considered:

1. **Standalone app.** A separate Electron or web app, with file-based handoff to whatever editor the user runs. Simple to start, but creates a two-context workflow (the user constantly switches between DeliveryOS and their editor) and means rebuilding an editor, terminal, file tree, and git integration that already exist.
2. **Fork of VS Code.** Clone Code-OSS, rebrand, layer DeliveryOS in. This is the "Antigravity / Cursor / Windsurf" pattern. The bare fork is fast (days to a usable build), but a distributable fork pulls in code-signing, auto-update, a marketplace decision, multi-platform packaging, and ongoing maintenance of a forked codebase. It also commits DeliveryOS to being its own editor, which competes with Cursor and Antigravity rather than sitting above them, and breaks the harness-neutrality thesis.
3. **VS Code extension, distributed as a sideloadable `.vsix`.** DeliveryOS is the extension. Native VS Code surfaces (sidebar, commands, terminal integration) plus React webview panels for the rich UI. Distributed as a `.vsix` on GitHub Releases, installed via `code --install-extension` or an install script.

## Decision

Ship DeliveryOS as a **VS Code extension packaged as a sideloadable `.vsix` file**.

The extension API is shared by VS Code, Cursor, Windsurf, Antigravity, and VSCodium. A single `.vsix` runs in all five, which is the widest possible reach for a proof-of-work prototype and significantly raises the chance of being noticed by the developers and AI companies who use those editors.

## Alternatives Considered

- **Standalone app:** rejected. Two-context workflow, and rebuilds infrastructure that the editor already provides.
- **VS Code fork:** rejected for the first build. Even though a bare fork is fast, a *distributable* fork costs weeks of infrastructure (signing, auto-update, packaging, marketplace) that is unrelated to the product thesis. It also turns DeliveryOS into an editor, competing one layer below where it should sit, and locks it to one editor family. Reconsider only if the extension surface proves limiting and there is real user traction.
- **Marketplace publishing (VS Code Marketplace / OpenVSX) instead of sideloading:** deferred. Microsoft's marketplace is restricted to first-party VS Code. OpenVSX is viable and gives auto-update and discoverability, and is the planned fallback. For the prototype, sideloading the `.vsix` directly avoids any marketplace process and keeps iteration fast.

## Consequences

**Easier:**

- One artefact (`.vsix`) reaches five editors.
- No fork to maintain, no installers, no platform code-signing certificates, no auto-update infrastructure for the prototype.
- DeliveryOS lives inside the user's existing editor next to their existing coding harness, preserving harness-neutrality.
- The rich UI (React in webviews) is fully under DeliveryOS's visual control.
- Terminal integration (launching Claude Code or Codex with the brief reference) is available through standard extension APIs.

**Harder / accepted costs:**

- Sideloaded `.vsix` files do not auto-update. Mitigation: an in-extension version check against the GitHub Releases API that notifies the user when a new build is available.
- Recent VS Code builds are tightening extension signature verification. Sideloading behaviour must be tested on each target editor (VS Code, Cursor, Windsurf, Antigravity, VSCodium) early in Phase 0.
- DeliveryOS cannot customise the editor chrome outside its own panels. Acceptable: the rich experience lives in webviews, which are fully controllable.
- No marketplace discoverability for the prototype. Acceptable: distribution is by direct link during the proof-of-work phase.

## Related

- PRD section 25.1 (Delivery Mechanism)
- `docs/BUILD-PLAN.md` Phase 0
- `docs/architecture/harness-profiles.md`
