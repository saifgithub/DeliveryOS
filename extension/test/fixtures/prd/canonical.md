# DeliveryOS

## Problem

AI coding harnesses like Claude Code and Codex are powerful but operate without structured
product memory. Teams repeatedly lose context between sessions, can't verify that harness
outputs match intent, and have no traceability from idea to shipped code.

## Users

Primary: solo developers and small engineering teams (2–5 people) who use AI coding harnesses
daily and feel the pain of lost context and unverifiable outputs.

Secondary: engineering managers who need a lightweight audit trail without heavy process overhead.

## Goals

- Capture and persist a structured product intent before any code is written.
- Generate Execution Briefs that constrain AI harnesses to the agreed scope.
- Detect forbidden file changes automatically, before they reach review.
- Provide a full traceability chain from raw idea to verified release evidence.

## Non-Goals

- DeliveryOS is not a replacement for Claude Code, Codex, or any coding harness.
- It does not write code itself.
- It does not provide a marketplace or extension store.
- It is not a project management tool (no Gantt charts, no burn-down).

## Constraints

- Must ship as a sideloadable `.vsix` extension; no Marketplace dependency.
- Must work offline; no mandatory cloud calls.
- Must support VS Code, Cursor, Windsurf, VSCodium, and Antigravity from a single file.
- MVP budget: 14 weeks at 5–10 hours per week.

## Assumptions

- Users already have at least one AI coding harness installed and working.
- The workspace has at least one folder open (workspace trust required).
- Users are comfortable copy-pasting prompts to external AI tools in manual mode.

## Risks

- **Lenient parser brittleness** — AI tools format PRDs inconsistently. Mitigation: alias map + unmatched heading report.
- **Manual-mode fatigue** — copy-paste loop may deter casual users. Mitigation: make the prompts short and the value obvious in the first demo.
- **Sideloaded `.vsix` trust warnings** — some editors surface security warnings. Mitigation: SHA-256 checksums published with every release.

## Success Criteria

- A user can go from raw idea to verified release evidence in under 30 minutes for a well-understood project.
- The Allowed/Forbidden diff catches at least one forbidden file change in the live demo.
- At least three editors install successfully from the same `.vsix` file.
