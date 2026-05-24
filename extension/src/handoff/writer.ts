// CHUNK-11 § writer.ts — serialises a HandoffSnapshot into the
// `.deliveryos-handoff/` directory atomically (write-to-temp + rename),
// then copies the brief into `history/<timestamp>-execution-brief.md` as
// the committed audit trail.
//
// Does NOT create `result.md` upfront. That's written by the harness
// (Codex `-o`) or by the user (Claude Code via the CLAUDE.md instruction).

import * as vscode from 'vscode';
import type { HandoffSnapshot } from '@deliveryos/contracts';
import {
  CURRENT_CONTEXT_PACKAGE,
  CURRENT_EXECUTION_BRIEF,
  CURRENT_TEST_SPECIFICATION,
  CURRENT_VERIFICATION_CHECKLIST,
  MEMORY_SUMMARY,
  currentContextPackageUri,
  currentExecutionBriefUri,
  currentTestSpecificationUri,
  currentVerificationChecklistUri,
  handoffDirUri,
  historyBriefUri,
  historyDirUri,
  historyGitkeepUri,
  historyTimestamp,
  memorySummaryUri,
} from './paths';

export interface HandoffWriteResult {
  /** YYYYMMDDTHHmmssZ stamp used for the history snapshot filenames. */
  readonly timestamp: string;
  /** URI of the committed `history/<ts>-execution-brief.md` snapshot. */
  readonly briefHistoryUri: vscode.Uri;
}

interface WriteTarget {
  readonly relPath: string;
  readonly uri: vscode.Uri;
  readonly content: string;
}

/**
 * Serialises a `HandoffSnapshot` to the workspace. Construct once per
 * workspace; safe to call `write` multiple times (writer is stateless).
 */
export class HandoffWriter {
  constructor(private readonly workspace: vscode.WorkspaceFolder) {}

  async write(snapshot: HandoffSnapshot): Promise<HandoffWriteResult> {
    await this.ensureDirectories();
    await this.ensureHistoryGitkeep();

    const timestamp = historyTimestamp();
    const targets: WriteTarget[] = [
      {
        relPath: CURRENT_EXECUTION_BRIEF,
        uri: currentExecutionBriefUri(this.workspace),
        content: snapshot.executionBriefMd,
      },
      {
        relPath: CURRENT_CONTEXT_PACKAGE,
        uri: currentContextPackageUri(this.workspace),
        content: snapshot.contextPackageMd,
      },
      {
        relPath: CURRENT_TEST_SPECIFICATION,
        uri: currentTestSpecificationUri(this.workspace),
        content: snapshot.testSpecificationMd,
      },
      {
        relPath: CURRENT_VERIFICATION_CHECKLIST,
        uri: currentVerificationChecklistUri(this.workspace),
        content: snapshot.verificationChecklistMd,
      },
      {
        relPath: MEMORY_SUMMARY,
        uri: memorySummaryUri(this.workspace),
        content: snapshot.memorySummaryMd,
      },
    ];

    for (const t of targets) {
      await writePathAtomic(t.uri, t.content);
    }

    const briefHistoryUri = historyBriefUri(this.workspace, timestamp);
    await vscode.workspace.fs.copy(
      currentExecutionBriefUri(this.workspace),
      briefHistoryUri,
      { overwrite: true },
    );

    return { timestamp, briefHistoryUri };
  }

  private async ensureDirectories(): Promise<void> {
    // vscode.workspace.fs.createDirectory is idempotent — it never errors
    // when the directory already exists.
    await vscode.workspace.fs.createDirectory(handoffDirUri(this.workspace));
    await vscode.workspace.fs.createDirectory(historyDirUri(this.workspace));
  }

  private async ensureHistoryGitkeep(): Promise<void> {
    const uri = historyGitkeepUri(this.workspace);
    try {
      await vscode.workspace.fs.stat(uri);
      return; // already present
    } catch {
      // fall through and create
    }
    await vscode.workspace.fs.writeFile(uri, new Uint8Array());
  }
}

/**
 * Atomic write helper: write to `<file>.deliveryos.tmp`, then rename.
 * Mirrors `writeFileAtomic` in `extension/src/profiles/managedBlock.ts`
 * but takes raw `vscode.Uri` (one per current-* file rather than the
 * structurally-typed namespace).
 */
async function writePathAtomic(uri: vscode.Uri, content: string): Promise<void> {
  const tmpUri = vscode.Uri.file(`${uri.fsPath}.deliveryos.tmp`);
  const bytes = new TextEncoder().encode(content);
  await vscode.workspace.fs.writeFile(tmpUri, bytes);
  await vscode.workspace.fs.rename(tmpUri, uri, { overwrite: true });
}
