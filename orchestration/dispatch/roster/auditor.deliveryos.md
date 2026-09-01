<!--
roster entry — the Auditor instance. INSTALL-OWNED: written at stand-up, not maintained by the
Architect (DISPATCH_PROTOCOL.md §2). The Architect may start this instance and hand it work; it may
not edit this file, change this instance's band or family, or repoint any coder's `auditor:` field.
An Architect that decides which auditor exists has decided its own gate.
-->
# auditor.deliveryos

```
role: auditor
spec: all lanes — single-auditor fleet, no domain sharding
kind: code
owns:
  orchestration/audit/**
schema_owner: false
wip_cap: 1
auditor: n/a — this instance IS the gate
live_handle:                 # blank until launched; the launch_template returns it
commit_tag: DOS:auditor.deliveryos
worktree: .claude/worktrees/auditor.deliveryos-<ITEM>
active_lanes: []
impl:
  profile:     agentic-premium
  kind:        process
  band:        premium
  family:      claude
  turn_taking: invoked
  lifetime:    one-shot
  write_mode:  commits
```

**Known weakness, recorded rather than hidden: `family: claude` matches every coder it gates.** The
fleet is not decorrelated. An auditor that fails the way its subject fails catches less than its
presence suggests, and the `machine` gate does not rescue that — the same family authored the
acceptance checks. What would fix it is a second auditor entry on a different model family; this
project has other families available and has never wired one into a lane, which is why the honest
entry today is this one plus this paragraph rather than an aspirational second row.

**`turn_taking: invoked`, not `self-watch`.** Under `lifetime: one-shot`, a poll loop consumes the
whole lifetime. The Architect derives `AWAITING_AUDIT` from the board and starts this instance per
round with the item id; the instance goes straight to its work and never watches. Where a standing
auditor is wanted instead, that is a different entry with `always-on` + `persistent` — a stakeholder
change to this file, not an Architect one.

**Single auditor, `wip_cap: 1`.** Matches the global audit cap in BINDINGS. Nothing about a
single-auditor fleet is calibrated yet; raise it when there is throughput to calibrate against.
