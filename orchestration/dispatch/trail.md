<!--
trail.md — the dispatch ledger: one terse, timestamped row per assignment and per closure
  (DISPATCH_PROTOCOL.md §8.6). A LOG, not a state store — current lane state always comes from the
  lane files, never from this table. Kept bounded by `rotate_trail.py`, which rolls rows older than
  its retention window into ../history/trail/trail-<YYYY-MM>.md. Architect-owned; sole writer.
-->

# Dispatch trail

| When (`<TZ>`) | Item | Instance | Round | Event | Headline |
|---|---|---|---|---|---|
| _none yet_ | | | | | |
