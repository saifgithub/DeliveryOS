# Ultracode workflow design — automating the MABP build cycle

> **Experimental. Non-normative. Design only — not yet implemented.** This is the validated design
> for the follow-up `docs/MHBP_LAB.md` §4/§11 name as open work: "authoring the ultracode build
> workflow." It specifies what a Claude Code Workflow script would do to replace the manual
> per-chunk architect loop; it is not itself a runnable script. Baseline
> (`docs/MULTI_AGENT_BUILD_PROCESS.md`, `skills/sm-mabp-run/`) is unchanged.

## Grounding (repo facts that shape the design)

- **`skills/sm-mabp-run/SKILL.md` is v3-shaped, not v4** — single QA agent, human types
  approve/revise. This design implements `MULTI_AGENT_BUILD_PROCESS.md` §6 + §16 directly (≥2 blind
  verifiers, non-agentic gate, auto-advance), not the skill's stale steps.
- **No chunk spec has a canonical `### Pre-fire audit` or acceptance-criteria heading** (checked all
  18). Phase 1 normalizes each spec's shape before auditing it.
- **`extension/test/*.test.ts` is a flat, non-recursive glob.** Verifier-authored check files must
  land directly in that directory or `npm run gate`'s test step silently skips them.

## Phases

| # | Phase | Script (deterministic) | Agent call | Tier |
| --- | --- | --- | --- | --- |
| 0 | Select chunk | Next by dependency order (`READY.md`/`BUILD_STATUS.md`); human overrides explicitly | — | — |
| 1 | Normalize + pre-fire audit | Run the commands | Extract criteria/commands from whatever heading shape the spec uses; interpret clean/drift | Economy |
| 2 | Invocation + builder fire | Validate shape (<80 lines, tier, ≤10 criteria, criteria map 1:1 to Phase 1's list) | Draft invocation; fire builder on the escalation ladder | Standard (draft) / ladder (build) |
| 3 | Verifier triangulation | Gate-checkpoint: check files exist before unblinding | ≥2 verifiers in `parallel()`, diversified lens/tier | Standard + Premium |
| 4 | Architect spot-check | Re-execute sampled builder-manifest rows, diff output | Derive 2–3 rows independently **from the spec alone** — not shown the builder's manifest or verifier findings | Standard |
| 5 | Gate | `npm run gate`, exit code + `last-run.json` consumed as boolean only | — | — |
| 6 | Verdict + routing | Convergence computed by the orchestrator over the verifier set, never self-reported by one verifier | See below | — |
| 7 | Cohesion review | Cadence trigger (every 4–5 chunks); format + append `BUILD_STATUS.md` entry | Grep the 3 most common recent patterns, confirm consistency | Standard |

Verifier triangulation (3) runs at N=3 instead of the N=2 default when Phase 2's invocation carries
`riskFlag: true` — set when the chunk touches a §16.5 delivery surface with irreversible/state-changing
effect (persisted-artifact schema, activation, packaging).

## Builder outcomes — three states, not two

The first draft conflated two different kinds of "blocked" into one `blocker` state. The doc treats
them differently, so the design now does too:

- **`clean`** → proceed to verifier triangulation (3).
- **`ambiguity_blocker`** (the builder wrote a BLOCKER file — contradiction, missing dependency,
  genuine ambiguity) → **always** routes to an architect-AI Premium call that edits the chunk spec
  and re-fires from Phase 1, regardless of which tier the builder was at. Zero retries at any tier —
  ambiguity isn't a capability problem (`MULTI_AGENT_BUILD_PROCESS.md` §7, §9).
- **`criterion_failed`** (a well-specified criterion genuinely fails) → advances the escalation
  ladder (§8 Cycle 3 table: Economy fails once → Standard; Standard/Premium each get one same-tier
  retry before escalating). When the ladder is exhausted (Premium's retry also fails), route to a
  **human** — the doc's own ladder table says so explicitly ("Premium failed — requires human
  judgement"), unlike `ambiguity_blocker` above.

## Verdict + routing (6)

```
structural-debt hot spot flagged  → architect-AI (Premium) approval call — MULTI_AGENT_BUILD_PROCESS.md
                                     §9: "the architect is the only agent who can approve a structural
                                     shortcut." Approved → register `Structural debt:` in BUILD_STATUS.md,
                                     continue. Not approved → divergence.

all green + spot-check passed
+ no findings/disagreement        → auto-advance: agent writes the BUILD_STATUS.md entry (Economy) →
                                     script commits + confirms the SHA landed → deterministic sampler
                                     selects a fraction of auto-advanced chunks and NOTIFIES A HUMAN
                                     (script never self-certifies — §16.4's "scaling backstop against
                                     verifiers converging on a shared wrong reading" only works if the
                                     sample audit is a different, uncorrelated actor) → next chunk.

verifier-vs-builder                → a verifier's check fails the impl: fix-prompt (agent, Standard,
(a code bug)                         ≤60 lines) → rebuild from Phase 2. Depth-capped: before writing the
                                     next fix-prompt version, if it would be v4, escalate instead of
                                     writing it (`MULTI_AGENT_BUILD_PROCESS.md` §258: "at v4, the
                                     architect stops and escalates" — v4 itself is never created).

verifier-vs-verifier               → verifiers disagree on expected behaviour: this is spec ambiguity,
(spec ambiguity)                     not a code bug. Routes through the SAME architect-AI BLOCKER path as
                                     `ambiguity_blocker` above (edit the spec, re-audit), not a
                                     fix-prompt loop.

otherwise                          → escalate: surface the 4 options verbatim (keep iterating / redesign
                                     the chunk / re-plan / park) — the one true human decision point in
                                     the loop besides an explicit chunk-selection or tier override.
```

## What's genuinely irreducible to a human

- Chunk-selection override; tier override for a known-hard chunk.
- Escalation-ladder exhaustion at Premium (the doc's own routing, not a design choice).
- The `escalate` verdict's resolution (iterate / redesign / re-plan / park).
- The sample audit itself (the script only selects *which* chunks get sampled and notifies).

Every other place the baseline doc assigns work to "the architect" — BLOCKER resolution, structural-debt
approval, spot-check judgment, fix-prompt drafting — is modeled as an AI agent call at the tier §15
specifies, not silently downgraded to a human step.

## Fixed vs. the first draft

1. Depth-cap off-by-one — a `_v4.md` fix prompt is never created; hitting that point escalates instead.
2. The escalation ladder had no path from "criterion genuinely failed" to "advance tier" — the builder's
   two-state output (`clean`/`blocker`) is now three states, splitting ambiguity from capability failure.
3. BLOCKER resolution and structural-debt approval were routed to a human while citing doc lines that
   assign them to the AI architect — now modeled as Premium-tier agent calls, matching §9/§15. Ladder
   exhaustion still correctly routes to a human (that one *is* the doc's own explicit routing).
4. The architect's spot-check moved from before verifier triangulation to after it, matching
   `MULTI_AGENT_BUILD_PROCESS.md` §6 step 7 (the v4 doc), not the stale v3 skill's ordering.
5. Verdict routing now distinguishes verifier-vs-builder (code bug → fix-prompt) from
   verifier-vs-verifier (spec ambiguity → BLOCKER path) instead of funneling both through code fixes.

## Still open

This is a design, not a script. Authoring the actual Workflow `.js` implementing these phases, and
validating it against a real chunk, remains the follow-up `docs/MHBP_LAB.md` §11 names.
