// CHUNK-09 § 6.4 — pure renderers for the four sibling handoff files that
// CHUNK-11's HandoffSnapshot writes alongside the brief in `.deliveryos-handoff/`.
// CHUNK-09 owns the derivation; CHUNK-11 owns the filesystem write. Pure
// (no `vscode`, no `fs`); same inputs ⇒ byte-identical output.

import type {
  CodebaseMemory,
  RequirementMemory,
  TestSpecMemory,
} from '@deliveryos/contracts';
import type { ExecutionBrief } from './types';

/**
 * Context Package ← Codebase Memory snapshot for the requirement, falling
 * back to the brief's Section 5 body when no Codebase Memory entry is linked
 * (the MVP-common case where Section 5 was user-pasted).
 */
export function renderContextPackage(
  req: RequirementMemory,
  codebase: CodebaseMemory | null,
  brief: ExecutionBrief,
): string {
  const lines: string[] = [];
  lines.push('# Existing Codebase Context');
  lines.push('');
  lines.push(
    `Source: Requirement \`${req.id}\` (${req.title}); brief \`${brief.frontmatter.brief_id}\`.`,
  );
  lines.push('');

  if (codebase) {
    const payload = codebase.payload;
    if (payload.folderStructure) {
      lines.push('## Folder structure');
      lines.push('');
      lines.push('```');
      lines.push(payload.folderStructure.trim());
      lines.push('```');
      lines.push('');
    }
    if (payload.keyFiles && payload.keyFiles.length > 0) {
      lines.push('## Key files');
      lines.push('');
      for (const f of payload.keyFiles) {
        lines.push(`- \`${f.path}\` — ${f.purpose}`);
      }
      lines.push('');
    }
    if (payload.conventions && payload.conventions.length > 0) {
      lines.push('## Conventions');
      lines.push('');
      for (const c of payload.conventions) lines.push(`- ${c}`);
      lines.push('');
    }
    if (payload.testCommands && payload.testCommands.length > 0) {
      lines.push('## Test commands');
      lines.push('');
      for (const t of payload.testCommands) lines.push(`- \`${t}\``);
      lines.push('');
    }
    if (payload.knownDefects && payload.knownDefects.length > 0) {
      lines.push('## Known defects');
      lines.push('');
      for (const d of payload.knownDefects) lines.push(`- ${d}`);
      lines.push('');
    }
  } else {
    // No Codebase Memory linked. Emit the brief's Section 5 verbatim.
    lines.push('## Existing Codebase Context');
    lines.push('');
    const section5 = brief.sections['existing-codebase-context'].body.trim();
    lines.push(section5 === '' ? '_(empty)_' : section5);
    lines.push('');
  }

  return joinLines(lines);
}

/**
 * Test Specification ← TestSpec memory entry linked to the requirement
 * (CHUNK-08 output). Renders the test spec body verbatim with a short
 * preamble pointing back to the requirement id + brief id.
 */
export function renderTestSpecification(testSpec: TestSpecMemory): string {
  const lines: string[] = [];
  lines.push('# Test Specification');
  lines.push('');
  lines.push(
    `Source: \`${testSpec.id}\` (${testSpec.title}). The harness MUST satisfy every verification criterion and test case below.`,
  );
  lines.push('');
  lines.push(testSpec.body.trim());
  return joinLines(lines);
}

/**
 * Verification Checklist ← Brief Section 10 ("Completion Criteria") rendered
 * as a GFM Markdown checklist. Bulleted lines (`- ...` / `* ...` / `+ ...`)
 * become `- [ ] ...`; blank/heading lines pass through.
 */
export function renderVerificationChecklist(brief: ExecutionBrief): string {
  const lines: string[] = [];
  lines.push('# Verification Checklist');
  lines.push('');
  lines.push(
    `Source: brief \`${brief.frontmatter.brief_id}\` Section 10 (Completion Criteria).`,
  );
  lines.push('');
  const section10 = brief.sections['completion-criteria'].body;
  for (const raw of section10.split('\n')) {
    const trimmed = raw.trim();
    if (trimmed === '') {
      lines.push('');
      continue;
    }
    if (trimmed.startsWith('#')) {
      lines.push(raw);
      continue;
    }
    const bullet = /^[-*+]\s+(?:\[[xX ]\]\s+)?(.*)$/.exec(trimmed);
    if (bullet) {
      lines.push(`- [ ] ${bullet[1]}`);
      continue;
    }
    lines.push(`- [ ] ${trimmed}`);
  }
  return joinLines(lines);
}

const MEMORY_SUMMARY_MAX_LINES = 50;

/**
 * Memory Summary ← Brief + Requirement + linked entries (best-effort).
 * The store-walking is supplied by the caller as `linkedEntries` so this
 * module stays pure (no MemoryStore dep). The truncation order per spec § 6.4
 * is requirement → brief → other linked entries.
 */
export function renderMemorySummary(args: {
  readonly brief: ExecutionBrief;
  readonly requirement: RequirementMemory;
  readonly linkedEntries: readonly { readonly id: string; readonly type: string; readonly title: string }[];
}): string {
  const lines: string[] = [];
  lines.push('# Memory summary');
  lines.push(`Requirement: ${args.requirement.id} — ${args.requirement.title}`);
  lines.push(
    `Brief: ${args.brief.frontmatter.brief_id} — ${args.brief.frontmatter.locked_at ?? args.brief.frontmatter.created_at}`,
  );
  lines.push('');
  lines.push('## Linked entries');
  for (const entry of args.linkedEntries) {
    lines.push(`- ${entry.type}:${entry.id} — ${entry.title}`);
  }
  // Truncate per spec § 6.4 — requirement + brief lines first, then linked
  // entries. We cap at 50 lines total; if linkedEntries push us over, drop
  // tail entries and append a "... N more (truncated)" indicator.
  if (lines.length > MEMORY_SUMMARY_MAX_LINES) {
    const fixedHead = 5; // headings + req + brief + blank + "Linked entries"
    const headLines = lines.slice(0, fixedHead);
    const linkedLines = lines.slice(fixedHead);
    const dropCount = lines.length - MEMORY_SUMMARY_MAX_LINES;
    const keptLinked = linkedLines.slice(0, linkedLines.length - dropCount - 1);
    return joinLines([
      ...headLines,
      ...keptLinked,
      `- … ${dropCount + 1} more (truncated)`,
    ]);
  }
  return joinLines(lines);
}

function joinLines(lines: readonly string[]): string {
  let out = lines.join('\n');
  if (!out.endsWith('\n')) out += '\n';
  // Collapse runs of 3+ blank lines to keep the output tidy.
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}
