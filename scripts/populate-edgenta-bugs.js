#!/usr/bin/env node

/**
 * Populate edgenta_OKR bugs into DeliveryOS SQLite from DEFECT_LIST.md.
 *
 * Usage:
 *   node scripts/populate-edgenta-bugs.js
 *
 * This reads /Volumes/Extreme Pro/edgenta_OKR/docs/build/DEFECT_LIST.md,
 * parses the defect table, and inserts bugs into
 * /Volumes/Extreme Pro/edgenta_OKR/.deliveryos/memory.sqlite.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const DEFECT_LIST_PATH = '/Volumes/Extreme Pro/edgenta_OKR/docs/build/DEFECT_LIST.md';
const DB_PATH = '/Volumes/Extreme Pro/edgenta_OKR/.deliveryos/memory.sqlite';
const PROJECT_ID_PATH = '/Volumes/Extreme Pro/edgenta_OKR/.deliveryos';

function generateUUID() {
  return crypto.randomUUID();
}

function severityMap(severity) {
  const m = {
    'Critical': 'critical',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low',
  };
  return m[severity] || 'medium';
}

function parseDefectList(markdown) {
  const lines = markdown.split('\n');
  const defects = [];
  let inTable = false;
  let headerSkipped = false;

  for (const line of lines) {
    if (line.includes('| DEF-ID | Area | Severity')) {
      inTable = true;
      headerSkipped = false;
      continue;
    }

    if (!inTable) continue;

    // Stop at next section (---)
    if (line.trim().startsWith('---') && headerSkipped) break;

    // Skip separator row
    if (line.includes('|---') || line.includes('|-----')) {
      headerSkipped = true;
      continue;
    }

    // Parse defect row
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < 8) continue;

    const [defId, area, severity, status, description, discoveredIn, fixAgent, verified] = cells;

    if (!defId.startsWith('DEF-')) continue;

    defects.push({
      id: defId,
      area,
      severity: severityMap(severity),
      status: status.toLowerCase(),
      description,
      discoveredIn,
      verified: verified !== '—',
      notes: `Imported from OKR.AI DEFECT_LIST — ${verified}`,
    });
  }

  return defects;
}

async function populateBugs() {
  const markdown = fs.readFileSync(DEFECT_LIST_PATH, 'utf8');
  const defects = parseDefectList(markdown);

  console.log(`Parsed ${defects.length} defects from DEFECT_LIST.md`);

  // Get or create project entry
  const db = new sqlite3.Database(DB_PATH);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Get or create a project entry for edgenta_OKR
      db.get(
        `SELECT id FROM memory_entries WHERE type = 'intent' AND json_extract(payload_json, '$.title') = 'edgenta_OKR'`,
        (err, row) => {
          if (err) {
            console.error('Error querying project:', err);
            reject(err);
            return;
          }

          let projectId;
          if (row) {
            projectId = row.id;
            console.log(`Using existing project entry: ${projectId}`);
            insertBugs();
          } else {
            console.log('Creating new project entry for edgenta_OKR');
            const projectEntryId = generateUUID();
            const projectCreatedAt = Date.now();
            const projectPayload = {
              kind: 'intent',
              title: 'edgenta_OKR',
              description: 'OKR.AI — KPI scorecard tracking for MEEM',
            };

            db.run(
              `INSERT INTO memory_entries (id, type, title, payload_json, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                projectEntryId,
                'intent',
                'edgenta_OKR',
                JSON.stringify(projectPayload),
                projectCreatedAt,
                projectCreatedAt,
              ],
              (err) => {
                if (err) {
                  console.error('Error creating project entry:', err);
                  reject(err);
                  return;
                }
                projectId = projectEntryId;
                console.log(`Created project entry: ${projectId}`);
                insertBugs();
              }
            );
          }

          function insertBugs() {
            let inserted = 0;
            db.run('BEGIN TRANSACTION');

            // Get the highest existing BUG-NNN number
            db.get(
              `SELECT MAX(CAST(SUBSTR(json_extract(payload_json, '$.id'), 5) AS INTEGER)) as maxNum
               FROM memory_entries WHERE type = 'bug' AND json_extract(payload_json, '$.id') LIKE 'BUG-%'`,
              (err, row) => {
                if (err) {
                  console.error('Error querying max bug id:', err);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                let nextNum = (row?.maxNum || 0) + 1;

                defects.forEach((defect, idx) => {
                  const bugEntryId = generateUUID();
                  const bugCreatedAt = Date.now();
                  const bugNum = String(nextNum++).padStart(3, '0');
                  const bugId = `BUG-${bugNum}`;

                  const bugPayload = {
                    kind: 'bug',
                    id: bugId,
                    description: defect.description,
                    severity: defect.severity,
                    status: 'open', // Always start as open for dogfooding
                    area: defect.area,
                    discoveredIn: defect.discoveredIn,
                    notes: defect.notes,
                  };

                  const title = `${bugId} — ${defect.description.slice(0, 80)}`;

                  db.run(
                    `INSERT INTO memory_entries (id, type, title, body, payload_json, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                      bugEntryId,
                      'bug',
                      title,
                      defect.description,
                      JSON.stringify(bugPayload),
                      bugCreatedAt,
                      bugCreatedAt,
                    ],
                    (err) => {
                      if (err) {
                        console.error(`Error inserting bug ${bugId}:`, err);
                        return;
                      }

                      // Link bug to project via 'derives-from'
                      db.run(
                        `INSERT INTO memory_links (from_id, to_id, kind) VALUES (?, ?, ?)`,
                        [bugEntryId, projectId, 'derives-from'],
                        (err) => {
                          if (err) {
                            console.error(`Error linking bug ${bugId}:`, err);
                            return;
                          }
                          inserted++;
                          if (inserted % 5 === 0) {
                            console.log(`  Inserted ${inserted}/${defects.length} bugs...`);
                          }

                          if (inserted === defects.length) {
                            db.run('COMMIT', (err) => {
                              if (err) {
                                console.error('Error committing transaction:', err);
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                              }
                              console.log(`✅ Successfully inserted ${inserted} bugs!`);
                              db.close((err) => {
                                if (err) console.error('Error closing db:', err);
                                resolve();
                              });
                            });
                          }
                        }
                      );
                    }
                  );
                });
              }
            );
          }
        }
      );
    });
  });
}

populateBugs().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
