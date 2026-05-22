// CHUNK-03 § 2.7 — typed memory entry IDs.
// Format: `<type>-<short-uuid>`, e.g. 'intent-7a3f9b2c'. Typed prefix makes
// IDs self-describing on disk + in markdown links. UUIDs come from
// `crypto.randomUUID()` (guaranteed on VS Code 1.85+ / Node 18+) truncated
// to 8 hex chars — ~4 billion collision space per project is fine.

import { randomUUID } from 'node:crypto';
import type { MemoryType } from '@deliveryos/contracts';

const SHORT_UUID_LEN = 8;

export function generateMemoryId(type: MemoryType): string {
  const short = randomUUID().replace(/-/g, '').slice(0, SHORT_UUID_LEN);
  return `${type}-${short}`;
}

export function parseMemoryIdType(id: string): MemoryType | null {
  const dash = id.indexOf('-');
  if (dash <= 0) return null;
  return id.slice(0, dash) as MemoryType;
}
