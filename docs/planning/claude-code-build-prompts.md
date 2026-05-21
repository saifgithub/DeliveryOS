# Claude Code planning prompts: Part 1 (whole trimmed MVP)

These four prompts drive a planning loop in Claude Code. Run them in order, in Claude Code, from the DeliveryOS repo root. They produce a validated, implementation-ready plan. They do NOT write implementation code: that is a separate step after the loop is clean.

"Part 1" here means the whole trimmed MVP: BUILD-PLAN Phases 0 through 4 (extension skeleton, DISCOVER + DEFINE, Execution Brief + handoff, Result Capture + the Allowed/Forbidden diff, demo/polish). Trimmed scope: 4 stages, 1 specialist (Test Designer), 2 harness profiles (Claude Code + Codex), 1 demo (Bug Triage).

The loop: Prompt 1 breaks the work into chunks, Prompt 2 expands each chunk, Prompt 3 validates cohesion, Prompt 4 iterates 1 to 3 until clean. Claude Code uses subagents for research and for drafting the chunk specs.

Outputs all land in `docs/planning/`:

```
docs/planning/
  part-1-plan.md         (Prompt 1)
  chunks/chunk-NN-*.md   (Prompt 2)
  chunks/README.md       (Prompt 2)
  validation-report.md   (Prompt 3, overwritten each iteration)
  READY.md               (Prompt 4, final)
```

---

## Prompt 1: Break into chunks and create the project plan

```text
You are planning the build of DeliveryOS, a VS Code extension. This is a PLANNING task only. Do NOT write any implementation code in this step.

Read these files first so you fully understand the project:
- docs/PRD.md (the v0.3 spec)
- docs/BUILD-PLAN.md (the 14-week phased plan)
- docs/decisions/0001-vsix-extension-not-fork.md (the delivery mechanism)
- docs/architecture/execution-briefs.md
- docs/architecture/harness-profiles.md
- docs/architecture/memory-layers.md
- docs/architecture/stage-configuration.md

Scope for this planning pass is "Part 1" = the WHOLE TRIMMED MVP: BUILD-PLAN Phases 0 through 4. Trimmed scope is 4 stages, 1 specialist (Test Designer), 2 harness profiles (Claude Code + Codex), 1 demo (Bug Triage). Anything beyond that (extra specialists, extra profiles, MCP server mode, API integration) is out of scope.

Use subagents for research. Spawn parallel research subagents, one per distinct topic, and have each report back. Research at minimum:
- VS Code extension architecture: activation events, contribution points, tree views, commands, the extension host
- Webview panels: hosting a React + Tailwind app in a webview, the webview-to-extension messaging boundary, content security policy
- Packaging and distribution: vsce/vsix packaging, sideloading across VS Code, Cursor, Windsurf, Antigravity and VSCodium, extension signature verification
- Persistence in an extension: SQLite in the extension host vs ExtensionContext storage, where the memory graph should live
- Terminal integration: creating terminals and sending text through the extension API
- Harness conventions: how Claude Code reads CLAUDE.md, how Codex reads AGENTS.md, and the .deliveryos-handoff/ directory approach

Then write docs/planning/part-1-plan.md. Break the whole trimmed MVP into manageable implementation chunks. A chunk is a coherent unit of work that can be implemented and verified largely on its own. Each chunk should be at most a few days of work.

For every chunk capture:
- Chunk ID and name
- Goal (one or two sentences)
- In scope and out of scope
- Dependencies on other chunks
- Which BUILD-PLAN phase it belongs to
- Rough effort estimate
- What "done" means (a concrete, checkable outcome)
- How it will be verified
- Key risks or unknowns

Also include an ordered build sequence and a dependency map.

Finally, list any research findings that contradict or change assumptions in the PRD or BUILD-PLAN, so we can decide whether to update those docs.

Do not write code. The only output of this step is docs/planning/part-1-plan.md.
```

---

## Prompt 2: Expand each chunk

