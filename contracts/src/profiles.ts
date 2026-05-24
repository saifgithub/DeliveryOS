import type { NotificationType, RequestType } from 'vscode-messenger-common';

// --- Domain (shared between host + webview) -------------------------------
//
// CHUNK-10 (Harness profiles). The webview imports these types; the host
// re-exports the same shapes from `extension/src/profiles/types.ts` for its
// internal modules. Wire-safe by construction — all fields are primitives,
// arrays of primitives, or plain objects of the same.

export type ProfileName = 'claude-code' | 'codex';

export type BriefStyle = 'structured-full' | 'concise';

export type OutputFormat = 'markdown';

export type ManagedBlockFormat = 'md' | 'json' | 'gitignore';

export type ManagedBlockAction = 'create' | 'append-block' | 'replace-block' | 'noop';

export interface HarnessProfileWire {
  readonly name: ProfileName;
  readonly display_name: string;
  readonly instruction_file: string;
  readonly handoff_dir: string;
  readonly brief_style: BriefStyle;
  readonly include_test_commands: boolean;
  readonly include_lint_commands: boolean;
  readonly include_forbidden_changes: boolean;
  readonly output_format: OutputFormat;
  readonly mcp_capable: boolean;
  readonly command_template?: string;
  readonly harness_version_pin?: string;
}

export interface RenderedBriefWire {
  readonly profileName: ProfileName;
  readonly briefId: string;
  readonly markdown: string;
  /** ISO-8601. */
  readonly renderedAt: string;
}

export interface ManagedBlockWire {
  readonly file: string;
  readonly format: ManagedBlockFormat;
  readonly begin: string;
  readonly end: string;
  readonly body: string;
}

export interface SuggestedUpdateWire {
  readonly file: string;
  readonly existingContent: string | null;
  readonly nextContent: string;
  readonly managedBlock: ManagedBlockWire;
  readonly action: ManagedBlockAction;
  readonly warning?: string;
  readonly error?: string;
}

// --- Wire messages (webview ↔ host) ---------------------------------------

/** One-way notification: webview persists user's last picked profile. */
export interface ProfileSelectParams {
  readonly profileName: ProfileName;
}

export const ProfileSelect: NotificationType<ProfileSelectParams> = {
  method: 'profile/select',
};

/**
 * Bootstrap: webview asks for the list of available profiles + the user's
 * last-used selection (or default). Returned eagerly so the picker can render
 * without a separate round-trip.
 */
export type ProfileBootstrapParams = Record<string, never>;

export interface ProfileBootstrapResult {
  readonly profiles: readonly HarnessProfileWire[];
  readonly lastUsedProfileName: ProfileName;
}

export const ProfileBootstrap: RequestType<ProfileBootstrapParams, ProfileBootstrapResult> = {
  method: 'profile/bootstrap',
};

export interface ProfilePreviewParams {
  readonly briefId: string;
  readonly profileName: ProfileName;
}

export type ProfilePreviewResult =
  | { readonly ok: true; readonly rendered: RenderedBriefWire }
  | { readonly ok: false; readonly reason: 'no-draft' | 'no-workspace'; readonly error?: string };

export const ProfilePreview: RequestType<ProfilePreviewParams, ProfilePreviewResult> = {
  method: 'profile/preview',
};

export interface ProfileComputeUpdatesParams {
  readonly briefId: string;
  readonly profileName: ProfileName;
}

export type ProfileComputeUpdatesResult =
  | { readonly ok: true; readonly updates: readonly SuggestedUpdateWire[] }
  | { readonly ok: false; readonly reason: 'no-workspace'; readonly error?: string };

export const ProfileComputeUpdates: RequestType<
  ProfileComputeUpdatesParams,
  ProfileComputeUpdatesResult
> = {
  method: 'profile/computeSuggestedUpdates',
};

export interface ProfileApplyUpdateParams {
  readonly briefId: string;
  readonly profileName: ProfileName;
  readonly file: string;
}

export type ProfileApplyUpdateResult =
  | { readonly ok: true; readonly file: string; readonly action: ManagedBlockAction }
  | {
      readonly ok: false;
      readonly reason:
        | 'no-workspace'
        | 'cancelled'
        | 'unknown-file'
        | 'noop-with-error'
        | 'write-failed';
      readonly error?: string;
    };

export const ProfileApplyUpdate: RequestType<ProfileApplyUpdateParams, ProfileApplyUpdateResult> = {
  method: 'profile/applyUpdate',
};
