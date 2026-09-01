<!--
DRAFT.TEMPLATE.md — the shape of a requester's intake draft (DISPATCH_PROTOCOL.md §7).
PORTABLE CORE — copy verbatim. The angle-bracket placeholders are filled ONCE, at stand-up, from
this project's own vocabulary (install/INSTALL_INTERVIEW.md phase 2); the field list itself is not
a project choice. Copy this file to `<DISPATCH_ROOT>/intake/<your-spec>-NNN.md` per draft.

A draft is NOT a register row. It carries no <ITEM> id — the Architect mints that on ACCEPTED.
-->

# <one-line problem statement — what is wrong or what should change>

```
TRIAGE: OPEN
```

`TRIAGE:` is **the Architect's field**. You write `OPEN` once, when you file the draft, and never
touch it again. The Architect moves it to `NEEDS-INFO` (with a `Q1:` block for you), `ACCEPTED`, or
`REJECTED` (with a reason).

## Proposed kind

`<one of this project's bound ITEM_KIND values>` — this is a proposal about **which register** the
item belongs in, not an id and not a decision.

## Severity / priority

`<one value from this project's bound scale>` — and one sentence on why that one, not the next one
up or down.

## Category

`<one value from this project's bound category vocabulary, or "none — this project binds no
categories">`

## Evidence

Everything here must be something a reader can re-check without asking you:

- `file:line` references for anything in the source
- the command run **and its observed output** — not "it fails"
- a reproduction: exact steps, exact input, what you saw, what you expected
- for a measurement or a metric: the number, where it came from, and when

A claim that could have been written without doing the work is not evidence, and a draft made of
those is what `TRIAGE: NEEDS-INFO` exists to bounce.

## Clarification round-trip

The Architect appends `Q1:` here and sets `TRIAGE: NEEDS-INFO`; you append `A1:` below it. The
draft is blocked until you do — answer promptly. Keep every round in this file; a clarification
that lived only in a live channel is not part of the record.
