// DOS:P10 § reverse/reverseCapture.ts — converges the REVERSE path onto the
// forward pipeline. Takes the PRD markdown the agent wrote, parses it with the
// SAME parser the forward PRD-paste flow uses, and stores it via the SAME
// `upsertPrdParent` convenience. From here the existing decompose → REQ-NNN →
// test-spec → brief pipeline works unchanged.

import { parsePrdMarkdown } from '../prd/sectionSchema';
import type { MemoryStore } from '../memory/MemoryStore';
import type { IProjectRegistry } from '../projectRegistry';

export interface ReverseCaptureResult {
  readonly prdId: string;
  readonly projectId: string;
  readonly sectionsFound: number;
  readonly sectionsMissing: number;
}

/**
 * Parse + store the inferred PRD against the active project's intent entry.
 * The run command guarantees an active intent exists before launching, so by
 * the time the agent writes `prd.md` there is always a project to attach to.
 */
export async function captureReversePrd(args: {
  readonly contentBytes: Uint8Array;
  readonly memoryStore: MemoryStore;
  readonly registry: IProjectRegistry;
}): Promise<ReverseCaptureResult> {
  const { contentBytes, memoryStore, registry } = args;

  const active = registry.getActive();
  if (!active) {
    throw new Error('Reverse: no active project to attach the inferred PRD to.');
  }
  const entry = await memoryStore.read(active.id);
  if (!entry || entry.type !== 'intent') {
    throw new Error(`Reverse: active project ${active.id} has no intent record.`);
  }

  const intentEntry = { id: entry.id, title: entry.title };
  const raw = new TextDecoder().decode(contentBytes);
  const { sections, report } = parsePrdMarkdown(raw, entry.title);

  const existing = await memoryStore.loadPrdParent(entry.id);
  const prd = await memoryStore.upsertPrdParent(intentEntry, sections, existing?.prdId);

  return {
    prdId: prd.prdId,
    projectId: entry.id,
    sectionsFound: report.sectionsFound.length,
    sectionsMissing: report.sectionsMissing.length,
  };
}
