<!--
ANSWERS.md — DeliveryOS's stand-up record. TIER C: this project's own, never copied onward.
Shape: install/templates/ANSWERS.TEMPLATE.md.

HONEST PROVENANCE: this stand-up was RETRO-FITTED, not interviewed. The orchestration tree was
adopted here on 2026-07-27, before install/INSTALL_INTERVIEW.md existed; this file records the
bindings as they actually stand on 2026-09-01, reconstructed from the tree and the repo, with the
stakeholder in the loop only where a decision was genuinely needed. A project standing up fresh
should run the interview rather than reconstruct like this.
-->

# Stand-up record — DeliveryOS

Adopted 2026-07-27 · Recorded 2026-09-01 · Interview: `install/INSTALL_INTERVIEW.md` ·
Verdict: `sh install/check_bindings.sh`

## Where each template was emitted

`check_bindings.sh` resolves `<interview-bound>` templates through these lines. Paths are relative
to the repo root.

```
EMITTED: DOD_BINDINGS -> docs/governance/DEFINITION_OF_DONE_BINDINGS.md
EMITTED: REGISTER -> docs/pm/BACKLOG.md
```

**The register was not scaffolded** — both registers predate the protocol. `REGISTER.TEMPLATE.md`'s
create-a-register path (interview phase 2.2) was `ruled out` here, and the line above names the
existing register the template's contract is satisfied by instead.

## States

`open` · `claimed` · `resolved` · `deferred` (with the condition that will decide it) ·
`ruled out` (the project's shape makes it moot)

## Questions

| # | Phase | Question | State | Answer / condition |
|---|---|---|---|---|
| 0.1 | 0 | Scrub inherited tier-B/C | `ruled out` | Nothing was inherited: this tree was authored here, it was not copied in. DeliveryOS is the upstream |
| 1.1 | 1 | Project / host / person / harness needles | `resolved` | `install/needles.conf` |
| 2.1 | 2 | Which registers exist | `resolved` | `docs/pm/BACKLOG.md` (planned changes), `docs/build/bugs.json` (defects) |
| 2.2 | 2 | Create a register | `ruled out` | Both already exist |
| 2.3 | 2 | Bind each register | `resolved` | `dispatch/BINDINGS.md` → Registers. `<DOD_APPLIES>`: yes for planned changes, no for defects — a stakeholder decision, per kind |
| 3.1 | 3 | Delivery surfaces + test command per surface | `resolved` | `dispatch/BINDINGS.md`. Webview has typecheck only |
| 3.2 | 3 | Contract check | `resolved` | `npm run build:contracts && npm run typecheck -w deliveryos` — extension consumes `contracts/dist`, not `contracts/src` |
| 3.3 | 3 | Content self-test | `ruled out` | No content corpus |
| 3.4 | 3 | Device-only marker | `ruled out` | No device surface |
| 3.5 | 3 | `<SYNC_COMMAND>`, `<TZ>` | `resolved` | `dispatch/BINDINGS.md` |
| 4.1 | 4 | Non-agentic acceptance runner | `resolved` | `npm run gate -- --item <ITEM>` (`scripts/gate.mjs`), built 2026-09-01. Verified end to end: a failing check turns the gate RED and exit 1; all-green exits 0 |
| 4.2 | 4 | `<GATE_RUN_RECORD>` | `resolved` | `docs/build/gate/item-<ITEM>.json`; `passed` + `gitSha`; untracked by rule |
| 4.3 | 4 | `gate_check.sh` | `resolved` | `dispatch/gate_check.sh` — reads the record, compares its `gitSha` to the lane's submitted SHA. All four branches verified |
| 5.1 | 5 | Which implementations are available | `resolved` | One profile: `agentic-premium`. `dispatch/BINDINGS.md` → Implementation profiles |
| 5.2 | 5 | `version_pin` | **`deferred`** | No pin is set. Decided when a second release of the same tool is in use concurrently and two instances need distinguishing |
| 5.3 | 5 | `DECORRELATION: required` or `waived` | `resolved` | **`waived`** — one family is wired into this fleet. `dispatch/BINDINGS.md` → Decorrelation carries the line and the condition that lifts it. Check 7 still prints all three correlated pairs on every run |
| 6.1 | 6 | Domains and `owns:` | `resolved` | Four roster entries, grammar clean, sets disjoint (check 3 green) |
| 6.2 | 6 | Hot files | `resolved` | Three, in `dispatch/BINDINGS.md`. They are why `coder.features` is `wip_cap: 1` |
| 7.1 | 7 | Caps, stall window | `resolved` | 1 / 1 / one active session. Conservative, uncalibrated, and stated as such |
| 7.2 | 7 | Escalation precedents | `resolved` | `none yet` — no lane has ever run here |
| 8.1 | 8 | `<DOD_BINDINGS_PATH>` + every row | `resolved` | `docs/governance/DEFINITION_OF_DONE_BINDINGS.md` |

## Phase 0 — what was scrubbed

Nothing. This tree was authored in this repo; there was no donor project to inherit tier-B or tier-C
files from. The scrub step exists for projects that copy the tree, and it is the step most likely to
be skipped by someone who assumes an inherited roster is a starting point rather than a lie.

## Deferred — with conditions

- **`impl.version_pin`** — decided when two instances run different releases of the same tool
  concurrently and their results diverge. Until then a pin would be a value nobody reads.
- **Auditor decorrelation** — resolved as a *declared waiver*, not left open: `DECORRELATION: waived`
  in `dispatch/BINDINGS.md`, which is what check 7 requires before it will pass a correlated fleet.
  What is deferred is *lifting* it, and its condition is a real event: a second model family actually
  wired into a lane. The families are available and documented; none has run. Writing a second
  auditor roster entry before that would be an aspirational binding, which is the thing this file
  exists not to contain.

## Known gaps at stand-up

Things that are true and not good:

1. **The fleet cannot decorrelate**, and says so out loud. Every roster entry, auditor included, is
   one model family. An auditor that fails the way its subject fails catches less than its presence
   suggests, and the machine gate does not rescue it — the same family authored the acceptance
   checks. Declared as `DECORRELATION: waived`; `check_bindings.sh` prints all three correlated pairs
   on every run, so the waiver cannot be mistaken for the problem having gone away.
2. **No lane has ever run.** Every cap, the stall window, and the whole dispatch layer are
   uncalibrated. The first real lane is the only thing that will change that.
3. **The webview surface has no test suite.** `typecheck` is its only automated gate.
4. **Test-path ownership overlaps.** `coder.features` claims `extension/test/*.test.ts` wholesale, so
   `coder.harness` and `coder.memory` own none of their own tests and must serialize against it. The
   fix is a per-subsystem test layout, not a roster edit.
5. **`docs/build/CHUNK_LEDGER.md` is a second copy of register state** and has already drifted. It
   collapses into the bound registers when chunks route through lanes.
6. **The v0.2.0 work in flight belongs to no register row.** `CHUNK_LEDGER.md` reports UAT + DEPLOY
   stages built and uncommitted while `docs/pm/BACKLOG.md`'s *In progress* section reads "nothing in
   flight", and no `B-NNN` row covers it. The first real use of the `backlog` register has to either
   mint that row retroactively or accept a shipped item that was never registered. Left open
   deliberately: minting it is the stakeholder's call about their own register, not the installer's.

## Verdict

`sh install/check_bindings.sh` → **exit 0**, 2026-09-01.
The exit code is the claim. A transcript saying it passed is not.
