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
  PrdGenerateDraftPrompt,
  PrdLoad,
  PrdPasteDraft,
  PrdReviseSectionPrompt,
  PrdSaveSection,
  RequirementsChanged,
  RequirementsDelete,
  RequirementsFilter,
  RequirementsGenerateDecomposePrompt,
  RequirementsList,
  RequirementsOpenDecomposePanel,
  RequirementsPasteDecomposed,
  RequirementsUpdate,
  type DiscoverGetInitialStateResult,
  type DiscoverMode,
  type DiscoveryAnswer,
  type DiscoveryRecord,
  type IntentPayload,
  type PrdSection,
  type RawIdea,
  type Requirement,
  type RequirementsCatalogue,
  type RequirementsListResult,
  type VerificationStatus,
} from '@deliveryos/contracts';
import { parseAnswers } from '../discovery/answersParser';
import { buildDiscoveryPrompt } from '../discovery/promptBuilder';
import { DISCOVERY_QUESTIONS_MVP } from '../discovery/questionLibrary';
import type { MemoryStore, RequirementItemRecord } from '../memory/MemoryStore';
import { buildGenerateDraftPrompt, buildReviseSectionPrompt } from '../prd/promptBuilder';
import { parsePrdMarkdown, renderPrdMarkdown } from '../prd/sectionSchema';
import type { IProjectRegistry } from '../projectRegistry';
import { buildDecomposePrompt } from '../requirements/decompositionPrompt';
import { parseDecomposed } from '../requirements/parser';
import { consumePendingDiscoverMode } from './discoverPanel';

export interface DiscoverDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
}

