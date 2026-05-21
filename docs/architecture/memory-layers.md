# Memory Layers

DeliveryOS maintains a typed memory graph. The memory graph is the product. Every other artefact (PRDs, requirements, briefs, results) derives from or feeds the graph.

## The eight memory types

### 1. Intent Memory
What the user originally wanted.

Stores: raw idea, discovery answers, problem statement, user goals, non-goals, success criteria.

Lifetime: created once per project, immutable except by explicit user edit.

### 2. Requirement Memory
What the system agreed to build.

Stores: requirements (typed by category), assumptions, constraints, priorities, verification criteria.

Lifetime: created during requirement analysis, updated when scope is renegotiated.

### 3. Design Memory
How the system should be built.

Stores: architecture decisions, data model, API design, security design, UX flows, tradeoffs, rejected options.

Lifetime: created during solution design, updated by Memory Update stage when the harness made decisions that should be preserved.

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

Stores: harness output, changed files, tests added/run, test results, errors, deviations from the brief, reviewer notes.

Lifetime: append-only, linked to a single Execution Memory entry.

### 7. Verification Memory
Whether the work passed.

Stores: test result, failed criteria, defects, rework notes, approval decision.

Lifetime: one verification per Result, but a Result can have multiple Verifications if rework cycles happen.

### 8. Release Memory
What was released and why.

Stores: release evidence package, included requirements, known limitations, deferred items, final sign-off.

Lifetime: created at release time, immutable.

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
