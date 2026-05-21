import type { StageId } from './stageTreeNodes';

export interface StageDefinition {
  readonly id: StageId;
  readonly displayName: string;
  readonly description: string;
  readonly iconId: string;
}

export const STAGE_DEFS: ReadonlyArray<StageDefinition> = Object.freeze([
  {
    id: 'discover',
    displayName: 'DISCOVER',
    description: 'Raw idea → interview → draft PRD',
    iconId: 'lightbulb',
  },
  {
    id: 'define',
    displayName: 'DEFINE',
    description: 'Requirements → design → test spec → brief',
    iconId: 'checklist',
  },
  {
    id: 'execute',
    displayName: 'EXECUTE',
    description: 'Handoff to coding harness → result capture',
    iconId: 'rocket',
  },
  {
    id: 'verify',
    displayName: 'VERIFY',
    description: 'Verify → memory update → release evidence',
    iconId: 'verified',
  },
]);
