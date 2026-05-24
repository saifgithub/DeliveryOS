// CHUNK-09 § 11.5 — user-visible brief id format.
// Stored in `payload.id` of the `type='execution'` memory entry and as the
// `brief_id` value in the brief markdown frontmatter. Distinct from the
// SQLite row id (which is `execution-<short-uuid>` per `generateMemoryId`).

import { randomUUID } from 'node:crypto';

export function nextBriefId(): string {
  return `brief_${randomUUID()}`;
}
