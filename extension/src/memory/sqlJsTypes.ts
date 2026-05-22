// CHUNK-03 — sql.js types helper.
// @types/sql.js uses `export = initSqlJs`, so the ambient `Database` /
// `SqlJsStatic` declarations are not importable as named types. We derive
// them from the initialiser's signature so the rest of the memory module
// can refer to them cleanly.

import initSqlJs from 'sql.js';

export type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
export type SqlJsDatabase = InstanceType<SqlJsStatic['Database']>;
