// CHUNK-14 § contracts/src/release.ts — Release Evidence contracts.
// Webview-safe: no runtime imports (no `vscode`, no `sql.js`, no `fs`).

import type { MemoryEntry } from './memory';
import type { BypassRecord } from './verification';

export interface MemoryNode {
  entry: MemoryEntry;
  path: string;
}

export interface ReleaseMemoryPayload {
  requirementRef: import('./verification').MemoryRef;
  verificationRef: import('./verification').MemoryRef;
  documentPath: string;
  chainComplete: boolean;
  warnings: string[];
  bypassRefs: import('./verification').MemoryRef[];
  finalSignOff: { by: 'user'; at: number };
  deferredItems: string[];
  knownLimitations: string[];
}

export interface ChainGraph {
  intent?: MemoryNode;
  prd?: MemoryNode;
  requirement?: MemoryNode;
  design?: MemoryNode;
  testSpec?: MemoryNode;
  codebase?: MemoryNode;
  execution?: MemoryNode;
  result?: MemoryNode;
  verification: MemoryNode;
  bypasses: BypassRecord[];
  warnings: string[];
}

export interface ReleaseEvidence {
  releaseId: string;
  markdown: string;
  filesReferenced: string[];
  chain: ChainGraph;
}
