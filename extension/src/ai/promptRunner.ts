import * as vscode from 'vscode';
import { spawn } from 'node:child_process';

/**
 * Send a prompt to the best available AI provider and return the response.
 *
 * Tier 1 — vscode.lm API (vendor-neutral; works with Claude Code ext, Copilot, etc.)
 * Tier 2 — CLI spawn via `deliveryos.aiCliCommand` (default: `claude --print`)
 * Tier 3 — clipboard fallback with warning toast
 *
 * Throws `Error('clipboard-fallback')` when only the clipboard path is available.
 */
export async function runPrompt(
  prompt: string,
  token?: vscode.CancellationToken,
): Promise<string> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'DeliveryOS: running AI…',
      cancellable: true,
    },
    async (_progress, progressToken) => {
      const combined = mergeTokens(token, progressToken);

      // Tier 1: vscode.lm
      const lmResult = await tryVscodeLm(prompt, combined);
      if (lmResult !== null) return lmResult;

      // Tier 2: CLI spawn
      const cliCommand = vscode.workspace
        .getConfiguration('deliveryos')
        .get<string>('aiCliCommand', 'claude --print');
      const cliResult = await tryCliSpawn(prompt, cliCommand, combined);
      if (cliResult !== null) return cliResult;

      // Tier 3: clipboard fallback
      await vscode.env.clipboard.writeText(prompt);
      void vscode.window.showWarningMessage(
        'DeliveryOS: no AI provider found — prompt copied to clipboard. Paste the response back manually.',
      );
      throw new Error('clipboard-fallback');
    },
  );
}

async function tryVscodeLm(
  prompt: string,
  token: vscode.CancellationToken,
): Promise<string | null> {
  // vscode.lm was added in VS Code 1.88 — guard for safety
  if (!('lm' in vscode)) return null;

  try {
    // Prefer Anthropic Claude; fall back to any registered model
    let models = await vscode.lm.selectChatModels({ vendor: 'anthropic' });
    if (!models.length) models = await vscode.lm.selectChatModels();
    if (!models.length) return null;

    const model = models[0];
    const response = await model.sendRequest(
      [vscode.LanguageModelChatMessage.User(prompt)],
      {},
      token,
    );

    let text = '';
    for await (const chunk of response.stream) {
      if (token.isCancellationRequested) throw new vscode.CancellationError();
      if (chunk instanceof vscode.LanguageModelTextPart) {
        text += chunk.value;
      }
    }
    return text;
  } catch (err) {
    if (err instanceof vscode.CancellationError) throw err;
    // vscode.lm unavailable or errored — fall through to CLI tier
    return null;
  }
}

async function tryCliSpawn(
  prompt: string,
  command: string,
  token: vscode.CancellationToken,
): Promise<string | null> {
  const parts = command.split(/\s+/).filter(Boolean);
  const [binary = 'claude', ...args] = parts;

  const binaryPath = await findBinary(binary);
  if (!binaryPath) return null;

  return new Promise<string | null>((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });

    const cancelSub = token.onCancellationRequested(() => {
      child.kill();
      reject(new vscode.CancellationError());
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.stdin?.write(prompt, 'utf8');
    child.stdin?.end();

    child.on('close', (code) => {
      cancelSub.dispose();
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`AI CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
      }
    });

    child.on('error', () => {
      cancelSub.dispose();
      resolve(null); // spawn failed — fall through to clipboard
    });
  });
}

async function findBinary(binary: string): Promise<string | null> {
  return new Promise((resolve) => {
    const checker = spawn(
      process.platform === 'win32' ? 'where' : 'which',
      [binary],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let out = '';
    checker.stdout?.on('data', (chunk: Buffer) => { out += chunk.toString(); });
    checker.on('close', (code) => resolve(code === 0 ? out.trim().split('\n')[0] ?? null : null));
    checker.on('error', () => resolve(null));
  });
}

function mergeTokens(
  ...tokens: (vscode.CancellationToken | undefined)[]
): vscode.CancellationToken {
  const source = new vscode.CancellationTokenSource();
  for (const t of tokens) {
    if (!t) continue;
    if (t.isCancellationRequested) {
      source.cancel();
      break;
    }
    t.onCancellationRequested(() => source.cancel());
  }
  return source.token;
}
