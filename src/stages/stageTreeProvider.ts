import * as vscode from 'vscode';
import { IProjectRegistry } from '../projectRegistry';
import { STAGE_DEFS } from './stageDefinitions';
import {
  StageTreeNode,
  stageDefToNode,
  toTreeItem,
} from './stageTreeNodes';

export class StageTreeProvider
  implements vscode.TreeDataProvider<StageTreeNode>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    StageTreeNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly registry: IProjectRegistry) {
    registry.onDidChange(() => this.refresh());
  }

  refresh(node?: StageTreeNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  getTreeItem(element: StageTreeNode): vscode.TreeItem {
    return toTreeItem(element);
  }

  getChildren(element?: StageTreeNode): vscode.ProviderResult<StageTreeNode[]> {
    if (!this.registry.getActive()) {
      return [];
    }
    if (!element) {
      return STAGE_DEFS.map(stageDefToNode);
    }
    return [];
  }
}
