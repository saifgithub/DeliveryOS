// CHUNK-10 § 5.1 / 5.2 / 5.3 — frozen body content for the suggested updates.
// Kept in its own module so `suggestedUpdates.ts` stays orchestration-only
// and these strings remain easy to scan + diff.

export const CLAUDE_MD_BODY = `## DeliveryOS coordination

This project uses DeliveryOS to prepare Execution Briefs. When you start a session:

1. **Read** the brief at \`.deliveryos-handoff/current-execution-brief.md\` before any edit or write. The brief is authoritative — it lists the requirement, the Approved Design Context, the test specification, and the Allowed and Forbidden Changes.
2. **Honour** the Allowed Changes and Forbidden Changes sections strictly. Touching a Forbidden path is a contract violation.
3. **Write** your final result summary to \`.deliveryos-handoff/result.md\` on completion. Include:
   - Summary of changes
   - Files changed
   - Tests added or updated
   - Tests run and their outcomes
   - Risks
   - Unresolved questions

Claude Code does not have a native flag to redirect its last message to a file (unlike Codex's \`-o\`), so the \`result.md\` write is **instruction-driven** — please write it yourself before ending the session.

If a DeliveryOS PreToolUse hook is configured in \`.claude/settings.json\`, it will block edits to Forbidden paths at the tool-call layer. Do not attempt to bypass it.`;

export const AGENTS_MD_BODY = `## DeliveryOS coordination

This project uses DeliveryOS to prepare Execution Briefs. When you start a session:

1. **Read** the brief at \`.deliveryos-handoff/current-execution-brief.md\` before any edit or write. The brief is authoritative — it lists the requirement, the Approved Design Context, the test specification, and the Allowed and Forbidden Changes.
2. **Honour** the Allowed Changes and Forbidden Changes sections strictly. Touching a Forbidden path is a contract violation.
3. **Write** your final result summary to \`.deliveryos-handoff/result.md\` on completion. Include:
   - Summary of changes
   - Files changed
   - Tests added or updated
   - Tests run and their outcomes
   - Risks
   - Unresolved questions

The \`codex exec\` invocation that DeliveryOS launches uses the \`-o .deliveryos-handoff/result.md\` flag (Codex CLI's \`--output-last-message\`), so Codex's final assistant message is written to that file automatically. You can additionally narrate the same information in-message; the file is the source of truth.

AGENTS.md was donated to the Linux Foundation in December 2025 as an open standard, so this file is portable across any compliant agent harness.`;

/**
 * Stub body for `.claude/settings.json`'s `deliveryos.managed` sentinel.
 * CHUNK-10 registers the stub only — the PreToolUse hook script lands in
 * CHUNK-13. `hooks: null` is the install signal CHUNK-13 will replace.
 */
export const CLAUDE_SETTINGS_STUB = {
  version: 1,
  begin: 'DELIVERYOS:BEGIN',
  end: 'DELIVERYOS:END',
  hooks: null,
  note: 'DeliveryOS will populate the hooks entry when the Allowed/Forbidden PreToolUse hook ships in a later release.',
} as const;
