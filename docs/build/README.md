# docs/build — Phase B working area

This folder holds the build-phase artefacts. See `docs/MULTI_AGENT_BUILD_PROCESS.md` for the full process.

Phase A (planning) produces validated chunk specs in `docs/planning/chunks/`. Phase B (build) consumes them one chunk at a time through the build cycle.

| Path | Owner | Purpose |
|---|---|---|
| `CHUNK_LEDGER.md` | Architect | Cumulative live state: what's on disk, what's running, next-chunk pointer. |
| `STRUCTURAL_DEBT.md` | Architect | Standing register of approved structural shortcuts. |
| `COHESION_LOG.md` | Architect | Append-only log of cross-chunk cohesion reviews. |
| `NEXT_SESSION.md` | Architect | Single-page cold-start brief for the next architect session. |
| `invocations/` | Architect | Builder invocation prompts, one per chunk fire. |
| `builder_reports/` | Builder | Builder reports (`chunk_NN_<slug>.md`; `_v2`/`_v3` for re-runs, never overwritten). |
| `qa_invocations/` | Architect | QA invocation prompts. |
| `qa_reports/` | QA | QA verdicts (`chunk_NN_<slug>_qa.md`). |
| `fix_prompts/` | Architect | Revision briefs, 60 lines or fewer each. |
| `blockers/` | Builder | BLOCKER notes, the only sub-agent escalation surface. |
| `auditor/` | Auditor (own/foreign/human) | Lane handshake — `PROTOCOL.md` (portable kernel, canonical origin), `DELIVERYOS_BINDINGS.md`, loop prompts, `watcher.sh`, `lanes/`. MHBP-lab scope (experimental), not baseline MABP. |

`NEXT_SESSION.md` does not exist yet — the architect creates it at cold-start once needed.
