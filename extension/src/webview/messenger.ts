import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { BROADCAST } from 'vscode-messenger-common';
import {
  BriefBootstrap,
  BriefCancel,
  BriefCopyPreview,
  BriefEditList,
  BriefEditSection,
  BriefSave,
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
  RequirementsOpenBriefComposer,
  RequirementsOpenBriefFile,
  RequirementsOpenDecomposePanel,
  RequirementsOpenTestDesigner,
  RequirementsOpenTestSpecFile,
  RequirementsPasteDecomposed,
  RequirementsUpdate,
  TestDesignerBootstrap,
  TestDesignerCancel,
  TestDesignerCommit,
  TestDesignerCopyPrompt,
  TestDesignerGeneratePrompt,
  TestDesignerPasteResult,
  type BriefBootstrapResult,
  type BriefEditListResult,
  type BriefEditSectionResult,
  type BriefSaveResult,
  type DiscoverGetInitialStateResult,
  type DiscoverMode,
  type DiscoveryAnswer,
  type DiscoveryRecord,
  type ExecutionBriefDraft,
  type IntentPayload,
  type PrdSection,
  type RawIdea,
  type Requirement,
  type RequirementSummary,
  type RequirementsCatalogue,
  type RequirementsListResult,
  type TestDesignerBootstrapResult,
  type VerificationStatus,
} from '@deliveryos/contracts';
import { parseAnswers } from '../discovery/answersParser';
import { buildDiscoveryPrompt } from '../discovery/promptBuilder';
import { DISCOVERY_QUESTIONS_MVP } from '../discovery/questionLibrary';
import { assembleDraft } from '../brief/briefBuilder';
import { nextBriefId } from '../brief/briefIds';
import {
  BRIEF_SCHEMA_VERSION,
  parse as parseBriefMarkdown,
  serialise as serialiseBriefMarkdown,
} from '../brief/briefMarkdown';
import { validate as validateBrief } from '../brief/briefValidator';
import type { ExecutionBrief, BriefSection } from '../brief/types';
import type { BriefSectionId } from '@deliveryos/contracts';
import type {
  BriefRecord,
  MemoryStore,
  RequirementItemRecord,
  StoredRequirementItemPayload,
} from '../memory/MemoryStore';
import { buildGenerateDraftPrompt, buildReviseSectionPrompt } from '../prd/promptBuilder';
import { parsePrdMarkdown, renderPrdMarkdown } from '../prd/sectionSchema';
import type { IProjectRegistry } from '../projectRegistry';
import { buildDecomposePrompt } from '../requirements/decompositionPrompt';
import { parseDecomposed } from '../requirements/parser';
import { buildTestDesignerPrompt } from '../specialists/testDesigner/promptBuilder';
import { parseTestDesignerResult } from '../specialists/testDesigner/resultParser';
import { consumePendingBriefRequest } from './briefComposerPanel';
import { consumePendingDiscoverMode } from './discoverPanel';
import { consumePendingTestDesignerRequirement } from './testDesignerPanel';

export interface DiscoverDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
}

export interface RequirementsDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
  /** Callback the host injects so handlers can open the decompose panel from a webview request. */
  readonly openDecomposePanel: () => Promise<void>;
  /** Callback the host injects so handlers can open the Test Designer panel for a requirement. */
  readonly openTestDesignerPanel: (requirementEntryId: string) => Promise<void>;
  /** Callback the host injects so handlers can open the Execution Brief composer. */
  readonly openBriefComposerPanel: (args: {
    readonly requirementEntryId: string;
    readonly briefEntryId?: string;
    readonly supersedesEntryId?: string;
  }) => Promise<void>;
}

export interface TestDesignerDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
}

export interface BriefDeps {
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
    const {
      registry,
      memoryStore,
      openDecomposePanel,
      openTestDesignerPanel,
      openBriefComposerPanel,
    } = deps;

    const verificationStatusFor = (record: RequirementItemRecord): VerificationStatus => {
      const criteria = record.payload.verificationCriteria;
      return criteria && criteria.length > 0 ? 'draft' : 'empty';
    };

