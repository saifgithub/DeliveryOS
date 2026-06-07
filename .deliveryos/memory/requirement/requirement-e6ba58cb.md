---
id: requirement-e6ba58cb
type: requirement
title: "DeliveryOS"
created_at: 2026-05-30T18:51:56.623Z
---
# DeliveryOS

## Problem

DeliveryOS assumes a greenfield starting point: a developer enters a raw idea and builds the documentation layer before writing code. The tool has no entry point for projects that already exist. A developer with a working codebase — legacy projects, acquired apps, side projects that evolved into products — cannot adopt DOS without first manually reconstructing the intent, PRD, and requirements from scratch. That step is high-effort, error-prone, and blocks adoption for the majority of real-world projects, which start brownfield. This feature closes that gap by reading the existing codebase and synthesising the DOS documentation layer from the code outward, making DeliveryOS accessible to any project, not just new ones started inside it.


## Users

**Primary — Developer / team lead with an existing codebase.** Technical, comfortable with VS Code, introducing DOS to an ongoing project rather than starting one from scratch. They run the Reverse Engineer command once at setup, review the inferred output, approve it, and continue forward through the normal DOS delivery cycle. They may re-run the command if the initial inference was poor, or edit individual artifacts in the DOS UI before saving.

No secondary user types for MVP — the command is invoked by whoever has write access to the workspace and the authority to define the project's delivery structure.


## Goals

- Enable a developer to onboard an existing codebase into DOS in a single VS Code command session — no config files, no manifest editing
- Produce a populated intent memory row, draft PRD sections, and initial requirement rows accurate enough to continue forward without full manual reconstruction
- Require a human review step before saving — output is proposed, not committed automatically
- Exclude credential and secret files from the AI read set by default (safe by default, not opt-in)
- Allow the user to immediately continue the normal DOS delivery cycle (PRD → requirements → brief → harness) after onboarding completes
- Produce output that is additive — running on a project with no existing DOS data creates; running on one with existing data prompts before changing anything


## Non-Goals

- Not a live sync tool — does not watch for code changes and update the memory store automatically
- Not a test-coverage or code-quality analyser — does not read test files to infer coverage metrics
- Not a git history tool — does not use git blame or authorship data (optional `git log --oneline` for context only)
- Not a multi-workspace or monorepo tool — one project root per run
- Not a replacement for the forward DOS workflow — inferred output is a starting point for human review, not a finished document
- Does not support non-VS Code editors in this version


## Constraints

- TypeScript, VS Code extension API, SQLite — same stack as existing DOS; no new language runtimes
- No new npm packages unless strictly unavoidable; reuse existing MemoryStore interface, webview messaging patterns, and harness contract types
- AI integration must reuse the access path already established in the extension — no separate Anthropic API key setup for the user
- Must not silently overwrite existing DOS artifacts; if an intent row or requirement rows already exist, prompt the user to confirm before replacing
- Deployed as part of the VS Code .vsix bundle — no server component
- File selection for AI must be bounded: total input must stay within a safe context budget; large codebases must be sampled intelligently, not truncated arbitrarily


## Assumptions

- The target workspace contains at least a README (or equivalent top-level description) and a package manifest — without these, inference quality degrades significantly and should be surfaced to the user
- The user has Claude Code (or equivalent AI access) authenticated in their VS Code environment; the feature reuses this rather than requiring a new credential
- The existing memory store schema (intent, requirement, codebase row types) is sufficient to represent inferred content — no schema migration needed for MVP
- A human review step before saving is acceptable UX; users expect to review AI-generated content before committing it to their project
- Common secret file patterns (.env, .env.*, secrets.json, credentials.json, *.pem) at well-known paths cover the material leak risk for the target user


## Risks

- **AI integration path unknown** — the extension may not currently make direct Anthropic API calls; if all AI interaction is user-driven via Claude Code CLI, a new in-extension call path is needed before implementation can start. Mitigation: investigate extension source first; design the call path as a pluggable module so it can be swapped without reworking the feature.
- **Context window overflow** — a large codebase won't fit in one AI call. Mitigation: prioritise entry points, README, manifests, and module boundaries; cap total token budget; truncate gracefully and surface a warning when the codebase was too large to fully analyse.
- **Inference quality** — AI may produce plausible but incorrect PRD sections or requirements. Mitigation: mandatory human review before saving; use `*(unknown — flag for the user)*` markers for uncertain output so gaps are visible.
- **Idempotency on re-run** — running twice on a project with existing DOS data must not silently corrupt state. Mitigation: detect existing memory rows at command start; confirm with user before overwriting.
- **Secret leakage** — .env and credential files in the source tree could be sent to the AI. Mitigation: hardcoded exclusion list for common secret file patterns; this is a security requirement, not a nice-to-have.


## Success Criteria

- Running "Reverse Engineer Project" on the DeliveryOS repo itself produces ≥1 intent row, ≥3 PRD section rows, and ≥5 requirement rows in memory.sqlite — with no manual data entry
- The inferred rawIdea is recognisable: a human reading it agrees it describes what the project does
- ≥3 of the generated requirement rows correspond to verifiable, real features in the codebase
- After onboarding, the PRD editor and requirements catalogue panels show the inferred content and the user can begin the normal DOS forward cycle immediately
- No .env or credential file content appears in any generated artifact
- The command completes in under 120 seconds on a codebase of ≈500 files
