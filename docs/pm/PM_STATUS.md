# Handover — Project Management (DOS:P)

**Last updated:** 2026-05-22 (end of DOS:P1 wrap — Track P bootstrap: charter + first schedule dashboard committed in `b515be1`; wrap commit landed on top. No code, no planning corpus edits, no bug-list changes — write-set strictly `docs/pm/`.)

Read this file **first** when starting a new Project Management session (`/start-fresh P`). It is the single rolling source of truth for track P: state, narrative, and carry-overs all in one doc. Older "what just landed" sections rotate out to `docs/pm/PM_HISTORY.md` newest-on-top.

---

## What's on disk + what's running

| Field | Value |
| --- | --- |
| Commits on `main` | 39 (will be 40 after this wrap commit lands) |
| HEAD | _will be_ the DOS:P1 wrap commit on top of `b515be1 docs(pm): bootstrap Track P — schedule + cadence (DOS:P1)`. |
| Tags | none yet (planned: `v0.0.1` in DOS:R5; `v0.1.0` at CHUNK-16 = Week 14) |
| Tests | 38 passing (R track) |
| Bugs (`docs/build/bugs.json`) | 0 |
| Session model definition | `docs/MULTI_AGENT_BUILD_PROCESS.md` § 12 |
| Session config | `.claude/session-config.yml` (prefix `DOS`, tracks **O · R · P**) |
| Tracks configured | O (Documentation) · R (Development) · P (Project Management — **this track, first session**) |
| Phase | Phase 0 / Week 2 second half complete (BUILD-PLAN week of 2026-06-01) |
| Days ahead of nominal | ~10 (per DOS:R4 BUILD_STATUS preamble) |
| Worktree residue | None |
| Last R wrap | DOS:R4 — CHUNK-04 code complete; manual cross-editor smoke + `v0.0.1` tag push deferred to DOS:R5 |
| Last O wrap | DOS:O5 — standalone PRD coherence + completeness audit (2026-05-21) |

---

## § Charter — what Track P owns

Track P owns **schedule + cadence management** for the DeliveryOS build. Concretely:

- Track real elapsed dates vs the BUILD-PLAN's nominal 14-week schedule (demo target **2026-08-24**).
- Flag drift — chunks running over or under their nominal week budget.
- Maintain a rolling "weeks remaining vs chunks remaining" dashboard.
- Decide whether to compress, extend, or descope per-chunk effort estimates when drift accumulates.

**Write-set guardrails (hard constraint — preserves multi-track interleaving safety):**

- ✅ P may write to: `docs/pm/PM_STATUS.md`, `docs/pm/PM_HISTORY.md`.
- ❌ P does NOT edit: `docs/BUILD-PLAN.md` (Track O), `docs/PRD.md` (Track O), `docs/planning/**` (Track O), `docs/build/BUILD_STATUS.md` (Track R), `docs/build/bugs.json` (Track R), `extension/**` / `webview/**` / `contracts/**` (Track R), `.claude/session-config.yml` (cross-track infra; edits via `/session-setup`).
- ✅ P reads anything freely.

**Explicitly out of scope for Track P at the DOS:P1 charter:**

- Risk register, retrospectives, process tweaks to the build workflow itself, post-MVP roadmap. These can be added as additional P-track concerns if they prove useful, but the DOS:P1 charter keeps scope to scheduling only — minimise scope creep until the first signal that a wider P remit is needed.

---

## § Schedule dashboard

### Calendar

| Field | Value |
| --- | --- |
| Today | 2026-05-22 |
| BUILD-PLAN nominal start | 2026-05-25 (Week 1) |
| BUILD-PLAN demo target | 2026-08-24 (Week 14) |
| Calendar days to demo | 94 (≈ 13.4 weeks) |
| BUILD-PLAN week shipped through | end of Week 2 (CHUNK-01 + CHUNK-02 + CHUNK-03 ✅; CHUNK-04 🟡 code-complete) |
| Days ahead of nominal | ~10 (running before nominal Week 1 even starts) |

### Chunk burn-down (16 chunks total)

