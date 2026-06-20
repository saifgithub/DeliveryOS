// Contract test: the body-file format documented in
// skills/sm-elicitation/REFERENCE.md must remain ingestible by the memory
// store. /sm-elicitation hand-authors `intent` (spec) + `design` (decision)
// body files and appends `derives-from` triples to LINKS.md; this test writes
// those exact shapes and asserts a fresh DB rebuilds them losslessly. If the
// frontmatter contract (markdown.ts) or the payload shapes (contracts) drift,
// this fails — a signal to update the skill REFERENCE alongside the code.

import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { Uri, __resetVscodeStub } from './vscode-stub';
import { MemoryStore } from '../src/memory/MemoryStore';
import { bodyPath, writeBody } from '../src/memory/markdown';
import { memoryLinksPath } from '../src/memory/paths';

const wasmBytes = readFileSync(
  path.resolve(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
);

const workspaceUri = Uri.file('/test-workspace');

// --- Verbatim from skills/sm-elicitation/REFERENCE.md ---------------------
// Hand-authored exactly as the skill writes them (NOT via renderFrontmatter):
// the point is to verify the documented, by-hand format parses.

const INTENT_ID = 'intent-1a2b3c4d';
const DESIGN_ID = 'design-9f8e7d6c';

const INTENT_BODY = `---
id: ${INTENT_ID}
type: intent
title: "Payments reconciliation — elicitation"
created_at: 2026-06-20T14:30:00.000Z
updated_at: 2026-06-20T14:30:00.000Z
payload_json: {"rawIdea":{"text":"We need to stop chasing mismatched settlements by hand","capturedAt":1718894400000},"discovery":null,"problemStatement":"Finance reconciles processor settlements to the ledger manually each morning; mismatches are found late and cost ~6 hrs/week.","userGoals":["Auto-match settlement lines to ledger entries","Flag only true exceptions for human review"],"nonGoals":["Replacing the ledger system","Real-time matching"],"successCriteria":["95%+ lines auto-matched","Exception queue cleared before 10:00 daily"]}
---

# Payments reconciliation — specification

**Problem.** Finance reconciles processor settlements to the ledger manually each morning.
`;

const DESIGN_BODY = `---
id: ${DESIGN_ID}
type: design
title: "Reconcile nightly in batch, not real-time"
created_at: 2026-06-20T14:32:00.000Z
updated_at: 2026-06-20T14:32:00.000Z
payload_json: {"area":"architecture","decision":"Run reconciliation as a nightly batch keyed off the processor settlement file.","rationale":"Settlement files only land once daily; real-time adds cost with no business value.","rejectedOptions":["Real-time matching — no upstream real-time feed exists","Hourly polling — wastes compute, files only arrive nightly"],"tradeoffs":"Exceptions surface next morning, not intraday — acceptable per finance."}
---

# Decision: reconcile nightly in batch
`;

const LINKS_FILE = `# Memory Links

${DESIGN_ID}  derives-from  ${INTENT_ID}
`;

describe('sm-elicitation body-file format (skill ↔ memory contract)', () => {
  beforeEach(() => __resetVscodeStub());
  afterEach(() => __resetVscodeStub());

  it('rebuilds hand-authored intent + design entries and the derives-from link', async () => {
    // Write the files exactly as /sm-elicitation would (no store.create()).
    await writeBody(bodyPath(workspaceUri, 'intent', INTENT_ID), INTENT_BODY);
    await writeBody(bodyPath(workspaceUri, 'design', DESIGN_ID), DESIGN_BODY);
    await writeBody(memoryLinksPath(workspaceUri), LINKS_FILE);

    // Fresh, empty DB recovers everything from the markdown alone.
    const store = await MemoryStore.openInMemoryForTests(wasmBytes, workspaceUri);
    const counts = await store.rebuildFromMarkdown();
    assert.equal(counts.entries, 2, 'both body files ingested');
    assert.equal(counts.links, 1, 'derives-from triple ingested');

    const { entries, links } = await store.exportAll();

    const intent = entries.find((e) => e.id === INTENT_ID);
    assert.ok(intent, 'intent entry present');
    assert.equal(intent.type, 'intent');
    assert.equal(intent.createdAt, Date.parse('2026-06-20T14:30:00.000Z'));
    const ip = intent.payload as {
      rawIdea: { text: string; capturedAt: number };
      discovery: null;
      problemStatement: string;
      userGoals: string[];
      nonGoals: string[];
      successCriteria: string[];
    };
    // IntentPayload required fields survive the round-trip…
    assert.equal(ip.discovery, null);
    assert.equal(ip.rawIdea.capturedAt, 1718894400000);
    // …and the elicitation spec fields.
    assert.match(ip.problemStatement, /reconciles processor settlements/);
    assert.equal(ip.userGoals.length, 2);
    assert.equal(ip.nonGoals.length, 2);
    assert.equal(ip.successCriteria.length, 2);

    const design = entries.find((e) => e.id === DESIGN_ID);
    assert.ok(design, 'design entry present');
    assert.equal(design.type, 'design');
    const dp = design.payload as {
      area: string;
      decision: string;
      rationale: string;
      rejectedOptions: string[];
      tradeoffs: string;
    };
    assert.equal(dp.area, 'architecture');
    assert.match(dp.decision, /nightly batch/);
    assert.equal(dp.rejectedOptions.length, 2);
    assert.ok(dp.tradeoffs.length > 0);

    assert.deepEqual(links, [
      { fromId: DESIGN_ID, toId: INTENT_ID, kind: 'derives-from' },
    ]);

    await store.close();
  });
});
