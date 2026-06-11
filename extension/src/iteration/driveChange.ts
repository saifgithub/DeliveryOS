// L3 — shared back-half for the post-build iteration loop.
//
// A Change Request and a Bug differ only at the front: a CR changes the spec
// (requirement deltas) before building; a Bug fixes code to match an existing
// requirement. From "ready to build" onward they share one path:
//
//   compose brief → handoff → result → verify → close (status = verified)
//
// This module owns the *orchestration logic* of that shared path — target
// resolution, status transitions, and the close-on-pass hook — reusing the
// existing brief composer (`assembleDraft`) and verification graph. The actual
// terminal handoff + verification UI live in their existing modules; this is
// the pure, testable glue that the commands/messenger wire together.

import * as vscode from 'vscode';
import type { ExecutionBrief } from '../brief/types';
import { assembleDraft } from '../brief/briefBuilder';
import type { MemoryStore } from '../memory/MemoryStore';
import {
  regenerateChangeRequestList,
  regenerateDefectList,
} from './defectListWriter';

export type IterationSourceType = 'bug' | 'change-request';

export interface IterationSource {
  readonly entryId: string;
  readonly type: IterationSourceType;
}

/** Compose a fix brief for a bug by reusing the requirement brief composer. */
export type ComposeBugBriefOutcome =
  | { readonly ok: true; readonly brief: ExecutionBrief; readonly requirementEntryId: string }
  | { readonly ok: false; readonly reason: 'free-standing' | 'no-requirement' };

/**
 * Compose a fix brief for a bug. When the bug links a violated requirement we
 * reuse `assembleDraft` so the brief carries the requirement + its test-spec.
 * A free-standing bug (no `targetRequirementId`) has no requirement to anchor a
 * full brief — the caller composes a lighter brief from the bug description.
 */
export async function composeBugBrief(
  store: MemoryStore,
  args: {
    readonly bugEntryId: string;
    readonly projectId: string;
    readonly projectTitle: string;
  },
): Promise<ComposeBugBriefOutcome> {
  const bug = await store.loadBug(args.bugEntryId);
  if (!bug) return { ok: false, reason: 'no-requirement' };
  const requirementEntryId = bug.payload.targetRequirementId;
  if (!requirementEntryId) return { ok: false, reason: 'free-standing' };

  const outcome = await assembleDraft({
    memoryStore: store,
    requirementEntryId,
    projectId: args.projectId,
    projectTitle: args.projectTitle,
  });
  if (!outcome.ok) return { ok: false, reason: 'no-requirement' };
  return { ok: true, brief: outcome.brief, requirementEntryId };
}

/** Transition a bug open → assigned (a fix brief has been composed/handed off). */
export async function markBugAssigned(
  store: MemoryStore,
  bugEntryId: string,
): Promise<void> {
  const bug = await store.loadBug(bugEntryId);
  if (!bug) throw new Error(`No bug ${bugEntryId}`);
  if (bug.payload.status === 'open') {
    await store.updateBug(bugEntryId, { status: 'assigned', assignedAt: Date.now() });
  }
}

/** Transition a bug assigned → fixed and record the result that fixed it. */
export async function markBugFixed(
  store: MemoryStore,
  bugEntryId: string,
  resultEntryId: string,
): Promise<void> {
  const bug = await store.loadBug(bugEntryId);
  if (!bug) throw new Error(`No bug ${bugEntryId}`);
  await store.updateBug(bugEntryId, {
    status: 'fixed',
    fixedAt: Date.now(),
    fixResultId: resultEntryId,
  });
}

/**
 * Find the iteration sources (bugs / CRs) that address a given requirement,
 * via the `addresses` backlinks. Used to close the loop after a requirement's
 * result passes verification.
 */
export async function findSourcesForRequirement(
  store: MemoryStore,
  requirementEntryId: string,
): Promise<IterationSource[]> {
  const links = await store.backlinks(requirementEntryId, 'addresses');
  const sources: IterationSource[] = [];
  for (const link of links) {
    const entry = await store.read(link.fromId);
    if (!entry) continue;
    if (entry.type === 'bug' || entry.type === 'change-request') {
      sources.push({ entryId: entry.id, type: entry.type });
    }
  }
  return sources;
}

/**
 * Close one iteration source on a passing verification: flip its status to
 * `verified` (and, for a bug, record the fixing result), then regenerate the
 * matching aggregate markdown view.
 */
export async function closeSourceOnPass(
  store: MemoryStore,
  workspace: vscode.Uri,
  args: {
    readonly source: IterationSource;
    readonly resultEntryId: string;
    readonly projectId: string;
  },
): Promise<void> {
  if (args.source.type === 'bug') {
    await store.updateBug(args.source.entryId, {
      status: 'verified',
      verifiedAt: Date.now(),
      fixResultId: args.resultEntryId,
    });
    await regenerateDefectList(workspace, store, args.projectId);
  } else {
    await store.updateChangeRequest(args.source.entryId, { status: 'verified' });
    await regenerateChangeRequestList(workspace, store, args.projectId);
  }
}

/**
 * Convenience hook for the verification flow: after a requirement's result
 * passes, close every bug/CR that addresses that requirement. Returns the
 * sources that were closed.
 */
export async function closeSourcesForRequirementOnPass(
  store: MemoryStore,
  workspace: vscode.Uri,
  args: {
    readonly requirementEntryId: string;
    readonly resultEntryId: string;
    readonly projectId: string;
  },
): Promise<IterationSource[]> {
  const sources = await findSourcesForRequirement(store, args.requirementEntryId);
  for (const source of sources) {
    await closeSourceOnPass(store, workspace, {
      source,
      resultEntryId: args.resultEntryId,
      projectId: args.projectId,
    });
  }
  return sources;
}
