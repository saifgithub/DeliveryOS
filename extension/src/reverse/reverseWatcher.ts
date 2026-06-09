// DOS:P10 § reverse/reverseWatcher.ts — observes `.deliveryos-reverse/prd.md`
// and emits a typed `ReversePrdEvent` once the agent has written the inferred
// PRD. Mirrors `handoff/resultWatcher.ts`: subscribes to BOTH onDidCreate AND
// onDidChange (atomic-rename caveat), 250ms trailing debounce collapses bursts,
// SHA-256 dedup suppresses re-emit on identical content.

import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import { reversePrdRelativePattern, reversePrdUri } from './paths';

export interface ReversePrdEvent {
  readonly workspace: vscode.WorkspaceFolder;
  readonly prdUri: vscode.Uri;
  readonly contentBytes: Uint8Array;
  readonly contentSha256: string;
  readonly kind: 'created' | 'changed';
  readonly observedAt: number;
}

export const REVERSE_DEBOUNCE_MS = 250;

export class ReverseWatcher implements vscode.Disposable {
  private readonly watcher: vscode.FileSystemWatcher;
  private readonly emitter = new vscode.EventEmitter<ReversePrdEvent>();
  private readonly subscriptions: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingKind: 'created' | 'changed' | null = null;
  private lastEmittedSha: string | null = null;

  readonly onPrd = this.emitter.event;

  constructor(private readonly workspace: vscode.WorkspaceFolder) {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      reversePrdRelativePattern(workspace),
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

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    for (const sub of this.subscriptions) sub.dispose();
    this.subscriptions.length = 0;
    this.emitter.dispose();
  }

  private scheduleEmit(kind: 'created' | 'changed'): void {
    // Promote 'created' if we see one; otherwise hold whatever we have.
    if (this.pendingKind === null || kind === 'created') {
      this.pendingKind = kind;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.fire();
    }, REVERSE_DEBOUNCE_MS);
  }

  private async fire(): Promise<void> {
    const kind = this.pendingKind ?? 'changed';
    this.pendingKind = null;
    this.debounceTimer = null;

    const uri = reversePrdUri(this.workspace);
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

    this.emitter.fire({
      workspace: this.workspace,
      prdUri: uri,
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

  // --- Test hooks ---------------------------------------------------------

  /** Test-only: synthesise a watcher fire without the real FileSystemWatcher. */
  __fireForTest(kind: 'created' | 'changed'): void {
    this.scheduleEmit(kind);
  }

  static readonly DEBOUNCE_MS_FOR_TEST = REVERSE_DEBOUNCE_MS;
}
