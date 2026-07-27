<!-- roster entry — binds a role to a spec + addressing. Architect-owned. -->
# coder.memory

```
role: coder
spec: extension memory store (SQLite-backed)
kind: code
owns: extension/src/memory/** (schema, migrations, store, projection, sql.js host, ids, paths,
      types, update, markdown/readme templating); extension/test/memory*.test.ts,
      extension/test/memoryProjection.test.ts
schema_owner: true          # sole owner of the memory store's SQLite schema + migrations
wip_cap: 1
auditor: per-lane GATE
live_handle:                 # blank — not yet launched
commit_tag: DOS:coder.memory
worktree: .claude/worktrees/coder.memory-<ITEM>
active_lanes: []
```

**Why this is its own instance:** the memory subsystem (`extension/src/memory/**`, 12 files) is the
most genuinely self-contained boundary in this codebase — it has its own schema, its own migration
chain, and is consumed by other subsystems through a narrow store API rather than by direct file
edits. It does not touch the hot files (`messenger.ts`, `contracts/src/index.ts`, `extension.ts`)
except for the handful of registration calls that wire memory commands into the extension — those
edits should be small and, if they land in the same round as a `coder.features` lane, serialized via
`DEPENDS-ON`.
