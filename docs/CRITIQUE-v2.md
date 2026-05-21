# Critical review v2: Does the meta-harness pivot fix it?

This is a follow-up to the original critique (now at `docs/deprecated/CRITIQUE-v1.md`), written after reading the v0.2 architectural correction.

## Short answer

Yes, mostly. The pivot is a real upgrade. The premise is now on the right side of the trend line, the language is sharper, and the file-based handoff via `/deliveryos-handoff/` is the first thing in the PRD that feels like it could be built in two weeks and demo well.

But there are still leftovers from v0.1 that drag against the new positioning. If you cut those too, you have a credible product. If you do not, v0.2 risks being v0.1 with a better paint job.

## What the pivot fixes

**Positioning is now on-trend, not against it.** "Meta-harness around coding harnesses" is intellectually correct and reads as somebody who actually pays attention to what Claude Code, Codex, and Cursor are doing. The layered Model → Harness → Meta-Harness frame is the sharpest sentence in the entire PRD. When you show this to AI companies, that frame survives the elevator pitch.

**"Execution Brief" carries weight that "implementation prompt" did not.** It implies a contract. It implies Allowed and Forbidden Changes. It implies that the harness is being held to a standard. This is a real product object, not a prettier name for a prompt.

**File-based handoff is the right MVP.** `/deliveryos-handoff/current-execution-brief.md` plus a suggested update to `AGENTS.md` or `CLAUDE.md` is a concrete, shippable mechanism. Codex genuinely does read AGENTS.md, Claude Code genuinely does read CLAUDE.md. You are leveraging conventions that already exist, not inventing your own. That makes adoption cheaper and the demo more convincing.

**Harness Profiles are real differentiation.** This is the most defensible idea in v0.2. Whoever maintains the best library of profiles (per harness, per version) becomes the broker layer that nobody else wants to maintain. This is the closest thing to a moat in the PRD.

**The memory graph is the right backbone.** Eight typed memory layers with explicit relationships, immutable Execution and Release memories, append-only Result memory. This sounds like infrastructure, not a UI. It also gives you the auditable traceability story for the regulated-industry buyer later.

**MCP path is the right end state.** Exposing DeliveryOS memory as an MCP server so Claude Code can query approved requirements and constraints in-session is exactly where this should go. The fact that v0.2 punts it to a future phase, rather than promising it in MVP, shows discipline.

## What did not get fixed

**The lifecycle is still too long.** v0.2 actually grew the lifecycle from 12 stages to 14 (Memory Update and Release Evidence are now broken out). The mental model is still essentially waterfall plus typed memory. A solo builder in 2026 will not walk through 14 stages. Even with progressive disclosure they will not.

The honest cut: the MVP needs four stages, not fourteen. Idea, Brief, Result, Verification. The other ten can hide behind links until somebody actually asks for them.

**The eleven specialists are still in the PRD.** MVP scope says only four (BA, Architect, Security, QA), which is better. But they are still framed as "AI personas" which is, structurally, prompt switching dressed as a feature. If you keep specialists in v0.2, make their value concrete: each specialist should produce a specific named artefact that updates a specific named memory. Otherwise they read as ceremony.

**Solo builder vs enterprise audit is still two products.** The v0.2 memory and traceability story is enterprise-flavoured. The 14-stage lifecycle is enterprise-flavoured. But the primary persona is still the AI-native solo builder. Solo builders do not want traceability, they want speed. Pick one. My read: the traceability story is stronger and rarer in the market. Lean into it.

**The MVP loop still has friction.** Even with file-based handoff, the user still has to: open DeliveryOS, generate the brief, switch to Claude Code, instruct it to read the handoff dir, watch it run, switch back, paste or import the result, verify. This is better than v0.1, but it is still a two-context flow. The harness wants to live inside the editor; DeliveryOS lives outside it. Without an MCP server (which you correctly punted), the user has to context-switch every cycle.

You can blunt this by making the handoff dir do most of the talking. If the brief, the test spec, and the memory summary are excellent files that the harness reads on its own, the user does not need to look at DeliveryOS during the agent loop. They only come back to verify and update. That is acceptable. But the brief and the memory summary have to be genuinely good. This is the single biggest execution risk.

