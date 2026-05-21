# Memory Layers

DeliveryOS maintains a typed memory graph. The memory graph is the product. Every other artefact (PRDs, requirements, briefs, results) derives from or feeds the graph.

## The nine canonical memory types

The MVP uses a **polymorphic single-table** storage strategy — one `memory_entries` row per memory of any type, discriminated by the `type` column and a typed `payload` JSON blob. The 9-type discriminated union lives in `contracts/src/memory.ts` and is owned by the CHUNK-03 spec; every consumer chunk imports the union and the `MEMORY_TYPES` tuple, never redeclares them.

### 1. Intent Memory
What the user originally wanted.

Stores: raw idea, problem statement, user goals, non-goals, success criteria. **The Discovery Record is folded into the Intent payload** (`payload.discovery: DiscoveryRecord | null` carrying the discovery answers, interview transcript, and trigger-question outcomes) — there is no separate `discovery` memory type. This keeps the type count down and matches the natural one-to-one relationship: one project, one intent, one discovery interview.

Lifetime: created once per project, immutable except by explicit user edit.

### 2. Requirement Memory
What the system agreed to build.

Stores: requirements (typed by category), assumptions, constraints, priorities, verification criteria. **The PRD itself is folded into Requirement Memory** with `payload.kind === 'prd'` — the PRD is a `Requirement` row that acts as parent of all decomposed requirement rows (which carry `payload.kind === 'requirement'`). There is no separate `prd` memory type.

Lifetime: created during requirement analysis, updated when scope is renegotiated.

### 3. Design Memory
How the system should be built.

Stores: architecture decisions, data model, API design, security design, UX flows, tradeoffs, rejected options.

Lifetime: created during solution design, updated by Memory Update stage when the harness made decisions that should be preserved. Updates are append-only — new entries linked via `derived-from-verification` rather than in-place edits, keeping the audit chain clean.

### 4. Codebase Memory
What already exists.

Stores: folder structure, key files, components, database schema, APIs, coding conventions, test commands, known defects.

Lifetime: refreshed at the start of each Execution Brief generation. Can be hand-curated or auto-extracted.

### 5. Execution Memory
What the coding harness was asked to do.

Stores: execution brief, target harness, harness profile, timestamp, context package, expected outputs.

Lifetime: append-only. Immutable once the brief is handed off.

### 6. Result Memory
What actually happened.

Stores: harness output, changed files (canonical "files actually changed" list comes from `git diff --name-only HEAD`, not the harness self-report), tests added/run, test results, errors, deviations from the brief, reviewer notes. Payload includes an optional **`diffOutcome`** field attached by CHUNK-13's Allowed/Forbidden diff engine — verdict (`pass | fail`), per-file classification, and matched globs. Other chunks read `result.payload.diffOutcome`; there is no separate field at the row level.

Lifetime: append-only, linked to a single Execution Memory entry via the `produced` link kind.

### 7. Verification Memory
Whether the work passed.

Stores: test result, failed criteria, defects, rework notes, approval decision. Payload includes a **`bypasses: BypassRecord[]`** array — each `BypassRecord` carries the bypassed gate name, the user-provided justification (≥10 characters required), and a timestamp. Bypasses live inside Verification rather than as their own memory type to keep the type count down.

Lifetime: one verification per Result, but a Result can have multiple Verifications if rework cycles happen.

### 8. Release Memory
What was released and why.

Stores: release evidence package, included requirements, known limitations, deferred items, final sign-off.

Lifetime: created at release time, immutable.

### 9. Test Specification Memory
What proves the requirement is met.

Stores: verification criteria, test cases (markdown bullets with inline `Given:` / `When:` / `Then:` labels in MVP, revisited at CHUNK-13 start if the diff parser needs structured atoms), happy-path and edge-case coverage, expected harness behaviour.

Lifetime: created during the Test Designer specialist run (CHUNK-08) and linked to its parent Requirement. Test Specification was declared a first-class 9th canonical memory type rather than a subtype of Verification Memory; it folds into the same polymorphic table at zero cost.

## Canonical link kinds

Memory entries are connected by a small fixed set of link kinds (defined in `contracts/src/links.ts`, owned by the CHUNK-03 spec). The MVP set covers requirement decomposition, brief versioning, result production, verification edges, release inclusion, codebase references, rework cycles, and post-verification memory updates. See `docs/planning/chunks/README.md` § "Cross-chunk contracts" for the full list and per-edge ownership table. No chunk invents a link kind outside this set.

## Relationships

```text
Intent ─→ Requirement ─→ Design ─→ Execution ─→ Result ─→ Verification ─→ Release
                              ↑
                        Codebase ─┘
```

Every Release Memory entry should be traceable back to an Intent Memory entry through this chain. The traceability is the audit story DeliveryOS sells.

## Storage

MVP: SQLite tables, one per memory type, with markdown documents on disk for the longer-form content. Each entry has a UUID, a created_at, an updated_at, and a links field pointing to related entries.

Later: a graph backend (Neo4j or similar) if the relationship queries get complex.

## MCP exposure (future)

In a later release, the memory graph can be exposed as an MCP server. Claude Code (and any other MCP-capable harness) could then query: "What are the approved requirements for this feature?", "What design decisions apply?", "What must I not change?". This removes the need to bake everything into the Execution Brief upfront.

This is the upside path. It is not required for MVP. File-based handoff via `/deliveryos-handoff/` is enough to prove the value.
