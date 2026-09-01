#!/usr/bin/env node
// Non-agentic build gate for DeliveryOS's own repo (MABP §16 self-build instance).
//
// Runs the deliverable end to end from a clean state and emits a single exit code
// plus a machine-readable result at docs/build/gate/last-run.json. This is the
// un-fabricable layer: an agent cannot narrate it green — the exit code is the verdict.
//
// Two modes:
//
//   npm run gate                 the self-build regression suite: the five fixed steps below.
//                                Gates BUILDING DeliveryOS ITSELF. Result: gate/last-run.json.
//
//   npm run gate -- --item <ID>  the ACCEPTANCE gate for one work item (MABP §16, and the
//                                orchestration chassis's `GATE: machine`). Runs the five fixed
//                                steps, then executes every check the auditor authored under
//                                orchestration/audit/acceptance/<ID>/ — files this script did not
//                                write and the implementer does not own. Result:
//                                gate/item-<ID>.json, carrying per-check exit codes.
//
// In --item mode the revision is MANDATORY: a result that cannot name the revision it ran at is
// evidence about unidentified code, so an unresolvable HEAD fails the gate rather than recording
// a placeholder.
//
// Usage: npm run gate  |  npm run gate -- --item B-042

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const itemIdx = process.argv.indexOf('--item');
const item = itemIdx !== -1 ? process.argv[itemIdx + 1] : null;
if (itemIdx !== -1 && (!item || !/^[A-Za-z0-9._-]+$/.test(item))) {
  process.stderr.write('gate: --item needs an item id matching [A-Za-z0-9._-]+\n');
  process.exit(2);
}

const gateDir = join(repoRoot, 'docs', 'build', 'gate');
const resultPath = join(gateDir, item ? `item-${item}.json` : 'last-run.json');
const acceptanceDir = item
  ? join(repoRoot, 'orchestration', 'audit', 'acceptance', item)
  : null;

// Ordered steps. Each must exit 0. First non-zero stops the gate (later steps
// would build on a broken artifact and only obscure the root cause).
const steps = [
  { name: 'clean', cmd: 'npm', args: ['run', 'clean'] },
  { name: 'build', cmd: 'npm', args: ['run', 'build'] },
  { name: 'typecheck', cmd: 'npm', args: ['-w', 'deliveryos', 'run', 'typecheck'] },
  { name: 'test', cmd: 'npm', args: ['-w', 'deliveryos', 'run', 'test'] },
  { name: 'package', cmd: 'npm', args: ['-w', 'deliveryos', 'run', 'package'] },
];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit', shell: false });
  // A signal (e.g. SIGINT) or spawn failure has a null status; treat as failure.
  return r.status === null ? 1 : r.status;
}

function gitSha() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

// Every executable file directly under the item's acceptance directory, sorted for a stable order.
// Discovery, not configuration: the auditor adds a check by adding a file, and this script never
// learns what any of them assert. Non-executable files are reported, not silently skipped — a check
// that cannot run is a check that is not gating, and that must be visible rather than absent.
function discoverChecks(dir) {
  if (!dir || !existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((f) => !f.startsWith('.'))
    .sort()
    .map((f) => {
      const p = join(dir, f);
      const st = statSync(p);
      return { name: f, path: p, runnable: st.isFile() && (st.mode & 0o111) !== 0 };
    });
}

const startedAt = new Date().toISOString();
const sha = gitSha();

// --item mode records a claim about ONE revision, so it cannot proceed without knowing which.
if (item && !sha) {
  process.stderr.write('\n=== gate: FAILED — cannot resolve HEAD, so this run could not name the\n');
  process.stderr.write('    revision it gated. Run it inside a worktree checkout of the submitted\n');
  process.stderr.write('    SHA; an archive-style export has no repository metadata. ===\n');
  process.exit(1);
}

const results = [];
const checkResults = [];
let exitCode = 0;

for (const step of steps) {
  const t0 = Date.now();
  process.stdout.write(`\n=== gate: ${step.name} ===\n`);
  const code = run(step.cmd, step.args);
  results.push({ step: step.name, exitCode: code, ms: Date.now() - t0 });
  if (code !== 0) {
    exitCode = code;
    process.stderr.write(`\n=== gate: FAILED at "${step.name}" (exit ${code}) — stopping ===\n`);
    break;
  }
}

// Acceptance checks run only after the build is green: a check failing against an unbuilt tree says
// nothing about the item. Unlike the fixed steps, ALL of them run — one failure does not stop the
// rest, because the auditor needs the full set of which criteria hold, not just the first that does
// not.
if (item && exitCode === 0) {
  const checks = discoverChecks(acceptanceDir);
  if (checks === null) {
    process.stderr.write(
      `\n=== gate: FAILED — no acceptance directory at orchestration/audit/acceptance/${item}/.\n` +
        '    An item gated by this runner has independently authored checks, or it is not gated. ===\n',
    );
    exitCode = 1;
  } else if (checks.length === 0) {
    process.stderr.write(
      `\n=== gate: FAILED — orchestration/audit/acceptance/${item}/ is empty. An empty check set\n` +
        '    passes vacuously, which is the one result this gate must never produce. ===\n',
    );
    exitCode = 1;
  } else {
    for (const c of checks) {
      process.stdout.write(`\n=== gate: acceptance check ${c.name} ===\n`);
      if (!c.runnable) {
        process.stderr.write(`    not executable — counted as a failure, not skipped\n`);
        checkResults.push({ check: c.name, exitCode: null, runnable: false, ms: 0 });
        exitCode = 1;
        continue;
      }
      const t0 = Date.now();
      const code = run(c.path, []);
      checkResults.push({ check: c.name, exitCode: code, runnable: true, ms: Date.now() - t0 });
      if (code !== 0) exitCode = code;
    }
  }
}

const summary = {
  item,
  exitCode,
  gitSha: sha ?? 'unknown',
  startedAt,
  finishedAt: new Date().toISOString(),
  steps: results,
  checks: checkResults,
  passed: exitCode === 0,
};

mkdirSync(dirname(resultPath), { recursive: true });
writeFileSync(resultPath, JSON.stringify(summary, null, 2) + '\n');

const rel = `docs/build/gate/${item ? `item-${item}.json` : 'last-run.json'}`;
process.stdout.write(`\n=== gate: ${exitCode === 0 ? 'GREEN' : 'RED'} === (result: ${rel})\n`);
process.exit(exitCode);
