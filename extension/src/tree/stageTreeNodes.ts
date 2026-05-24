import * as vscode from 'vscode';
import type { DiscoverMode, RequirementPriority } from '@deliveryos/contracts';
import { STAGE_DEFS } from './stageDefinitions';

export type StageId = 'discover' | 'define' | 'execute' | 'verify';

export interface StageNode {
  readonly kind: 'stage';
  readonly stageId: StageId;
  readonly displayName: string;
  readonly description: string;
  readonly iconId: string;
}

export interface ArtefactNode {
  readonly kind: 'artefact';
  readonly stageId: StageId;
  readonly artefactId: string;
  readonly displayName: string;
  readonly artefactKind: string;
  readonly description?: string;
  readonly iconId?: string;
  readonly tooltip?: string;
  readonly discoverMode?: DiscoverMode;
  readonly commandId?: string;
  readonly commandArgs?: unknown[];
}

export interface RequirementsGroupNode {
  readonly kind: 'requirements-group';
  readonly stageId: 'define';
  readonly prdId: string;
  readonly displayName: string;
  readonly description: string;
  readonly iconId: string;
}

export interface RequirementItemNode {
  readonly kind: 'requirement-item';
  readonly stageId: 'define';
  readonly entryId: string;
  readonly reqId: string;
  readonly title: string;
  readonly priority: RequirementPriority;
  readonly iconId: string;
  /** Truthy when CHUNK-08 has run for this requirement — drives collapse state. */
  readonly hasVerification: boolean;
}

export interface VerificationCriteriaNode {
  readonly kind: 'verification-criteria';
  readonly stageId: 'define';
  readonly requirementEntryId: string;
  readonly reqId: string;
  readonly count: number;
  readonly iconId: string;
}

export interface TestSpecNode {
  readonly kind: 'test-spec';
  readonly stageId: 'define';
  readonly testSpecEntryId: string;
  readonly testSpecId: string;
  readonly iconId: string;
}

export interface ExecuteRequirementNode {
  readonly kind: 'execute-requirement';
  readonly stageId: 'execute';
  readonly entryId: string;
  readonly reqId: string;
  readonly title: string;
  readonly briefCount: number;
  readonly iconId: string;
}

export interface BriefNode {
  readonly kind: 'brief';
  readonly stageId: 'execute';
  readonly briefEntryId: string;
  readonly briefId: string;
  readonly version: number;
  readonly lockedAt: string;
  readonly superseded: boolean;
  readonly iconId: string;
}

export interface ComposeBriefNode {
  readonly kind: 'compose-brief';
  readonly stageId: 'execute';
  readonly requirementEntryId: string;
  readonly reqId: string;
  readonly iconId: string;
}

export type StageTreeNode =
  | StageNode
  | ArtefactNode
  | RequirementsGroupNode
  | RequirementItemNode
  | VerificationCriteriaNode
  | TestSpecNode
  | ExecuteRequirementNode
  | BriefNode
  | ComposeBriefNode;

export function stageDefToNode(def: (typeof STAGE_DEFS)[number]): StageNode {
  return {
    kind: 'stage',
    stageId: def.id,
    displayName: def.displayName,
    description: def.description,
    iconId: def.iconId,
  };
}

