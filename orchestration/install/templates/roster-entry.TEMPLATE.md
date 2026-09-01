<!--
roster-entry.TEMPLATE.md — shape for dispatch/roster/<instance-id>.md. PORTABLE CORE: copy verbatim,
emit ONE PER INSTANCE. Field list is DISPATCH_PROTOCOL.md §2; every value is local. No sample
answers — an inherited roster is the single worst thing to copy, because every field in it reads as
a real binding to the next agent that opens the file.
EMITS-TO: dispatch/roster/*.md
-->
# <instance-id>

```
role:          <UNBOUND>
spec:          <UNBOUND>
kind:          <UNBOUND>
owns:
  <UNBOUND>
schema_owner:  <UNBOUND>
wip_cap:       <UNBOUND>
auditor:       <UNBOUND>
live_handle:                 # blank until launched; the launch_template returns it
commit_tag:    <UNBOUND>
worktree:      <UNBOUND>
active_lanes:  []
impl:
  profile:     <UNBOUND>
  kind:        <UNBOUND>
  band:        <UNBOUND>
  family:      <UNBOUND>
  turn_taking: <UNBOUND>
  lifetime:    <UNBOUND>
  write_mode:  <UNBOUND>
```

**`owns:` grammar is normative, and a check enforces it.** One path glob per line, no brace
expansion, no two globs on one line, no inline prose, comments on their own line. Test paths written
out rather than referred to. This is not style: `check_bindings.sh` computes set disjointness across
every instance over these literal strings, and prose is not a path.

## Granularity note — required, and required to be honest

State whether this instance is further shardable, and **why or why not**, before anyone tries. The
answer that matters is the one about files every item touches on the way in: a domain whose work
funnels through a shared registration point, a barrel export or a common schema is **not** shardable
however many subdirectories it has, because two lanes under it would collide on that file every time.

Where that is the case, say it here and let `wip_cap` carry it — a `wip_cap` whose reason is written
down is load-bearing; one that is not reads as a placeholder and gets raised by the next person who
wants throughput.

This note exists because the alternative is the more impressive-looking roster, and the more
impressive-looking roster is the one that deadlocks on its first parallel wave.
