import { useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  RequirementsGenerateDecomposePrompt,
  RequirementsPasteDecomposed,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;
const LARGE_THRESHOLD = 50_000;

type PhaseState =
  | { phase: 'idle' }
  | { phase: 'parseError'; reason: string; raw: string };

interface ResultState {
  readonly mode: 'json' | 'markdown-table';
  readonly createdCount: number;
  readonly warnings: readonly string[];
}

export function DecomposePromptApp() {
  const [paste, setPaste] = useState('');
  const [copying, setCopying] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [phase, setPhase] = useState<PhaseState>({ phase: 'idle' });
  const [result, setResult] = useState<ResultState | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  const handleCopyPrompt = async () => {
    setCopying(true);
    try {
      const res = await messenger.sendRequest(
        RequirementsGenerateDecomposePrompt,
        HOST_EXTENSION,
        { projectId: '' },
      );
      if (res.ok) {
        showToast('Decompose-PRD prompt copied to clipboard.');
      } else {
        showToast(
          res.reason === 'no-prd'
            ? 'No PRD on file yet. Generate the PRD first.'
            : 'No active project.',
        );
      }
    } catch (err) {
      console.error('DecomposePromptApp: generate prompt failed', err);
      showToast('Failed to copy prompt.');
    } finally {
      setCopying(false);
    }
  };

  const handleParseAndCreate = async () => {
    if (!paste.trim()) return;
    setParsing(true);
    try {
      const res = await messenger.sendRequest(
        RequirementsPasteDecomposed,
        HOST_EXTENSION,
        { projectId: '', text: paste },
      );
      if (res.ok) {
        setResult({
          mode: res.mode,
          createdCount: res.createdIds.length,
          warnings: res.warnings,
        });
        setPhase({ phase: 'idle' });
        setPaste('');
        showToast(`Created ${res.createdIds.length} requirements.`);
      } else {
        setPhase({ phase: 'parseError', reason: res.reason, raw: res.raw });
      }
    } catch (err) {
      console.error('DecomposePromptApp: parse failed', err);
      showToast('Parse failed — check console for details.');
    } finally {
      setParsing(false);
    }
  };

  const isLarge = paste.length > LARGE_THRESHOLD;

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border">
          <h1 className="text-2xl font-semibold text-dos-accent">Decompose PRD</h1>
          <p className="text-sm text-dos-muted mt-0.5">
            Generate a prompt, run it in your AI tool, then paste the response to create requirements.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-3xl">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-vscode-fg">
              1. Copy the decomposition prompt
            </h2>
            <p className="text-sm text-dos-muted">
              The PRD is embedded in the prompt between <code>{'<!-- BEGIN_PRD -->'}</code> and{' '}
              <code>{'<!-- END_PRD -->'}</code> markers.
            </p>
            <button
              onClick={handleCopyPrompt}
              disabled={copying}
              className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {copying ? 'Copying…' : 'Copy decompose-PRD prompt'}
            </button>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-vscode-fg">
              2. Paste the AI response
            </h2>
            <p className="text-sm text-dos-muted">
              Accepts a JSON code block or a GitHub-flavoured markdown table. If parsing fails,
              you'll get a manual-add fallback.
            </p>
            {isLarge && (
              <p className="text-xs text-dos-muted">
                Large paste ({(paste.length / 1024).toFixed(0)} KB).
              </p>
            )}
            <textarea
              value={paste}
              onChange={(e) => {
                if (e.target.value.length > MAX_BYTES) return;
                setPaste(e.target.value);
              }}
              placeholder="Paste the AI's response here…"
              style={{ minHeight: '16rem' }}
              className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y font-mono"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleParseAndCreate}
                disabled={parsing || !paste.trim()}
                className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {parsing ? 'Parsing…' : 'Parse and create'}
              </button>
              {phase.phase === 'parseError' && (
                <span className="text-xs text-dos-muted">
                  Couldn't parse — try cleaning the paste or use the manual-add fallback below.
                </span>
              )}
            </div>
          </section>

          {phase.phase === 'parseError' && (
            <ManualAddFallback reason={phase.reason} raw={phase.raw} />
          )}

          {result && (
            <section className="space-y-2 border border-vscode-border rounded-md p-4 bg-dos-surface">
              <p className="text-sm text-vscode-fg">
                Created <strong>{result.createdCount}</strong> requirements ({result.mode}).
              </p>
              {result.warnings.length > 0 && (
                <details className="text-xs text-dos-muted">
                  <summary>Parser warnings ({result.warnings.length})</summary>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="text-xs text-dos-muted">
                Open <em>DeliveryOS: Open Requirements Catalogue</em> from the command palette to
                view + edit the new rows.
              </p>
            </section>
          )}
        </div>

        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={2500}
          className="bg-dos-surface border border-vscode-border rounded-md shadow-lg px-4 py-3 text-sm text-dos-ink"
        >
          <Toast.Title>{toastMsg}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72" />
      </main>
    </Toast.Provider>
  );
}

function ManualAddFallback({ reason, raw }: { reason: string; raw: string }) {
  // Placeholder UX — Day 5 polishes the manual-add editor.
  return (
    <section className="space-y-2 border border-vscode-border rounded-md p-4 bg-dos-surface">
      <h2 className="text-base font-semibold text-vscode-fg">Manual add</h2>
      <p className="text-sm text-dos-muted">{reason}</p>
      <details className="text-xs text-dos-muted">
        <summary>Show raw paste ({raw.length} chars)</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">{raw}</pre>
      </details>
      <p className="text-xs text-dos-muted">
        Tip: clean up the response (often the AI adds prose around the code block) and use{' '}
        <em>Parse and create</em> again.
      </p>
    </section>
  );
}
