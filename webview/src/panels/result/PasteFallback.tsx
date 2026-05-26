import { useState } from 'react';
import type { HarnessIdentity } from '@deliveryos/contracts';
import { ResultPasteFallback } from '@deliveryos/contracts';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { messenger } from '../../shared/messenger';

export function PasteFallback() {
  const [briefId, setBriefId] = useState('');
  const [rawText, setRawText] = useState('');
  const [harnessIdentity, setHarnessIdentity] = useState<HarnessIdentity>('claude-code');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please paste the harness result markdown.');
      return;
    }
    setStatus('saving');
    setErrorMsg('');
    try {
      await messenger.sendRequest(ResultPasteFallback, HOST_EXTENSION, {
        briefId,
        rawText,
        harnessIdentity,
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="p-4 max-w-2xl">
      <h1 className="text-base font-semibold text-vscode-foreground mb-4">
        Paste Harness Result
      </h1>

      <div className="mb-3">
        <label className="block text-sm font-medium text-vscode-foreground mb-1">
          Brief Entry ID (optional)
        </label>
        <input
          type="text"
          value={briefId}
          onChange={(e) => setBriefId(e.target.value)}
          placeholder="result-abc123"
          className="w-full px-2 py-1.5 text-sm bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-vscode-foreground mb-1">
          Harness
        </label>
        <div className="flex gap-4">
          {(['claude-code', 'codex', 'other'] as HarnessIdentity[]).map((h) => (
            <label key={h} className="flex items-center gap-1 text-sm text-vscode-foreground">
              <input
                type="radio"
                name="harness"
                value={h}
                checked={harnessIdentity === h}
                onChange={() => setHarnessIdentity(h)}
              />
              {h}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-vscode-foreground mb-1">
          Result markdown
        </label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={16}
          placeholder="Paste the harness result.md content here…"
          className="w-full px-2 py-1.5 text-sm bg-vscode-input-background text-vscode-input-foreground border border-vscode-input-border rounded font-mono"
        />
      </div>

      {errorMsg && (
        <p className="mb-3 text-sm text-vscode-inputValidation-errorForeground">{errorMsg}</p>
      )}

      {status === 'done' && (
        <p className="mb-3 text-sm text-vscode-charts-green">Result captured successfully.</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={status === 'saving'}
        className="px-3 py-1.5 text-sm bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : 'Parse and store'}
      </button>
    </div>
  );
}
