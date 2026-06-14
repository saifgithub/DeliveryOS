#!/usr/bin/env node
// Non-agentic build gate for DeliveryOS's own repo (MABP §16 self-build instance).
//
// Runs the deliverable end to end from a clean state and emits a single exit code
// plus a machine-readable result at docs/build/gate/last-run.json. This is the
// un-fabricable layer: an agent cannot narrate it green — the exit code is the verdict.
//
// Scope: this gates BUILDING DeliveryOS ITSELF only. It is not generic; the
// per-delivery, per-stack acceptance-check generation (MABP §16.2) is a separate feature.
//
// Usage: npm run gate

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const resultPath = join(repoRoot, 'docs', 'build', 'gate', 'last-run.json');

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
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}

const startedAt = new Date().toISOString();
const results = [];
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

const summary = {
  exitCode,
  gitSha: gitSha(),
  startedAt,
  finishedAt: new Date().toISOString(),
  steps: results,
  passed: exitCode === 0,
};

mkdirSync(dirname(resultPath), { recursive: true });
writeFileSync(resultPath, JSON.stringify(summary, null, 2) + '\n');

process.stdout.write(
  `\n=== gate: ${exitCode === 0 ? 'GREEN' : 'RED'} === (result: docs/build/gate/last-run.json)\n`,
);
process.exit(exitCode);
