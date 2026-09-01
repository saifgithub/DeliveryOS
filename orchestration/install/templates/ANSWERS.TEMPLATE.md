<!--
ANSWERS.TEMPLATE.md — shape for install/ANSWERS.md, the stand-up record. PORTABLE CORE: copy the
template; the EMITTED file is TIER C and never travels to the next project — it is this project's
stand-up, not a stand-up procedure.
Write the status rows on the FIRST question, not at the end: a stand-up interrupted halfway is
resumed by reading this file, and a file written at the end does not exist when it is needed.
EMITS-TO: install/ANSWERS.md
-->

# Stand-up record — <UNBOUND>

Started <UNBOUND> · Interview: `install/INSTALL_INTERVIEW.md` · Verdict:
`sh install/check_bindings.sh`

## States

`open` · `claimed` · `resolved` · `deferred` (with the condition that will decide it) ·
`ruled out` (the project's shape makes it moot — there is no answer coming, ever)

`ruled out` is not a tidier `deferred`. Using it correctly is what keeps the unfinished list short
enough to be read.

## Questions

| # | Phase | Question | State | Answer / condition |
|---|---|---|---|---|
| | | | | |

## Phase 0 — what was scrubbed

The inherited tier-B and tier-C files removed, and the command that removed them. Deleted **out of**
the tree, never relocated inside it.

<UNBOUND>

## Deferred — with conditions

Each one names what will decide it. A deferred question with no condition is an open question that
has been made to look closed.

<UNBOUND>

## Known gaps at stand-up

Things that are true and not good: no acceptance runner, a single model family across the fleet, a
domain that could not be sharded, a delivery surface with no test. Write them here rather than
leaving them to be discovered — every one of them is something the protocol will otherwise appear
to be handling.

<UNBOUND>

## Verdict

`sh install/check_bindings.sh` → exit <UNBOUND>, on <UNBOUND> (date).
The exit code is the claim. A transcript saying it passed is not.
