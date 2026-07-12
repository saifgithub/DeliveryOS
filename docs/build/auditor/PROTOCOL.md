<!--
PROTOCOL.md — the portable lane-handshake kernel. Canonical origin: DeliveryOS. A downstream project
  reusing this kernel keeps this file byte-identical (propagate upstream fixes by plain cp) and resolves
  every project-specific term through its own <PROJECT>_BINDINGS.md beside it — see
  docs/build/auditor/DELIVERYOS_BINDINGS.md for this project's own resolution and as the template for a
  new one. Do not hand-edit this file to localise; that breaks cp-propagation for every downstream
  project. Section skeleton is stable on purpose: bindings files line up against these section numbers.
-->

# Lane handshake protocol (v1)

> **Experimental. Non-normative.** Baseline is the project's own multi-agent build-process doc,
> unchanged by this file. This is the mechanism behind a per-unit build↔audit loop — the surrounding
> process doc owns the role/severity rules; this file owns only the file format and state derivation.

A **lane** hands one unit (a chunk, or a module for a Tester variant) between two roles through two
files — no shared flag, no queue, no server. State is derived by reading both files.

## 1. Roles

Three roles: **architect** orchestrates only, owns the lane index, never writes source or the
auditor's file. **Builder** (sub-agent) writes source + `<UNIT>.builder.md`. **Auditor** (own /
foreign / human tier — see the project's cross-harness doc) verifies independently, writes
`<UNIT>.auditor.md`, never fixes source, never closes on the builder's word. A **Tester** variant is
an auditor scoped to a module instead of a chunk; it writes `<MODULE>.tester.md`.

## 2. Lane files

Per unit, two files under the lane directory (see bindings):

- **`<UNIT>.builder.md`** (builder-owned) — SHA, `depends-on:` (or none), what/why, tests run,
  the builder's own revert-proof QA, and `SUBMITTED: round N`. Writing/bumping that line signals
  `AWAITING_AUDIT`.
- **`<UNIT>.auditor.md`** (auditor-owned) — per-finding verdicts, `AUDITOR: own | foreign | human`,
  and `VERDICT: COMPLETE | AWAITING_FIXES (round N)`.

Each role commits only its own file, by name. Delivery is on `origin`, not local — confirm the push
landed before treating a round as handed over.

## 3. Derived state

- `AWAITING_AUDIT` — builder `SUBMITTED round` > auditor `VERDICT round`, or no auditor file yet.
- `AWAITING_FIXES` — auditor's latest verdict is `AWAITING_FIXES`.
- `COMPLETE` — auditor's latest verdict is `COMPLETE`.

Detect a verdict by the `VERDICT:` keyword, not round-number equality alone (a bounce leaves
`SUBMITTED == VERDICT`, identical to a `COMPLETE`). `watcher.sh state` derives this correctly.

## 4. Chunks vs. modules

| | Part II — chunk | Part III — Tester |
| --- | --- | --- |
| Verifier file | `<UNIT>.auditor.md` | `<MODULE>.tester.md` |
| Verdict | `COMPLETE` / `AWAITING_FIXES` | `ACCEPTED` / `DEFECTS` |
| Depth cap | round v4 → escalate | round v4 → escalate |

Same derived-state read at both granularities. The project's cross-harness doc owns the Tester's
black-box stance and defect routing.

## 5. Guardrails

1. **Strictly serial** — one lane in flight; no concurrency cap needed. (A project may relax this to
   a capped-parallel model instead — see bindings; that changes guardrail 1 only, nothing else here.)
2. **Doubt bounces** — genuinely-in-doubt severity resolves toward MAJOR, not `COMPLETE`, and not
   default-to-human.
3. **Single ledger** — append every verdict to the ledger (see bindings); no second ledger.
4. **Lane index** — the architect keeps it current; advisory only, the two lane files are truth.
5. **Dependencies** — a unit doesn't start until its `depends-on` is `COMPLETE`.
6. **Stall rule** — no movement for an extended active session → escalate, don't wait indefinitely.
7. **Mandatory watcher** — each role runs `watcher.sh` (or equivalent) on its inbound file; no
   watcher means no handoff.
8. **Output compression.** Prose sections (what/why, finding descriptions, hot spots) — fragments
   over full sentences, no filler or hedging, every technical noun/verb kept. Never compress or
   paraphrase: command output in the evidence manifest (verbatim is the anti-fabrication contract),
   file:line citations, or the `SUBMITTED:` / `VERDICT:` / `AUDITOR:` lines — `watcher.sh` matches
   those by exact keyword.

## 6. Tooling

`ARCHITECT_LOOP_PROMPT.md`, `AUDITOR_LOOP_PROMPT.md`, `watcher.sh`, and this project's
`*_BINDINGS.md` — all beside this file. The loop prompts and bindings file are locally authored, not
part of this kernel; a re-copy of this file never clobbers them.
