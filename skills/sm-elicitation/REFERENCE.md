# sm-elicitation Reference — formats & persistence

Companion to [SKILL.md](SKILL.md). The memory body-file formats below must be **byte-faithful**:
the DeliveryOS memory store rebuilds `memory.sqlite` from these files, and any file whose
frontmatter is malformed (missing `id` / `type` / `payload_json`, or a `payload_json` that isn't
valid one-line JSON) is **silently skipped** on rebuild.

Source of truth for these shapes (do not guess — these mirror the extension):
- Frontmatter writer/parser: `extension/src/memory/markdown.ts` (`renderFrontmatter` / `parseBodyFile`)
- ID format: `extension/src/memory/ids.ts` (`<type>-<8 hex>`)
- Payloads: `contracts/src/memory.ts` (`IntentPayload`, `DesignPayload`)
- Link vocabulary: `contracts/src/links.ts` (`LINK_KINDS`)
- Rebuild path: `extension/src/memory/MemoryStore.ts` (`rebuildFromMarkdown`) via command `deliveryos.memory.regenerate`

---

## Where things go

| Output | DeliveryOS project | Standalone (no `.deliveryos/`) |
|---|---|---|
| Transcript artifact | `.deliveryos/elicitation/<slug>.md` | `docs/elicitation/<slug>.md` |
| Spec (intent entry) | `.deliveryos/memory/intent/intent-<8hex>.md` | — (artifact only) |
| Each decision (design entry) | `.deliveryos/memory/design/design-<8hex>.md` | — (artifact only) |
| Links | append triples to `.deliveryos/memory/LINKS.md` | — |

The artifact is always written. Memory body files are written only when `.deliveryos/` exists.

---

## IDs and timestamps

- **Entry id**: `<type>-<8 lowercase hex>` — e.g. `intent-1a2b3c4d`, `design-9f8e7d6c`. The 8 hex
  chars are random; before writing, `ls` the target type dir and pick a value not already used.
  The filename is `<id>.md`.
- **Frontmatter `created_at` / `updated_at`**: ISO 8601 with milliseconds, e.g.
  `2026-06-20T14:30:00.000Z`. Use the same value for both on first write.
- **Epoch fields inside `payload_json`** (e.g. `capturedAt`): integer milliseconds since epoch
  (a number, not a string).

---

## Frontmatter contract (every body file)

```
---
id: <type>-<8hex>
type: <type>
title: "<title, with any internal double-quote escaped as \">"
created_at: <ISO-8601 ms>
updated_at: <ISO-8601 ms>
payload_json: <one-line compact JSON — NO newlines>
---

<prose body — human-readable; the frontmatter above is the machine-readable mirror>
```

Rules:
- The file must begin with `---` on its own first line and the header must close with a line that is
  exactly `---`.
- `payload_json` is the full typed payload on a **single line** (compact `JSON.stringify`, no pretty
  printing). This is what makes the markdown lossless.
- `title` is wrapped in double quotes; escape any `"` inside it as `\"`.

---

## Intent entry — the specification

Type `intent`. Payload is `IntentPayload`. **Required** payload keys: `rawIdea` (`{text, capturedAt}`)
and `discovery` (set to `null`). Elicitation fills the optional spec keys.

`payload_json` shape (single line when written):

```json
{
  "rawIdea": { "text": "<the raw idea / topic framing the user started from>", "capturedAt": 1718894400000 },
  "discovery": null,
  "problemStatement": "<one crisp paragraph>",
  "userGoals": ["<goal>", "..."],
  "nonGoals": ["<explicit out-of-scope>", "..."],
  "successCriteria": ["<verifiable criterion>", "..."]
}
```

Example file `.deliveryos/memory/intent/intent-1a2b3c4d.md`:

```
---
id: intent-1a2b3c4d
type: intent
title: "Payments reconciliation — elicitation"
created_at: 2026-06-20T14:30:00.000Z
updated_at: 2026-06-20T14:30:00.000Z
payload_json: {"rawIdea":{"text":"We need to stop chasing mismatched settlements by hand","capturedAt":1718894400000},"discovery":null,"problemStatement":"Finance reconciles processor settlements to the ledger manually each morning; mismatches are found late and cost ~6 hrs/week.","userGoals":["Auto-match settlement lines to ledger entries","Flag only true exceptions for human review"],"nonGoals":["Replacing the ledger system","Real-time matching"],"successCriteria":["95%+ lines auto-matched","Exception queue cleared before 10:00 daily"]}
---

# Payments reconciliation — specification

**Problem.** Finance reconciles processor settlements to the ledger manually each morning…

## Goals
- Auto-match settlement lines to ledger entries
- Flag only true exceptions for human review

## Non-goals
- Replacing the ledger system
- Real-time matching

## Success criteria
- 95%+ lines auto-matched
- Exception queue cleared before 10:00 daily
```