```text
Planning task only. Do NOT write implementation code.

Read docs/planning/part-1-plan.md (the chunk breakdown from the previous step). Re-read docs/PRD.md and the docs/architecture/ files as needed.

Expand every chunk into a detailed chunk spec. Use subagents: spawn one subagent per chunk so the chunks are expanded in parallel. Each subagent owns exactly one chunk and writes that chunk's spec file.

For each chunk, write docs/planning/chunks/chunk-NN-<short-name>.md containing:
- Restated goal and scope
- File-by-file breakdown: every file to create or modify, with its responsibility
- Key interfaces and types: function signatures, the shape of data structures, the webview-to-extension message types
- Data model touched: tables, schema, storage keys
- The specific VS Code extension APIs used
- A step-by-step implementation outline
- Test plan: which unit and integration tests prove the chunk works
- Risks, edge cases and open questions
- Explicit dependencies: what must exist before this chunk, and what this chunk exposes for later chunks

Keep the chunk specs consistent with each other. Shared types must be named and defined the same way everywhere. If a subagent needs a shared type, it should record it as a dependency rather than redefining it.

After all subagents finish, review the full set yourself and write docs/planning/chunks/README.md listing the chunks and any cross-chunk types or contracts you noticed.

Do not write code. The only outputs of this step are the chunk spec files and chunks/README.md.
```

---

## Prompt 3: Validate that the chunks are cohesive

```text
Planning task only. Do NOT write implementation code.

Read docs/planning/part-1-plan.md and every file in docs/planning/chunks/.

Validate that the chunks are cohesive and together actually deliver the whole trimmed MVP. Use subagents: spawn parallel audit subagents for different concerns. Check for:
- Gaps: any PRD requirement or BUILD-PLAN deliverable not covered by any chunk
- Overlaps: two chunks claiming the same file or the same responsibility
- Interface mismatches: a type, message or function defined one way in one chunk and differently in another
- Dependency problems: a chunk depending on something built later, dependency cycles, or unclear ordering
- Shared contracts: types, schemas or storage keys used across chunks but not defined consistently
- Verification gaps: chunks whose "done" criteria are not actually checkable
- Scope drift: anything exceeding the trimmed MVP (extra specialists, extra profiles, MCP, API integration)

Write docs/planning/validation-report.md. List every issue found, each with: an ID, a severity (blocker, major or minor), the chunks involved, a description, and a recommended fix.

If there are zero issues, state that explicitly.

Do not write code. The only output of this step is docs/planning/validation-report.md.
```

---

## Prompt 4: Iterate until ready for implementation

```text
Planning task only. Do NOT write implementation code. This is the iteration loop.

Read docs/planning/validation-report.md.

If the report lists issues:
1. Resolve every issue by editing docs/planning/part-1-plan.md and the relevant docs/planning/chunks/ files. Use subagents to apply independent fixes in parallel.
2. Re-run the cohesion validation: re-audit the updated plan and chunks with the same checks used in the validation step, and overwrite docs/planning/validation-report.md with the fresh results.
3. Repeat steps 1 and 2 until the validation report has zero blocker and zero major issues. Minor issues may remain only if each is explicitly justified.

When the report is clean, write docs/planning/READY.md containing:
- A one-paragraph statement that Part 1 (the whole trimmed MVP) is planned and ready for implementation
- The final ordered list of chunks with their dependencies
- The recommended implementation order
- Any remaining minor issues and why they are acceptable
- A short note that this plan was produced by the chunk, expand, validate, iterate loop, which is DeliveryOS's own methodology applied to building DeliveryOS (this is the dogfooding proof)

Report how many iterations it took and what the main issues were.

Do not write code. Stop when READY.md is written. Implementation is a separate, later step.
```

---

## After the loop

When `READY.md` exists and `validation-report.md` is clean, the planning loop is done. The next step is implementation: a separate prompt that takes one chunk at a time, uses subagents to build it, and verifies against the chunk's "done" criteria and test plan. Keep all of `docs/planning/` in the repo: it is the evidence that DeliveryOS was planned with DeliveryOS's own discipline.
