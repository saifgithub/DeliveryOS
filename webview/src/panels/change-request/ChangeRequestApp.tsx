import { useEffect, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  ChangeRequestBootstrap,
  ChangeRequestGeneratePrompt,
  ChangeRequestLoad,
  ChangeRequestPasteApply,
  ChangeRequestRunAI,
  type ChangeRequest,
  type ChangeRequestStatus,
} from '@deliveryos/contracts';
import { Sparkles } from 'lucide-react';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;

type AppPhase =
  | { phase: 'booting' }
  | { phase: 'log-cr' }
  | { phase: 'prompted'; crEntryId: string; description: string }
  | { phase: 'applied'; cr: ChangeRequest }
  | { phase: 'history'; cr: ChangeRequest }
  | { phase: 'parse-error'; crEntryId: string; reason: string; raw: string };

function statusBadge(status: ChangeRequestStatus) {
  const cls =
    status === 'applied'
      ? 'bg-dos-success/20 text-dos-success'
      : status === 'prompted'
        ? 'bg-yellow-500/20 text-yellow-400'
        : 'bg-vscode-border text-dos-muted';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${cls}`}>{status}</span>
  );
}

export function ChangeRequestApp() {
  const [phase, setPhase] = useState<AppPhase>({ phase: 'booting' });
  const [description, setDescription] = useState('');
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    void messenger
      .sendRequest(ChangeRequestBootstrap, HOST_EXTENSION, {})
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setPhase({ phase: 'log-cr' });
          return;
        }
        if (!res.crEntryId) {
          setPhase({ phase: 'log-cr' });
          return;
        }
        const loadRes = await messenger.sendRequest(ChangeRequestLoad, HOST_EXTENSION, {
          entryId: res.crEntryId,
        });
        if (cancelled) return;
        if (!loadRes.ok) {
          setPhase({ phase: 'log-cr' });
          return;
        }
        const cr = loadRes.changeRequest;
        if (cr.status === 'applied') {
          setPhase({ phase: 'history', cr });
        } else {
          setPhase({ phase: 'prompted', crEntryId: cr.entryId, description: cr.description });
        }
      })
      .catch(() => {
        if (!cancelled) setPhase({ phase: 'log-cr' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRunAI = async () => {
    if (!description.trim()) return;
    setBusy(true);
    try {
      const res = await messenger.sendRequest(ChangeRequestRunAI, HOST_EXTENSION, {
        description: description.trim(),
      });
      if (res.ok) {
        const crRes = await messenger.sendRequest(ChangeRequestLoad, HOST_EXTENSION, { entryId: res.crEntryId });
        const cr = crRes.ok ? crRes.changeRequest : null;
        setPhase(cr ? { phase: 'applied', cr } : { phase: 'log-cr' });
        showToast(`Applied: +${res.added} added, ~${res.edited} edited, -${res.deleted} deleted.`);
      } else if (res.clipboardFallback) {
        showToast('Prompt copied — paste the AI response in the next step.');
        setPhase({ phase: 'prompted', crEntryId: '', description: description.trim() });
      } else {
        showToast(res.reason);
      }
    } catch (err) {
      console.error('ChangeRequestApp: runAI failed', err);
      showToast('AI run failed — check console.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setBusy(true);
    try {
      const res = await messenger.sendRequest(ChangeRequestGeneratePrompt, HOST_EXTENSION, {
        description: description.trim(),
      });
      if (res.ok) {
        setPhase({ phase: 'prompted', crEntryId: res.crEntryId, description: description.trim() });
        showToast('Prompt copied to clipboard. Paste it into your AI tool.');
      } else {
        showToast(res.reason);
      }
    } catch (err) {
      console.error('ChangeRequestApp: generate failed', err);
      showToast('Failed to generate prompt.');
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async (crEntryId: string) => {
    if (!paste.trim()) return;
    setBusy(true);
    try {
      const res = await messenger.sendRequest(ChangeRequestPasteApply, HOST_EXTENSION, {
        crEntryId,
        text: paste,
      });
      if (res.ok) {
        const crRes = await messenger.sendRequest(ChangeRequestLoad, HOST_EXTENSION, { entryId: crEntryId });
        const cr = crRes.ok ? crRes.changeRequest : null;
        setPhase(cr ? { phase: 'applied', cr } : { phase: 'log-cr' });
        setPaste('');
        showToast(
          `Applied: +${res.added} added, ~${res.edited} edited, -${res.deleted} deleted.`,
        );
      } else {
        setPhase({ phase: 'parse-error', crEntryId, reason: res.reason, raw: res.raw });
      }
    } catch (err) {
      console.error('ChangeRequestApp: apply failed', err);
      showToast('Apply failed — check console for details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border">
          <h1 className="text-2xl font-semibold text-dos-accent">Change Request</h1>
          <p className="text-sm text-dos-muted mt-0.5">
            Log a change, generate a diff prompt, paste the AI's response to update requirements.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-3xl">
          {phase.phase === 'booting' && (
            <p className="text-sm text-dos-muted animate-pulse">Loading…</p>
          )}

          {phase.phase === 'log-cr' && (
            <LogCrSection
              description={description}
              onDescriptionChange={setDescription}
              onGenerate={handleGenerate}
              onRunAI={handleRunAI}
              busy={busy}
            />
          )}

          {(phase.phase === 'prompted' || phase.phase === 'parse-error') && (
            <>
              <section className="space-y-2 border border-vscode-border rounded-md p-4 bg-dos-surface">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-vscode-fg">Change request logged</span>
                  {statusBadge(phase.phase === 'prompted' ? 'prompted' : 'prompted')}
                </div>
                <p className="text-sm text-dos-muted">{phase.phase === 'prompted' ? phase.description : (phase as { description?: string }).description ?? ''}</p>
              </section>

              <ApplySection
                crEntryId={phase.crEntryId}
                paste={paste}
                onPasteChange={setPaste}
                onApply={handleApply}
                busy={busy}
                parseError={phase.phase === 'parse-error' ? { reason: phase.reason, raw: phase.raw } : null}
              />
            </>
          )}

          {(phase.phase === 'applied' || phase.phase === 'history') && (
            <AppliedView cr={phase.cr} onLogNew={() => setPhase({ phase: 'log-cr' })} />
          )}
        </div>

        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={3000}
          className="bg-dos-surface border border-vscode-border rounded-md shadow-lg px-4 py-3 text-sm text-dos-ink"
        >
          <Toast.Title>{toastMsg}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80" />
      </main>
    </Toast.Provider>
  );
}

function LogCrSection({
  description,
  onDescriptionChange,
  onGenerate,
  onRunAI,
  busy,
}: {
  description: string;
  onDescriptionChange: (v: string) => void;
  onGenerate: () => void;
  onRunAI: () => void;
  busy: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-vscode-fg">1. Describe the change</h2>
      <p className="text-sm text-dos-muted">
        What needs to change? E.g. "Add constraint: must support offline mode" or "Remove goal:
        mobile support is out of scope."
      </p>
      <textarea
        value={description}
        onChange={(e) => {
          if (e.target.value.length > MAX_BYTES) return;
          onDescriptionChange(e.target.value);
        }}
        placeholder="Describe the change…"
        style={{ minHeight: '8rem' }}
        className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onRunAI}
          disabled={busy || !description.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Sparkles size={14} className={busy ? 'animate-pulse' : ''} />
          {busy ? 'AI is thinking…' : 'Send to AI ▶'}
        </button>
        <button
          onClick={onGenerate}
          disabled={busy || !description.trim()}
          className="px-4 py-2 rounded-md border border-vscode-border bg-dos-surface text-dos-ink text-sm font-medium disabled:opacity-50 hover:bg-vscode-panel transition-colors"
        >
          {busy ? 'Generating…' : 'Generate prompt manually'}
        </button>
      </div>
    </section>
  );
}

function ApplySection({
  crEntryId,
  paste,
  onPasteChange,
  onApply,
  busy,
  parseError,
}: {
  crEntryId: string;
  paste: string;
  onPasteChange: (v: string) => void;
  onApply: (crEntryId: string) => void;
  busy: boolean;
  parseError: { reason: string; raw: string } | null;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-vscode-fg">2. Paste the AI response</h2>
      <p className="text-sm text-dos-muted">
        The AI should return a JSON block with <code>added</code>, <code>edited</code>, and{' '}
        <code>deleted</code> arrays. Paste the full response here.
      </p>
      {parseError && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400 space-y-1">
          <p className="font-semibold">Parse error</p>
          <p>{parseError.reason}</p>
          <details>
            <summary>Show raw paste ({parseError.raw.length} chars)</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">
              {parseError.raw}
            </pre>
          </details>
        </div>
      )}
      <textarea
        value={paste}
        onChange={(e) => {
          if (e.target.value.length > MAX_BYTES) return;
          onPasteChange(e.target.value);
        }}
        placeholder="Paste the AI's JSON response here…"
        style={{ minHeight: '16rem' }}
        className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y font-mono"
      />
      <button
        onClick={() => onApply(crEntryId)}
        disabled={busy || !paste.trim()}
        className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {busy ? 'Applying…' : 'Parse and apply'}
      </button>
    </section>
  );
}

function AppliedView({ cr, onLogNew }: { cr: ChangeRequest; onLogNew: () => void }) {
  const added = cr.addedRequirementIds?.length ?? 0;
  const edited = cr.editedRequirementIds?.length ?? 0;
  const deleted = cr.deletedRequirementUserIds?.length ?? 0;

  return (
    <div className="space-y-4">
      <section className="space-y-2 border border-vscode-border rounded-md p-4 bg-dos-surface">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-vscode-fg">{cr.id}</span>
          {statusBadge(cr.status)}
        </div>
        <p className="text-sm text-dos-muted">{cr.description}</p>
        {cr.status === 'applied' && (
          <ul className="text-xs text-dos-muted list-disc pl-4 mt-2 space-y-0.5">
            {added > 0 && <li>{added} requirement{added === 1 ? '' : 's'} added</li>}
            {edited > 0 && <li>{edited} requirement{edited === 1 ? '' : 's'} edited</li>}
            {deleted > 0 && <li>{deleted} requirement ID{deleted === 1 ? '' : 's'} deleted</li>}
            {added === 0 && edited === 0 && deleted === 0 && <li>No requirements changed (no-op CR).</li>}
          </ul>
        )}
      </section>
      <button
        onClick={onLogNew}
        className="px-4 py-2 rounded-md border border-vscode-border text-sm text-vscode-fg hover:bg-vscode-bg transition-colors"
      >
        Log another change request
      </button>
    </div>
  );
}
