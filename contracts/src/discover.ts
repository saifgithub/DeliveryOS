import type { RequestType, NotificationType } from 'vscode-messenger-common';
import type { RawIdea, DiscoveryRecord, DiscoveryAnswer } from './memory';

export type DiscoverMode = 'rawIdea' | 'prompt' | 'answers' | 'summary';

export interface DiscoveryQuestion {
  readonly id: string;
  readonly topic: string;
  readonly prompt: string;
  readonly helperText?: string;
}

export interface RawIdeaView {
  readonly body: string;
  readonly title?: string;
  readonly savedAt: number;
  readonly updatedAt: number;
}

export interface DiscoveryAnswerInput {
  readonly questionId: string;
  readonly body: string;
  readonly markedNA: boolean;
}

export interface DiscoveryDraft {
  readonly promptGeneratedAt: number | null;
  readonly promptSnapshot: string | null;
  readonly questionsSnapshotIds: readonly string[];
  readonly rawAnswersPaste: string;
  readonly answers: readonly DiscoveryAnswerInput[];
  readonly unmatchedText: string;
  readonly answeredAt: number | null;
}

export interface DiscoverGetInitialStateParams {
  readonly _empty?: never;
}

export interface DiscoverGetInitialStateResult {
  readonly projectTitle: string;
  readonly rawIdea: RawIdea | null;
  readonly discovery: DiscoveryRecord | null;
  readonly questions: readonly DiscoveryQuestion[];
  readonly mode: DiscoverMode;
}

export interface DiscoverSaveRawIdeaParams {
  readonly body: string;
  readonly title?: string;
}

export interface DiscoverSaveRawIdeaResult {
  readonly rawIdea: RawIdea;
}

export interface DiscoverGeneratePromptParams {
  readonly _empty?: never;
}

export interface DiscoverGeneratePromptResult {
  readonly prompt: string;
  readonly generatedAt: number;
  readonly questionsSnapshotIds: readonly string[];
}

export interface DiscoverCopyPromptParams {
  readonly prompt: string;
}

export interface DiscoverCopyPromptResult {
  readonly ok: true;
}

export interface DiscoverParseAnswersParams {
  readonly rawPaste: string;
}

export interface DiscoverParseAnswersResult {
  readonly answers: readonly DiscoveryAnswer[];
  readonly unmatchedText: string;
}

export interface DiscoverSaveAnswersParams {
  readonly rawAnswersPaste: string;
  readonly answers: readonly DiscoveryAnswer[];
  readonly unmatchedText: string;
}

export interface DiscoverSaveAnswersResult {
  readonly discovery: DiscoveryRecord;
}

export interface DiscoverSetModeParams {
  readonly mode: DiscoverMode;
}

export interface DiscoverStateChangedParams {
  readonly rawIdea: RawIdea | null;
  readonly discovery: DiscoveryRecord | null;
}

export const DiscoverGetInitialState: RequestType<
  DiscoverGetInitialStateParams,
  DiscoverGetInitialStateResult
> = { method: 'discover/getInitialState' };

export const DiscoverSaveRawIdea: RequestType<
  DiscoverSaveRawIdeaParams,
  DiscoverSaveRawIdeaResult
> = { method: 'discover/saveRawIdea' };

export const DiscoverGeneratePrompt: RequestType<
  DiscoverGeneratePromptParams,
  DiscoverGeneratePromptResult
> = { method: 'discover/generatePrompt' };

export const DiscoverCopyPrompt: RequestType<
  DiscoverCopyPromptParams,
  DiscoverCopyPromptResult
> = { method: 'discover/copyPrompt' };

export const DiscoverParseAnswers: RequestType<
  DiscoverParseAnswersParams,
  DiscoverParseAnswersResult
> = { method: 'discover/parseAnswers' };

export const DiscoverSaveAnswers: RequestType<
  DiscoverSaveAnswersParams,
  DiscoverSaveAnswersResult
> = { method: 'discover/saveAnswers' };

export const DiscoverSetMode: NotificationType<DiscoverSetModeParams> = {
  method: 'discover/setMode',
};

export const DiscoverStateChanged: NotificationType<DiscoverStateChangedParams> = {
  method: 'discover/stateChanged',
};
