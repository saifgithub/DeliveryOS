// CHUNK-09 § 9 step 5 — assemble a fresh ExecutionBrief draft from a
// requirement + its linked test-spec (CHUNK-08) + pasted Codebase Context.
//
// Pure module: no `vscode` imports. Takes the MemoryStore as a dep so it
// can be wired in tests with the in-memory factory.

import {
  BRIEF_SCHEMA_VERSION,
  CANONICAL_BRIEF_TITLE,
  EMPTY_FORBIDDEN_SENTINEL,
  renderExpectedOutputSection,
} from './briefMarkdown';
import { nextBriefId } from './briefIds';
import type { ExecutionBrief, BriefMetaLines, BriefSection } from './types';
import type { BriefSectionId } from '@deliveryos/contracts';
import type {
  MemoryStore,
  RequirementItemRecord,
  TestSpecRecord,
} from '../memory/MemoryStore';

export interface AssembleDraftOptions {
  readonly memoryStore: MemoryStore;
  readonly requirementEntryId: string;
  readonly projectId: string;
  readonly projectTitle: string;
  /** Brief entry id being revised. Pre-fills `supersedes` in frontmatter. */
  readonly supersedesEntryId?: string;
}

export type AssembleDraftOutcome =
  | { readonly ok: true; readonly brief: ExecutionBrief }
  | { readonly ok: false; readonly reason: 'no-requirement' };

export async function assembleDraft(
  options: AssembleDraftOptions,
): Promise<AssembleDraftOutcome> {
  const reqEntry = await options.memoryStore.read(options.requirementEntryId);
  if (!reqEntry || reqEntry.type !== 'requirement') {
    return { ok: false, reason: 'no-requirement' };
  }
  const stored = reqEntry.payload as unknown as {
    readonly id: string;
    readonly title: string;
    readonly text: string;
    readonly kind?: string;
  };
  if (stored.kind !== 'requirement-item') {
    return { ok: false, reason: 'no-requirement' };
  }
  const requirementRecord: RequirementItemRecord = {
    entryId: reqEntry.id,
    payload: stored as RequirementItemRecord['payload'],
    createdAt: reqEntry.createdAt,
    updatedAt: reqEntry.updatedAt,
  };

  const testSpecRecord = await options.memoryStore.getTestSpec(reqEntry.id);

  const nowIso = new Date().toISOString();
  const briefId = nextBriefId();

  const frontmatter: ExecutionBrief['frontmatter'] = {
    brief_id: briefId,
    schema_version: BRIEF_SCHEMA_VERSION,
    project_id: options.projectId,
    requirement_id: requirementRecord.payload.id,
    ...(testSpecRecord ? { test_spec_id: testSpecRecord.payload.id } : {}),
    ...(options.supersedesEntryId ? { supersedes: options.supersedesEntryId } : {}),
    profile: '(unspecified)',
    created_at: nowIso,
  };

  const meta: BriefMetaLines = {
    profile: '(unspecified)',
    project: options.projectTitle,
    requirement: `${requirementRecord.payload.id} — ${requirementRecord.payload.title}`,
  };

  const sections = buildSectionsFromRequirement(requirementRecord, testSpecRecord);
  return {
    ok: true,
    brief: {
      frontmatter,
      title: CANONICAL_BRIEF_TITLE,
      metaLines: meta,
      sections,
      allowed: { kind: 'allowed', globs: [] },
      forbidden: { kind: 'forbidden', globs: [] },
    },
  };
}

function buildSectionsFromRequirement(
  req: RequirementItemRecord,
  testSpec: TestSpecRecord | null,
): Readonly<Record<BriefSectionId, BriefSection>> {
  const objectiveBody = makeObjective(req);
  const approvedRequirementBody = makeApprovedRequirement(req);
  const businessIntentBody = '_TODO: capture the business motivation behind this requirement._';
  const designContextBody =
    '_TODO: paste architecture / data-model / API decisions that bound the solution._';
  const codebaseContextBody = '';
  const testFirstSpecBody = makeTestFirstSpec(req, testSpec);
  const completionCriteriaBody =
    '- [ ] All Allowed-Changes files modified or new\n- [ ] No Forbidden-Changes files touched\n- [ ] All test cases pass';

  const sections: Record<BriefSectionId, BriefSection> = {
    objective: { id: 'objective', number: 1, name: 'Objective', body: objectiveBody },
    'approved-requirement': {
      id: 'approved-requirement',
      number: 2,
      name: 'Approved Requirement',
      body: approvedRequirementBody,
    },
    'business-intent': {
      id: 'business-intent',
      number: 3,
      name: 'Business Intent',
      body: businessIntentBody,
    },
    'approved-design-context': {
      id: 'approved-design-context',
      number: 4,
      name: 'Approved Design Context',
      body: designContextBody,
    },
    'existing-codebase-context': {
      id: 'existing-codebase-context',
      number: 5,
      name: 'Existing Codebase Context',
      // Paste-in-MVP per spec § 11.2 + TODO seam for codebaseExtractor.
      // TODO(codebase-memory): replace with auto-extracted Codebase Memory
      // payload when the codebaseExtractor module lands (post-MVP).
      body: codebaseContextBody,
    },
    'test-first-specification': {
      id: 'test-first-specification',
      number: 6,
      name: 'Test-First Specification',
      body: testFirstSpecBody,
    },
    'allowed-changes': {
      id: 'allowed-changes',
      number: 7,
      name: 'Allowed Changes',
      body: '',
    },
    'forbidden-changes': {
      id: 'forbidden-changes',
      number: 8,
      name: 'Forbidden Changes',
      body: EMPTY_FORBIDDEN_SENTINEL,
    },
    'expected-output': {
      id: 'expected-output',
      number: 9,
      name: 'Expected Output',
      body: renderExpectedOutputSection(),
    },
    'completion-criteria': {
      id: 'completion-criteria',
      number: 10,
      name: 'Completion Criteria',
      body: completionCriteriaBody,
    },
  };
  return sections;
}

function makeObjective(req: RequirementItemRecord): string {
  const firstSentence = firstSentenceOf(req.payload.text) || req.payload.title;
  return `Implement ${req.payload.id} (${req.payload.title}). ${firstSentence}`;
}

function makeApprovedRequirement(req: RequirementItemRecord): string {
  const header = `**${req.payload.id} — ${req.payload.title}** (${req.payload.category}, ${req.payload.priority})`;
  return `${header}\n\n${req.payload.text.trim()}`;
}

function makeTestFirstSpec(
  req: RequirementItemRecord,
  testSpec: TestSpecRecord | null,
): string {
  if (!testSpec) {
    return `_No Test Specification linked yet — run the Test Designer for ${req.payload.id} before saving this brief._`;
  }
  const lines: string[] = [];
  lines.push(`Source: \`${testSpec.payload.id}\` (re-parsed from the saved test-spec markdown).`);
  lines.push('');
  if (testSpec.payload.verificationCriteria.length > 0) {
    lines.push('**Verification criteria:**');
    for (const vc of testSpec.payload.verificationCriteria) {
      lines.push(`- ${vc.id}: ${vc.text}`);
    }
    lines.push('');
  }
  if (testSpec.payload.cases.length > 0) {
    lines.push('**Test cases:**');
    for (const c of testSpec.payload.cases) {
      lines.push(`- ${c.id} — ${c.title}`);
    }
  }
  return lines.join('\n').trim();
}

function firstSentenceOf(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  const match = /^(.+?[.!?])(\s|$)/.exec(trimmed);
  return match ? match[1] : trimmed.split('\n')[0];
}
