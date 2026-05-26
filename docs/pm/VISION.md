# DeliveryOS — Product Vision

**Created:** 2026-05-26
**Status:** Foundational — read before any roadmap or backlog work

---

## The one-line version

DeliveryOS is a structured delivery operating system for AI-assisted knowledge work. Software is domain one.

---

## The insight

The SDLC loop DOS implements is not about software. It is about structured delivery of any complex artifact that requires:

1. **Intent capture** — what are we trying to make, and why?
2. **Discovery** — what do we need to know before we can specify it?
3. **Specification** — what exactly must be true about the output?
4. **Delegation** — hand a structured brief to an AI agent with explicit scope and constraints
5. **Verification** — does what came back satisfy what we specified?
6. **Memory** — what did we decide, what worked, what should the next delivery know?

This loop is domain-agnostic. The primitives generalise:

- **Requirement** = "what must be true about this output" — in any domain
- **Execution Brief** = "produce X following these constraints; do not touch Y" — for any AI agent
- **Forbidden list** = "boundaries the agent must not cross" — logical, tonal, structural, or factual
- **Verification criteria** = "how we know the output is right" — before the agent runs, not after
- **Memory** = "what this delivery produced and what we learned" — institutional knowledge across sessions

---

## Domains DOS can serve today

The current v0.1.0 extension was built for software. The underlying engine has no software-specific assumptions. With appropriate specialist types and harness profiles, the same tool serves:

| Domain | Raw idea example | Verification example | AI agent |
| --- | --- | --- | --- |
| Software | "I want a bug triage API" | Tests pass; forbidden files untouched | Claude Code, Codex |
| Presentation | "Pitch our Series A to technical VCs" | Message lands in 3 sentences; no slide exceeds 40 words | Claude (slides), Gamma |
| Education | "Teach Python to absolute beginners" | Exercise tests stated objective; no assumed prior knowledge | Claude (curriculum) |
| Screenplay | "A 90-minute thriller set on a submarine" | Act 2 maintains established character voice; no new characters introduced after page 60 | Claude (script) |
| Research paper | "Literature review on transformer attention mechanisms" | All claims cited; no concept introduced without prior definition | Claude (writing) |
| Marketing | "Email campaign for product launch, enterprise audience" | On-brand tone; no unsubstantiated claims; CTA present | Claude (copy) |
| Legal document | "SaaS subscription agreement, US jurisdiction" | Indemnification clause consistent with limitation of liability clause | Claude (legal) |
| Film / video | "3-minute explainer for non-technical investors" | Voiceover matches storyboard; runtime within 10% of target | Claude (script) + Sora |
| Architecture / design | "Open-plan kitchen for a family of four" | Natural light requirement met; no structural wall removal | Claude (design), Midjourney |

---

## What changes by domain — and what doesn't

**What stays the same:**

- The memory store structure (intent, discovery, PRD, requirements, test spec, brief, result, verification)
- The delivery loop (intent → spec → brief → execute → verify → memory)
- The forbidden/allowed constraint model
- The review gate, impact analysis, rollback, and all other process features
- The Workgroup model (teams coordinate the same way regardless of domain)
- The platform integrations (GitHub Issues, Jira, Kanban)

**What changes by domain:**

| Element | Software | Other domains |
| --- | --- | --- |
| Specialist types | Test Designer | Curriculum Designer, Screenplay Analyst, Brand Voice Analyst, etc. |
| Harness profiles | Claude Code, Codex | Any AI production tool with an API or CLI |
| Terminology | PRD, requirements, tests | "Delivery spec", "content requirements", "quality criteria" — customisable |
| Verification criteria | Tests pass, no forbidden writes | Domain-specific: tone consistent, reading level appropriate, runtime within bounds, citations valid |
| Forbidden list semantics | File paths, glob patterns | Concepts not yet introduced, brand terms to avoid, characters not yet established, claims requiring evidence |

---

## The name

"DeliveryOS" was prescient. It is not "SoftwareDeliveryOS." An operating system abstracts the hardware so software can run on it. DeliveryOS abstracts the delivery discipline so AI agents can produce verified, structured, remembered outputs — regardless of what those outputs are.

---

## The positioning consequence

DOS is not a software development tool that happens to be used by developers. It is a delivery intelligence layer for anyone who uses AI agents to produce complex work.

That is a different market. Developers are a subset of it. The full market includes anyone who has replaced (or is about to replace) a human creative or knowledge worker with an AI agent and discovered that "just prompt it" produces inconsistent, unverifiable, unmemorable outputs.

The DOS thesis: **the discipline around the agent matters more than the agent itself.** Structured intent. Constrained scope. Verified output. Remembered decisions. That thesis applies everywhere AI agents produce complex work.

---

## Implications for the roadmap

Every item in `BACKLOG.md` and `WORKGROUP.md` applies to all domains, not just software:

- **B-002 (reverse engineer):** infer a DOS structure from any existing body of work — an existing course, an existing brand style guide, an existing screenplay
- **B-003 (agent teams):** a film requires director + writer + visual artist working with different AI agents at different cost tiers
- **B-005 (elicitation):** intent is more ambiguous in creative domains than in software; elicitation is even more valuable
- **B-006 (change propagation):** a changed story premise invalidates every scene brief downstream — same problem, different domain
- **Workgroup:** a production team (film, education, marketing) has the same role separation problem as a software team — the person with the vision is not the person running the AI agent

The only roadmap item that is software-specific is Phase W2's GitHub App integration. Even that has a parallel: creative teams use Notion, Airtable, or Frame.io the way developers use GitHub — those become Phase W3 platform adapters.

---

## Domain expansion strategy

DOS should not try to serve all domains simultaneously. The right strategy:

1. **Nail software first.** v0.1.0 builds credibility and surfaces the real friction points.
2. **Open the specialist model.** A community-contributed specialist library (B-003's harness profile generalisation) lets domain experts build DOS specialists for their field without core team involvement.
3. **Customisable terminology.** Let teams rename "PRD" to "Treatment", "Requirements" to "Script Notes", "Brief" to "Commission" — the structure is the same, the language fits the domain.
4. **Domain packs.** Curated combinations of specialists, harness profiles, issue templates, and terminology presets for common non-software domains. A "Film Production Pack" or an "Education Pack" that configures DOS for that domain in one step.

The engine is already general. The strategy is to expose that generality without losing the coherence that makes software delivery work well.
