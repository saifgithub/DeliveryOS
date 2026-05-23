import * as vscode from 'vscode';
import type { DiscoverMode } from '@deliveryos/contracts';
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

export type StageTreeNode = StageNode | ArtefactNode;

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
  }
}
