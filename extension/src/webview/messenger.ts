import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { Hello } from '@deliveryos/contracts';

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

  attachPanel(panel: vscode.WebviewPanel): void {
    this.messenger.registerWebviewPanel(panel);
  }
}
