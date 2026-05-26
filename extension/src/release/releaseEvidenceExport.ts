// CHUNK-14 § release/releaseEvidenceExport.ts — top-level coordinator.

import * as vscode from 'vscode';
import type { MemoryStore } from '../memory/MemoryStore';
import type { ReleaseEvidence, ReleaseMemoryPayload } from '@deliveryos/contracts';
import type { VerificationMemoryPayload, MemoryRef } from '@deliveryos/contracts';
import type { ReleasePayload } from '@deliveryos/contracts';
import { walkChain } from './memoryGraphWalker';
import { renderEvidence } from './markdownRenderer';
import { DELIVERYOS_DIR } from '../memory/paths';

const RELEASES_DIR = 'releases';

function makeReleaseId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  return `release-${date}-${rand}`;
}

function releasesDir(workspaceUri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(workspaceUri, DELIVERYOS_DIR, RELEASES_DIR);
}

/**
 * Export release evidence for a given verification entry.
 * Calls walkChain() → renderEvidence() → writes .deliveryos/releases/<id>.md
 * Persists ReleaseMemory with links: releases → verification, includes → requirement.
 */
export async function exportReleaseEvidence(
  store: MemoryStore,
  workspaceUri: vscode.Uri,
  verificationId: string,
): Promise<ReleaseEvidence> {
  const chain = await walkChain(verificationId, store);
  const releaseId = makeReleaseId();
  const markdown = renderEvidence(chain, releaseId);

  // Collect referenced files.
  const filesReferenced: string[] = [];
  if (chain.verification) filesReferenced.push(chain.verification.path);
  if (chain.result) filesReferenced.push(chain.result.path);
  if (chain.testSpec) filesReferenced.push(chain.testSpec.path);
  if (chain.execution) filesReferenced.push(chain.execution.path);
  if (chain.requirement) filesReferenced.push(chain.requirement.path);
  if (chain.prd) filesReferenced.push(chain.prd.path);
  if (chain.intent) filesReferenced.push(chain.intent.path);
  if (chain.design) filesReferenced.push(chain.design.path);

  // Write release markdown file.
  const docRelPath = `${DELIVERYOS_DIR}/${RELEASES_DIR}/${releaseId}.md`;
  const releaseDir = releasesDir(workspaceUri);
  await vscode.workspace.fs.createDirectory(releaseDir);
  const releaseFileUri = vscode.Uri.joinPath(releaseDir, `${releaseId}.md`);
  await vscode.workspace.fs.writeFile(
    releaseFileUri,
    new TextEncoder().encode(markdown),
  );

  // Read verification for refs.
  const verPayload = chain.verification.entry.payload as unknown as VerificationMemoryPayload;
  const verificationRef: MemoryRef = {
    id: verificationId,
    type: 'verification',
    title: chain.verification.entry.title,
  };
  const requirementRef: MemoryRef = chain.requirement
    ? {
        id: chain.requirement.entry.id,
        type: chain.requirement.entry.type,
        title: chain.requirement.entry.title,
      }
    : { id: '', type: 'requirement', title: 'unknown' };

  // Persist ReleaseMemory entry.
  const chainComplete =
    chain.intent !== undefined &&
    chain.requirement !== undefined &&
    chain.testSpec !== undefined &&
    chain.execution !== undefined &&
    chain.result !== undefined;

  const bypassRefs: MemoryRef[] = (verPayload.bypasses ?? []).map((b) => ({
    id: b.id,
    type: 'verification',
    title: `Bypass: ${b.gate}`,
  }));

  const releaseMemoryPayload: ReleaseMemoryPayload = {
    requirementRef,
    verificationRef,
    documentPath: docRelPath,
    chainComplete,
    warnings: chain.warnings,
    bypassRefs,
    finalSignOff: { by: 'user', at: Date.now() },
    deferredItems: [],
    knownLimitations: [],
  };

  const releaseTitle = chain.requirement?.entry.title ?? `Release ${releaseId}`;
  const releaseEntry = await store.create<'release'>({
    type: 'release',
    title: releaseTitle,
    payload: {
      releaseId,
      includedRequirementIds: chain.requirement ? [chain.requirement.entry.id] : [],
      finalSignOffAt: releaseMemoryPayload.finalSignOff.at,
      evidencePackagePath: docRelPath,
    } as ReleasePayload,
  });

  // Override the payload with the richer shape using cast-through.
  await store.update<'release'>(releaseEntry.id, {
    payload: releaseMemoryPayload as unknown as Partial<ReleasePayload>,
  });

  // Write links.
  await store.link(releaseEntry.id, verificationId, 'releases');
  if (chain.requirement) {
    await store.link(releaseEntry.id, chain.requirement.entry.id, 'includes');
  }

  const evidence: ReleaseEvidence = {
    releaseId,
    markdown,
    filesReferenced,
    chain,
  };

  return evidence;
}
