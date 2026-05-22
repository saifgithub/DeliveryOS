import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import type { IntentMemory } from '@deliveryos/contracts';
import type { MemoryStore } from './memory/MemoryStore';

export interface ProjectRecord {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: number;
}

export interface IProjectRegistry extends vscode.Disposable {
  readonly onDidChange: vscode.Event<void>;
  getActive(): ProjectRecord | undefined;
  setActive(record: ProjectRecord): void;
  clear(): void;
}

export class InMemoryProjectRegistry implements IProjectRegistry {
  private active: ProjectRecord | undefined;
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  getActive(): ProjectRecord | undefined {
    return this.active;
  }

  setActive(record: ProjectRecord): void {
    this.active = record;
    this._onDidChange.fire();
  }

  clear(): void {
    this.active = undefined;
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}

/** CHUNK-03 § 2.11 — IProjectRegistry backed by MemoryStore. */
export class PersistedProjectRegistry implements IProjectRegistry {
  private active: ProjectRecord | undefined;
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly store: MemoryStore) {}

  getActive(): ProjectRecord | undefined {
    return this.active;
  }

  setActive(record: ProjectRecord): void {
    this.active = record;
    this._onDidChange.fire();
  }

  clear(): void {
    this.active = undefined;
    this._onDidChange.fire();
  }

  /** Bootstrap the active project from the most-recent Intent on disk. */
  async loadActive(): Promise<void> {
    const intents = await this.store.list('intent');
    if (intents.length === 0) return;
    this.active = intentToRecord(intents[0]);
    this._onDidChange.fire();
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}

export function intentToRecord(entry: IntentMemory): ProjectRecord {
  return {
    id: entry.id,
    name: entry.title,
    createdAt: entry.createdAt,
  };
}

export function generateProjectId(): string {
  return randomUUID();
}
