import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { BROADCAST } from 'vscode-messenger-common';
import {
  DiscoverCopyPrompt,
  DiscoverGeneratePrompt,
  DiscoverGetInitialState,
  DiscoverParseAnswers,
  DiscoverSaveAnswers,
  DiscoverSaveRawIdea,
  DiscoverSetMode,
  DiscoverStateChanged,
  Hello,
  type DiscoverGetInitialStateResult,
  type DiscoverMode,
  type DiscoveryAnswer,
  type DiscoveryRecord,
  type IntentPayload,
  type RawIdea,
} from '@deliveryos/contracts';
import { parseAnswers } from '../discovery/answersParser';
import { buildDiscoveryPrompt } from '../discovery/promptBuilder';
import { DISCOVERY_QUESTIONS_MVP } from '../discovery/questionLibrary';
import type { MemoryStore } from '../memory/MemoryStore';
import type { IProjectRegistry } from '../projectRegistry';
import { consumePendingDiscoverMode } from './discoverPanel';

export interface DiscoverDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
}

export class HostMessenger {
  readonly messenger = new Messenger({ ignoreHiddenViews: false });

  registerHelloHandlers(): void {
    this.messenger.onRequest(Hello.GetHelloText, async (params) => {
      const project = params?.projectName ?? 'DeliveryOS';
      return {
        text: `Hello, ${project}.`,
        timestamp: Date.now(),
      };
    });
  }

  registerDiscoverHandlers(deps: DiscoverDeps): void {
    const { registry, memoryStore } = deps;

    const readActiveIntent = async (): Promise<{
      id: string;
      title: string;
      payload: IntentPayload;
    }> => {
      const active = registry.getActive();
      if (!active) {
        throw new Error('Discover: no active project. Create a project first.');
      }
      const entry = await memoryStore.read(active.id);
      if (!entry || entry.type !== 'intent') {
        throw new Error(`Discover: active project ${active.id} has no intent record.`);
      }
      return { id: entry.id, title: entry.title, payload: entry.payload };
    };

    const broadcastStateChange = (
      rawIdea: RawIdea | null,
      discovery: DiscoveryRecord | null,
    ): void => {
      this.messenger.sendNotification(DiscoverStateChanged, BROADCAST, {
        rawIdea,
        discovery,
      });
    };

    this.messenger.onRequest(
      DiscoverGetInitialState,
      async (): Promise<DiscoverGetInitialStateResult> => {
        const mode: DiscoverMode = consumePendingDiscoverMode();
        const active = registry.getActive();
        if (!active) {
          return {
            projectTitle: '',
            rawIdea: null,
            discovery: null,
            questions: DISCOVERY_QUESTIONS_MVP,
            mode,
          };
        }
        const entry = await memoryStore.read(active.id);
        if (!entry || entry.type !== 'intent') {
          return {
            projectTitle: active.name,
            rawIdea: null,
            discovery: null,
            questions: DISCOVERY_QUESTIONS_MVP,
            mode,
          };
        }
        return {
          projectTitle: entry.title,
          rawIdea: entry.payload.rawIdea,
          discovery: entry.payload.discovery,
          questions: DISCOVERY_QUESTIONS_MVP,
          mode,
        };
      },
    );

    this.messenger.onRequest(DiscoverSaveRawIdea, async (params) => {
      const intent = await readActiveIntent();
      const now = Date.now();
      const rawIdea: RawIdea = { text: params.body, capturedAt: now };
      const nextTitle = params.title?.trim();
      const updated = await memoryStore.update<'intent'>(intent.id, {
        ...(nextTitle && { title: nextTitle }),
        payload: { rawIdea } as Partial<IntentPayload>,
        body: params.body,
      });
      broadcastStateChange(updated.payload.rawIdea, updated.payload.discovery);
      return { rawIdea: updated.payload.rawIdea };
    });

    this.messenger.onRequest(DiscoverGeneratePrompt, async () => {
      const intent = await readActiveIntent();
      const prompt = buildDiscoveryPrompt({
        projectTitle: intent.title,
        rawIdea: intent.payload.rawIdea.text,
        questions: DISCOVERY_QUESTIONS_MVP,
      });
      return {
        prompt,
        generatedAt: Date.now(),
        questionsSnapshotIds: DISCOVERY_QUESTIONS_MVP.map((q) => q.id),
      };
    });

    this.messenger.onRequest(DiscoverCopyPrompt, async (params) => {
      await vscode.env.clipboard.writeText(params.prompt);
      return { ok: true as const };
    });

    this.messenger.onRequest(DiscoverParseAnswers, async (params) => {
      const result = parseAnswers(params.rawPaste, DISCOVERY_QUESTIONS_MVP);
      return {
        answers: result.answers,
        unmatchedText: result.unmatchedText,
      };
    });

    this.messenger.onRequest(DiscoverSaveAnswers, async (params) => {
      const intent = await readActiveIntent();
      const promptSnapshot = buildDiscoveryPrompt({
        projectTitle: intent.title,
        rawIdea: intent.payload.rawIdea.text,
        questions: DISCOVERY_QUESTIONS_MVP,
      });
      const now = Date.now();
      const discovery: DiscoveryRecord = {
        promptSnapshot,
        answers: params.answers as readonly DiscoveryAnswer[],
        completedAt: now,
        rawAnswersPaste: params.rawAnswersPaste,
        unmatchedText: params.unmatchedText,
      };
      const updated = await memoryStore.update<'intent'>(intent.id, {
        payload: { discovery } as Partial<IntentPayload>,
      });
      broadcastStateChange(updated.payload.rawIdea, updated.payload.discovery);
      return { discovery: updated.payload.discovery as DiscoveryRecord };
    });

    this.messenger.onNotification(DiscoverSetMode, () => {
      // Webview-originated tab switches are panel-local; no host state to
      // mutate here. Future restore-after-reload flows may read this.
    });
  }

  broadcastDiscoverMode(mode: DiscoverMode): void {
    this.messenger.sendNotification(DiscoverSetMode, BROADCAST, { mode });
  }

  attachPanel(panel: vscode.WebviewPanel): void {
    this.messenger.registerWebviewPanel(panel);
  }
}
