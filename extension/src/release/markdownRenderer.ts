// CHUNK-14 § release/markdownRenderer.ts — pure function for release evidence markdown.

import type { ChainGraph } from '@deliveryos/contracts';
import type { VerificationMemoryPayload } from '@deliveryos/contracts';

const MISSING = '> _(missing from chain — see Bypasses & gaps)_';

export function renderEvidence(chain: ChainGraph, releaseId: string): string {
  const verPayload = chain.verification.entry.payload as unknown as VerificationMemoryPayload;
  const diffVerdict = verPayload.diffSummary?.verdict ?? 'fail';
  const diffOverrideText = verPayload.diffOverride ? 'yes' : 'no';
  const bypassCount = chain.bypasses.length;
  const releaseDate = new Date(verPayload.approvedAt ?? Date.now()).toISOString().slice(0, 10);

  // Infer harness from execution entry if available.
  let harness = 'unknown';
  if (chain.execution) {
    const ep = chain.execution.entry.payload as { targetHarness?: string };
    harness = ep.targetHarness ?? 'unknown';
  }

  const lines: string[] = [];

  // Header
  const reqTitle = chain.requirement?.entry.title ?? chain.verification.entry.title;
  lines.push(`# Release Evidence — ${reqTitle}`);
  lines.push('');
  lines.push(`- **Release ID:** ${releaseId}`);
  lines.push(`- **Released:** ${releaseDate}`);
  lines.push(`- **Verdict:** ${verPayload.verdict}`);
  lines.push(
    `- **Diff verdict:** ${diffVerdict} (overridden by user: ${diffOverrideText})`,
  );
  lines.push(`- **Harness:** ${harness}`);
  lines.push(`- **Bypasses recorded:** ${bypassCount} (see § Bypasses & gaps)`);
  lines.push('');

  // Section 1: Intent
  lines.push('## 1. Intent');
  lines.push('');
  if (chain.intent) {
    lines.push(chain.intent.entry.body || chain.intent.entry.title);
    lines.push('');
    lines.push(`- Link: \`${chain.intent.path}\``);
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 2: Discovery
  lines.push('## 2. Discovery');
  lines.push('');
  if (chain.intent) {
    const ip = chain.intent.entry.payload as { discovery?: { completedAt?: number; answers?: Array<{ question: string; answer: string }> } | null };
    if (ip.discovery) {
      const answeredCount = (ip.discovery.answers ?? []).filter((a) => a.answer.trim().length > 0).length;
      lines.push(`Discovery completed. ${answeredCount} question(s) answered.`);
      lines.push('');
      lines.push(`- Source: \`${chain.intent.path}\` (Discovery section)`);
    } else {
      lines.push('_(No discovery record found — intent captured without guided discovery.)_');
      lines.push('');
      lines.push(`- Source: \`${chain.intent.path}\``);
    }
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 3: PRD section
  lines.push('## 3. PRD section');
  lines.push('');
  if (chain.prd) {
    lines.push(chain.prd.entry.body || chain.prd.entry.title);
    lines.push('');
    lines.push(`- Link: \`${chain.prd.path}\``);
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 4: Requirement
  lines.push('## 4. Requirement');
  lines.push('');
  if (chain.requirement) {
    lines.push(chain.requirement.entry.body || chain.requirement.entry.title);
    lines.push('');
    lines.push(`- Link: \`${chain.requirement.path}\``);
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 5: Design context
  lines.push('## 5. Design context');
  lines.push('');
  if (chain.design) {
    lines.push(chain.design.entry.body || chain.design.entry.title);
    lines.push('');
    lines.push(`- Link: \`${chain.design.path}\``);
    lines.push('- Updated this release: yes');
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 6: Test Specification
  lines.push('## 6. Test Specification');
  lines.push('');
  if (chain.testSpec) {
    lines.push(chain.testSpec.entry.body || chain.testSpec.entry.title);
    lines.push('');
    lines.push(`- Link: \`${chain.testSpec.path}\``);
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 7: Execution Brief
  lines.push('## 7. Execution Brief (immutable)');
  lines.push('');
  if (chain.execution) {
    const ep = chain.execution.entry.payload as { briefMarkdown?: string; targetHarness?: string; lockedAt?: string };
    lines.push(ep.briefMarkdown ? '_(Brief markdown stored in entry body)_' : '_(Brief body available in entry file)_');
    lines.push('');
    lines.push(`- Link: \`${chain.execution.path}\``);
    lines.push(`- Harness: ${ep.targetHarness ?? 'unknown'}`);
    if (ep.lockedAt) {
      lines.push(`- Generated: ${ep.lockedAt}`);
    }
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 8: Result
  lines.push('## 8. Result');
  lines.push('');
  if (chain.result) {
    const rp = chain.result.entry.payload as {
      summary?: string;
      filesChanged?: { fromGit?: Array<{ path: string }>; fromHarness?: Array<{ path: string }> };
      parsed?: { sections?: { filesChangedClaimed?: Array<{ path: string }> } };
      diffOutcome?: { verdict?: string };
    };
    lines.push(rp.summary ?? '_(No summary)_');
    lines.push('');
    lines.push(`- Link: \`${chain.result.path}\``);
    const filesFromGit = rp.filesChanged?.fromGit?.map((f) => f.path) ?? [];
    const filesFromHarness = rp.filesChanged?.fromHarness?.map((f) => f.path) ?? [];
    const allFiles = [...new Set([...filesFromGit, ...filesFromHarness])];
    if (allFiles.length > 0) {
      lines.push(`- Files changed: ${allFiles.join(', ')}`);
    }
    const dv = rp.diffOutcome?.verdict ?? diffVerdict;
    lines.push(`- Diff verdict: ${dv}`);
  } else {
    lines.push(MISSING);
  }
  lines.push('');

  // Section 9: Verification
  lines.push('## 9. Verification');
  lines.push('');
  lines.push(`- Verdict: **${verPayload.verdict}**`);
  if (verPayload.failedCriteria && verPayload.failedCriteria.length > 0) {
    lines.push(`- Failed criteria: ${verPayload.failedCriteria.join(', ')}`);
  }
  if (verPayload.defects && verPayload.defects.length > 0) {
    for (const d of verPayload.defects) {
      lines.push(`- Defect [${d.id}]: ${d.summary}`);
    }
  }
  if (verPayload.reworkNotes) {
    lines.push(`- Rework notes: ${verPayload.reworkNotes}`);
  }
  lines.push(`- Approved by user at: ${new Date(verPayload.approvedAt ?? 0).toISOString()}`);
  lines.push(`- Diff override: ${diffOverrideText}`);
  lines.push(`- Link: \`${chain.verification.path}\``);
  lines.push('');

  // Section 10: Release
  lines.push('## 10. Release');
  lines.push('');
  lines.push('This document. Linked back as the canonical `release` Memory entry.');
  lines.push('');

  // Bypasses & gaps
  lines.push('## Bypasses & gaps');
  lines.push('');
  const hasBypasses = chain.bypasses.length > 0;
  const hasWarnings = chain.warnings.length > 0;
  if (!hasBypasses && !hasWarnings) {
    lines.push('None.');
  } else {
    for (const bypass of chain.bypasses) {
      const ts = new Date(bypass.bypassedAt).toISOString();
      lines.push(
        `- BYPASS: ${bypass.gate} gate skipped — "${bypass.justification}" (recorded at ${ts})`,
      );
    }
    for (const w of chain.warnings) {
      lines.push(`- WARNING: ${w}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}
