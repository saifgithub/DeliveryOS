// CHUNK-14 § release/zipPackage.ts — zip export of release evidence.

import * as vscode from 'vscode';
import * as path from 'node:path';
import archiver from 'archiver';
import { createWriteStream } from 'node:fs';
import type { ReleaseEvidence } from '@deliveryos/contracts';

/**
 * Prompt for a save path and bundle the release markdown + all referenced
 * files into a zip archive.
 */
export async function zipPackage(
  evidence: ReleaseEvidence,
  workspaceUri: vscode.Uri,
): Promise<void> {
  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(
      path.join(workspaceUri.fsPath, `${evidence.releaseId}.zip`),
    ),
    filters: { 'Zip archive': ['zip'] },
    title: 'Save Release Evidence Package',
  });

  if (!saveUri) return; // user cancelled

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(saveUri.fsPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    // Add the release markdown itself.
    const releaseMarkdownBytes = new TextEncoder().encode(evidence.markdown);
    archive.append(Buffer.from(releaseMarkdownBytes), {
      name: `${evidence.releaseId}.md`,
    });

    // Add referenced files from the workspace.
    for (const relPath of evidence.filesReferenced) {
      const absPath = path.join(workspaceUri.fsPath, relPath);
      const entryName = relPath.replace(/^\//, '');
      archive.file(absPath, { name: entryName });
    }

    void archive.finalize();
  });

  await vscode.window.showInformationMessage(
    `Release Evidence Package saved to ${saveUri.fsPath}`,
  );
}
