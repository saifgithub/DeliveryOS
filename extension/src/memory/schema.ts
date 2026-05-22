// CHUNK-03 § 2.2 + § 4 — DDL strings and migration map.
// Each migration version is an ordered list of statements. The runner in
// migrations.ts walks `_schema_version.v` forward through the keys.

export const CURRENT_SCHEMA_VERSION = 1;

// Bootstrap step — creates only the `_schema_version` table so the runner
// can decide what (if anything) needs to apply. Runs unconditionally on
// open, idempotent via IF NOT EXISTS.
export const SCHEMA_V0_BOOTSTRAP = `
  CREATE TABLE IF NOT EXISTS _schema_version (
    v INTEGER NOT NULL
  );
`;

// v1 — the full canonical DDL. Frozen.
const SCHEMA_V1: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS memory_entries (
     id           TEXT PRIMARY KEY,
     type         TEXT NOT NULL,
     title        TEXT NOT NULL,
     payload_json TEXT NOT NULL,
     created_at   INTEGER NOT NULL,
     updated_at   INTEGER NOT NULL
   );`,

  `CREATE TABLE IF NOT EXISTS memory_links (
     from_id TEXT NOT NULL,
     to_id   TEXT NOT NULL,
     kind    TEXT NOT NULL,
     PRIMARY KEY (from_id, to_id, kind),
     FOREIGN KEY (from_id) REFERENCES memory_entries(id) ON DELETE CASCADE,
     FOREIGN KEY (to_id)   REFERENCES memory_entries(id) ON DELETE CASCADE
   );`,

  `CREATE INDEX IF NOT EXISTS idx_memory_entries_type
     ON memory_entries(type);`,

  `CREATE INDEX IF NOT EXISTS idx_memory_links_from
     ON memory_links(from_id, kind);`,

  `CREATE INDEX IF NOT EXISTS idx_memory_links_to
     ON memory_links(to_id, kind);`,
];

// v2+ migrations should be wrapped in BEGIN; ... COMMIT; (v1 is the
// initial DDL so wrapping doesn't change anything).
export const MIGRATIONS: Readonly<Record<number, readonly string[]>> = {
  1: SCHEMA_V1,
};
