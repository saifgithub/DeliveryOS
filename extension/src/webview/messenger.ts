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
  ProfileApplyUpdate,
  ProfileBootstrap,
  ProfileComputeUpdates,
  ProfilePreview,
  ProfileSelect,
  HandoffApplyGitignoreTemplate,
  HandoffError,
  HandoffResultObserved,
  HandoffRunWithClaudeCode,
  HandoffRunWithCodex,
  HandoffTerminalClosed,
  HandoffWritten,
  type HandoffApplyGitignoreResult,
  type HandoffRunResult,
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
  ChangeRequestBootstrap,
  ChangeRequestGeneratePrompt,
  ChangeRequestList,
  ChangeRequestLoad,
  ChangeRequestPasteApply,
  type ChangeRequest,
  BugBootstrap,
  BugList,
  BugLoad,
  BugLog,
  BugUpdate,
  type Bug,
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
  type HarnessProfileWire,
  type ProfileApplyUpdateResult,
  type ProfileBootstrapResult,
  type ProfileComputeUpdatesResult,
  type ProfileName,
  type ProfilePreviewResult,
  type SuggestedUpdateWire,
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
import { buildChangeRequestPrompt } from '../requirements/changeRequestPrompt';
import { parseChangeRequest } from '../requirements/changeRequestParser';
import type { ChangeRequestRecord, BugRecord } from '../memory/MemoryStore';
import { regenerateDefectList } from '../iteration/defectListWriter';
import { buildDecomposePrompt } from '../requirements/decompositionPrompt';
import { parseDecomposed } from '../requirements/parser';
import {
  PROFILE_LIST,
  getProfile,
  renderBrief,
  computeSuggestedUpdates,
  writeFileAtomic,
} from '../profiles';
import type {
  HarnessProfile,
  ProfileName as HarnessProfileName,
  SuggestedUpdate,
  VscodeFsNamespace,
  WorkspaceFileReader,
} from '../profiles';
import {
  renderContextPackage,
  renderMemorySummary,
  renderTestSpecification,
  renderVerificationChecklist,
} from '../brief/handoffSiblings';
import { HandoffWriter } from '../handoff/writer';
import { TerminalLauncher } from '../handoff/terminalLauncher';
import { ResultWatcher } from '../handoff/resultWatcher';
import type { ResultWatchEvent } from '../handoff/resultWatcher';
import {
  applyGitignoreBlock,
  gitignoreState,
} from '../handoff/gitignoreTemplate';
import type { TestSpecMemory, RequirementMemory } from '@deliveryos/contracts';
import { buildTestDesignerPrompt } from '../specialists/testDesigner/promptBuilder';
import { parseTestDesignerResult } from '../specialists/testDesigner/resultParser';
import { consumePendingBriefRequest } from './briefComposerPanel';
import { consumePendingCrEntryId } from './changeRequestPanel';
import { consumePendingBugEntryId } from './bugPanel';
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

export interface ProfileDeps {
  /** Workspace root used to resolve `instruction_file` + `.claude/settings.json` paths. */
  readonly workspaceRoot: vscode.Uri;
  /** Persistence for `lastUsedProfileName` per spec § 12 Q1. */
  readonly workspaceState: vscode.Memento;
}

export interface HandoffDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
  readonly workspace: vscode.WorkspaceFolder;
  /** Per-project flag store for the `.gitignore` first-write prompt. */
  readonly globalState: vscode.Memento;
  /** CHUNK-12: called when result.md is observed, to trigger capture pipeline. */
  readonly onResultMdReady?: (event: ResultWatchEvent) => void;
}

export interface ChangeRequestDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
  /** Callback the host injects so handlers can open the CR panel. */
  readonly openChangeRequestPanel: (args?: { crEntryId?: string }) => Promise<void>;
}

export interface BugDeps {
  readonly registry: IProjectRegistry;
  readonly memoryStore: MemoryStore;
  /**
   * Workspace root used to regenerate `.deliveryos/DEFECT_LIST.md` after every
   * bug mutation. Absent in the in-memory fallback (no workspace open), in
   * which case the aggregate markdown is simply not written.
   */
  readonly workspace?: vscode.Uri;
}

