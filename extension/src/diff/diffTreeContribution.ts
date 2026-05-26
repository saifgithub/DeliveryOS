// CHUNK-13 § diff/diffTreeContribution.ts — adds a "Diff outcome" child node
// under Result tree items in the stage tree. Imported by stageTreeProvider.ts.

import type { DiffOutcome } from '@deliveryos/contracts';
import type { ResultNode } from '../tree/stageTreeNodes';

export interface DiffOutcomeNode {
  readonly kind: 'diff-outcome';
  readonly stageId: 'execute';
  readonly resultEntryId: string;
  readonly verdict: 'pass' | 'fail' | null;
  readonly iconId: string;
  readonly displayName: string;
  readonly commandId: string;
  readonly commandArgs: unknown[];
}

/**
 * Build a DiffOutcomeNode child for a given ResultNode.
 * Pass the live diffOutcome payload (may be undefined if not yet computed).
 */
export function diffOutcomeChildBuilder(
  resultNode: ResultNode,
  diffOutcome: DiffOutcome | null | undefined,
): DiffOutcomeNode {
  if (!diffOutcome) {
    return {
      kind: 'diff-outcome',
      stageId: 'execute',
      resultEntryId: resultNode.resultEntryId,
      verdict: null,
      iconId: 'question',
      displayName: 'Diff outcome — (not run)',
      commandId: 'deliveryos.diff.openForResult',
      commandArgs: [resultNode.resultEntryId],
    };
  }
  const verdictLabel = diffOutcome.verdict === 'pass' ? 'PASS' : 'FAIL';
  const iconId = diffOutcome.verdict === 'pass' ? 'pass' : 'error';
  return {
    kind: 'diff-outcome',
    stageId: 'execute',
    resultEntryId: resultNode.resultEntryId,
    verdict: diffOutcome.verdict,
    iconId,
    displayName: `Diff outcome — ${verdictLabel}`,
    commandId: 'deliveryos.diff.openForResult',
    commandArgs: [resultNode.resultEntryId],
  };
}
