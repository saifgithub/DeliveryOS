import { useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  RequirementsGenerateDecomposePrompt,
  RequirementsPasteDecomposed,
  RequirementsRunAI,
  type RequirementCategory,
  type RequirementPriority,
} from '@deliveryos/contracts';
import { Sparkles } from 'lucide-react';
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
  const [runningAI, setRunningAI] = useState(false);
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

  const handleRunAI = async () => {
    setRunningAI(true);
    try {
      const res = await messenger.sendRequest(RequirementsRunAI, HOST_EXTENSION, { projectId: '' });
      if (res.ok) {
        setResult({ mode: res.mode, createdCount: res.createdIds.length, warnings: res.warnings });
        setPhase({ phase: 'idle' });
        setPaste('');
        showToast(`Created ${res.createdIds.length} requirements.`);
      } else if (res.clipboardFallback) {
        showToast('Prompt copied — paste the AI response below.');
      } else {
        showToast(res.reason === 'no-prd' ? 'No PRD on file yet. Generate the PRD first.' : res.reason);
      }
    } catch (err) {
      console.error('DecomposePromptApp: runAI failed', err);
      showToast('AI run failed — check console.');
    } finally {
      setRunningAI(false);
    }
  };

  const isLarge = paste.length > LARGE_THRESHOLD;
  const busy = copying || parsing || runningAI;

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border">
          <h1 className="text-2xl font-semibold text-dos-accent">Decompose PRD</h1>
          <p className="text-sm text-dos-muted mt-0.5">
            Send to your AI provider directly, or copy the prompt and paste the response.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-3xl">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-vscode-fg">
              1. Run AI
            </h2>
            <p className="text-sm text-dos-muted">
              The PRD is embedded in the prompt between <code>{'<!-- BEGIN_PRD -->'}</code> and{' '}
              <code>{'<!-- END_PRD -->'}</code> markers.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleRunAI}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <Sparkles size={14} className={runningAI ? 'animate-pulse' : ''} />
                {runningAI ? 'AI is thinking…' : 'Send to AI ▶'}
              </button>
              <button
                onClick={handleCopyPrompt}
                disabled={busy}
                className="px-4 py-2 rounded-md border border-vscode-border bg-dos-surface text-dos-ink text-sm font-medium disabled:opacity-50 hover:bg-vscode-panel transition-colors"
              >
                {copying ? 'Copying…' : 'Copy prompt manually'}
              </button>
            </div>
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
                disabled={busy || !paste.trim()}
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
            <ManualAddFallback
              reason={phase.reason}
              raw={phase.raw}
              onAdded={(count) => {
                showToast(`Created ${count} requirement${count === 1 ? '' : 's'}.`);
                setPhase({ phase: 'idle' });
                setResult({ mode: 'json', createdCount: count, warnings: [] });
              }}
            />
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

interface ManualRow {
  title: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  sourcePrdSection: string;
}

function blankRow(): ManualRow {
  return {
    title: '',
    description: '',
    category: 'functional',
    priority: 'should',
    sourcePrdSection: '',
  };
}

function ManualAddFallback({
  reason,
  raw,
  onAdded,
}: {
  reason: string;
  raw: string;
  onAdded: (count: number) => void;
}) {
  const [rows, setRows] = useState<ManualRow[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (idx: number, patch: Partial<ManualRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async () => {
    const usable = rows.filter((r) => r.title.trim().length > 0);
    if (usable.length === 0) return;
    setSubmitting(true);
    try {
      // Wrap into JSON so the host's parseDecomposed accepts it on the first
      // pass without round-tripping through user paste again.
      const payload = JSON.stringify(usable);
      const res = await messenger.sendRequest(RequirementsPasteDecomposed, HOST_EXTENSION, {
        projectId: '',
        text: payload,
      });
      if (res.ok) {
        onAdded(res.createdIds.length);
      } else {
        // Shouldn't happen — manual rows are pre-shaped.
        console.error('ManualAddFallback: paste failed', res.reason);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-3 border border-vscode-border rounded-md p-4 bg-dos-surface">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-vscode-fg">Add manually</h2>
        <p className="text-xs text-dos-muted">{reason}</p>
      </header>
      <details className="text-xs text-dos-muted">
        <summary>Show raw paste ({raw.length} chars)</summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">{raw}</pre>
      </details>
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="border border-vscode-border rounded-md p-3 space-y-2 bg-vscode-bg"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-dos-muted">Row {idx + 1}</span>
              {rows.length > 1 && (
                <button
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-dos-muted hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Title"
              value={row.title}
              onChange={(e) => updateRow(idx, { title: e.target.value })}
              className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-2 py-1.5 text-sm outline-none focus:border-vscode-focusBorder"
            />
            <textarea
              placeholder="Description"
              rows={2}
              value={row.description}
              onChange={(e) => updateRow(idx, { description: e.target.value })}
              className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-2 py-1.5 text-sm outline-none focus:border-vscode-focusBorder resize-y font-mono"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={row.category}
                onChange={(e) =>
                  updateRow(idx, { category: e.target.value as RequirementCategory })
                }
                className="rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-2 py-1 text-xs"
              >
                <option value="functional">Functional</option>
                <option value="non-functional">Non-functional</option>
              </select>
              <select
                value={row.priority}
                onChange={(e) =>
                  updateRow(idx, { priority: e.target.value as RequirementPriority })
                }
                className="rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-2 py-1 text-xs"
              >
                <option value="must">Must</option>
                <option value="should">Should</option>
                <option value="could">Could</option>
              </select>
              <input
                type="text"
                placeholder="Source PRD section"
                value={row.sourcePrdSection}
                onChange={(e) => updateRow(idx, { sourcePrdSection: e.target.value })}
                className="rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-2 py-1 text-xs outline-none focus:border-vscode-focusBorder"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRows((prev) => [...prev, blankRow()])}
          className="px-3 py-1.5 rounded-md border border-vscode-border text-xs text-vscode-fg hover:bg-vscode-bg transition-colors"
        >
          Add row
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || rows.every((r) => r.title.trim().length === 0)}
          className="px-4 py-1.5 rounded-md bg-dos-accent text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Creating…' : 'Create rows'}
        </button>
        <span className="text-xs text-dos-muted">
          Tip: you can also clean up the original paste and try parsing again above.
        </span>
      </div>
    </section>
  );
}
