import { Messenger } from 'vscode-messenger-webview';
import { vscode } from './vscode';

export const messenger = new Messenger(vscode());
messenger.start();
