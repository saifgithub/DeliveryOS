# Build manifest — CHUNK-03 memory store (Gate 2 dry run)

> MHBP Gate 2 input. Pointers to every file used/touched building CHUNK-03. Dry run for
> `docs/MHBP_LAB.md` verification — NOT a pre-registered experiment.

## Spec consumed (definition of "done")

- docs/planning/chunks/chunk-03-memory-store.md

## Source written

- extension/src/memory/MemoryStore.ts
- extension/src/memory/schema.ts
- extension/src/memory/migrations.ts
- extension/src/memory/types.ts
- extension/src/memory/paths.ts
- extension/src/memory/markdown.ts
- extension/src/memory/sqlJsHost.ts
- contracts/src/memory.ts
- contracts/src/links.ts

## Tests written

- extension/test/memory.test.ts
- extension/test/memoryUpdate.test.ts
- extension/test/memoryGraphWalker.test.ts

## Delivery surfaces

- MemoryStore singleton owned by extension/src/extension.ts (CRUD + link/walk)
- Persisted artifact: `<workspace>/.deliveryos/` sql.js DB + markdown tree (write→reload round-trip)
- `.deliveryos/README.md` template generated on first project creation
