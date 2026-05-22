// CHUNK-03 § 2.1 + § 5.6 — extension-side re-export of the canonical memory
// contracts plus the SQL row shape used by `sqlJsHost` + `MemoryStore`.
// The contracts package is the source of truth for everything else.

export * from '@deliveryos/contracts';

import type { MemoryType } from '@deliveryos/contracts';

// Raw shape of a memory_entries row as returned by sql.js. Not exported via
// the contracts package (extension-only — webviews never see SQL rows).
export interface MemoryEntryRow {
  readonly id: string;
  readonly type: MemoryType;
  readonly title: string;
  readonly payload_json: string;
  readonly created_at: number;
  readonly updated_at: number;
}
