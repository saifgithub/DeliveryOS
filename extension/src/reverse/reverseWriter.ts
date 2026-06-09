// DOS:P10 § reverse/reverseWriter.ts — writes the reverse analysis brief to
// `.deliveryos-reverse/analysis-brief.md` atomically (write-to-temp + rename).
// Mirrors `handoff/writer.ts` but writes a single file. Construct once per
// workspace; safe to call `write` repeatedly (stateless).

import * as vscode from 'vscode';
import { reverseAnalysisBriefUri, reverseDirUri } from './paths';

export class ReverseWriter {
  constructor(private readonly workspace: vscode.WorkspaceFolder) {}

  /** Write the analysis brief; returns the URI of the written file. */
  async write(briefMarkdown: string): Promise<vscode.Uri> {
    // createDirectory is idempotent — never errors when the dir exists.
    await vscode.workspace.fs.createDirectory(reverseDirUri(this.workspace));
    const uri = reverseAnalysisBriefUri(this.workspace);
    await writePathAtomic(uri, briefMarkdown);
    return uri;
  }
}

/** Atomic write helper — mirrors `handoff/writer.ts#writePathAtomic`. */
async function writePathAtomic(uri: vscode.Uri, content: string): Promise<void> {
  const tmpUri = vscode.Uri.file(`${uri.fsPath}.deliveryos.tmp`);
  const bytes = new TextEncoder().encode(content);
  await vscode.workspace.fs.writeFile(tmpUri, bytes);
  await vscode.workspace.fs.rename(tmpUri, uri, { overwrite: true });
}
