/**
 * seed-demo.ts — Generates .deliveryos/memory.sqlite + body files
 * from scripts/seed-demo.source.yml.
 *
 * Uses sql.js (same library as the extension runtime) to produce a
 * compatible SQLite file that DeliveryOS can read without migration.
 *
 * Run from examples/bug-triage/:
 *   npx tsx scripts/seed-demo.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { load as parseYaml } from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DELIVERYOS_DIR = path.join(ROOT, '.deliveryos');
const MEMORY_DIR = path.join(DELIVERYOS_DIR, 'memory');
const SQLITE_PATH = path.join(DELIVERYOS_DIR, 'memory.sqlite');

// Read the WASM from the root node_modules/sql.js dist.
// Walk up until we find it.
function findSqlJsWasm(): Buffer {
  const candidates = [
    path.resolve(ROOT, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve(ROOT, '../../../node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve(__dirname, '../../../../node_modules/sql.js/dist/sql-wasm.wasm'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  // Try resolve from require (CJS fallback)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlJsPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    return fs.readFileSync(sqlJsPath);
  } catch {
    throw new Error('Cannot locate sql-wasm.wasm. Run npm install from the repo root first.');
  }
}

function renderFrontmatter(fields: {
  id: string;
  type: string;
  title: string;
  createdAt: number;
}): string {
  const escaped = fields.title.replace(/"/g, '\\"');
  return [
    '---',
    `id: ${fields.id}`,
    `type: ${fields.type}`,
    `title: "${escaped}"`,
    `created_at: ${new Date(fields.createdAt).toISOString()}`,
    '---',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  // Read source YAML.
  const sourceYmlPath = path.join(__dirname, 'seed-demo.source.yml');
  const sourceYml = fs.readFileSync(sourceYmlPath, 'utf8');
  const source = parseYaml(sourceYml) as {
    project: { name: string };
    intent: {
      id: string;
      rawIdea: string;
      discovery: Array<{ question: string; answer: string }>;
      title: string;
    };
    codebase: {
      id: string;
      title: string;
      body: string;
    };
  };

  const now = Date.now();

  // --- Intent entry ---
  const intentId = source.intent.id;
  const intentTitle = source.intent.title;
  const intentPayload = {
    rawIdea: {
      text: source.intent.rawIdea,
      capturedAt: now,
    },
    discovery: {
      answers: source.intent.discovery.map((qa: { question: string; answer: string }) => ({
        questionId: `q-${qa.question.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`,
        question: qa.question,
        answer: qa.answer,
        answeredAt: now,
      })),
      completedAt: now,
    },
  };
  const intentBody = source.intent.rawIdea;
  const intentFullBody =
    renderFrontmatter({ id: intentId, type: 'intent', title: intentTitle, createdAt: now }) +
    intentBody;

  // --- Codebase entry ---
  const codebaseId = source.codebase.id;
  const codebaseTitle = source.codebase.title;
  const codebasePayload = {
    summary: source.codebase.body,
    capturedAt: now,
    source: 'manual',
  };
  const codebaseBody = source.codebase.body;
  const codebaseFullBody =
    renderFrontmatter({
      id: codebaseId,
      type: 'codebase',
      title: codebaseTitle,
      createdAt: now,
    }) + codebaseBody;

  // --- Ensure directories exist ---
  fs.mkdirSync(path.join(MEMORY_DIR, 'intent'), { recursive: true });
  fs.mkdirSync(path.join(MEMORY_DIR, 'codebase'), { recursive: true });

  // --- Write body files ---
  const intentBodyPath = path.join(MEMORY_DIR, 'intent', `${intentId}.md`);
  const codebaseBodyPath = path.join(MEMORY_DIR, 'codebase', `${codebaseId}.md`);
  fs.writeFileSync(intentBodyPath, intentFullBody, 'utf8');
  fs.writeFileSync(codebaseBodyPath, codebaseFullBody, 'utf8');
  console.log(`Wrote ${intentBodyPath}`);
  console.log(`Wrote ${codebaseBodyPath}`);

  // --- Build SQLite ---
  const wasmBytes = findSqlJsWasm();
  const SQL = await initSqlJs({ wasmBinary: wasmBytes.buffer as ArrayBuffer });
  const db = new SQL.Database();

  // Bootstrap _schema_version table (mirrors CHUNK-03 schema.ts).
  db.exec(`CREATE TABLE IF NOT EXISTS _schema_version (v INTEGER NOT NULL);`);

  // v1 DDL (mirrors CHUNK-03 schema.ts SCHEMA_V1).
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_entries (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_links (
      from_id TEXT NOT NULL,
      to_id   TEXT NOT NULL,
      kind    TEXT NOT NULL,
      PRIMARY KEY (from_id, to_id, kind),
      FOREIGN KEY (from_id) REFERENCES memory_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (to_id)   REFERENCES memory_entries(id) ON DELETE CASCADE
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memory_entries_type ON memory_entries(type);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memory_links_from ON memory_links(from_id, kind);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memory_links_to ON memory_links(to_id, kind);
  `);

  // Insert schema version.
  db.exec(`DELETE FROM _schema_version;`);
  db.run(`INSERT INTO _schema_version (v) VALUES (?)`, [1]);

  // Insert intent entry.
  db.run(
    `INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [intentId, 'intent', intentTitle, JSON.stringify(intentPayload), now, now],
  );

  // Insert codebase entry.
  db.run(
    `INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [codebaseId, 'codebase', codebaseTitle, JSON.stringify(codebasePayload), now, now],
  );

  // Export and write the SQLite file.
  const snapshot = db.export();
  fs.writeFileSync(SQLITE_PATH, Buffer.from(snapshot));
  db.close();
  console.log(`Wrote ${SQLITE_PATH}`);
  console.log('Seed complete.');
}

main().catch((err: unknown) => {
  console.error('seed-demo.ts: fatal error:', err);
  process.exit(1);
});
