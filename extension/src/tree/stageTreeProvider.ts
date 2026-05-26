import * as vscode from 'vscode';
import type { IntentMemory } from '@deliveryos/contracts';
import { DISCOVERY_QUESTIONS_MVP } from '../discovery/questionLibrary';
import { MemoryStore } from '../memory/MemoryStore';
import { IProjectRegistry } from '../projectRegistry';
import { STAGE_DEFS } from './stageDefinitions';
import {
  ArtefactNode,
  BriefNode,
  ComposeBriefNode,
  ExecuteRequirementNode,
  RequirementItemNode,
  RequirementsGroupNode,
  ResultNode,
  StageTreeNode,
  TestSpecNode,
  VerificationCriteriaNode,
  stageDefToNode,
  toTreeItem,
} from './stageTreeNodes';
import type { StoredResultPayload } from '@deliveryos/contracts';

const TOTAL_QUESTIONS = DISCOVERY_QUESTIONS_MVP.length;

export class StageTreeProvider
  implements vscode.TreeDataProvider<StageTreeNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    StageTreeNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly registry: IProjectRegistry,
    private readonly memoryStore?: MemoryStore,
  ) {
    this.disposables.push(registry.onDidChange(() => this.refresh()));
    if (memoryStore) {
      this.disposables.push(
        memoryStore.onDidChangeMemory((event) => {
          const active = this.registry.getActive();
          if (!active) return;
          if (event.kind === 'create' && event.entryType === 'intent') {
            this.refresh();
            return;
          }
          if (event.kind === 'update' && event.entryId === active.id) {
            this.refresh();
            return;
          }
          if (event.kind === 'create' && event.entryType === 'requirement') {
            this.refresh();
            return;
          }
          if (event.kind === 'update' && event.entryType === 'requirement') {
            this.refresh();
            return;
          }
          if (event.kind === 'create' && event.entryType === 'test-spec') {
            this.refresh();
            return;
          }
          if (event.kind === 'update' && event.entryType === 'test-spec') {
            this.refresh();
            return;
          }
          if (event.kind === 'create' && event.entryType === 'execution') {
            this.refresh();
            return;
          }
          if (event.kind === 'update' && event.entryType === 'execution') {
            this.refresh();
            return;
          }
          if (event.kind === 'create' && event.entryType === 'result') {
            this.refresh();
            return;
          }
          if (event.kind === 'link' && event.linkKind === 'produced') {
            this.refresh();
            return;
          }
          if (
            (event.kind === 'link' || event.kind === 'unlink') &&
            (event.linkKind === 'has-test-spec' ||
              event.linkKind === 'derives-from' ||
              event.linkKind === 'supersedes' ||
              event.fromId === active.id ||
              event.toId === active.id)
          ) {
            this.refresh();
          }
        }),
      );
    }
  }

  refresh(node?: StageTreeNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  getTreeItem(element: StageTreeNode): vscode.TreeItem {
    return toTreeItem(element);
  }

  async getChildren(element?: StageTreeNode): Promise<StageTreeNode[]> {
    const active = this.registry.getActive();
    if (!active) {
      return [];
    }
    if (!element) {
      return STAGE_DEFS.map(stageDefToNode);
    }
    if (element.kind === 'stage' && element.stageId === 'discover') {
      return this.discoverChildren(active.id);
    }
    if (element.kind === 'stage' && element.stageId === 'define') {
      return this.defineChildren(active.id);
    }
    if (element.kind === 'requirements-group') {
      return this.requirementsGroupChildren(element.prdId);
    }
    if (element.kind === 'requirement-item') {
      return this.requirementItemChildren(element);
    }
    if (element.kind === 'stage' && element.stageId === 'execute') {
      return this.executeChildren(active.id);
    }
    if (element.kind === 'execute-requirement') {
      return this.executeRequirementChildren(element);
    }
    if (element.kind === 'brief') {
      return this.briefResultChildren(element);
    }
    return [];
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this._onDidChangeTreeData.dispose();
  }

  private async defineChildren(
    projectId: string,
  ): Promise<(ArtefactNode | RequirementsGroupNode)[]> {
    const prd = await this.memoryStore?.loadPrdParent(projectId);
    const sectionCount = prd
      ? prd.sections.filter((s) => s.body.trim().length > 0).length
      : 0;
    const started = prd !== null && prd !== undefined;
    const nodes: (ArtefactNode | RequirementsGroupNode)[] = [
      {
        kind: 'artefact',
        stageId: 'define',
        artefactId: 'define.prd',
        artefactKind: 'define.prd',
        displayName: 'Draft PRD',
        description: started ? `${sectionCount}/8 sections` : '(not started)',
        iconId: started ? 'file-text' : 'circle-outline',
        tooltip: started
          ? `${sectionCount} of 8 sections have content`
          : 'Click to open the PRD Editor.',
        commandId: 'deliveryos.prd.open',
        commandArgs: [],
      },
    ];
    if (prd && this.memoryStore) {
      const items = await this.memoryStore.listRequirementItems(prd.prdId);
      nodes.push({
        kind: 'requirements-group',
        stageId: 'define',
        prdId: prd.prdId,
        displayName: 'Requirements',
        description: items.length === 0 ? '(not started)' : `${items.length} items`,
        iconId: items.length === 0 ? 'circle-outline' : 'checklist',
      });
    }
    return nodes;
  }

  private async requirementsGroupChildren(
    prdId: string,
  ): Promise<RequirementItemNode[]> {
    if (!this.memoryStore) return [];
    const items = await this.memoryStore.listRequirementItems(prdId);
    const out: RequirementItemNode[] = [];
    for (const record of items) {
      const hasCriteria = (record.payload.verificationCriteria?.length ?? 0) > 0;
      const testSpec = await this.memoryStore.getTestSpec(record.entryId);
      out.push({
        kind: 'requirement-item',
        stageId: 'define',
        entryId: record.entryId,
        reqId: record.payload.id,
        title: record.payload.title,
        priority: record.payload.priority,
        iconId:
          record.payload.priority === 'must'
            ? 'circle-filled'
            : record.payload.priority === 'should'
              ? 'circle-large-outline'
              : 'circle-outline',
        hasVerification: hasCriteria || testSpec !== null,
      });
    }
    return out;
  }

  private async requirementItemChildren(
    node: RequirementItemNode,
  ): Promise<(VerificationCriteriaNode | TestSpecNode)[]> {
    if (!this.memoryStore) return [];
    const entry = await this.memoryStore.read(node.entryId);
    if (!entry || entry.type !== 'requirement') return [];
    const criteriaCount = (
      (entry.payload as { verificationCriteria?: readonly string[] }).verificationCriteria ?? []
    ).length;
    const testSpec = await this.memoryStore.getTestSpec(node.entryId);
    const children: (VerificationCriteriaNode | TestSpecNode)[] = [];
    if (criteriaCount > 0) {
      children.push({
        kind: 'verification-criteria',
        stageId: 'define',
        requirementEntryId: node.entryId,
        reqId: node.reqId,
        count: criteriaCount,
        iconId: 'checklist',
      });
    }
    if (testSpec) {
      children.push({
        kind: 'test-spec',
        stageId: 'define',
        testSpecEntryId: testSpec.entryId,
        testSpecId: testSpec.payload.id,
        iconId: 'beaker',
      });
    }
    return children;
  }

  private async executeChildren(projectId: string): Promise<ExecuteRequirementNode[]> {
    if (!this.memoryStore) return [];
    const prd = await this.memoryStore.loadPrdParent(projectId);
    if (!prd) return [];
    const items = await this.memoryStore.listRequirementItems(prd.prdId);
    const out: ExecuteRequirementNode[] = [];
    for (const record of items) {
      // Show every requirement under EXECUTE; the child node tells the user
      // whether they have briefs or just a "Compose Execution Brief…" stub.
      const briefs = await this.memoryStore.listBriefsForRequirement(record.entryId);
      out.push({
        kind: 'execute-requirement',
        stageId: 'execute',
        entryId: record.entryId,
        reqId: record.payload.id,
        title: record.payload.title,
        briefCount: briefs.length,
        iconId: briefs.length === 0 ? 'circle-outline' : 'rocket',
      });
    }
    return out;
  }

  private async executeRequirementChildren(
    node: ExecuteRequirementNode,
  ): Promise<(BriefNode | ComposeBriefNode)[]> {
    if (!this.memoryStore) return [];
    const briefs = await this.memoryStore.listBriefsForRequirement(node.entryId);
    if (briefs.length === 0) {
      return [
        {
          kind: 'compose-brief',
          stageId: 'execute',
          requirementEntryId: node.entryId,
          reqId: node.reqId,
          iconId: 'plus',
        },
      ];
    }
    // Determine which briefs have been superseded (any brief whose entryId
    // appears as another brief's `supersedesEntryId`).
    const supersededIds = new Set(
      briefs
        .map((b) => b.payload.supersedesEntryId)
        .filter((s): s is string => typeof s === 'string'),
    );
    return briefs.map((brief, index) => ({
      kind: 'brief',
      stageId: 'execute',
      briefEntryId: brief.entryId,
      briefId: brief.payload.id,
      version: index + 1,
      lockedAt: brief.payload.lockedAt,
      superseded: supersededIds.has(brief.entryId),
      iconId: supersededIds.has(brief.entryId) ? 'archive' : 'rocket',
    }));
  }

  private async briefResultChildren(node: BriefNode): Promise<ResultNode[]> {
    if (!this.memoryStore) return [];
    const results = await this.memoryStore.listResultsForBrief(node.briefEntryId);
    return results.map((r) => {
      const payload = r.payload as unknown as StoredResultPayload;
      const confidence = (payload.parsed?.confidence ?? payload.parseConfidence === 'high' ? 'high' : 'low') as 'high' | 'medium' | 'low';
      const iconId =
        confidence === 'high' ? 'pass' : confidence === 'medium' ? 'warning' : 'error';
      return {
        kind: 'result' as const,
        stageId: 'execute' as const,
        resultEntryId: r.entryId,
        briefEntryId: node.briefEntryId,
        capturedAt: payload.capturedAt ?? new Date(r.createdAt).toISOString(),
        confidence,
        source: (payload.source ?? 'watcher') as 'watcher' | 'paste',
        iconId,
      };
    });
  }

  private async discoverChildren(intentId: string): Promise<ArtefactNode[]> {
    const intent = (await this.memoryStore?.read(intentId)) as IntentMemory | null | undefined;
    return [
      this.buildRawIdeaNode(intent ?? null),
      this.buildDiscoveryNode(intent ?? null),
    ];
  }

  private buildRawIdeaNode(intent: IntentMemory | null): ArtefactNode {
    const text = intent?.payload.rawIdea.text.trim() ?? '';
    const captured = text.length > 0;
    return {
      kind: 'artefact',
      stageId: 'discover',
      artefactId: 'discover.rawIdea',
      artefactKind: 'discover.rawIdea',
      displayName: 'Raw idea',
      description: captured ? snippet(text) : '(not yet captured)',
      iconId: captured ? 'edit' : 'circle-outline',
      tooltip: captured ? text : 'Click to capture your raw idea.',
      discoverMode: 'rawIdea',
    };
  }

  private buildDiscoveryNode(intent: IntentMemory | null): ArtefactNode {
    const discovery = intent?.payload.discovery ?? null;
    const answered = discovery
      ? discovery.answers.filter((a) => a.answer.trim().length > 0).length
      : 0;
    const started = answered > 0;
    return {
      kind: 'artefact',
      stageId: 'discover',
      artefactId: 'discover.interview',
      artefactKind: 'discover.interview',
      displayName: 'Discovery interview',
      description: started ? `${answered}/${TOTAL_QUESTIONS} answered` : 'not started',
      iconId: started ? 'comment-discussion' : 'circle-outline',
      tooltip: started
        ? `${answered} of ${TOTAL_QUESTIONS} questions answered`
        : 'Click to generate the discovery prompt and capture answers.',
      discoverMode: started ? 'summary' : 'answers',
    };
  }
}

function snippet(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > 60 ? `${collapsed.slice(0, 57)}…` : collapsed;
}
