// CHUNK-11 § webview UI — "Run with Claude Code" + "Run with Codex"
// buttons. Both fire from the brief composer's right-rail footer once the
// brief is saved + locked (mode === 'readonly'). Per spec: clicking the
// button writes `.deliveryos-handoff/` and opens an integrated terminal
// with the harness command pre-typed (NOT executed — user presses Enter).

import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  HandoffRunWithClaudeCode,
  HandoffRunWithCodex,
  type HandoffRunResult,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

interface RunHarnessButtonsProps {
  readonly briefId: string;
  readonly disabled?: boolean;
  readonly inFlight: 'none' | 'claude-code' | 'codex';
  readonly onStart: (profile: 'claude-code' | 'codex') => void;
  readonly onFinish: (
    profile: 'claude-code' | 'codex',
    result: HandoffRunResult,
  ) => void;
  readonly lastResult?: string | null;
  readonly lastError?: string | null;
}

export function RunHarnessButtons({
  briefId,
  disabled,
  inFlight,
  onStart,
  onFinish,
  lastResult,
  lastError,
}: RunHarnessButtonsProps) {
  const run = async (profile: 'claude-code' | 'codex') => {
    onStart(profile);
    const message =
      profile === 'claude-code' ? HandoffRunWithClaudeCode : HandoffRunWithCodex;
    try {
      const res = await messenger.sendRequest(message, HOST_EXTENSION, { briefId });
      onFinish(profile, res);
    } catch (err) {
      onFinish(profile, {
        ok: false,
        reason: 'unknown',
        error: (err as Error).message,
      });
    }
  };

  return (
    <div className="pt-4 border-t border-vscode-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dos-accent">Run with harness</h3>
        <span className="text-[11px] text-dos-muted">
          Opens a terminal with the command pre-typed — press Enter to run.
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled || inFlight !== 'none'}
          onClick={() => void run('claude-code')}
          className="flex-1 px-3 py-2 text-xs rounded border border-vscode-border bg-vscode-bg hover:bg-dos-surface disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {inFlight === 'claude-code' ? 'Launching Claude Code…' : 'Run with Claude Code'}
        </button>
        <button
          type="button"
          disabled={disabled || inFlight !== 'none'}
          onClick={() => void run('codex')}
          className="flex-1 px-3 py-2 text-xs rounded border border-vscode-border bg-vscode-bg hover:bg-dos-surface disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {inFlight === 'codex' ? 'Launching Codex…' : 'Run with Codex'}
        </button>
      </div>
      {lastResult && (
        <p className="text-[11px] text-green-300">
          ✓ {lastResult}
        </p>
      )}
      {lastError && (
        <p className="text-[11px] text-red-400">
          ✗ {lastError}
        </p>
      )}
    </div>
  );
}