**The competition has not changed.** Claude Projects, GitHub repo state, Cursor rules, AGENTS.md, CLAUDE.md, and standard ADR files together cover most of what v0.2 wants to do. The user can do 70 percent of this with a CLAUDE.md file and discipline. DeliveryOS has to be obviously better than "a well-curated CLAUDE.md" to earn a place in someone's workflow.

The pitch needs an answer to: "Why can't I just keep a good CLAUDE.md?" The answer is probably: "Because nobody actually does, and the traceability from intent to release is what you cannot fake with a single file." That answer is defensible if the traceability page is beautiful and the memory updates are automatic. It is not defensible if the user has to maintain memory by hand.

## The version of v0.2 that would actually ship well

Take the v0.2 architecture and cut hard:

1. **Four stages in the MVP, not fourteen.** Idea → Brief → Result → Verification. Everything else (PRD, specialists, requirements catalogue, design memory) is generated on demand from these four anchors.

2. **One specialist, not eleven.** Pick the Test Designer. It is the most defensible role because it produces the verification criteria that gate everything else. Add more later.

3. **Two harness profiles, not five.** Claude Code and Codex. Cursor and the others as fast follows. Profiles must be version-pinned.

4. **One killer demo, not ten screens.** A single page that shows the chain from a one-sentence idea to a passing test, with every intermediate artefact one click away, every memory update visible, and the exact Execution Brief and Result preserved. This is the screenshot that gets you the meeting.

5. **One unique capability that nobody else has.** My pick: an automatic post-execution diff between Allowed/Forbidden Changes and what the harness actually touched. If a harness modifies a forbidden file, DeliveryOS catches it and flags it during Result Capture. This is real value and nobody is doing it cleanly today.

If you build that, you have a defensible proof of work in two to three weeks. The full v0.2 PRD as written would take months and dilute the message.

## Addendum: v0.3 configurable stages

The v0.3 change (four default stages plus a configurable library of mid-stages, driven by discovery) directly addresses the "lifecycle is still too long" criticism in this document. Specifically:

- The 14-stage v0.2 walk is gone for projects that do not need it. Solo builders now see four stages, full stop.
- Heavyweight stages (Security, Privacy, Compliance, Legal, UX, etc.) appear only when discovery surfaces a real reason for them. This solves the solo-builder-vs-regulated-enterprise tension elegantly.
- Each mid-stage has an explicit gate and a named artefact, which prevents ceremony from creeping back in. If a stage exists, it has a reason it exists.

This is the strongest single improvement since v0.1. With v0.3, the PRD has a credible answer to "doesn't this feel too heavy?": "Only as heavy as your project needs to be."

Remaining concerns from this critique that v0.3 does **not** address:

- The user still context-switches between DeliveryOS and the coding harness during EXECUTE.
- The competition (well-curated CLAUDE.md/AGENTS.md plus discipline) still covers a meaningful chunk of the use case.
- The single demo, the one screenshot that gets you the meeting, still needs to be picked and built.

The bet is now well-shaped. The remaining risk is execution and demo quality, not architecture.

## Honest verdict on the pivot

v0.1 was a thoughtful but off-trend product. v0.2 is on-trend but still over-engineered. The shape of the bet is now correct: harness around the harnesses, memory as backbone, file-based handoff first, MCP later. The execution risk is over-scope, not direction.

If you cut to the four-stage MVP, ship the diff-against-forbidden-changes feature, and demo it end to end with Claude Code on the Bug Triage project, this becomes the strongest proof of work you could put in front of an AI company in 2026. It signals that you understand the harness layer, you understand context engineering, you understand memory, and you can ship.

Without the cut, v0.2 is still too much surface area for one person to deliver convincingly.

## Two updated questions worth answering before coding

1. If a senior engineer at Anthropic spent two minutes on your demo, what is the single thing they should remember the next morning? The whole product should bend toward that one thing.

2. If Anthropic shipped "DeliveryOS-lite" as a feature inside Claude Code next quarter (CLAUDE.md generator + execution brief composer + memory log), what would you have built that they could not absorb in a sprint? My guess is the answer is harness profiles plus the Allowed/Forbidden diff. If so, lead with those.
