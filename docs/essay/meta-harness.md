# The meta-harness: why the SDLC layer is the missing product

---

## 1. The thesis

The model is not the product. The harness around the model is the product.

That line is not original — it shows up in various forms in discussions of AI tooling — but it's worth unpacking precisely, because most of the tooling ecosystem has responded to it at the wrong level.

The claim is this: frontier language models are converging. GPT-4, Claude 3, Gemini 1.5, Llama 3 — their raw capabilities are close enough that the choice of underlying model is rarely the decisive factor in whether an AI-assisted workflow produces good software. What's decisive is the structure around the model: the context it receives, the constraints it operates under, the memory that survives between sessions, the tools it can call, the review loops it's embedded in. That structure is the harness. Claude Code, Codex, and Cursor are harnesses. They're the actual product surface. The model inside them is close to interchangeable.

If you accept that argument, the next question is obvious: what's the harness around the harness?

Claude Code's `CLAUDE.md` is a harness. It tells the model which files it's allowed to touch, what commands are safe to run, what conventions the codebase follows, what the project's scope is right now. A well-crafted `CLAUDE.md` is the difference between a coding session that makes progress and one that makes a mess. Codex has `AGENTS.md`. Cursor has its rules files. Every serious user of these tools has learned that the first thing you do before starting an agent run is make sure the harness is set up correctly.

But `CLAUDE.md` covers one session. It doesn't know your requirements. It doesn't carry your PRD, your test specification, your list of forbidden files, your release evidence, or your decisions from last month into this session. It doesn't tell Claude Code which requirements this run is supposed to address and which are out of scope. It doesn't verify after the run that what Claude Code did matches what you asked it to do. All of that structure — the stuff that makes the difference between a professional software delivery process and a vibes-driven hack — is scattered across chat history, Linear tickets, README files, Google Docs, terminal scrollback, and human memory.

That's the gap DeliveryOS fills. Not at the model layer. Not at the coding-harness layer. At the SDLC layer — the layer above the coding harnesses, where intent, requirements, validation, and release evidence live. The meta-harness is the structured layer that holds all of that and hands a clean brief to whichever coding harness the user prefers.

The brief is the load-bearing artefact. An Execution Brief is a 10-section document that tells the coding harness exactly what to build, which files it's allowed to touch, which files are absolutely forbidden, what the test specification says success looks like, and what evidence the result should produce. It's not a JIRA ticket. It's a formal handoff — the same kind a human senior engineer would write for a contractor, except the contractor is Claude Code.

---

## 2. What's new compared to existing tools

The natural response to a pitch like this is "but we already have Linear / Jira / Devin / Cursor — what does DeliveryOS add?" It's a fair question. Here's the honest comparison.

### Ticket trackers: Linear, Jira, Asana, Shortcut

Ticket trackers are good at tracking work items and their state. They are not structured SDLC memory. A JIRA ticket contains a title, a description, and a chain of comments. The artefact it produces — a merged PR, a deploy — is a hyperlink. It doesn't contain a test specification. It doesn't contain a list of files Claude Code is forbidden to touch. It doesn't produce release evidence in a format the model can read in the next session. It doesn't carry forward the design decisions that constrained how the work was done.

More precisely: ticket trackers track the existence of work. DeliveryOS structures the work itself — the brief that goes to the coding harness, the test spec that validates the result, the evidence that links the commit to the requirement to the original intent. Those are different problems.

### Autonomous agents: Devin, Cognition, and similar

Autonomous agents black-box the entire SDLC. The user submits an intent; the agent decides how to pursue it, which files to touch, what tests to run. The loop is closed inside the agent. This is the polar opposite of DeliveryOS's approach.

DeliveryOS goes the other way. Every stage is human-inspectable. Every artefact is a markdown file on disk, readable without any tooling. The human decides what goes into the Execution Brief. The human reviews the test specification before it goes to the coding harness. The diff validation runs against a brief the human signed off on, not a goal the agent inferred.

