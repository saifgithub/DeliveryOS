# Harness Profiles

A Harness Profile defines how DeliveryOS renders an Execution Brief for a specific coding harness. Each harness has its own conventions, instruction files, and operating model. The profile encapsulates those differences so the core SDLC memory remains harness-neutral.

## MVP profiles

### Claude Code

Conventions:
- Reads `CLAUDE.md` at repo root for project instructions
- Supports MCP for connecting to external context sources
- Supports custom skills and hooks
- Operates inside a terminal-style loop with tool use

Profile output:
- Execution Brief at `/deliveryos-handoff/current-execution-brief.md`
- Suggested `CLAUDE.md` update (additive, never destructive)
- Optional future: an MCP server entry pointing Claude Code at DeliveryOS memory

### Codex

Conventions:
- Reads `AGENTS.md` at repo root for project instructions ("a README for agents")
- Agent loop coordinates model, tools, and user
- Repo-local context expected via files

Profile output:
- Execution Brief at `/deliveryos-handoff/current-execution-brief.md`
- Suggested `AGENTS.md` update
- Explicit test/build command list
- Repo-local context files in `/deliveryos-handoff/`

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
```

Profiles are version-pinned because harnesses change frequently. Each profile entry should record the harness version it was authored against.

## Why this matters

The profile concept is the meta-harness in action. Without it, DeliveryOS would have to pick one harness to support. With it, DeliveryOS becomes an adapter layer that survives changes in the underlying tools and adds value as new harnesses appear.