    const toRequirement = async (record: RequirementItemRecord): Promise<Requirement> => {
      const testSpec = await memoryStore.getTestSpec(record.entryId);
      const testSpecSummary = testSpec
        ? {
            id: testSpec.payload.id,
            caseTitles: testSpec.payload.cases.map((c) => `${c.id} — ${c.title}`),
          }
        : null;
      const briefRecords = await memoryStore.listBriefsForRequirement(record.entryId);
      const briefs = briefRecords.map((brief, index) => {
        const supersededByEntry = briefRecords.find(
          (other) => other.payload.supersedesEntryId === brief.entryId,
        );
        return {
          entryId: brief.entryId,
          id: brief.payload.id,
          version: index + 1,
          createdAt: brief.payload.lockedAt,
          ...(supersededByEntry ? { supersededByEntryId: supersededByEntry.entryId } : {}),
        };
      });
      return {
        entryId: record.entryId,
        id: record.payload.id,
        title: record.payload.title,
        description: record.payload.text,
        category: record.payload.category,
        priority: record.payload.priority,
        sourcePrdSection: record.payload.sourcePrdSection,
        verificationStatus: verificationStatusFor(record),
        verificationCriteria: record.payload.verificationCriteria
          ? [...record.payload.verificationCriteria]
          : [],
        testSpec: testSpecSummary,
        briefs,
      };
    };