export interface RequirementsDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
  /** Callback the host injects so handlers can open the decompose panel from a webview request. */
  readonly openDecomposePanel: () => Promise<void>;
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

  registerPrdHandlers(deps: DiscoverDeps): void {
    const { registry, memoryStore } = deps;

    this.messenger.onRequest(PrdLoad, async (_params) => {
      const active = registry.getActive();
      if (!active) {
        return { prd: null, projectId: '', projectTitle: '' };
      }
      const prd = await memoryStore.loadPrdParent(active.id);
      return { prd, projectId: active.id, projectTitle: active.name };
    });

    this.messenger.onRequest(PrdGenerateDraftPrompt, async (params) => {
      const entry = await memoryStore.read(params.projectId);
      if (!entry || entry.type !== 'intent') {
        throw new Error(`prd.generateDraftPrompt: no intent entry for ${params.projectId}`);
      }
      const payload = entry.payload as IntentPayload;
      const prompt = buildGenerateDraftPrompt({
        projectTitle: entry.title,
        rawIdea: payload.rawIdea?.text ?? '',
        discoveryRecord: payload.discovery ?? { promptSnapshot: '', answers: [], completedAt: 0 },
      });
      await vscode.env.clipboard.writeText(prompt);
      const bytesCopied = new TextEncoder().encode(prompt).length;
      return { ok: true as const, bytesCopied };
    });

    this.messenger.onRequest(PrdPasteDraft, async (params) => {
      const entry = await memoryStore.read(params.projectId);
      if (!entry || entry.type !== 'intent') {
        throw new Error(`prd.pasteDraft: no intent entry for ${params.projectId}`);
      }
      const intentEntry = { id: entry.id, title: entry.title };
      const { sections, report } = parsePrdMarkdown(params.rawMarkdown, entry.title);
      const existing = await memoryStore.loadPrdParent(params.projectId);
      const prd = await memoryStore.upsertPrdParent(intentEntry, sections, existing?.prdId);
      return { prd, report };
    });

    this.messenger.onRequest(PrdSaveSection, async (params) => {
      const entry = await memoryStore.read(params.prdId);
      if (!entry) {
        throw new Error(`prd.saveSection: PRD entry ${params.prdId} not found`);
      }
      const stored = entry.payload as unknown as {
        projectId: string;
        projectTitle: string;
        sections: PrdSection[];
      };
      const nextSections = stored.sections.map((s) =>
        s.id === params.sectionId ? { ...s, body: params.body } : s,
      );
      const intentEntry = { id: stored.projectId, title: stored.projectTitle };
      const result = await memoryStore.upsertPrdParent(intentEntry, nextSections, params.prdId);
      return { ok: true as const, updatedAt: result.updatedAt };
    });

    this.messenger.onRequest(PrdReviseSectionPrompt, async (params) => {
      const entry = await memoryStore.read(params.prdId);
      if (!entry) {
        throw new Error(`prd.reviseSectionPrompt: PRD ${params.prdId} not found`);
      }
      const stored = entry.payload as unknown as {
        projectTitle: string;
        sections: PrdSection[];
      };
      const section = stored.sections.find((s) => s.id === params.sectionId);
      if (!section) {
        throw new Error(`prd.reviseSectionPrompt: section ${params.sectionId} not found`);
      }
      const otherSectionSummaries: Record<string, string> = {};
      for (const s of stored.sections) {
        if (s.id !== params.sectionId) {
          otherSectionSummaries[s.id] = s.body;
        }
      }
      const prompt = buildReviseSectionPrompt({
        section,
        instruction: params.instruction,
        prdContext: { projectTitle: stored.projectTitle, otherSectionSummaries },
      });
      await vscode.env.clipboard.writeText(prompt);
      const bytesCopied = new TextEncoder().encode(prompt).length;
      return { ok: true as const, bytesCopied };
    });

  }

  registerRequirementsHandlers(deps: RequirementsDeps): void {
    const { registry, memoryStore, openDecomposePanel } = deps;

    const verificationStatusFor = (record: RequirementItemRecord): VerificationStatus => {
      const criteria = record.payload.verificationCriteria;
      return criteria && criteria.length > 0 ? 'draft' : 'empty';
    };

    const toRequirement = (record: RequirementItemRecord): Requirement => ({
      entryId: record.entryId,
      id: record.payload.id,
      title: record.payload.title,
      description: record.payload.text,
      category: record.payload.category,
      priority: record.payload.priority,
      sourcePrdSection: record.payload.sourcePrdSection,
      verificationStatus: verificationStatusFor(record),
    });

    const broadcastChanged = (
      source: 'create' | 'update' | 'delete',
      ids: readonly string[],
    ): void => {
      this.messenger.sendNotification(RequirementsChanged, BROADCAST, { source, ids });
    };

    const buildCatalogue = async (projectId: string): Promise<RequirementsListResult> => {
      const active = registry.getActive();
      const targetId = projectId || active?.id;
      if (!targetId) {
        return { ok: false as const, reason: 'no-project' };
      }
      const prd = await memoryStore.loadPrdParent(targetId);
      if (!prd) {
        return { ok: false as const, reason: 'no-prd' };
      }
      const records = await memoryStore.listRequirementItems(prd.prdId);
      const catalogue: RequirementsCatalogue = {
        prdId: prd.prdId,
        prdTitle: prd.projectTitle,
        prdSections: prd.sections.map((s) => s.title),
        requirements: records.map(toRequirement),
      };
      return { ok: true as const, catalogue };
    };

    this.messenger.onRequest(RequirementsList, async (params) => buildCatalogue(params.projectId));

    this.messenger.onRequest(RequirementsFilter, async (params) => {
      // MVP: host returns the full catalogue; the webview filters in-memory.
      // The endpoint exists for forward-compatibility with server-side filtering.
      return buildCatalogue(params.projectId);
    });

    this.messenger.onRequest(RequirementsGenerateDecomposePrompt, async (params) => {
      const active = registry.getActive();
      const targetId = params.projectId || active?.id;
      if (!targetId) {
        return { ok: false as const, reason: 'no-project' as const };
      }
      const prd = await memoryStore.loadPrdParent(targetId);
      if (!prd) {
        return { ok: false as const, reason: 'no-prd' as const };
      }
      const body = renderPrdMarkdown({
        projectTitle: prd.projectTitle,
        sections: prd.sections,
      });
      const prompt = buildDecomposePrompt({ prd, prdMarkdownBody: body });
      await vscode.env.clipboard.writeText(prompt);
      const bytesCopied = new TextEncoder().encode(prompt).length;
      return { ok: true as const, bytesCopied };
    });

    this.messenger.onRequest(RequirementsPasteDecomposed, async (params) => {
      const active = registry.getActive();
      const targetId = params.projectId || active?.id;
      if (!targetId) {
        return { ok: false as const, reason: 'No active project.', raw: params.text };
      }
      const prd = await memoryStore.loadPrdParent(targetId);
      if (!prd) {
        return { ok: false as const, reason: 'No PRD on file for this project.', raw: params.text };
      }
      const parsed = parseDecomposed(params.text);
      if (!parsed.ok) {
        return { ok: false as const, reason: parsed.reason, raw: parsed.raw };
      }
      const createdIds = await memoryStore.createRequirementItems(prd.prdId, parsed.requirements);
      broadcastChanged('create', createdIds);
      const warnings: string[] = [];
      for (const r of parsed.requirements) {
        if (r.warnings) warnings.push(...r.warnings);
      }
      return {
        ok: true as const,
        mode: parsed.mode,
        createdIds,
        warnings,
      };
    });

    this.messenger.onRequest(RequirementsUpdate, async (params) => {
      const updated = await memoryStore.updateRequirementItem(params.entryId, params.patch);
      broadcastChanged('update', [params.entryId]);
      return { ok: true as const, requirement: toRequirement(updated) };
    });

    this.messenger.onRequest(RequirementsDelete, async (params) => {
      await memoryStore.deleteRequirementItem(params.entryId);
      broadcastChanged('delete', [params.entryId]);
      return { ok: true as const };
    });

    this.messenger.onRequest(RequirementsOpenDecomposePanel, async () => {
      await openDecomposePanel();
      return { ok: true as const };
    });
  }

  broadcastDiscoverMode(mode: DiscoverMode): void {
    this.messenger.sendNotification(DiscoverSetMode, BROADCAST, { mode });
  }

  attachPanel(panel: vscode.WebviewPanel): void {
    this.messenger.registerWebviewPanel(panel);
  }
}
