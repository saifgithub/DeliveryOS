<!--
DEFINITION_OF_DONE_BINDINGS.md — DeliveryOS's answers to ../../orchestration/DEFINITION_OF_DONE.md's
  portable questions, per that file's own rule: "the core rows may be dispositioned but never
  removed... put project-specific rows here, never in the portable file."
  Lives with governance docs, not inside orchestration/, per PORTABLE_MANIFEST.md's own instruction.
-->

# Definition-of-Done bindings for DeliveryOS

Answers `orchestration/DEFINITION_OF_DONE.md`'s core rows for this project. A CR-level submission
into `orchestration/audit/cr/` carries this table filled in, per that file's "Scope: CR-level only"
rule.

## Section A — Verification

| Row | DeliveryOS disposition |
|---|---|
| Scope | Names the `B-XXX` (BACKLOG.md) or bug id (bugs.json) spec; states what was in/out against that spec's stated scope. |
| Tests | `npm run gate` green, or the narrower `npm run test --workspace=deliveryos` / `npm run typecheck --workspace=@deliveryos/webview` for the changed surface — command + observed output. |
| Manual verification | The `.vsix` loaded in the VS Code Extension Development Host, the changed feature exercised through its real panel — what was done, what was observed. |
| Scope discipline | Confirmed against the actual diff (`git diff`/`git show`), not from memory. |
| Contract integrity | `npm run build:contracts && npm run typecheck --workspace=deliveryos` re-run and green — `extension` consumes `contracts/dist`, not `contracts/src`, so this is the real seam a change can silently break. |

## Section B — Deliverables

| Row | DeliveryOS disposition |
|---|---|
| Docs | The doc(s) updated for any changed behaviour (e.g. `docs/architecture/*`, a chunk spec), or a one-line reason none needed it. |
| Commit tag | `(DOS:<instance-id> <ITEM>)` as it appears on the commit(s). |
| Register | The `docs/pm/BACKLOG.md` row or `docs/build/bugs.json` entry as it now reads. |
| Model / effort / budget | Tier, effort level, and a one-line reason — this project has no per-tier cost table; disposition in prose is sufficient until dispatch volume justifies one. |

## Notes

- This project currently has **no test suite for the webview surface** — `npm run typecheck` is the
  only automated gate for `webview/src/**`. A CR touching only webview code dispositions the "Tests"
  row against typecheck alone; that is visible, not hidden — do not manufacture a false pass.
- No content corpus, no mobile/device surface, no deployed host — the corresponding rows in
  `orchestration/dispatch/BINDINGS.md` are already dispositioned `N/A` with reasons; this table
  inherits those, it does not repeat them.