    const broadcastChanged = (
      source:
        | 'create'
        | 'update'
        | 'delete'
        | 'verification-update'
        | 'execution-update',
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
      const requirements: Requirement[] = await Promise.all(records.map(toRequirement));
      const catalogue: RequirementsCatalogue = {
        prdId: prd.prdId,
        prdTitle: prd.projectTitle,
        prdSections: prd.sections.map((s) => s.title),
        requirements,
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
      return { ok: true as const, requirement: await toRequirement(updated) };
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

    this.messenger.onRequest(RequirementsOpenTestDesigner, async (params) => {
      const requirementRow = await loadRequirementByEntryId(memoryStore, params.requirementEntryId);
      if (!requirementRow) {
        return { ok: false as const, reason: 'no-requirement' as const };
      }
      await openTestDesignerPanel(params.requirementEntryId);
      return { ok: true as const };
    });

    this.messenger.onRequest(RequirementsOpenTestSpecFile, async (params) => {
      const requirementRow = await loadRequirementByEntryId(memoryStore, params.requirementEntryId);
      if (!requirementRow) {
        return { ok: false as const, reason: 'no-requirement' as const };
      }
      const testSpec = await memoryStore.getTestSpec(params.requirementEntryId);
      if (!testSpec) {
        return { ok: false as const, reason: 'no-test-spec' as const };
      }
      const uri = memoryStore.testSpecBodyUri(testSpec.entryId);
      await vscode.commands.executeCommand('vscode.open', uri);
      return { ok: true as const };
    });

    this.messenger.onRequest(RequirementsOpenBriefComposer, async (params) => {
      const requirementRow = await loadRequirementByEntryId(memoryStore, params.requirementEntryId);
      if (!requirementRow) {
        return { ok: false as const, reason: 'no-requirement' as const };
      }
      if (params.briefEntryId) {
        const existing = await memoryStore.getBrief(params.briefEntryId);
        if (!existing) {
          return { ok: false as const, reason: 'no-brief' as const };
        }
      }
      await openBriefComposerPanel({
        requirementEntryId: params.requirementEntryId,
        ...(params.briefEntryId ? { briefEntryId: params.briefEntryId } : {}),
        ...(params.supersedesEntryId ? { supersedesEntryId: params.supersedesEntryId } : {}),
      });
      return { ok: true as const };
    });

    this.messenger.onRequest(RequirementsOpenBriefFile, async (params) => {
      const brief = await memoryStore.getBrief(params.briefEntryId);
      if (!brief) {
        return { ok: false as const, reason: 'no-brief' as const };
      }
      const uri = memoryStore.briefBodyUri(brief.entryId);
      await vscode.commands.executeCommand('vscode.open', uri);
      return { ok: true as const };
    });
  }

  registerTestDesignerHandlers(deps: TestDesignerDeps): void {
    const { registry, memoryStore } = deps;

    const broadcastVerificationChanged = (ids: readonly string[]): void => {
      this.messenger.sendNotification(RequirementsChanged, BROADCAST, {
        source: 'verification-update',
        ids,
      });
    };

    const loadProjectContext = async (
      requirementEntryId: string,
    ): Promise<
      | {
          readonly ok: true;
          readonly requirement: RequirementSummary;
          readonly assumptions: readonly string[];
          readonly constraints: readonly string[];
          readonly projectTitle: string;
          readonly prdSummary: string;
        }
      | { readonly ok: false; readonly reason: 'no-requirement' | 'no-prd' | 'no-project' }
    > => {
      const reqRow = await loadRequirementByEntryId(memoryStore, requirementEntryId);
      if (!reqRow) return { ok: false, reason: 'no-requirement' };
      const active = registry.getActive();
      if (!active) return { ok: false, reason: 'no-project' };
      const prd = await memoryStore.loadPrdParent(active.id);
      if (!prd) return { ok: false, reason: 'no-prd' };
      const requirement: RequirementSummary = {
        entryId: reqRow.entryId,
        id: reqRow.payload.id,
        title: reqRow.payload.title,
        description: reqRow.payload.text,
        category: reqRow.payload.category,
        priority: reqRow.payload.priority,
        sourcePrdSection: reqRow.payload.sourcePrdSection,
      };
      const prdEntry = await memoryStore.read(prd.prdId);
      const prdBody = prdEntry?.body ?? '';
      return {
        ok: true,
        requirement,
        assumptions: [],
        constraints: [],
        projectTitle: prd.projectTitle,
        prdSummary: firstParagraph(prdBody),
      };
    };

    this.messenger.onRequest(
      TestDesignerBootstrap,
      async (): Promise<TestDesignerBootstrapResult> => {
        const requirementEntryId = consumePendingTestDesignerRequirement();
        if (!requirementEntryId) {
          return { ok: false as const, reason: 'no-requirement' as const };
        }
        const ctx = await loadProjectContext(requirementEntryId);
        if (!ctx.ok) {
          return { ok: false as const, reason: ctx.reason };
        }
        const existingRecord = await memoryStore.getTestSpec(requirementEntryId);
        return {
          ok: true as const,
          requirement: ctx.requirement,
          projectTitle: ctx.projectTitle,
          prdSummary: ctx.prdSummary,
          existing: existingRecord ? memoryStore.toTestSpec(existingRecord) : null,
        };
      },
    );

    this.messenger.onRequest(TestDesignerGeneratePrompt, async (params) => {
      const ctx = await loadProjectContext(params.requirementEntryId);
      if (!ctx.ok) {
        return { ok: false as const, reason: ctx.reason };
      }
      const existingRecord = await memoryStore.getTestSpec(params.requirementEntryId);
      const existingTestSpec = existingRecord ? memoryStore.toTestSpec(existingRecord) : undefined;
      const prompt = buildTestDesignerPrompt({
        requirement: ctx.requirement,
        projectTitle: ctx.projectTitle,
        prdSummary: ctx.prdSummary,
        assumptions: ctx.assumptions,
        constraints: ctx.constraints,
        ...(existingTestSpec ? { existingTestSpec } : {}),
      });
      return { ok: true as const, prompt };
    });

    this.messenger.onRequest(TestDesignerCopyPrompt, async (params) => {
      await vscode.env.clipboard.writeText(params.prompt);
      const bytesCopied = new TextEncoder().encode(params.prompt).length;
      return { ok: true as const, bytesCopied };
    });

    this.messenger.onRequest(TestDesignerPasteResult, async (params) => {
      const reqRow = await loadRequirementByEntryId(memoryStore, params.requirementEntryId);
      if (!reqRow) {
        throw new Error(
          `testDesigner.pasteResult: no requirement-item ${params.requirementEntryId}`,
        );
      }
      const parse = parseTestDesignerResult(params.raw, { requirementId: reqRow.payload.id });
      return { ok: true as const, parse };
    });

    this.messenger.onRequest(TestDesignerCommit, async (params) => {
      const reqRow = await loadRequirementByEntryId(memoryStore, params.requirementEntryId);
      if (!reqRow) {
        return { ok: false as const, reason: `No requirement-item ${params.requirementEntryId}` };
      }
      // Host re-parses raw — webview's preview is advisory only.
      const parse = parseTestDesignerResult(params.raw, { requirementId: reqRow.payload.id });
      const record = await memoryStore.createOrOverwriteTestSpec({
        requirementEntryId: params.requirementEntryId,
        verificationCriteria: parse.verificationCriteria,
        cases: parse.cases,
        openQuestions: parse.openQuestions,
        confidence: parse.confidence,
        raw: params.raw,
      });
      broadcastVerificationChanged([params.requirementEntryId]);
      return {
        ok: true as const,
        testSpecId: record.payload.id,
        verificationCriteriaCount: record.payload.verificationCriteria.length,
        caseCount: record.payload.cases.length,
        confidence: record.payload.confidence,
      };
    });

    this.messenger.onNotification(TestDesignerCancel, () => {
      // Panel-local close signal — host state is committed on Save, so no
      // additional cleanup is needed here.
    });
  }

  registerBriefHandlers(deps: BriefDeps): void {
    const { registry, memoryStore } = deps;

    // The composer is single-instance; webview-local draft state lives between
    // bootstrap and save. The host caches the in-flight draft per webview so
    // editSection / editList can mutate by section id without round-tripping
    // the whole draft on every keystroke. On panel close, the draft is dropped.
    // `null` ⇒ no active draft (read-only mode, or pre-bootstrap).
    let activeDraft: ExecutionBrief | null = null;
    let activeBriefEntryId: string | undefined;

    this.messenger.onRequest(BriefBootstrap, async (): Promise<BriefBootstrapResult> => {
      const pending = consumePendingBriefRequest();
      if (!pending) {
        activeDraft = null;
        activeBriefEntryId = undefined;
        return { ok: false as const, reason: 'no-requirement' as const };
      }

      const reqRow = await loadRequirementByEntryId(memoryStore, pending.requirementEntryId);
      if (!reqRow) {
        activeDraft = null;
        activeBriefEntryId = undefined;
        return { ok: false as const, reason: 'no-requirement' as const };
      }
      const active = registry.getActive();
      if (!active) {
        return { ok: false as const, reason: 'no-project' as const };
      }
      const prd = await memoryStore.loadPrdParent(active.id);
      if (!prd) {
        return { ok: false as const, reason: 'no-prd' as const };
      }

      if (pending.briefEntryId) {
        const existing = await memoryStore.getBrief(pending.briefEntryId);
        if (!existing) {
          return { ok: false as const, reason: 'no-brief' as const };
        }
        const parsed = parseBriefMarkdown(existing.body);
        activeDraft = parsed.brief;
        activeBriefEntryId = existing.entryId;
        return {
          ok: true as const,
          mode: 'readonly',
          draft: toDraft(parsed.brief),
          validation: { ok: true, errors: [], warnings: parsed.warnings.map(toWarning) },
          preview: serialiseBriefMarkdown(parsed.brief),
          requirementUserId: reqRow.payload.id,
          requirementTitle: reqRow.payload.title,
        };
      }

      // Fresh draft (optionally seeded as a revision of a prior brief).
      const supersedesArg = pending.supersedesEntryId
        ? { supersedesEntryId: pending.supersedesEntryId }
        : {};
      const outcome = await assembleDraft({
        memoryStore,
        requirementEntryId: pending.requirementEntryId,
        projectId: active.id,
        projectTitle: prd.projectTitle,
        ...supersedesArg,
      });
      if (!outcome.ok) {
        return { ok: false as const, reason: 'no-requirement' as const };
      }
      activeDraft = outcome.brief;
      activeBriefEntryId = undefined;
      const validation = validateBrief(outcome.brief);
      return {
        ok: true as const,
        mode: 'draft',
        draft: toDraft(outcome.brief),
        validation,
        preview: serialiseBriefMarkdown(outcome.brief),
        requirementUserId: reqRow.payload.id,
        requirementTitle: reqRow.payload.title,
      };
    });

    this.messenger.onRequest(
      BriefEditSection,
      async (params): Promise<BriefEditSectionResult> => {
        if (activeBriefEntryId) {
          // Read-only mode — host is the authoritative immutability gate
          // (spec § 11.5a). Webview-disabled controls are UX courtesy.
          return { ok: false as const, reason: 'locked' as const };
        }
        if (!activeDraft) {
          return { ok: false as const, reason: 'unknown-section' as const };
        }
        if (params.sectionId === 'expected-output') {
          // Section 9 is the fixed RESULT_MD_SECTION_NAMES template (spec § 4.5).
          return { ok: false as const, reason: 'read-only-section' as const };
        }
        if (!(params.sectionId in activeDraft.sections)) {
          return { ok: false as const, reason: 'unknown-section' as const };
        }
        const id = params.sectionId as BriefSectionId;
        const next = applySectionEdit(activeDraft, id, params.body);
        activeDraft = next;
        const validation = validateBrief(next);
        return {
          ok: true as const,
          draft: toDraft(next),
          validation,
          preview: serialiseBriefMarkdown(next),
        };
      },
    );

    this.messenger.onRequest(BriefEditList, async (params): Promise<BriefEditListResult> => {
      if (activeBriefEntryId) {
        return { ok: false as const, reason: 'locked' as const };
      }
      if (!activeDraft) {
        return { ok: false as const, reason: 'locked' as const };
      }
      const next = applyListEdit(activeDraft, params.list, params.globs);
      activeDraft = next;
      const validation = validateBrief(next);
      return {
        ok: true as const,
        draft: toDraft(next),
        validation,
        preview: serialiseBriefMarkdown(next),
      };
    });

    this.messenger.onRequest(BriefSave, async (params): Promise<BriefSaveResult> => {
      if (activeBriefEntryId) {
        // Stale-id attack guard: a saved brief can never be re-saved.
        return {
          ok: false as const,
          reason: 'locked' as const,
          errors: ['Brief is locked; create a new version via Compose new version.'],
        };
      }
      const incoming = fromDraft(params.draft);
      const validation = validateBrief(incoming);
      if (!validation.ok) {
        return {
          ok: false as const,
          reason: 'validation' as const,
          errors: validation.errors,
        };
      }

      const lockedAt = new Date().toISOString();
      const briefUserId = incoming.frontmatter.brief_id || nextBriefId();
      const briefVersion = incoming.frontmatter.supersedes ? 2 : 1;
      const finalisedBrief: ExecutionBrief = {
        ...incoming,
        frontmatter: {
          ...incoming.frontmatter,
          brief_id: briefUserId,
          schema_version: BRIEF_SCHEMA_VERSION,
          locked_at: lockedAt,
        },
      };
      const markdown = serialiseBriefMarkdown(finalisedBrief);

      const created = await memoryStore.createBrief({
        requirementEntryId: incoming.frontmatter.requirement_id
          ? (await resolveRequirementEntryIdFromUserId(
              memoryStore,
              registry,
              incoming.frontmatter.requirement_id,
            )) ?? ''
          : '',
        projectId: incoming.frontmatter.project_id,
        briefUserId,
        briefMarkdown: markdown,
        profile: incoming.frontmatter.profile,
        lockedAt,
        briefVersion,
        schemaVersion: BRIEF_SCHEMA_VERSION,
        ...(incoming.frontmatter.test_spec_id
          ? { testSpecEntryId: incoming.frontmatter.test_spec_id }
          : {}),
        ...(incoming.frontmatter.supersedes
          ? { supersedesEntryId: incoming.frontmatter.supersedes }
          : {}),
      });

      activeBriefEntryId = created.entryId;
      activeDraft = null;

      this.messenger.sendNotification(RequirementsChanged, BROADCAST, {
        source: 'execution-update',
        ids: [
          await resolveRequirementEntryIdFromUserId(
            memoryStore,
            registry,
            incoming.frontmatter.requirement_id,
          ) ?? '',
        ].filter((s): s is string => s.length > 0),
      });

      return {
        ok: true as const,
        entryId: created.entryId,
        briefId: created.payload.id,
        bodyUri: memoryStore.briefBodyUri(created.entryId).toString(),
      };
    });

    this.messenger.onRequest(BriefCopyPreview, async (params) => {
      await vscode.env.clipboard.writeText(params.markdown);
      const bytesCopied = new TextEncoder().encode(params.markdown).length;
      return { ok: true as const, bytesCopied };
    });

    this.messenger.onNotification(BriefCancel, () => {
      activeDraft = null;
      activeBriefEntryId = undefined;
    });
  }

  broadcastDiscoverMode(mode: DiscoverMode): void {
    this.messenger.sendNotification(DiscoverSetMode, BROADCAST, { mode });
  }

  attachPanel(panel: vscode.WebviewPanel): void {
    this.messenger.registerWebviewPanel(panel);
  }
}

async function loadRequirementByEntryId(
  memoryStore: MemoryStore,
  entryId: string,
): Promise<RequirementItemRecord | null> {
  const entry = await memoryStore.read(entryId);
  if (!entry || entry.type !== 'requirement') return null;
  const stored = entry.payload as unknown as StoredRequirementItemPayload;
  if (stored.kind !== 'requirement-item') return null;
  return {
    entryId: entry.id,
    payload: stored,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function firstParagraph(markdown: string): string {
  const body = markdown.trim();
  if (body.length === 0) return '';
  const lines = body.split(/\r?\n/);
  const paragraph: string[] = [];
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (line.trim().length === 0) {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(line.trim());
  }
  return paragraph.join(' ');
}

// --- CHUNK-09 brief helpers ----------------------------------------------

function toDraft(brief: ExecutionBrief): ExecutionBriefDraft {
  const sections = {} as Record<BriefSectionId, ExecutionBriefDraft['sections'][BriefSectionId]>;
  for (const id of Object.keys(brief.sections) as BriefSectionId[]) {
    const section = brief.sections[id];
    sections[id] = {
      id: section.id,
      number: section.number,
      name: section.name,
      body: section.body,
      readOnly: id === 'expected-output',
    };
  }
  return {
    frontmatter: brief.frontmatter,
    title: brief.title,
    metaLines: brief.metaLines,
    sections,
    allowed: brief.allowed.globs,
    forbidden: brief.forbidden.globs,
  };
}

function fromDraft(draft: ExecutionBriefDraft): ExecutionBrief {
  const sections = {} as Record<BriefSectionId, BriefSection>;
  for (const id of Object.keys(draft.sections) as BriefSectionId[]) {
    const section = draft.sections[id];
    sections[id] = {
      id: section.id,
      number: section.number,
      name: section.name,
      body: section.body,
    };
  }
  return {
    frontmatter: draft.frontmatter,
    title: draft.title,
    metaLines: draft.metaLines,
    sections,
    allowed: { kind: 'allowed', globs: [...draft.allowed] },
    forbidden: { kind: 'forbidden', globs: [...draft.forbidden] },
  };
}

function applySectionEdit(
  brief: ExecutionBrief,
  id: BriefSectionId,
  body: string,
): ExecutionBrief {
  const existing = brief.sections[id];
  return {
    ...brief,
    sections: {
      ...brief.sections,
      [id]: { ...existing, body },
    },
  };
}

function applyListEdit(
  brief: ExecutionBrief,
  list: 'allowed' | 'forbidden',
  globs: readonly string[],
): ExecutionBrief {
  const normalised = globs.map(normaliseListGlob).filter((g) => g.length > 0);
  if (list === 'allowed') {
    return {
      ...brief,
      sections: {
        ...brief.sections,
        'allowed-changes': {
          ...brief.sections['allowed-changes'],
          body: normalised.length > 0 ? normalised.map((g) => `- ${g}`).join('\n') : '',
        },
      },
      allowed: { kind: 'allowed', globs: normalised },
    };
  }
  return {
    ...brief,
    sections: {
      ...brief.sections,
      'forbidden-changes': {
        ...brief.sections['forbidden-changes'],
        body: normalised.length > 0 ? normalised.map((g) => `- ${g}`).join('\n') : '- (none)',
      },
    },
    forbidden: { kind: 'forbidden', globs: normalised },
  };
}

function normaliseListGlob(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  // Mirror briefMarkdown's parse-time normalisation so the host-side draft
  // matches the on-disk canonical form before serialise round-trips it.
  return trimmed.endsWith('/') ? `${trimmed}**` : trimmed;
}

function toWarning(parserWarning: string): string {
  switch (parserWarning) {
    case 'crlf-normalised':
      return 'Brief markdown contained CRLF line endings; normalised to LF.';
    case 'h1-case-mismatch':
      return 'H1 title case differed from canonical "DeliveryOS Execution Brief".';
    default:
      return parserWarning;
  }
}

async function resolveRequirementEntryIdFromUserId(
  memoryStore: MemoryStore,
  registry: IProjectRegistry,
  userId: string,
): Promise<string | null> {
  const active = registry.getActive();
  if (!active) return null;
  const prd = await memoryStore.loadPrdParent(active.id);
  if (!prd) return null;
  const records = await memoryStore.listRequirementItems(prd.prdId);
  const match = records.find((r) => r.payload.id === userId);
  return match ? match.entryId : null;
}

/** Re-export for adjacent host code that needs the brief record shape. */
export type { BriefRecord };
