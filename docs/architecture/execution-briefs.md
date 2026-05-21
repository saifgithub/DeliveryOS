# Execution Briefs

The Execution Brief is the core handoff artefact in DeliveryOS. It replaces the v0.1 concept of "implementation prompt".

## Why "Brief" and not "Prompt"

A prompt sounds casual. A brief sounds like controlled delivery. The Execution Brief is a structured object that an external coding harness (Claude Code, Codex, Cursor, etc.) reads and executes against.

## Schema

```md
# DeliveryOS Execution Brief

## 1. Objective
Describe exactly what the AI coding harness must accomplish.

## 2. Approved Requirement
Link to the requirement and include the approved requirement text.

## 3. Business Intent
Explain why this requirement exists.

## 4. Approved Design Context
Include relevant architecture, API, data model, UX and security notes.

## 5. Existing Codebase Context
Include relevant files, folder structure, conventions and known constraints.

## 6. Test-First Specification
List verification criteria and tests that must be satisfied.

## 7. Allowed Changes
Define what the coding harness may change.

## 8. Forbidden Changes
Define what it must not touch.

## 9. Expected Output
Ask for: summary of changes, files changed, tests added or updated, tests run, risks, unresolved questions.

## 10. Completion Criteria
Define what must be true before the work is considered complete.
```

## Lifecycle

1. The Execution Brief is generated after the Test Specification stage.
2. It is rendered through a Harness Profile (see `harness-profiles.md`).
3. It is written to `/deliveryos-handoff/current-execution-brief.md` in the user's repo (file-based mode) or copied to clipboard (manual mode).
4. The external coding harness consumes it.
5. The harness output is captured back into DeliveryOS via Result Capture.
6. The brief is preserved as Execution Memory for traceability.

## Allowed and Forbidden Changes

These two sections are load-bearing. They define the contract between DeliveryOS and the external harness. After Result Capture, DeliveryOS should compute a diff and flag any change that touched a Forbidden path or skipped an Allowed file.

## Versioning

Each brief is immutable once generated. If the requirement changes, a new brief is generated and linked to the previous one. This produces an auditable chain.
