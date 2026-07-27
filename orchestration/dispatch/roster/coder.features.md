<!-- roster entry — binds a role to a spec + addressing. Architect-owned. -->
# coder.features

```
role: coder
spec: feature panels + their contracts (everything not memory or harness)
kind: code
owns: contracts/src/* (all 20 files); extension/src/{webview,serializers,commands,diff,brief,
      discovery,reverse,release,requirements,result,verification,tree,ai,iteration,prd,
      specialists}/**; webview/src/panels/**; webview/src/shared/**; their test counterparts
schema_owner: false
wip_cap: 1
auditor: per-lane GATE
live_handle:                 # blank — not yet launched
commit_tag: DOS:coder.features
worktree: .claude/worktrees/coder.features-<ITEM>
active_lanes: []
```

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