const LAST_USED_PROFILE_KEY = 'deliveryos.profiles.lastUsed';
const GITIGNORE_PROMPTED_KEY_PREFIX = 'deliveryos.handoff.gitignorePromptedFor.';

export class HostMessenger {
  readonly messenger = new Messenger({ ignoreHiddenViews: false });

  /**
   * In-flight brief composer draft, shared between `registerBriefHandlers`
   * (the editor) and `registerProfileHandlers` (the profile-aware preview
   * pane). `null` when no composer is open or after Save. Read-only mode
   * also populates this (bootstrap loads the saved brief into it).
   */
  private activeDraft: ExecutionBrief | null = null;

  /** SQLite row id of the active brief when in read-only mode. */
  private activeBriefEntryId: string | undefined;

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
      interview: import('@deliveryos/contracts').InterviewRecord | null,
    ): void => {
      this.messenger.sendNotification(DiscoverStateChanged, BROADCAST, {
        rawIdea,
        discovery,
        interview,
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
            interview: null,
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
            interview: null,
            questions: DISCOVERY_QUESTIONS_MVP,
            mode,
          };
        }
        return {
          projectTitle: entry.title,
          rawIdea: entry.payload.rawIdea,
          discovery: entry.payload.discovery,
          interview: entry.payload.interview ?? null,
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
      broadcastStateChange(updated.payload.rawIdea, updated.payload.discovery, updated.payload.interview ?? null);
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
      broadcastStateChange(updated.payload.rawIdea, updated.payload.discovery, updated.payload.interview ?? null);
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
    // State lives on `this.activeDraft` + `this.activeBriefEntryId` so
    // `registerProfileHandlers` (CHUNK-10) can read the current brief for
    // its profile-aware preview pane without re-querying memory.

    this.messenger.onRequest(BriefBootstrap, async (): Promise<BriefBootstrapResult> => {
      const pending = consumePendingBriefRequest();
      if (!pending) {
        this.activeDraft = null;
        this.activeBriefEntryId = undefined;
        return { ok: false as const, reason: 'no-requirement' as const };
      }

      const reqRow = await loadRequirementByEntryId(memoryStore, pending.requirementEntryId);
      if (!reqRow) {
        this.activeDraft = null;
        this.activeBriefEntryId = undefined;
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
        this.activeDraft = parsed.brief;
        this.activeBriefEntryId = existing.entryId;
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
      this.activeDraft = outcome.brief;
      this.activeBriefEntryId = undefined;
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
        if (this.activeBriefEntryId) {
          // Read-only mode — host is the authoritative immutability gate
          // (spec § 11.5a). Webview-disabled controls are UX courtesy.
          return { ok: false as const, reason: 'locked' as const };
        }
        if (!this.activeDraft) {
          return { ok: false as const, reason: 'unknown-section' as const };
        }
        if (params.sectionId === 'expected-output') {
          // Section 9 is the fixed RESULT_MD_SECTION_NAMES template (spec § 4.5).
          return { ok: false as const, reason: 'read-only-section' as const };
        }
        if (!(params.sectionId in this.activeDraft.sections)) {
          return { ok: false as const, reason: 'unknown-section' as const };
        }
        const id = params.sectionId as BriefSectionId;
        const next = applySectionEdit(this.activeDraft, id, params.body);
        this.activeDraft = next;
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
      if (this.activeBriefEntryId) {
        return { ok: false as const, reason: 'locked' as const };
      }
      if (!this.activeDraft) {
        return { ok: false as const, reason: 'locked' as const };
      }
      const next = applyListEdit(this.activeDraft, params.list, params.globs);
      this.activeDraft = next;
      const validation = validateBrief(next);
      return {
        ok: true as const,
        draft: toDraft(next),
        validation,
        preview: serialiseBriefMarkdown(next),
      };
    });

    this.messenger.onRequest(BriefSave, async (params): Promise<BriefSaveResult> => {
      if (this.activeBriefEntryId) {
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

      this.activeBriefEntryId = created.entryId;
      this.activeDraft = null;

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
      this.activeDraft = null;
      this.activeBriefEntryId = undefined;
    });
  }

  registerProfileHandlers(deps: ProfileDeps): void {
    const { workspaceRoot, workspaceState } = deps;

    this.messenger.onRequest(ProfileBootstrap, async (): Promise<ProfileBootstrapResult> => {
      const stored = workspaceState.get<string>(LAST_USED_PROFILE_KEY);
      const lastUsedProfileName: ProfileName =
        stored === 'codex' || stored === 'claude-code' ? stored : 'claude-code';
      return {
        profiles: PROFILE_LIST.map(toProfileWire),
        lastUsedProfileName,
      };
    });

    this.messenger.onNotification(ProfileSelect, (params) => {
      void workspaceState.update(LAST_USED_PROFILE_KEY, params.profileName);
    });

    this.messenger.onRequest(ProfilePreview, async (params): Promise<ProfilePreviewResult> => {
      if (!this.activeDraft) {
        return { ok: false as const, reason: 'no-draft' as const };
      }
      const profile = getProfile(params.profileName);
      const rendered = renderBrief(this.activeDraft, profile);
      return {
        ok: true as const,
        rendered: {
          profileName: rendered.profileName,
          briefId: rendered.briefId,
          markdown: rendered.markdown,
          renderedAt: rendered.renderedAt,
        },
      };
    });

    this.messenger.onRequest(
      ProfileComputeUpdates,
      async (params): Promise<ProfileComputeUpdatesResult> => {
        const profile = getProfile(params.profileName);
        const reader = makeWorkspaceFileReader(workspaceRoot);
        const updates = await computeSuggestedUpdates(profile, reader);
        return {
          ok: true as const,
          updates: updates.map(toUpdateWire),
        };
      },
    );

    this.messenger.onRequest(
      ProfileApplyUpdate,
      async (params): Promise<ProfileApplyUpdateResult> => {
        const profile = getProfile(params.profileName);
        const reader = makeWorkspaceFileReader(workspaceRoot);
        const updates = await computeSuggestedUpdates(profile, reader);
        const target = updates.find((u) => u.file === params.file);
        if (!target) {
          return {
            ok: false as const,
            reason: 'unknown-file' as const,
            error: `No suggested update for ${params.file}.`,
          };
        }
        if (target.action === 'noop' && target.error) {
          return {
            ok: false as const,
            reason: 'noop-with-error' as const,
            error: target.error,
          };
        }
        if (target.action === 'replace-block') {
          const pick = await vscode.window.showWarningMessage(
            `Overwrite the existing DeliveryOS-managed block in ${target.file}?`,
            { modal: true, detail: target.warning ?? '' },
            'Apply',
            'Cancel',
          );
          if (pick !== 'Apply') {
            return { ok: false as const, reason: 'cancelled' as const };
          }
        }
        try {
          const fileUri = vscode.Uri.joinPath(workspaceRoot, ...target.file.split('/'));
          if (target.file.includes('/')) {
            const parent = vscode.Uri.joinPath(
              workspaceRoot,
              ...target.file.split('/').slice(0, -1),
            );
            await vscode.workspace.fs.createDirectory(parent);
          }
          await writeFileAtomic(vscode as VscodeFsNamespace, fileUri, target.nextContent);
          return { ok: true as const, file: target.file, action: target.action };
        } catch (e) {
          return {
            ok: false as const,
            reason: 'write-failed' as const,
            error: (e as Error).message,
          };
        }
      },
    );
  }

  registerHandoffHandlers(deps: HandoffDeps): vscode.Disposable {
    const { registry, memoryStore, workspace, globalState } = deps;

    const writer = new HandoffWriter(workspace);
    const launcher = new TerminalLauncher();
    const watcher = new ResultWatcher(workspace);

    // Forward result-watcher events as webview notifications. CHUNK-12 will
    // also subscribe to `watcher.onResult` directly to parse + persist
    // Result Memory; CHUNK-11's job is to fire the event.
    const watcherSub = watcher.onResult((event) => {
      this.messenger.sendNotification(HandoffResultObserved, BROADCAST, {
        briefId: event.briefId,
        handoffTimestamp: event.handoffTimestamp,
        resultUri: event.resultUri.toString(),
        contentSha256: event.contentSha256,
        observedAt: event.observedAt,
        kind: event.kind,
      });
      // CHUNK-12: also invoke the capture callback if wired up.
      if (deps.onResultMdReady) {
        deps.onResultMdReady(event);
      }
    });

    const launcherSub = launcher.onClose((event) => {
      this.messenger.sendNotification(HandoffTerminalClosed, BROADCAST, {
        briefId: event.briefId,
        handoffTimestamp: event.handoffTimestamp,
        exitCode: event.exitCode,
        reason: event.reason,
      });
    });

    const runHandler = async (
      profileName: HarnessProfileName,
      briefId: string,
    ): Promise<HandoffRunResult> => {
      try {
        const brief = await memoryStore.getBrief(briefId);
        if (!brief) {
          this.messenger.sendNotification(HandoffError, BROADCAST, {
            briefId,
            message: 'Brief not found in memory.',
          });
          return { ok: false as const, reason: 'no-brief' as const };
        }
        const snapshot = await buildHandoffSnapshot(memoryStore, registry, brief);
        const writeResult = await writer.write(snapshot);
        const profile = getProfile(profileName);

        // Fire .gitignore opt-in once per project on first write.
        void promptGitignoreIfNeeded({
          workspace,
          globalState,
          projectId: snapshot.projectId,
        });

        watcher.registerExpectedHandoff(
          writeResult.timestamp,
          writeResult.briefHistoryUri,
          briefId,
        );
        launcher.launch({
          profile,
          workspace,
          handoffTimestamp: writeResult.timestamp,
          briefId,
        });

        this.messenger.sendNotification(HandoffWritten, BROADCAST, {
          briefId,
          handoffTimestamp: writeResult.timestamp,
          briefHistoryUri: writeResult.briefHistoryUri.toString(),
          profileName,
        });

        return {
          ok: true as const,
          handoffTimestamp: writeResult.timestamp,
          briefHistoryUri: writeResult.briefHistoryUri.toString(),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(`DeliveryOS handoff failed: ${message}`);
        this.messenger.sendNotification(HandoffError, BROADCAST, { briefId, message });
        return { ok: false as const, reason: 'write-failed' as const, error: message };
      }
    };

    this.messenger.onRequest(HandoffRunWithClaudeCode, (params) =>
      runHandler('claude-code', params.briefId),
    );
    this.messenger.onRequest(HandoffRunWithCodex, (params) =>
      runHandler('codex', params.briefId),
    );

    this.messenger.onRequest(
      HandoffApplyGitignoreTemplate,
      async (_params): Promise<HandoffApplyGitignoreResult> => {
        try {
          const stateBefore = await gitignoreState(workspace);
          if (stateBefore.kind === 'present-differs') {
            const pick = await vscode.window.showWarningMessage(
              'Overwrite the existing DeliveryOS-managed block in .gitignore?',
              { modal: true, detail: 'The current block was hand-edited or out of date.' },
              'Apply',
              'Cancel',
            );
            if (pick !== 'Apply') return { ok: false as const, reason: 'cancelled' as const };
          }
          const plan = await applyGitignoreBlock(workspace);
          return { ok: true as const, action: plan.action };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { ok: false as const, reason: 'write-failed' as const, error: message };
        }
      },
    );

    const owned: vscode.Disposable = {
      dispose: () => {
        watcherSub.dispose();
        launcherSub.dispose();
        watcher.dispose();
        launcher.dispose();
      },
    };
    return owned;
  }

  broadcastDiscoverMode(mode: DiscoverMode): void {
    this.messenger.sendNotification(DiscoverSetMode, BROADCAST, { mode });
  }

  registerChangeRequestHandlers(deps: ChangeRequestDeps): void {
    const { registry, memoryStore, openChangeRequestPanel } = deps;

    const toChangeRequest = (record: ChangeRequestRecord): ChangeRequest => {
      const cr: ChangeRequest = {
        entryId: record.entryId,
        id: record.payload.id,
        description: record.payload.description,
        status: record.payload.status,
        createdAt: record.createdAt,
      };
      if (record.payload.appliedAt !== undefined) (cr as { appliedAt?: number }).appliedAt = record.payload.appliedAt;
      if (record.payload.addedRequirementIds !== undefined) (cr as { addedRequirementIds?: readonly string[] }).addedRequirementIds = record.payload.addedRequirementIds;
      if (record.payload.editedRequirementIds !== undefined) (cr as { editedRequirementIds?: readonly string[] }).editedRequirementIds = record.payload.editedRequirementIds;
      if (record.payload.deletedRequirementUserIds !== undefined) (cr as { deletedRequirementUserIds?: readonly string[] }).deletedRequirementUserIds = record.payload.deletedRequirementUserIds;
      return cr;
    };

    this.messenger.onRequest(ChangeRequestBootstrap, async () => {
      const crEntryId = consumePendingCrEntryId();
      return { ok: true as const, crEntryId };
    });

    this.messenger.onRequest(ChangeRequestLoad, async (params) => {
      const record = await memoryStore.loadChangeRequest(params.entryId);
      if (!record) {
        return { ok: false as const, reason: `No change-request entry ${params.entryId}` };
      }
      return { ok: true as const, changeRequest: toChangeRequest(record) };
    });

    this.messenger.onRequest(ChangeRequestList, async (_params) => {
      const active = registry.getActive();
      if (!active) return { ok: false as const, reason: 'no-project' };
      const prd = await memoryStore.loadPrdParent(active.id);
      if (!prd) return { ok: false as const, reason: 'no-prd' };
      const records = await memoryStore.listChangeRequests(prd.prdId);
      return { ok: true as const, changeRequests: records.map(toChangeRequest) };
    });

    this.messenger.onRequest(ChangeRequestGeneratePrompt, async (params) => {
      const active = registry.getActive();
      if (!active) return { ok: false as const, reason: 'No active project.' };
      const prd = await memoryStore.loadPrdParent(active.id);
      if (!prd) return { ok: false as const, reason: 'No PRD on file for this project.' };
      const reqRecords = await memoryStore.listRequirementItems(prd.prdId);
      const requirements = reqRecords.map((r) => ({
        id: r.payload.id,
        title: r.payload.title,
        category: r.payload.category,
        priority: r.payload.priority,
        sourcePrdSection: r.payload.sourcePrdSection,
      }));
      const cr = await memoryStore.createChangeRequest(prd.prdId, params.description, prd.sections);
      const prdMarkdownBody = renderPrdMarkdown({ projectTitle: prd.projectTitle, sections: prd.sections });
      const prompt = buildChangeRequestPrompt({ prd, requirements, crDescription: params.description, prdMarkdownBody });
      await vscode.env.clipboard.writeText(prompt);
      const bytesCopied = new TextEncoder().encode(prompt).length;
      await memoryStore.updateChangeRequest(cr.entryId, { status: 'prompted' });
      await openChangeRequestPanel({ crEntryId: cr.entryId });
      return { ok: true as const, crEntryId: cr.entryId, bytesCopied };
    });

    this.messenger.onRequest(ChangeRequestPasteApply, async (params) => {
      const active = registry.getActive();
      if (!active) return { ok: false as const, reason: 'No active project.', raw: params.text };
      const prd = await memoryStore.loadPrdParent(active.id);
      if (!prd) return { ok: false as const, reason: 'No PRD on file for this project.', raw: params.text };

      const parsed = parseChangeRequest(params.text);
      if (!parsed.ok) {
        return { ok: false as const, reason: parsed.reason, raw: parsed.raw };
      }

      const reqRecords = await memoryStore.listRequirementItems(prd.prdId);
      const idToEntryId = new Map<string, string>(reqRecords.map((r) => [r.payload.id, r.entryId]));

      const addedIds = await memoryStore.createRequirementItems(prd.prdId, parsed.added);

      const editedIds: string[] = [];
      for (const edit of parsed.edited) {
        const entryId = idToEntryId.get(edit.id);
        if (!entryId) continue;
        await memoryStore.updateRequirementItem(entryId, edit.patch);
        editedIds.push(entryId);
      }

      const deletedUserIds: string[] = [];
      for (const del of parsed.deleted) {
        const entryId = idToEntryId.get(del.id);
        if (!entryId) continue;
        await memoryStore.deleteRequirementItem(entryId);
        deletedUserIds.push(del.id);
      }

      const allAffected = [...addedIds, ...editedIds];
      await memoryStore.linkCrToRequirements(params.crEntryId, allAffected);
      await memoryStore.updateChangeRequest(params.crEntryId, {
        status: 'applied',
        appliedAt: Date.now(),
        addedRequirementIds: addedIds,
        editedRequirementIds: editedIds,
        deletedRequirementUserIds: deletedUserIds,
      });

      if (addedIds.length > 0) {
        this.messenger.sendNotification(RequirementsChanged, BROADCAST, { source: 'create', ids: addedIds });
      }
      if (editedIds.length > 0) {
        this.messenger.sendNotification(RequirementsChanged, BROADCAST, { source: 'update', ids: editedIds });
      }

      return {
        ok: true as const,
        added: addedIds.length,
        edited: editedIds.length,
        deleted: deletedUserIds.length,
        warnings: parsed.warnings,
      };
    });
  }

  registerBugHandlers(deps: BugDeps): void {
    const { registry, memoryStore, workspace } = deps;

    const toBug = (record: BugRecord): Bug => {
      const bug: Bug = {
        entryId: record.entryId,
        id: record.payload.id,
        description: record.payload.description,
        severity: record.payload.severity,
        status: record.payload.status,
        createdAt: record.createdAt,
      };
      if (record.payload.area !== undefined) (bug as { area?: string }).area = record.payload.area;
      if (record.payload.discoveredIn !== undefined) (bug as { discoveredIn?: string }).discoveredIn = record.payload.discoveredIn;
      if (record.payload.targetRequirementId !== undefined) (bug as { targetRequirementId?: string }).targetRequirementId = record.payload.targetRequirementId;
      if (record.payload.fixResultId !== undefined) (bug as { fixResultId?: string }).fixResultId = record.payload.fixResultId;
      if (record.payload.assignedAt !== undefined) (bug as { assignedAt?: number }).assignedAt = record.payload.assignedAt;
      if (record.payload.fixedAt !== undefined) (bug as { fixedAt?: number }).fixedAt = record.payload.fixedAt;
      if (record.payload.verifiedAt !== undefined) (bug as { verifiedAt?: number }).verifiedAt = record.payload.verifiedAt;
      if (record.payload.deferredReason !== undefined) (bug as { deferredReason?: string }).deferredReason = record.payload.deferredReason;
      if (record.payload.notes !== undefined) (bug as { notes?: string }).notes = record.payload.notes;
      return bug;
    };

    // Resolve the active project (intent) id — the same id bugs derive from.
    const activeProjectId = (): string | null => registry.getActive()?.id ?? null;

    // Keep `.deliveryos/DEFECT_LIST.md` current after every mutation.
    const regenerate = async (projectId: string): Promise<void> => {
      if (!workspace) return;
      await regenerateDefectList(workspace, memoryStore, projectId);
    };

    this.messenger.onRequest(BugBootstrap, async () => {
      // Bug entry id is consumed for parity with CR; the panel lists bugs.
      consumePendingBugEntryId();
      return { ok: true as const, projectId: activeProjectId() };
    });

    this.messenger.onRequest(BugList, async (params) => {
      const projectId = params.projectId || activeProjectId();
      if (!projectId) return { ok: false as const, reason: 'no-project' };
      const records = await memoryStore.listBugs(projectId);
      return { ok: true as const, bugs: records.map(toBug) };
    });

    this.messenger.onRequest(BugLoad, async (params) => {
      const record = await memoryStore.loadBug(params.entryId);
      if (!record) return { ok: false as const, reason: `No bug entry ${params.entryId}` };
      return { ok: true as const, bug: toBug(record) };
    });

    this.messenger.onRequest(BugLog, async (params) => {
      const projectId = activeProjectId();
      if (!projectId) return { ok: false as const, reason: 'No active project.' };
      if (!params.description.trim()) {
        return { ok: false as const, reason: 'Bug description is required.' };
      }
      const record = await memoryStore.createBug(projectId, {
        description: params.description,
        severity: params.severity,
        ...(params.area ? { area: params.area } : {}),
        ...(params.discoveredIn ? { discoveredIn: params.discoveredIn } : {}),
        ...(params.targetRequirementId ? { targetRequirementId: params.targetRequirementId } : {}),
        ...(params.notes ? { notes: params.notes } : {}),
      });
      await regenerate(projectId);
      return { ok: true as const, bugEntryId: record.entryId, bugId: record.payload.id };
    });

    this.messenger.onRequest(BugUpdate, async (params) => {
      const existing = await memoryStore.loadBug(params.entryId);
      if (!existing) return { ok: false as const, reason: `No bug entry ${params.entryId}` };
      const patch: Partial<{
        status: Bug['status'];
        severity: Bug['severity'];
        area: string;
        targetRequirementId: string;
        deferredReason: string;
        notes: string;
      }> = {};
      if (params.status !== undefined) patch.status = params.status;
      if (params.severity !== undefined) patch.severity = params.severity;
      if (params.area !== undefined) patch.area = params.area;
      if (params.targetRequirementId !== undefined) patch.targetRequirementId = params.targetRequirementId;
      if (params.deferredReason !== undefined) patch.deferredReason = params.deferredReason;
      if (params.notes !== undefined) patch.notes = params.notes;
      const record = await memoryStore.updateBug(params.entryId, patch);
      if (params.targetRequirementId) {
        await memoryStore.linkBugToRequirement(params.entryId, params.targetRequirementId);
      }
      const projectId = activeProjectId();
      if (projectId) await regenerate(projectId);
      return { ok: true as const, bug: toBug(record) };
    });
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

// --- CHUNK-10 profile-handler helpers ------------------------------------

function toProfileWire(profile: HarnessProfile): HarnessProfileWire {
  return {
    name: profile.name,
    display_name: profile.display_name,
    instruction_file: profile.instruction_file,
    handoff_dir: profile.handoff_dir,
    brief_style: profile.brief_style,
    include_test_commands: profile.include_test_commands,
    include_lint_commands: profile.include_lint_commands,
    include_forbidden_changes: profile.include_forbidden_changes,
    output_format: profile.output_format,
    mcp_capable: profile.mcp_capable,
    ...(profile.command_template !== undefined
      ? { command_template: profile.command_template }
      : {}),
    ...(profile.harness_version_pin !== undefined
      ? { harness_version_pin: profile.harness_version_pin }
      : {}),
  };
}

function toUpdateWire(update: SuggestedUpdate): SuggestedUpdateWire {
  return {
    file: update.file,
    existingContent: update.existingContent,
    nextContent: update.nextContent,
    managedBlock: { ...update.managedBlock },
    action: update.action,
    ...(update.warning !== undefined ? { warning: update.warning } : {}),
    ...(update.error !== undefined ? { error: update.error } : {}),
  };
}

function makeWorkspaceFileReader(workspaceRoot: vscode.Uri): WorkspaceFileReader {
  return {
    async readFile(relativePath: string): Promise<string | null> {
      const fileUri = vscode.Uri.joinPath(workspaceRoot, ...relativePath.split('/'));
      try {
        const bytes = await vscode.workspace.fs.readFile(fileUri);
        return new TextDecoder('utf-8').decode(bytes);
      } catch (e) {
        const err = e as { code?: string; name?: string };
        if (
          err.code === 'FileNotFound' ||
          err.name === 'EntryNotFound (FileSystemError)' ||
          /not\s+found/i.test(String((e as Error).message ?? ''))
        ) {
          return null;
        }
        throw e;
      }
    },
  };
}

/** Re-export for adjacent host code that needs the brief record shape. */
export type { BriefRecord };

// --- CHUNK-11 handoff-handler helpers ------------------------------------

async function buildHandoffSnapshot(
  memoryStore: MemoryStore,
  registry: IProjectRegistry,
  brief: BriefRecord,
): Promise<import('@deliveryos/contracts').HandoffSnapshot> {
  const parsed = parseBriefMarkdown(brief.body);
  const parsedBrief: ExecutionBrief = parsed.brief;

  const requirementEntryId = brief.payload.requirementEntryId;
  const requirementUserId = brief.payload.requirementUserId;
  const requirementRecord = requirementEntryId
    ? await loadRequirementByEntryId(memoryStore, requirementEntryId)
    : null;
  const requirementTitle =
    requirementRecord?.payload.title ?? `Requirement ${requirementUserId}`;

  // Synthesize a RequirementMemory-shaped envelope for the renderers — they
  // only access `id` and `title` (codebase is null in MVP).
  const requirement: RequirementMemory = {
    id: requirementUserId,
    type: 'requirement',
    title: requirementTitle,
    body: '',
    payload: {
      category: requirementRecord?.payload.category ?? 'functional',
      priority: requirementRecord?.payload.priority ?? 'should',
      text: requirementRecord?.payload.text ?? requirementTitle,
    },
    createdAt: requirementRecord?.createdAt ?? Date.now(),
    updatedAt: requirementRecord?.updatedAt ?? Date.now(),
  };

  const contextPackageMd = renderContextPackage(requirement, null, parsedBrief);
  const verificationChecklistMd = renderVerificationChecklist(parsedBrief);

  const linkedEntries: Array<{ id: string; type: string; title: string }> = [];
  linkedEntries.push({
    id: requirementUserId,
    type: 'requirement',
    title: requirementTitle,
  });

  // Best-effort: pull the linked test-spec body for renderTestSpecification.
  let testSpecMd = '';
  let testSpec: TestSpecMemory | null = null;
  if (requirementEntryId) {
    const tsRecord = await memoryStore.getTestSpec(requirementEntryId);
    if (tsRecord) {
      testSpec = {
        id: tsRecord.payload.id,
        type: 'test-spec',
        title: tsRecord.title,
        body: tsRecord.body,
        payload: {
          requirementId: requirementUserId,
          scenarios: tsRecord.payload.scenarios.map((s) => ({
            id: s.id,
            description: s.description,
            steps: s.steps,
            expected: s.expected,
          })),
        },
        createdAt: tsRecord.createdAt,
        updatedAt: tsRecord.updatedAt,
      };
      linkedEntries.push({ id: testSpec.id, type: 'test-spec', title: testSpec.title });
    }
  }
  testSpecMd = testSpec
    ? renderTestSpecification(testSpec)
    : '# Test Specification\n\n_(No test specification linked to this requirement.)_\n';

  const memorySummaryMd = renderMemorySummary({
    brief: parsedBrief,
    requirement,
    linkedEntries,
  });

  // Resolve project id from the brief payload or fall back to active project.
  const projectId = brief.payload.projectId || registry.getActive()?.id || '';

  return {
    executionBriefMd: brief.body,
    contextPackageMd,
    testSpecificationMd: testSpecMd,
    verificationChecklistMd,
    memorySummaryMd,
    briefId: brief.entryId,
    projectId,
  };
}

async function promptGitignoreIfNeeded(args: {
  workspace: vscode.WorkspaceFolder;
  globalState: vscode.Memento;
  projectId: string;
}): Promise<void> {
  const { workspace, globalState, projectId } = args;
  const flagKey = `${GITIGNORE_PROMPTED_KEY_PREFIX}${projectId}`;
  if (globalState.get<boolean>(flagKey)) return;

  const snapshot = await gitignoreState(workspace);
  if (snapshot.kind === 'present-matching') {
    // Block already exists and matches — silently mark as prompted.
    await globalState.update(flagKey, true);
    return;
  }

  const pick = await vscode.window.showInformationMessage(
    'DeliveryOS can add 8 lines to your .gitignore so the regenerated handoff pointers do not show up in every commit. The history/ audit trail will still be committed.',
    'Apply',
    'Skip',
    "Don't ask again",
  );
  if (pick === 'Apply') {
    try {
      await applyGitignoreBlock(workspace);
      await globalState.update(flagKey, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`DeliveryOS: failed to update .gitignore — ${message}`);
    }
  } else if (pick === "Don't ask again") {
    await globalState.update(flagKey, true);
  }
  // 'Skip' (or dismiss) leaves the flag unset so we ask again next handoff.
}
