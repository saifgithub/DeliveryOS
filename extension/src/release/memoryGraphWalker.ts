// CHUNK-14 § release/memoryGraphWalker.ts — pure recursive chain walker.
// No I/O beyond MemoryStore calls.

import type { MemoryEntry } from '@deliveryos/contracts';
import type { ChainGraph, MemoryNode } from '@deliveryos/contracts';
import type { BypassRecord, VerificationMemoryPayload } from '@deliveryos/contracts';
import type { MemoryStore } from '../memory/MemoryStore';
import { DELIVERYOS_DIR, MEMORY_BODY_DIR } from '../memory/paths';

function toPath(type: string, id: string): string {
  return `${DELIVERYOS_DIR}/${MEMORY_BODY_DIR}/${type}/${id}.md`;
}

function toNode(entry: MemoryEntry): MemoryNode {
  return { entry, path: toPath(entry.type, entry.id) };
}

export async function walkChain(
  verificationId: string,
  store: MemoryStore,
): Promise<ChainGraph> {
  const warnings: string[] = [];
  const visited = new Set<string>();

  // Read the verification entry first.
  const verificationEntry = await store.read(verificationId);
  if (!verificationEntry || verificationEntry.type !== 'verification') {
    throw new Error(`Verification entry ${verificationId} not found`);
  }

  visited.add(verificationId);
  const verificationNode: MemoryNode = toNode(verificationEntry);

  // Extract bypasses from inline payload.
  const verPayload = verificationEntry.payload as unknown as VerificationMemoryPayload;
  const bypasses: BypassRecord[] = Array.isArray(verPayload.bypasses)
    ? [...verPayload.bypasses]
    : [];

  // --- Hop 1: verification → result (via evaluates) ---
  let resultNode: MemoryNode | undefined;
  {
    const resultCandidates = await store.walk(verificationId, 'evaluates');
    const resultEntry = resultCandidates.find((e) => e.type === 'result');
    if (!resultEntry) {
      warnings.push('missing link: verification ──evaluates──▶ result');
    } else if (visited.has(resultEntry.id)) {
      warnings.push(`cycle detected at ${resultEntry.id} via evaluates`);
    } else {
      visited.add(resultEntry.id);
      resultNode = toNode(resultEntry);
    }
  }

  // --- Hop 2: verification → test-spec (via evaluates) ---
  let testSpecNode: MemoryNode | undefined;
  {
    const testSpecCandidates = await store.walk(verificationId, 'evaluates');
    const testSpecEntry = testSpecCandidates.find((e) => e.type === 'test-spec');
    if (!testSpecEntry) {
      warnings.push('missing link: verification ──evaluates──▶ test-spec');
    } else if (visited.has(testSpecEntry.id)) {
      warnings.push(`cycle detected at ${testSpecEntry.id} via evaluates`);
    } else {
      visited.add(testSpecEntry.id);
      testSpecNode = toNode(testSpecEntry);
    }
  }

  // --- Hop 3: result ← produced ─ execution (reverse lookup via backlinks) ---
  let executionNode: MemoryNode | undefined;
  if (resultNode) {
    const links = await store.backlinks(resultNode.entry.id, 'produced');
    const executionLink = links.find((l) => l.fromId !== resultNode!.entry.id);
    if (!executionLink) {
      warnings.push('missing link: execution ──produced──▶ result');
    } else {
      const execEntry = await store.read(executionLink.fromId);
      if (!execEntry || execEntry.type !== 'execution') {
        warnings.push('missing link: execution ──produced──▶ result');
      } else if (visited.has(execEntry.id)) {
        warnings.push(`cycle detected at ${execEntry.id} via produced`);
      } else {
        visited.add(execEntry.id);
        executionNode = toNode(execEntry);
      }
    }
  }

  // --- Hop 4: execution → requirement (via derives-from, not prd) ---
  let requirementNode: MemoryNode | undefined;
  if (executionNode) {
    const candidates = await store.walk(executionNode.entry.id, 'derives-from');
    const reqEntry = candidates.find((e) => {
      if (e.type !== 'requirement') return false;
      const p = e.payload as { kind?: string };
      return p.kind !== 'prd';
    });
    if (!reqEntry) {
      warnings.push('missing link: execution ──derives-from──▶ requirement');
    } else if (visited.has(reqEntry.id)) {
      warnings.push(`cycle detected at ${reqEntry.id} via derives-from`);
    } else {
      visited.add(reqEntry.id);
      requirementNode = toNode(reqEntry);
    }
  }

  // --- Hop 5: requirement → prd (via derives-from, filter kind='prd') ---
  let prdNode: MemoryNode | undefined;
  if (requirementNode) {
    const candidates = await store.walk(requirementNode.entry.id, 'derives-from');
    const prdEntry = candidates.find((e) => {
      if (e.type !== 'requirement') return false;
      const p = e.payload as { kind?: string };
      return p.kind === 'prd';
    });
    if (!prdEntry) {
      warnings.push(
        'missing link: requirement ──derives-from──▶ requirement(kind=prd)',
      );
    } else if (visited.has(prdEntry.id)) {
      warnings.push(`cycle detected at ${prdEntry.id} via derives-from`);
    } else {
      visited.add(prdEntry.id);
      prdNode = toNode(prdEntry);
    }
  }

  // --- Hop 6: prd → intent (via derives-from) ---
  let intentNode: MemoryNode | undefined;
  if (prdNode) {
    const candidates = await store.walk(prdNode.entry.id, 'derives-from');
    const intentEntry = candidates.find((e) => e.type === 'intent');
    if (!intentEntry) {
      warnings.push('missing link: prd ──derives-from──▶ intent');
    } else if (visited.has(intentEntry.id)) {
      warnings.push(`cycle detected at ${intentEntry.id} via derives-from`);
    } else {
      visited.add(intentEntry.id);
      intentNode = toNode(intentEntry);
    }
  }

  // --- Design: walk from requirement via derives-from for design entries ---
  let designNode: MemoryNode | undefined;
  if (requirementNode) {
    const candidates = await store.walk(requirementNode.entry.id, 'derives-from');
    const designEntry = candidates.find((e) => e.type === 'design');
    if (designEntry && !visited.has(designEntry.id)) {
      visited.add(designEntry.id);
      designNode = toNode(designEntry);
    }
  }

  return {
    ...(intentNode !== undefined ? { intent: intentNode } : {}),
    ...(prdNode !== undefined ? { prd: prdNode } : {}),
    ...(requirementNode !== undefined ? { requirement: requirementNode } : {}),
    ...(designNode !== undefined ? { design: designNode } : {}),
    ...(testSpecNode !== undefined ? { testSpec: testSpecNode } : {}),
    // codebase is always undefined in v1
    ...(executionNode !== undefined ? { execution: executionNode } : {}),
    ...(resultNode !== undefined ? { result: resultNode } : {}),
    verification: verificationNode,
    bypasses,
    warnings,
  };
}
