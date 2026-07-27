<!-- roster entry — binds a role to a spec + addressing. Architect-owned. -->
# coder.harness

```
role: coder
spec: execution-harness integration (profiles, handoff, hooks, updater)
kind: code
owns: extension/src/profiles/**, extension/src/handoff/**, extension/src/hooks/**,
      extension/src/updater/**; their extension/test/*.test.ts counterparts
schema_owner: false
wip_cap: 1
auditor: per-lane GATE
live_handle:                 # blank — not yet launched
commit_tag: DOS:coder.harness
worktree: .claude/worktrees/coder.harness-<ITEM>
active_lanes: []
```

**Why this is its own instance:** harness-profile selection, file handoff, the PreToolUse hook, and
the release-updater are integration surfaces that talk to the outside world (other CLI harnesses, the
filesystem, GitHub releases) rather than to DeliveryOS's own webview panels. They are loosely coupled
to the panel-feature work in `coder.features` and rarely touch the hot files — `extension.ts`
registration aside, which should be `DEPENDS-ON`-serialized against any concurrent `coder.features`
lane the same round.
