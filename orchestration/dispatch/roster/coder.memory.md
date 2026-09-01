<!-- roster entry — binds a role to a spec + addressing. Architect-owned. -->
# coder.memory

```
role: coder
spec: extension memory store (SQLite-backed)
kind: code
owns:
  extension/src/memory/**
schema_owner: true          # sole owner of the memory store's SQLite schema + migrations
wip_cap: 1
auditor: auditor.deliveryos
live_handle:                 # blank until launched; the launch_template returns it
commit_tag: DOS:coder.memory
worktree: .claude/worktrees/coder.memory-<ITEM>
active_lanes: []
impl:
  profile:     agentic-premium
  kind:        process
  band:        standard
  family:      claude
  turn_taking: self-watch
  lifetime:    one-shot
  write_mode:  commits
```

**`owns:` note — same test-path constraint as `coder.harness`.** `extension/test/memory*.test.ts` and
`extension/test/memoryProjection.test.ts` fall inside `coder.features`'s `extension/test/*.test.ts`
glob, so this instance does not own them and a lane that must change them is serialized against
`coder.features` via `DEPENDS-ON`. The overlap is a fact about the test layout, not about the
subsystem boundary, and it is the one thing standing between this instance and genuine
run-in-parallel independence.

**Why this is its own instance:** the memory subsystem (`extension/src/memory/**`, 12 files) is the
most genuinely self-contained boundary in this codebase — it has its own schema, its own migration
chain, and is consumed by other subsystems through a narrow store API rather than by direct file
edits. It does not touch the hot files (`messenger.ts`, `contracts/src/index.ts`, `extension.ts`)
except for the handful of registration calls that wire memory commands into the extension — those
edits should be small and, if they land in the same round as a `coder.features` lane, serialized via
`DEPENDS-ON`.
