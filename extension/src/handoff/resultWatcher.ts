// CHUNK-11 § resultWatcher.ts — observes `.deliveryos-handoff/result.md`
// and emits a typed `ResultWatchEvent`. Consumed in CHUNK-11 by the
// HostMessenger (forwards to the webview as `handoff/resultObserved`)
// and in CHUNK-12 by Result Capture (parses the bytes + persists Result
// Memory).
//
// Subscribes to BOTH `onDidCreate` AND `onDidChange` — the atomic-rename
// caveat means harnesses observed in 2026 (Codex `-o` via fs.writeFileSync;
// Claude Code instruction-driven) can surface either event depending on
// platform. Debounce 250ms trailing-edge collapses bursts; SHA-256 hash
// dedup suppresses re-emit on identical content.

import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import {
  HANDOFF_HISTORY_DIR,
  historyDirUri,
  resultRelativePattern,
} from './paths';

export interface ResultWatchEvent {
  readonly workspace: vscode.WorkspaceFolder;
  readonly resultUri: vscode.Uri;
  readonly briefId: string;
  readonly briefHistoryUri: vscode.Uri;
  readonly handoffTimestamp: string;
  readonly contentBytes: Uint8Array;
  readonly contentSha256: string;
  readonly kind: 'created' | 'changed';
  readonly observedAt: number;
}

interface ExpectedHandoff {
  readonly timestamp: string;
  readonly briefHistoryUri: vscode.Uri;
  readonly briefId: string;
}

export const RESULT_DEBOUNCE_MS = 250;

const HISTORY_BRIEF_PATTERN = /^(\d{8}T\d{6}Z)-execution-brief\.md$/;

export class ResultWatcher implements vscode.Disposable {
  private readonly watcher: vscode.FileSystemWatcher;
  private readonly emitter = new vscode.EventEmitter<ResultWatchEvent>();
  private readonly subscriptions: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingKind: 'created' | 'changed' | null = null;
  private lastEmittedSha: string | null = null;
  private expected: ExpectedHandoff | null = null;

  readonly onResult = this.emitter.event;

  constructor(private readonly workspace: vscode.WorkspaceFolder) {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      resultRelativePattern(workspace),
      false,
      false,
      false,
    );
    this.subscriptions.push(
      this.watcher,
      this.watcher.onDidCreate(() => this.scheduleEmit('created')),
      this.watcher.onDidChange(() => this.scheduleEmit('changed')),
      this.watcher.onDidDelete(() => this.handleDelete()),
    );
  }

  /**
   * Pair the next `result.md` event with this brief. Called by the host
   * messenger immediately before opening the terminal so the event can
   * carry through to CHUNK-12 without an extra round-trip.
   */
  registerExpectedHandoff(
    timestamp: string,
    briefHistoryUri: vscode.Uri,
    briefId: string,
  ): void {
    this.expected = { timestamp, briefHistoryUri, briefId };
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    for (const sub of this.subscriptions) sub.dispose();
    this.subscriptions.length = 0;
    this.emitter.dispose();
    this.expected = null;
  }

  private scheduleEmit(kind: 'created' | 'changed'): void {
    // Promote 'created' if we see one; otherwise hold whatever we have.
    if (this.pendingKind === null || kind === 'created') {
      this.pendingKind = kind;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.fire();
    }, RESULT_DEBOUNCE_MS);
  }

  private async fire(): Promise<void> {
    const kind = this.pendingKind ?? 'changed';
    this.pendingKind = null;
    this.debounceTimer = null;

    const uri = vscode.Uri.joinPath(this.workspace.uri, '.deliveryos-handoff', 'result.md');
    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(uri);
    } catch {
      // File vanished between the watcher fire and the read. Drop.
      return;
    }

    const sha = crypto.createHash('sha256').update(bytes).digest('hex');
    if (this.lastEmittedSha === sha) return;
    this.lastEmittedSha = sha;

    const expected = this.expected ?? (await this.fallbackExpected());

    this.emitter.fire({
      workspace: this.workspace,
      resultUri: uri,
      briefId: expected?.briefId ?? '',
      briefHistoryUri: expected?.briefHistoryUri ?? uri,
      handoffTimestamp: expected?.timestamp ?? '',
      contentBytes: bytes,
      contentSha256: sha,
      kind,
      observedAt: Date.now(),
    });
  }

  private handleDelete(): void {
    // Reset dedup so the next create/change re-emits even if content matches.
    this.lastEmittedSha = null;
  }

  /**
   * When the user wrote `result.md` manually with no prior launch, fall back
   * to the most recent `history/*-execution-brief.md` by lexical sort.
   */
  private async fallbackExpected(): Promise<ExpectedHandoff | null> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(
        historyDirUri(this.workspace),
      );
      const briefs = entries
        .map(([name]) => name)
        .filter((name) => HISTORY_BRIEF_PATTERN.test(name))
        .sort();
      if (briefs.length === 0) return null;
      const latest = briefs[briefs.length - 1];
      const match = HISTORY_BRIEF_PATTERN.exec(latest);
      if (!match) return null;
      return {
        timestamp: match[1],
        briefHistoryUri: vscode.Uri.joinPath(
          this.workspace.uri,
          HANDOFF_HISTORY_DIR,
          latest,
        ),
        briefId: '',
      };
    } catch {
      return null;
    }
  }

  // --- Test hooks ---------------------------------------------------------

  /**
   * Test-only: synthesise a watcher fire without going through VS Code's
   * real FileSystemWatcher. Mirrors what `onDidCreate`/`onDidChange` would
   * trigger so headless unit tests can verify debounce + hash dedup.
   */
  __fireForTest(kind: 'created' | 'changed'): void {
    this.scheduleEmit(kind);
  }

  /** Test-only: expose the debounce window for sleep tuning in tests. */
  static readonly DEBOUNCE_MS_FOR_TEST = RESULT_DEBOUNCE_MS;
}
