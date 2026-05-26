// CHUNK-12 § result.ts — Result Capture contracts.
// Single source of truth for ParsedResult, StoredResultPayload, and the
// webview ↔ extension message types for the result detail + paste panels.
// Webview-safe: no runtime imports (no `vscode`, no `sql.js`, no `fs`).

import type { RequestType } from 'vscode-messenger-common';
import type { MemoryEntryOfType } from './memory';

export type ParseConfidence = 'high' | 'medium' | 'low';

export interface ParsedResult {
  confidence: ParseConfidence;
  sections: {
    summary?: string;
    filesChangedClaimed?: ClaimedFileChange[];
    testsAdded?: string[];
    testsRun?: string[];
    risks?: string[];
    questions?: string[];
  };
  missingSections: string[];
  rawText: string;
}

export interface ClaimedFileChange {
  path: string;
  claimedStatus: 'new' | 'modified' | 'deleted' | 'unknown';
}

export interface GitFileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
}

export interface FilesChangedList {
  gitAvailable: boolean;
  fromGit: GitFileChange[];
  fromHarness: ClaimedFileChange[];
}

export type HarnessIdentity = 'claude-code' | 'codex' | 'other';

export type ResultMemoryRecord = MemoryEntryOfType<'result'>;

// The rich payload shape CHUNK-12 writes — superset of ResultPayload.
// Use cast-through pattern (as unknown as ResultPayload) when calling MemoryStore.create.
export interface StoredResultPayload {
  // Fields from ResultPayload (for TS cast-through compatibility):
  rawOutput: string;         // = raw harness markdown text
  summary?: string;          // = parsed.sections.summary
  harness: 'claude-code' | 'codex' | 'cursor' | 'generic'; // HarnessName compat
  parseConfidence: 'high' | 'low'; // CHUNK-03 only has 2 levels; map medium→low
  diffOutcome?: unknown;     // CHUNK-13 fills this later

  // CHUNK-12 extra fields:
  briefId: string;
  harnessIdentity: HarnessIdentity;
  capturedAt: string;        // ISO-8601
  source: 'watcher' | 'paste';
  parsed: ParsedResult;      // full parsed result incl. confidence
  filesChanged: FilesChangedList;
  acknowledgedAt?: string;
}

// Message types for webview ↔ extension (add to contracts, exported via index)
export interface ResultShowParams { resultId: string }
export interface ResultPasteFallbackParams { briefId: string; rawText: string; harnessIdentity: HarnessIdentity }
export interface ResultAcknowledgeParams { resultId: string }

export const ResultShow: RequestType<ResultShowParams, void> = { method: 'result.show' };
export const ResultPasteFallback: RequestType<ResultPasteFallbackParams, void> = { method: 'result.pasteFallback' };
export const ResultAcknowledge: RequestType<ResultAcknowledgeParams, void> = { method: 'result.acknowledge' };
