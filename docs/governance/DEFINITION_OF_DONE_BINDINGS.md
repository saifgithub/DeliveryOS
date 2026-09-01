<!--
DEFINITION_OF_DONE_BINDINGS.md — DeliveryOS's answers to ../../orchestration/DEFINITION_OF_DONE.md's
  portable questions, per that file's own rule: "the core rows may be dispositioned but never
  removed... put project-specific rows here, never in the portable file."
  Lives with governance docs, not inside orchestration/, per PORTABLE_MANIFEST.md's own instruction.
-->

# Definition-of-Done bindings for DeliveryOS

Answers `orchestration/DEFINITION_OF_DONE.md`'s core rows for this project. An item-level submission
into `orchestration/audit/cr/` carries this table filled in, per that file's "Scope: item-level only"
rule.

## Which item kinds render this at all

Per `orchestration/DEFINITION_OF_DONE.md` → *Which items render it at all*, and matching each
register's `<DOD_APPLIES>` in `orchestration/dispatch/BINDINGS.md`:

| `<ITEM_KIND>` | Renders the DoD? | Why |
|---|---|---|
| planned change (`backlog`, `B-NNN`) | **yes** | It can touch docs, a register row and a user-facing surface, so every row below is genuinely answerable |
| defect (`bugs`, `bNNN`) | **no** | Its scope is "this specific thing was wrong and now is not". Requiring Docs, Register and band-justification on a one-line fix produces a column of `N/A`s, which is how a reviewer learns to wave `N/A`s through. A defect still carries the chunk evidence list, is still audited, and is still gated |

## Section A — Verification

| Row | DeliveryOS disposition |
|---|---|
| Scope | Names the `B-NNN` (BACKLOG.md) or bug id (bugs.json) spec; states what was in/out against that spec's stated scope. |
| Tests | This project's **own** suite: `npm run gate` (no `--item`) green, or the narrower `npm run test --workspace=deliveryos` / `npm run typecheck --workspace=@deliveryos/webview` for the changed surface — command + observed output. |
| Acceptance gate | `docs/build/gate/item-<ITEM>.json` as the runner wrote it: its `passed`, its `gitSha`, and the per-check `checks[]`. **Read the record; do not restate it.** If its `gitSha` is not the submitted revision, the row is unanswered. The checks live in `orchestration/audit/acceptance/<ITEM>/`, authored by the auditor from the spec before it read the implementation, and outside every coder instance's `owns:` set. Where a lane is not `GATE: machine`, disposition `N/A — this lane is gated by <its GATE value>`. |
| Manual verification | The `.vsix` loaded in the VS Code Extension Development Host, the changed feature exercised through its real panel — what was done, what was observed. |
| Scope discipline | Confirmed against the actual diff (`git diff`/`git show`), not from memory. |
| Contract integrity | `npm run build:contracts && npm run typecheck --workspace=deliveryos` re-run and green — `extension` consumes `contracts/dist`, not `contracts/src`, so this is the real seam a change can silently break. |

## Section B — Deliverables

| Row | DeliveryOS disposition |
|---|---|
| Docs | The doc(s) updated for any changed behaviour (e.g. `docs/architecture/*`, a chunk spec), or a one-line reason none needed it. |
| Commit tag | `(DOS:<instance-id> <ITEM>)` as it appears on the commit(s). |
| Register | The `docs/pm/BACKLOG.md` row or `docs/build/bugs.json` entry as it now reads. |
| Model / effort / budget | The lane's `BAND:` (Economy/Standard/Premium, `orchestration/ROLES.md`), the cap it ran under, and a one-line reason. `BAND:` is written by the Architect at dispatch from the roster, so this row is answerable from an artifact the submitting instance did not author. This project has no per-band cost table; prose is sufficient until dispatch volume justifies one. |

## Notes

- This project currently has **no test suite for the webview surface** — `npm run typecheck` is the
  only automated gate for `webview/src/**`. An item touching only webview code dispositions the
  "Tests" row against typecheck alone; that is visible, not hidden — do not manufacture a false pass.
- **Tests and Acceptance gate are different claims and must not be answered by the same command.**
  Tests is this project's own suite, written by whoever built the thing. Acceptance gate is a
  non-agentic runner over checks the builder did not write and cannot edit. `npm run gate` alone
  answers the first; only `npm run gate -- --item <ITEM>`, over a populated
  `orchestration/audit/acceptance/<ITEM>/`, answers the second.
- No content corpus, no mobile/device surface, no deployed host — the corresponding rows in
  `orchestration/dispatch/BINDINGS.md` are already dispositioned `N/A` with reasons; this table
  inherits those, it does not repeat them.
