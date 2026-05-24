// CHUNK-10 § 7 — Harness Profile schema (host-internal type surface).
// Mirrors the YAML shape in `docs/architecture/harness-profiles.md` 1:1.
// The wire projection lives in `contracts/src/profiles.ts`; webview imports
// from there. Host modules (registry/render/suggestedUpdates/managedBlock)
// import from here.

export type ProfileName = 'claude-code' | 'codex';

export type BriefStyle = 'structured-full' | 'concise';

export type OutputFormat = 'markdown';

export type ManagedBlockFormat = 'md' | 'json' | 'gitignore';

export interface HarnessProfile {
  readonly name: ProfileName;
  readonly display_name: string;
  /** Repo-root file the harness reads for project instructions. */
  readonly instruction_file: string;
  /** Where the brief + result files live (repo-relative). */
  readonly handoff_dir: string;
  readonly brief_style: BriefStyle;
  readonly include_test_commands: boolean;
  readonly include_lint_commands: boolean;
  readonly include_forbidden_changes: boolean;
  readonly output_format: OutputFormat;
  readonly mcp_capable: boolean;
  /**
   * Shell command CHUNK-11's terminal launcher invokes after writing the brief
   * into the handoff dir. Substitution tokens (literal string replace at launch):
   *   ${BRIEF_PATH}  → <handoff_dir>/current-execution-brief.md
   *   ${RESULT_PATH} → <handoff_dir>/result.md
   *   ${WORKSPACE}   → workspace root absolute path
   * Both MVP profile literals set this; future profiles may omit it.
   */
  readonly command_template?: string;
  /**
   * Optional CLI version pin (e.g. "claude-code@1.4.2"). Informational only —
   * surfaced in telemetry and UI tooltips, never enforced at launch. MVP
   * literals leave this undefined; the code-comment pin in registry.ts stands.
   */
  readonly harness_version_pin?: string;
}

export interface RenderedBrief {
  readonly profileName: ProfileName;
  readonly briefId: string;
  readonly markdown: string;
  /** ISO-8601. */
  readonly renderedAt: string;
}

export interface ManagedBlock {
  /** Workspace-relative path. */
  readonly file: string;
  readonly format: ManagedBlockFormat;
  /** Marker literal as it appears in the file. */
  readonly begin: string;
  readonly end: string;
  /**
   * Body between the markers (md/gitignore) or the JSON value of the sentinel
   * key (json), already deserialised. For the JSON variant `body` is the
   * stringified JSON value for diff display.
   */
  readonly body: string;
}

/**
 * Public action union for managed-block applier. Exported by name so CHUNK-13
 * imports it directly rather than redeclaring inline.
 */
export type ManagedBlockAction = 'create' | 'append-block' | 'replace-block' | 'noop';

/**
 * Backward-compatible alias of {@link ManagedBlockAction}; new code should use
 * the canonical name.
 */
export type UpdateAction = ManagedBlockAction;

export interface ManagedBlockPlan {
  readonly action: ManagedBlockAction;
  /** Resulting full file content (the bytes to write). */
  readonly next: string;
  /** The body inside the managed block (markers stripped). */
  readonly blockBody: string;
  /** Set when the existing file could not be processed (e.g. invalid JSON). */
  readonly error?: string;
}

export interface SuggestedUpdate {
  /** Workspace-relative path of the target file. */
  readonly file: string;
  /** `null` when the file does not exist on disk. */
  readonly existingContent: string | null;
  /** Bytes that would be written if Apply is clicked. Equals `existingContent` for noop. */
  readonly nextContent: string;
  readonly managedBlock: ManagedBlock;
  readonly action: ManagedBlockAction;
  /** Set when the existing block was hand-edited and Apply will overwrite changes. */
  readonly warning?: string;
  /** Set when the existing file could not be processed (e.g. JSON parse failure). */
  readonly error?: string;
}