This is not a claim that autonomous agents are bad. It's a claim that they answer a different question. Devin answers "can an AI do this task end-to-end with minimal human involvement?" DeliveryOS answers "can a human-with-an-AI-coding-tool deliver software with the same rigour as a human-with-a-human-coding-team?" The second question is the one most professional builders are actually asking.

### Raw harnesses: Claude Code, Codex, Cursor

These are the tools DeliveryOS sits above, not competes with. They're powerful at execution. They're weak around it. Memory in Claude Code lives in `CLAUDE.md`, which is good for one session and brittle across many. There's no structured way to say "this run addressed requirement REQ-003 from PRD section 5, the test spec is at `docs/test-specs/req-003.md`, and the result is verified at commit `a7f3bc2`." DeliveryOS provides that scaffolding, and hands the brief back to Claude Code or Codex for the execution step. The harnesses are not replaced; they're given better inputs and a verification layer around their outputs.

The key design decision is that DeliveryOS is harness-neutral. It targets Claude Code and Codex in v0.1.0 because those are the primary tools right now, but the Execution Brief format is designed to be renderable for any harness. Adding a new harness profile means implementing a renderer and a settings writer — the rest of the structure is the same.

### VS Code forks and editor-integrated agents: Cursor, Windsurf, Antigravity

These editors compete with each other at the editor layer. Each has an AI coding assistant baked in, differentiated by the harness around it. They don't compete with DeliveryOS; they're the runtime layer DeliveryOS hands off to. DeliveryOS is a `.vsix` that runs inside all of them. Harness-neutral is a first-class design constraint, not a marketing claim.

### The honest summary

DeliveryOS is closer in spirit to Linear-meets-`CLAUDE.md` than to Devin. It does not try to replace the model, the editor, or the coding harness. It organises the territory between intent and shipped code: the brief, the test spec, the memory, the evidence. That territory was previously unstructured. Structuring it is the product.

---

## 3. The dogfooding evidence

This section is load-bearing, so it's worth being precise about what "dogfooding" means here.

DeliveryOS planned its own build using the same discipline it enforces on other projects. That claim is verifiable. The evidence is in `docs/planning/`, and you can inspect it in two clicks from the repo root.

Here's what to look at and why it matters.

**`docs/PRD.md`** is the Product Requirements Document for DeliveryOS itself, written in the format DeliveryOS expects to produce for any project. It has an executive summary, a problem statement, a product vision, core positioning, a feature set structured by stage, explicit scope boundaries, and a roadmap. It went through multiple versions — v0.1 is archived at `docs/deprecated/PRD-v0.1.md`; the current version is v0.3. The structure is the same structure the Execution Brief composer pulls from when generating a brief for any user project.

**`docs/BUILD-PLAN.md`** is a phased build schedule. Four phases: Phase 0 (scaffold and infrastructure), Phase 1 (DISCOVER and DEFINE stages), Phase 2 (EXECUTE and VERIFY stages), Phase 3 (release prep). Each phase has a week estimate and a list of deliverables. This is the same kind of phased schedule the planning loop in DeliveryOS will generate for user projects.

**`docs/planning/part-1-plan.md`** is the chunk-by-chunk breakdown — 16 chunks, each with a target week, effort estimate, dependencies, and a one-paragraph description of what the chunk delivers. This is the output of the same expand-validate-iterate loop the planning system runs on user projects.

**`docs/planning/chunks/`** holds the per-chunk specification for each of the 16 implementation chunks. Each spec runs to several hundred lines and covers: restated goal, in-scope and out-of-scope boundaries, implementation outline, file-by-file breakdown, test plan, risks, acceptance criteria. The file you're reading right now is referenced in `chunk-16-demo-recording.md`. The structure of each chunk spec matches the structure the Execution Brief composer would produce for a requirement with a complex multi-day implementation.

**`docs/decisions/`** holds Architecture Decision Records. ADR-0001 covers the decision not to publish to OpenVSX in v0.1.0. ADR-0002 covers the choice of SQLite over a flat-file graph for the memory layer. These are in the format DeliveryOS templates for user projects.

