// CHUNK-03 § 2.3 + § 7 — forward-only migration runner.
// Called once from `MemoryStore.open()` before any other SQL runs.

import { CURRENT_SCHEMA_VERSION, MIGRATIONS, SCHEMA_V0_BOOTSTRAP } from './schema';
import type { SqlJsDatabase } from './sqlJsTypes';

export function runMigrations(db: SqlJsDatabase): void {
  // Bootstrap: ensure _schema_version exists. Idempotent.
  db.exec(SCHEMA_V0_BOOTSTRAP);

  const rows = db.exec('SELECT v FROM _schema_version LIMIT 1');
  const current =
    rows.length > 0 && rows[0].values.length > 0
      ? (rows[0].values[0][0] as number)
      : 0;

  for (let v = current + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const stmts = MIGRATIONS[v];
    if (!stmts) {
      throw new Error(`MemoryStore: missing migration for schema v${v}`);
    }
    for (const sql of stmts) {
      db.exec(sql);
    }
    db.exec('DELETE FROM _schema_version');
    db.run('INSERT INTO _schema_version (v) VALUES (?)', [v]);
  }
}