One intent entry per elicitation session. If the project already has a primary intent, this is a
**separate** elicitation-scoped intent — do not overwrite the existing one.

---

## Design entry — one per decision

Type `design`. Payload is `DesignPayload`. **Required** key: `decision`. `area` is one of
`architecture | data-model | api | security | ux | other`. Capture `rejectedOptions` — the *why not*
is the most valuable part.

`payload_json` shape (single line when written):

```json
{
  "area": "architecture",
  "decision": "<the choice made>",
  "rationale": "<why>",
  "rejectedOptions": ["<option not taken> — <why not>", "..."],
  "tradeoffs": "<what we accept by choosing this>"
}
```

Example file `.deliveryos/memory/design/design-9f8e7d6c.md`:

```
---
id: design-9f8e7d6c
type: design
title: "Reconcile nightly in batch, not real-time"
created_at: 2026-06-20T14:32:00.000Z
updated_at: 2026-06-20T14:32:00.000Z
payload_json: {"area":"architecture","decision":"Run reconciliation as a nightly batch keyed off the processor settlement file.","rationale":"Settlement files only land once daily; real-time adds cost with no business value.","rejectedOptions":["Real-time matching — no upstream real-time feed exists","Hourly polling — wastes compute, files only arrive nightly"],"tradeoffs":"Exceptions surface next morning, not intraday — acceptable per finance."}
---

# Decision: reconcile nightly in batch

**Decision.** Run reconciliation as a nightly batch keyed off the processor settlement file.

**Rationale.** Settlement files only land once daily…

**Rejected.** Real-time matching (no real-time feed); hourly polling (wasteful).

**Tradeoff.** Exceptions surface next morning, not intraday — finance accepts this.
```

---

## Links — wire each decision to the spec

Append one triple per decision to `.deliveryos/memory/LINKS.md`. Format is `from_id  kind  to_id`
(whitespace-separated). Use the `derives-from` kind so each decision derives from the intent:

```
design-9f8e7d6c  derives-from  intent-1a2b3c4d
design-7c6b5a49  derives-from  intent-1a2b3c4d
```

Notes:
- `LINKS.md` is a generated projection. If it doesn't exist yet, create it and add a one-line header
  comment plus the triples — the parser ignores any line whose second token isn't a known link kind,
  so headers and prose are safe to leave in.
- On the next rebuild, only triples whose **both** endpoints exist as body files are kept; dangling
  links are dropped. Then `LINKS.md` is regenerated canonically from the DB.
- Valid kinds: `derives-from`, `verifies`, `evaluates`, `produced`, `supersedes`, `includes`,
  `reworks`, `has-test-spec`, `derived-from-verification`, `releases`, `addresses`. For elicitation,
  use `derives-from`.

---

## Artifact transcript template

`.deliveryos/elicitation/<slug>.md` (or `docs/elicitation/<slug>.md` standalone). Human-facing,
git-committable, no extension required:

```markdown
# Elicitation — <Topic> (<slug>)

_Date: <YYYY-MM-DD> · Session: /sm-elicitation_

## Specification
**Problem.** <one paragraph>
**Goals.** <list>
**Non-goals.** <list>
**Success criteria.** <list>
**Constraints.** <list>
**Assumptions.** <list>
**Risks / unknowns.** <list>

## Question log
| # | Topic | Question | Recommended | User's answer |
|---|---|---|---|---|
| 1 | Problem | … | … | … |
| 2 | Scope | … | … | … |

## Decisions
| # | Area | Decision | Rationale | Rejected | Tradeoff |
|---|---|---|---|---|---|
| D1 | architecture | … | … | … | … |

## Open questions / deferred
- <branch deferred and why>

## Memory written
- intent: `intent-1a2b3c4d`
- design: `design-9f8e7d6c`, `design-7c6b5a49`
- Run **DeliveryOS: Rebuild Memory Index from Markdown** to ingest into `memory.sqlite`.
```

---

## Landing it in `memory.sqlite`

Writing the body files does **not** mutate `memory.sqlite`. To ingest:

1. In the editor with the DeliveryOS extension active, open the Command Palette.
2. Run **"DeliveryOS: Rebuild Memory Index from Markdown"** (`deliveryos.memory.regenerate`).
3. Confirm the modal. The store wipes and rebuilds the index from all `<type>/*.md` body files plus
   `LINKS.md`, then regenerates `INDEX.md` / `LINKS.md`.

Result line reports entry + link counts. Until then the new entries are readable in the markdown
(greppable) but absent from the SQLite index. This is by design: the markdown is the durable source
of truth; the SQLite file is a disposable query/graph engine.
