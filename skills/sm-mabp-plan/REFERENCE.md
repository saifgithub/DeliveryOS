# sm-mabp-plan Reference

Companion to [SKILL.md](SKILL.md).

---

## § Reading requirements from DeliveryOS SQLite

When `requirements.json` is absent, read from `.deliveryos/memory.sqlite`:

```bash
# List all requirement entries
sqlite3 .deliveryos/memory.sqlite \
  "SELECT id, title FROM memory_entries WHERE type='requirement' ORDER BY created_at;"

# Read a single requirement's full payload
sqlite3 .deliveryos/memory.sqlite \
  "SELECT payload_json FROM memory_entries WHERE id='requirement-xxxx';"
```

The `payload_json` field contains the full requirement object (description, category, priority, sourcePrdSection, decomposed sub-requirements if any).

---

## § Chunk spec template

```markdown
# CHUNK-NN — <Title>

**Phase:** B — Build
**Depends on:** CHUNK-XX, CHUNK-YY (or "none" for chunk 01)
**Builder start tier:** Economy / Standard / Premium
**Escalation ladder:** <tier> → <tier> → Premium → BLOCKER

---

## Objective

<2–4 sentences: what this chunk delivers>

---

## Requirements covered

- REQ-NNN: <title>
- ...

---

## Pre-resolved design decisions

<Key decisions the architect makes so the builder doesn't have to. This is the most important section.>

<For CHUNK-01: include the complete DB schema in Prisma format.>
<For other chunks: include API route shapes, data structures, key file paths.>

---

## Done criteria

1. <Verifiable with a command or observable behaviour>
2. ...
(max 10 items)

---

## Pre-fire audit

```bash
# N. <What this checks>
<command>
# Expected: <what output means "ok">
```
(5–8 checks)

---

## Allowed changes

- <file/dir the builder may touch>

Builder must NOT modify:
- <file/dir that is frozen>

---

## Notes for builder

<Gotchas, external data to read, assumptions to flag.>
```

---

## § Tier selection guide

| Chunk type | Start tier |
|---|---|
| Scaffold, config, migrations only (no design decisions) | Economy |
| Typical feature implementation | Standard |
| File parsing, third-party integrations, complex state management | Premium |
| BLOCKER resolution | Premium |

---

## § BUILD_STATUS.md scaffold

```markdown
# BUILD_STATUS.md

**Project:** <name>
**Phase B started:** <date>
**Chunk specs:** docs/planning/READY.md
**Architect track:** run `/sm-mabp-run` from project root

---

## Chunk ledger

| # | Slug | Status | Builder report | QA report | Verdict | Notes |
|---|---|---|---|---|---|---|
| 01 | <slug> | pending | — | — | — | — |
...

---

## Decisions + structural debt

<!-- Architect-only. -->

---

## Cohesion checks

<!-- Log every 4–5 chunks. -->

---

## Open assumptions

| Assumption | Needed by | Owner | Status |
|---|---|---|---|
| <text> | CHUNK-NN | PMO / Tech | ❓ Open |
```

---

## § CLAUDE.md minimum sections

```markdown
# <Project Name> — CLAUDE.md

<1–2 sentence purpose statement>

## Tech stack

| Layer | Technology |
|---|---|
...

## Key constraints

- <max 5 bullets — the constraints that most affect implementation decisions>

## Roles

| Role | Enum | Can do |
|---|---|---|
...

## DB tables (authoritative schema in `prisma/schema.prisma`)

- `TableName` — key fields

## Development commands

\`\`\`bash
npm run dev
npm test
npx prisma migrate dev
\`\`\`

## MABP Phase B

Chunk specs: docs/planning/chunks/
Build status: docs/build/BUILD_STATUS.md
Run next chunk: /sm-mabp-run
```

---

## § .claude/session-config.yml template

```yaml
project_prefix: "<PREFIX>"   # e.g. "OKR" → sessions OKR:R1, OKR:R2

worktree_pattern: "agent-*"
worktree_dir: .claude/worktrees

tracks:
  R:
    label: "Development"
    handover_path: docs/build/BUILD_STATUS.md
    history_dir: docs/build/history/
    sanity_checks:
      - name: "clean working tree"
        cmd: "git status --porcelain"
      - name: "scaffold state"
        cmd: "ls package.json prisma/schema.prisma 2>&1"
      - name: "tests"
        cmd: "npm test --if-present 2>&1 | tail -5 || echo 'not yet wired'"
    bug_list:
      enabled: false
```
