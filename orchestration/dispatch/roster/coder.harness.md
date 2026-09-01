<!-- roster entry — binds a role to a spec + addressing. Architect-owned. -->
# coder.harness

```
role: coder
spec: execution-harness integration (profiles, handoff, hooks, updater)
kind: code
owns:
  extension/src/profiles/**
  extension/src/handoff/**
  extension/src/hooks/**
  extension/src/updater/**
schema_owner: false
wip_cap: 1
auditor: auditor.deliveryos
live_handle:                 # blank until launched; the launch_template returns it
commit_tag: DOS:coder.harness
worktree: .claude/worktrees/coder.harness-<ITEM>
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

**`owns:` note — this instance owns no test paths, deliberately.** Its tests live in
`extension/test/*.test.ts`, which `coder.features` claims wholesale, and two instances cannot own the
same glob. Until the test layout is split per subsystem, a `coder.harness` lane that needs to add or
change a test is `DEPENDS-ON`-serialized against `coder.features` rather than editing a path it does
not own. Recorded here rather than left as an assumption, because the alternative is a lane that
discovers it mid-build.

**Why this is its own instance:** harness-profile selection, file handoff, the PreToolUse hook, and
the release-updater are integration surfaces that talk to the outside world (other CLI harnesses, the
filesystem, GitHub releases) rather than to DeliveryOS's own webview panels. They are loosely coupled
to the panel-feature work in `coder.features` and rarely touch the hot files — `extension.ts`
registration aside, which should be `DEPENDS-ON`-serialized against any concurrent `coder.features`
lane the same round.
