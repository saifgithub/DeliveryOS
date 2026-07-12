# docs/build — Phase B working area

This folder holds the build-phase artefacts. See `docs/MULTI_AGENT_BUILD_PROCESS.md` for the full process.

Phase A (planning) produces validated chunk specs in `docs/planning/chunks/`. Phase B (build) consumes them one chunk at a time through the build cycle.

| Path | Owner | Purpose |
|---|---|---|
| `BUILD_STATUS.md` | Architect | Cumulative live state: the chunk ledger, decisions, next-chunk pointer. Created on the first build session. |
| `NEXT_SESSION.md` | Architect | Single-page cold-start brief for the next architect session. |
| `invocations/` | Architect | Builder invocation prompts, one per chunk fire. |
| `builder_reports/` | Builder | Builder reports (`chunk_NN_<slug>.md`; `_v2`/`_v3` for re-runs, never overwritten). |
| `qa_invocations/` | Architect | QA invocation prompts. |
| `qa_reports/` | QA | QA verdicts (`chunk_NN_<slug>_qa.md`). |
| `fix_prompts/` | Architect | Revision briefs, 60 lines or fewer each. |
| `blockers/` | Builder | BLOCKER notes, the only sub-agent escalation surface. |
| `auditor/` | Auditor (own/foreign/human) | Lane handshake — `PROTOCOL.md` (portable kernel, canonical origin), `DELIVERYOS_BINDINGS.md`, loop prompts, `watcher.sh`, `lanes/`. MHBP-lab scope (experimental), not baseline MABP. |

`BUILD_STATUS.md` and `NEXT_SESSION.md` do not exist yet. The architect creates them at the start of the first build session, once `docs/planning/READY.md` is in place.
