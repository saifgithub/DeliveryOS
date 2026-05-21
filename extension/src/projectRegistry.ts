import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';

export interface ProjectRecord {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: number;
}

export interface IProjectRegistry {
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

export function generateProjectId(): string {
  return randomUUID();
}