| # | Chunk | Phase | Nominal week | Status | Closed in |
| --- | --- | --- | --- | --- | --- |
| 01 | Scaffold | 0 | 1 | ✅ | DOS:R1 (steps 1–3) + DOS:R2 (steps 4–13) |
| 02 | Webview package | 0 | 2 | ✅ | DOS:R2 (sessions 1–5) + DOS:R4 (§ 10.2 unit tests) |
| 03 | Memory store | 0 | 2 | ✅ | DOS:R3 |
| 04 | Multi-editor verify + Releases | 0 | 2 | 🟡 | DOS:R4 code-complete; smoke + `v0.0.1` tag push → DOS:R5 |
| 05 | Raw idea + discovery | 1 | 3 | ⬜ | — |
| 06 | PRD generation + editor | 1 | 4 | ⬜ | — |
| 07 | Requirements catalogue | 1 | 5 | ⬜ | — |
| 08 | Test Designer specialist | 1 | 6 | ⬜ | — |
| 09 | Execution Brief composer | 2 | 7 | ⬜ | — |
| 10 | Harness profiles | 2 | 8 | ⬜ | — |
| 11 | File handoff + terminal | 2 | 9 | ⬜ | — |
| 12 | Result capture | 3 | 10 | ⬜ | — |
| 13 | Allowed/Forbidden diff | 3 | 11 | ⬜ | — |
| 14 | Verification + release evidence | 3 | 12 | ⬜ | — |
| 15 | Demo | 4 | 13 | ⬜ | — |
| 16 | Record + write | 4 | 14 | ⬜ | — |

Done: **3 / 16** (CHUNK-01, 02, 03). In flight: **1** (CHUNK-04). Remaining: **12**.

### Pace + slack

| Metric | Value | Read |
| --- | --- | --- |
| Calendar weeks remaining | 13.4 | until 2026-08-24 demo |
| Chunks remaining (CHUNK-04 counted) | 13 | CHUNK-04 + CHUNK-05..16 |
| Required pace | ≈ 0.97 chunks/week | 13 chunks ÷ 13.4 weeks |
| Nominal Phase-0 pace (4 chunks / 2 weeks) | 2.0 chunks/week | only relevant until CHUNK-04 closes |
| Nominal Phase 1–4 pace (12 chunks / 12 weeks) | 1.0 chunks/week | the post-Phase-0 grind |
| Slack vs BUILD-PLAN end-of-Week-2 mark | ~10 days ahead | per DOS:R4 BUILD_STATUS |
| Status | 🟢 **green — slightly ahead** | tighten if Phase 1 chunks run wide |

### Drift signals

None yet — DOS:P1 is the first measurement, so there's no historical baseline to compare against. Future P sessions log drift here as: _chunk-N ran X days over/under nominal — implication for downstream weeks_.

---

## § Working set

DOS:P1: bootstrap only. No carry-overs. No deferred items.

---

## § What just landed (this session — DOS:P1)

First-ever Track P session. Triggered by `/start-fresh P` against a freshly-configured P track (added to `.claude/session-config.yml` in DOS:R3's housekeeping commit `3df8ce8`). The session-entry plan-mode loop established Track P's scope as **schedule + cadence** (user chose from a four-option scope menu).

**Substantive deliverables (single bootstrap commit):**

1. **`docs/pm/PM_STATUS.md`** (this file) — preamble table mirroring O + R tracks' shape; § Charter establishing the scheduling-only remit with explicit write-set guardrails; § Schedule dashboard with the inaugural snapshot (today 2026-05-22, demo 2026-08-24, 3/16 chunks closed, ~10 days ahead of nominal); § Working set empty; § How to start the next session pointing at `/start-fresh P` → DOS:P2.
2. **`docs/pm/PM_HISTORY.md`** — header-only seed file. Future `/handover P` wraps rotate older "What just landed" sections from PM_STATUS.md into it, newest-on-top.

No code touched. No planning corpus edits. No bug-list changes. No `.claude/session-config.yml` edits (Track P was already wired in DOS:R3). Disjoint write-set verified — Tracks O and R can interleave with P safely.

---

## § How to start the next session

Next session: **DOS:P2**.

```text
/start-fresh P
```

The skill reads this file, runs the (empty) P-track sanity checks + (disabled) bug list, computes the next session name from the most recent `DOS:P<N>` reference in commit history, and switches to plan mode with this file's working set + carry-overs surfaced as options.

**Suggested first P2 work** (none of these are commitments — the user picks):

- Refresh the schedule dashboard against the next R-track wrap (DOS:R5 will close CHUNK-04 with smoke + `v0.0.1` tag push). Update _chunk burn-down_, _pace + slack_, and _days ahead of nominal_.
- If CHUNK-04 closes in DOS:R5, decide whether to start logging Phase-1 per-chunk drift estimates eagerly (CHUNK-05 is the first Phase-1 chunk; the BUILD-PLAN gives it 1 week).
- Optionally extend the dashboard with a _cumulative chunk-day spend_ metric — actual session-days per chunk vs nominal — if drift signals start to need finer-grained tracking.