The honest caveat: at the time of writing, DeliveryOS the *extension* has just shipped v0.1.0. The dogfooding evidence is in the *planning artefacts*, not yet in a live "DeliveryOS used itself to plan and execute a feature in a recorded session." That's the next layer of dogfooding, planned for v0.2. The planning loop produces the right artefact shapes. The extension closes the right loop. But the live session where you watch DeliveryOS drive its own development end-to-end — that's a v0.2 story.

What the dogfooding does prove right now is that the planning discipline works at the scale of a real project. DeliveryOS is not a toy example. It's a 16-chunk, four-phase build with real dependencies, real scope decisions, and real constraints that had to be tracked across a multi-month build. The planning artefacts survived that build intact. The chunk specs are still the accurate description of what each chunk shipped. The PRD's scope boundaries held. That's a meaningful proof of the thesis at the planning layer.

---

## 4. What it doesn't do yet

Stating limits plainly is more useful than omitting them.

**No API integration in v0.1.0.** The manual AI flow — copy the prompt out, paste the result back — is deliberate. It forces the harness boundaries to stay honest. If the manual mode is too slow to be useful, that's a real signal about what the product needs. API integration will land in v0.2 once the manual loop has been exercised enough to know exactly where the friction is. Building API integration before knowing where the friction is would produce the wrong integration.

**No MCP server mode.** The memory graph in v0.1.0 is SQLite on disk, queried by the extension. The case for exposing it as an MCP resource — so any MCP-compatible tool can read requirement state, test specs, and release evidence — is strong. But it's v0.2 work. The memory schema needs to stabilise under real use before exposing it as a protocol.

**One specialist, two harness profiles, one demo target.** The Test Designer is the only specialist in v0.1.0. Claude Code and Codex are the only harness profiles. Bug Triage is the only demo workspace. The PRD lists the full set of planned specialists and profiles; this build ships the smallest set that closes the loop. Closing the loop is the proof. Expanding it is incremental.

**No OpenVSX, no Marketplace, no auto-update beyond a notification.** Sideloading is the whole distribution story for v0.1.0. The install script handles the five supported editors. The in-extension version check notifies on new releases. That's enough for a proof-of-work release aimed at developers who are comfortable sideloading.

**Not signed by a marketplace.** The `.vsix` ships with a SHA-256 hash attached to every release. That's the verification mechanism. Marketplace signing requires a publisher account, a Marketplace listing, and a review process. None of that is worth the overhead at v0.1.0.

The point is not breadth. The point is that the loop closes. A raw idea enters at DISCOVER; a verified, evidenced release exits at VERIFY. Once that closed loop exists and is demonstrated, expanding it is incremental work — each new specialist, harness profile, or integration adds value inside an already-proven structure.

---

## 5. Closing

Let's restate the thesis in different terms.

Frontier models are commoditising. The gap between the best closed-source model and the best open-weight model narrows every six months. This is good for users and bad for any product whose moat is "we use the best model." The value is moving up the stack, from the model to the harness around it.

But the harness ecosystem is also moving. Claude Code and Codex are good harnesses. They're getting better. The question is: what's the next abstraction up? The model layer is mostly solved. The coding-harness layer is actively competitive. The SDLC layer — requirements, briefs, test specs, memory, release evidence — is still largely unstructured. That's where structured discipline can dominate ad-hoc orchestration for the longest. DeliveryOS is one bet on what that abstraction looks like.

There's also a personal dimension to this project that's worth stating directly. This is a solo proof-of-work build, constructed deliberately as a credible-builder signal to AI companies and AI infrastructure teams. The argument is not just the essay; it's the artefact. A solo builder with a clear thesis, a structured build process, a working demo, and an auditable planning trail is a more legible candidate for a role building AI products than the same builder with a GitHub profile full of undocumented experiments.

The repo is the argument. This essay is the legend that goes with it.

If you want to try it: [install the `.vsix`](../README.md#install), open the Bug Triage workspace, and walk the loop once. The demo takes about five minutes with the pre-seeded state. The headline moment — DeliveryOS stopping Claude Code from writing to a forbidden file before the write executes — happens in scene eight of the storyboard, about two and a half minutes in.

The planning directory is at `docs/planning/`. The PRD is at `docs/PRD.md`. Both are readable without running anything.
