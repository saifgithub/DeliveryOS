// CHUNK-10 § 3 — profile-aware Execution Brief renderer.
// Pure: takes the parsed ExecutionBrief from CHUNK-09 + a HarnessProfile,
// returns a RenderedBrief with profile-specific header preamble + the 10
// brief sections (optionally filtered by profile flags).
//
// CHUNK-11 and CHUNK-13 do NOT re-render — they consume `RenderedBrief.markdown`.

import type { BriefSectionId } from '@deliveryos/contracts';
import {
  BRIEF_SECTION_NAMES,
  sectionId as sectionIdForNumber,
} from '../brief/briefMarkdown';
import type { ExecutionBrief } from '../brief/types';
import type { HarnessProfile, RenderedBrief } from './types';

export function renderBrief(brief: ExecutionBrief, profile: HarnessProfile): RenderedBrief {
  const lines: string[] = [];
  lines.push('# DeliveryOS Execution Brief');
  lines.push('');
  lines.push(`## Profile: ${profile.display_name}`);
  lines.push(`## Project: ${brief.metaLines.project}`);
  lines.push(`## Requirement: ${brief.metaLines.requirement}`);
  lines.push('');

  if (profile.include_test_commands || profile.include_lint_commands) {
    const commands = extractCommands(brief, profile);
    if (commands.length > 0) {
      lines.push('## Commands');
      lines.push('');
      for (const cmd of commands) lines.push(`- ${cmd}`);
      lines.push('');
    }
  }

  for (let n = 1; n <= 10; n++) {
    if (shouldSkipSection(n, profile)) continue;
    const id = sectionIdForNumber(n);
    if (!id) continue;
    const section = brief.sections[id];
    lines.push(`## ${n}. ${BRIEF_SECTION_NAMES[n - 1]}`);
    lines.push('');
    lines.push(section.body.trimEnd());
    lines.push('');
  }

  let markdown = lines.join('\n');
  markdown = markdown.replace(/\n+$/, '\n');
  if (!markdown.endsWith('\n')) markdown += '\n';

  return {
    profileName: profile.name,
    briefId: brief.frontmatter.brief_id,
    markdown,
    renderedAt: new Date().toISOString(),
  };
}

function shouldSkipSection(n: number, profile: HarnessProfile): boolean {
  if (!profile.include_forbidden_changes && n === 8) return true;
  if (profile.brief_style === 'concise' && (n === 3 || n === 4 || n === 5)) return true;
  return false;
}

/**
 * Heuristically extract test/lint/build commands from Section 5
 * ("Existing Codebase Context"). Matches lines of the form
 *   `test: npm test`
 *   `lint: npm run lint`
 *   `build: npm run build`
 *
 * Returns the verbatim line(s). Empty when nothing matches — Section 5 is
 * free-form and many briefs won't have command lines at all.
 */
function extractCommands(brief: ExecutionBrief, profile: HarnessProfile): readonly string[] {
  const codebaseSectionId: BriefSectionId = 'existing-codebase-context';
  const body = brief.sections[codebaseSectionId]?.body ?? '';
  const out: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    const match = /^(test|lint|build)\s*:\s*(.+)$/i.exec(line);
    if (!match) continue;
    const kind = match[1].toLowerCase();
    if (kind === 'test' && !profile.include_test_commands) continue;
    if (kind === 'lint' && !profile.include_lint_commands) continue;
    if (kind === 'build' && !profile.include_test_commands && !profile.include_lint_commands)
      continue;
    out.push(`${match[1]}: ${match[2]}`);
  }
  return out;
}
