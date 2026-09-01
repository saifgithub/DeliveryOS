<!-- roster entry — binds a role to a spec + addressing. Architect-owned. -->
# coder.features

```
role: coder
spec: feature panels + their contracts (everything not memory or harness)
kind: code
owns:
  contracts/src/**
  extension/src/webview/**
  extension/src/serializers/**
  extension/src/commands/**
  extension/src/diff/**
  extension/src/brief/**
  extension/src/discovery/**
  extension/src/reverse/**
  extension/src/release/**
  extension/src/requirements/**
  extension/src/result/**
  extension/src/verification/**
  extension/src/tree/**
  extension/src/ai/**
  extension/src/iteration/**
  extension/src/prd/**
  extension/src/specialists/**
  webview/src/panels/**
  webview/src/shared/**
  extension/test/*.test.ts
  webview/src/panels/**/*.test.ts
schema_owner: false
wip_cap: 1
auditor: auditor.deliveryos
live_handle:                 # blank until launched; the launch_template returns it
commit_tag: DOS:coder.features
worktree: .claude/worktrees/coder.features-<ITEM>
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

**`owns:` note.** `extension/test/*.test.ts` is written out rather than described because
`check_bindings.sh` computes set disjointness over these literal strings; it is *broad* — it claims
every extension test file, including `memory*.test.ts` which `coder.memory` also needs. That overlap
is real and is the reason those two instances cannot run concurrently today, which is what
`wip_cap: 1` on both encodes. Splitting the test glob per subsystem is the fix; it is a refactor of
the test layout, not a roster edit.

**Honest granularity note — read before dispatching a second concurrent lane here.** This instance is
NOT further shardable today, and should not be split into one-per-panel instances despite the
`webview/src/panels/**` directory looking like it invites that. Every panel feature (bug, deployment,
uat, prd-editor, requirements, test-designer, …) touches the same three hot files on the way in:
`extension/src/webview/messenger.ts` (every panel registers its message handlers in this single
2,300+ line file), `contracts/src/index.ts` (every contract module is re-exported through this one
barrel), and `extension/src/extension.ts` (every panel command is registered here). Two lanes both
under `coder.features` running concurrently would collide on all three. Run this instance **one lane
at a time** — the `wip_cap: 1` above is load-bearing, not a placeholder — until `messenger.ts` is
decomposed into a per-panel registration pattern (a real refactor, not attempted here). This is the
honest answer the manifest's own stand-up checklist asks for, not the most impressive-looking roster.