export function toTreeItem(node: StageTreeNode): vscode.TreeItem {
  switch (node.kind) {
    case 'stage': {
      const item = new vscode.TreeItem(
        node.displayName,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = node.description;
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.contextValue = `deliveryos.stage.${node.stageId}`;
      item.tooltip = `${node.displayName} — ${node.description}`;
      return item;
    }
    case 'artefact': {
      const item = new vscode.TreeItem(
        node.displayName,
        vscode.TreeItemCollapsibleState.None,
      );
      item.contextValue = `deliveryos.artefact.${node.artefactKind}`;
      if (node.description) {
        item.description = node.description;
      }
      if (node.iconId) {
        item.iconPath = new vscode.ThemeIcon(node.iconId);
      }
      if (node.tooltip) {
        item.tooltip = node.tooltip;
      }
      if (node.commandId) {
        item.command = {
          command: node.commandId,
          title: node.displayName,
          ...(node.commandArgs !== undefined && { arguments: node.commandArgs }),
        };
      } else if (node.discoverMode) {
        item.command = {
          command: 'deliveryos.openDiscover',
          title: 'Open Discover',
          arguments: [node.discoverMode],
        };
      }
      return item;
    }
    case 'requirements-group': {
      const item = new vscode.TreeItem(
        node.displayName,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.contextValue = 'deliveryos.requirements.group';
      item.description = node.description;
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.tooltip = `${node.displayName} — ${node.description}`;
      return item;
    }
    case 'requirement-item': {
      const item = new vscode.TreeItem(
        truncate(`${node.reqId} — ${node.title}`, 60),
        node.hasVerification
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      );
      item.contextValue = 'deliveryos.requirement.item';
      item.description = node.priority;
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.tooltip = `${node.reqId} (${node.priority}) — ${node.title}`;
      item.command = {
        command: 'deliveryos.requirements.open',
        title: 'Open Requirements',
        arguments: [{ selectedId: node.reqId }],
      };
      return item;
    }
    case 'verification-criteria': {
      const item = new vscode.TreeItem(
        `Verification criteria — ${node.count}`,
        vscode.TreeItemCollapsibleState.None,
      );
      item.contextValue = 'deliveryos.requirement.verification';
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.tooltip = `${node.count} criteria written for ${node.reqId}`;
      item.command = {
        command: 'deliveryos.requirements.open',
        title: 'Open Requirements',
        arguments: [{ selectedId: node.reqId, focus: 'verification' }],
      };
      return item;
    }
    case 'test-spec': {
      const item = new vscode.TreeItem(
        `Test spec — ${node.testSpecId}`,
        vscode.TreeItemCollapsibleState.None,
      );
      item.contextValue = 'deliveryos.requirement.testSpec';
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.tooltip = `Open the test-spec markdown body (${node.testSpecId})`;
      item.command = {
        command: 'deliveryos.requirements.openTestSpecFile',
        title: 'Open test-spec file',
        arguments: [{ testSpecEntryId: node.testSpecEntryId }],
      };
      return item;
    }
    case 'execute-requirement': {
      const item = new vscode.TreeItem(
        truncate(`${node.reqId} — ${node.title}`, 60),
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.contextValue = 'deliveryos.execute.requirement';
      item.description =
        node.briefCount === 0
          ? '(no briefs)'
          : node.briefCount === 1
            ? '1 brief'
            : `${node.briefCount} briefs`;
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.tooltip = `${node.reqId} — ${node.title}`;
      return item;
    }
    case 'brief': {
      const item = new vscode.TreeItem(
        `Brief — ${node.briefId} — v${node.version}`,
        vscode.TreeItemCollapsibleState.None,
      );
      item.contextValue = 'deliveryos.execute.brief';
      item.description = node.lockedAt;
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.tooltip = node.superseded
        ? `Superseded by a later brief. Locked at ${node.lockedAt}.`
        : `Locked at ${node.lockedAt}. Click to open the markdown body.`;
      item.command = {
        command: 'deliveryos.brief.openFile',
        title: 'Open brief markdown',
        arguments: [{ briefEntryId: node.briefEntryId }],
      };
      return item;
    }
    case 'compose-brief': {
      const item = new vscode.TreeItem(
        'Compose Execution Brief…',
        vscode.TreeItemCollapsibleState.None,
      );
      item.contextValue = 'deliveryos.execute.compose';
      item.iconPath = new vscode.ThemeIcon(node.iconId);
      item.tooltip = `Open the Execution Brief composer for ${node.reqId}.`;
      item.command = {
        command: 'deliveryos.brief.compose',
        title: 'Compose Execution Brief',
        arguments: [{ requirementEntryId: node.requirementEntryId }],
      };
      return item;
    }
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}
