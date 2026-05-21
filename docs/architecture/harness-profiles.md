# Harness Profiles

A Harness Profile defines how DeliveryOS renders an Execution Brief for a specific coding harness. Each harness has its own conventions, instruction files, and operating model. The profile encapsulates those differences so the core SDLC memory remains harness-neutral.

## MVP profiles

### Claude Code

Conventions:
- Reads `CLAUDE.md` at repo root for project instructions
- Supports MCP for connecting to external context sources
- Supports custom skills and hooks (including `PreToolUse` enforcement hooks)
- Operates inside a terminal-style loop with tool use

Profile output:
- Execution Brief at `.deliveryos-handoff/current-execution-brief.md`
- Suggested `CLAUDE.md` update (additive, never destructive — written inside a `<!-- DELIVERYOS:BEGIN --> ... <!-- DELIVERYOS:END -->` managed block). The managed block tells Claude Code to read the current execution brief before any edit, and to write its result summary to `.deliveryos-handoff/result.md` on completion. Claude Code has no native `-o`-style result-file flag in 2026; this instruction is how the file gets written.
- Suggested `.claude/settings.json` update registering a DeliveryOS-generated `PreToolUse` hook inside a JSON managed block (the canonical sentinel key is `deliveryos.managed.hooks`). The hook reads the Forbidden Changes section from `.deliveryos-handoff/current-execution-brief.md` and exits non-zero on any matching `Edit` / `Write` / `MultiEdit` invocation. Critically, `PreToolUse` fires **before** Claude Code's permission-mode checks, so the hook cannot be bypassed by `--dangerously-skip-permissions`. This is real-time Forbidden-path enforcement, not after-the-fact diffing — the post-hoc diff (Result Capture stage) remains the universal backstop for all profiles.
- `command_template` (see § Profile schema below): `claude --add-dir . "Run the brief at ${BRIEF_PATH} and write result to ${RESULT_PATH}"` — instruction-driven, since Claude Code has no native result-file flag.
- Optional future: an MCP server entry pointing Claude Code at DeliveryOS memory.

### Codex

Conventions:
- Reads `AGENTS.md` at repo root for project instructions ("a README for agents"). As of December 2025, AGENTS.md is no longer an OpenAI-proprietary convention: Codex donated it to the Linux Foundation's Agentic AI Foundation alongside MCP, and by mid-2026 it is an open standard adopted by 60,000+ projects. DeliveryOS's harness-neutrality thesis therefore is not bet on a proprietary file — the same `AGENTS.md` is read by Codex, Cursor, Windsurf, and a growing list of other agentic tools.
- `codex exec` supports a native **`-o / --output-last-message <file>`** flag that writes the final assistant message to a file. This maps directly onto DeliveryOS's `.deliveryos-handoff/result.md` mechanism; no managed-block instruction is needed for Codex to produce `result.md`.
- Agent loop coordinates model, tools, and user
- Repo-local context expected via files
- Has **no equivalent of Claude Code's `PreToolUse` hook** in 2026. The post-hoc Allowed/Forbidden diff during Result Capture is the universal enforcement mechanism on this profile.

Profile output:
- Execution Brief at `.deliveryos-handoff/current-execution-brief.md`
- Suggested `AGENTS.md` update (inside a `<!-- DELIVERYOS:BEGIN --> ... <!-- DELIVERYOS:END -->` managed block, same delimiter convention as the Claude Code profile)
- Explicit test/build command list
- Repo-local context files in `.deliveryos-handoff/`
- `command_template`: `codex exec -o ${RESULT_PATH} "Run the brief at ${BRIEF_PATH}"` — uses the native `-o` flag to produce `result.md` without any in-instruction prompting.

### Cursor

Conventions:
- Chat-based agent inside the editor
- Reads `.cursorrules` and `cursor.config`
- Expects concise instructions; tolerates implementation-style prompts

Profile output:
- Concise implementation-style prompt (shorter than Claude Code or Codex)
- Target file list
- Expected patch description
- Test checklist

### Generic

A harness-agnostic markdown brief. Usable in any chat-based AI tool (ChatGPT, Claude, Gemini, local LLM front-ends).

## Future profiles (fast follows)

- Replit Agent
- Lovable
- GitHub Copilot coding agent
- Devin and similar autonomous coding agents
- Local agents (Aider, Continue, etc.)

## Profile schema

```yaml
name: claude-code
display_name: Claude Code
instruction_file: CLAUDE.md
handoff_dir: .deliveryos-handoff
brief_style: structured-full
include_test_commands: true
include_lint_commands: true
include_forbidden_changes: true
output_format: markdown
mcp_capable: true
command_template: claude --add-dir . "Run the brief at ${BRIEF_PATH} and write result to ${RESULT_PATH}"
harness_version_pin: "1.x"   # optional; the harness version the profile was authored against
```

**`command_template`** is the shell command string that CHUNK-11 pre-types into the integrated terminal when the user clicks "Run with [harness]". Supported placeholder substitutions:

| Placeholder | Resolves to |
| --- | --- |
| `${BRIEF_PATH}` | `.deliveryos-handoff/current-execution-brief.md` (workspace-relative) |
| `${RESULT_PATH}` | `.deliveryos-handoff/result.md` (workspace-relative) |
| `${WORKSPACE}` | The absolute path to the workspace root |

DeliveryOS escapes any user-controlled string fragments before substitution; brief content is never inlined into the command (prompt-injection-into-shell defence).

**`harness_version_pin`** is optional. Profiles are version-pinned because harnesses change frequently; recording the harness version a profile was authored against lets DeliveryOS warn the user when a major version bump might invalidate the profile's command shape, instruction conventions, or hook contract.

## Why this matters

The profile concept is the meta-harness in action. Without it, DeliveryOS would have to pick one harness to support. With it, DeliveryOS becomes an adapter layer that survives changes in the underlying tools and adds value as new harnesses appear.
