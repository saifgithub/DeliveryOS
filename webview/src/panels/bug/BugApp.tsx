import { useEffect, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  BugBootstrap,
  BugList,
  BugLoad,
  BugLog,
  BugUpdate,
  type Bug,
  type BugSeverity,
  type BugStatus,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;

const SEVERITIES: readonly BugSeverity[] = ['critical', 'high', 'medium', 'low'];
const STATUSES: readonly BugStatus[] = ['open', 'assigned', 'fixed', 'verified', 'deferred'];

type AppPhase =
  | { phase: 'booting' }
  | { phase: 'list' }
  | { phase: 'log' }
  | { phase: 'detail'; bug: Bug };

function severityBadge(severity: BugSeverity) {
  const cls =
    severity === 'critical'
      ? 'bg-red-500/20 text-red-400'
      : severity === 'high'
        ? 'bg-orange-500/20 text-orange-400'
        : severity === 'medium'
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-vscode-border text-dos-muted';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${cls}`}>{severity}</span>
  );
}

function statusBadge(status: BugStatus) {
  const cls =
    status === 'verified'
      ? 'bg-dos-success/20 text-dos-success'
      : status === 'fixed'
        ? 'bg-blue-500/20 text-blue-400'
        : status === 'assigned'
          ? 'bg-yellow-500/20 text-yellow-400'
          : status === 'deferred'
            ? 'bg-vscode-border text-dos-muted'
            : 'bg-dos-accent/20 text-dos-accent';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${cls}`}>{status}</span>
  );
}

export function BugApp() {
  const [phase, setPhase] = useState<AppPhase>({ phase: 'booting' });
  const [bugs, setBugs] = useState<readonly Bug[]>([]);
  const [busy, setBusy] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // log-form fields
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [area, setArea] = useState('');
  const [discoveredIn, setDiscoveredIn] = useState('');
  const [targetRequirementId, setTargetRequirementId] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  const refreshList = async (): Promise<readonly Bug[]> => {
    const res = await messenger.sendRequest(BugList, HOST_EXTENSION, {});
    if (res.ok) {
      setBugs(res.bugs);
      return res.bugs;
    }
    setBugs([]);
    return [];
  };

  useEffect(() => {
    let cancelled = false;
    void messenger
      .sendRequest(BugBootstrap, HOST_EXTENSION, {})
      .then(async () => {
        if (cancelled) return;
        await refreshList();
        if (!cancelled) setPhase({ phase: 'list' });
      })
      .catch(() => {
        if (!cancelled) setPhase({ phase: 'list' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setDescription('');
    setSeverity('medium');
    setArea('');
    setDiscoveredIn('');
    setTargetRequirementId('');
  };

  const handleLog = async () => {
    if (!description.trim()) return;
    setBusy(true);
    try {
      const res = await messenger.sendRequest(BugLog, HOST_EXTENSION, {
        description: description.trim(),
        severity,
        ...(area.trim() ? { area: area.trim() } : {}),
        ...(discoveredIn.trim() ? { discoveredIn: discoveredIn.trim() } : {}),
        ...(targetRequirementId.trim()
          ? { targetRequirementId: targetRequirementId.trim() }
          : {}),
      });
      if (res.ok) {
        resetForm();
        await refreshList();
        setPhase({ phase: 'list' });
        showToast(`Logged ${res.bugId}.`);
      } else {
        showToast(res.reason);
      }
    } catch (err) {
      console.error('BugApp: log failed', err);
      showToast('Failed to log bug.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDetail = async (entryId: string) => {
    setBusy(true);
    try {
      const res = await messenger.sendRequest(BugLoad, HOST_EXTENSION, { entryId });
      if (res.ok) {
        setPhase({ phase: 'detail', bug: res.bug });
      } else {
        showToast(res.reason);
      }
    } catch (err) {
      console.error('BugApp: load failed', err);
      showToast('Failed to load bug.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateStatus = async (entryId: string, status: BugStatus) => {
    setBusy(true);
    try {
      const res = await messenger.sendRequest(BugUpdate, HOST_EXTENSION, { entryId, status });
      if (res.ok) {
        setPhase({ phase: 'detail', bug: res.bug });
        await refreshList();
        showToast(`Status set to ${status}.`);
      } else {
        showToast(res.reason);
      }
    } catch (err) {
      console.error('BugApp: update failed', err);
      showToast('Failed to update bug.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-dos-accent">Bugs</h1>
            <p className="text-sm text-dos-muted mt-0.5">
              Log defects against the built product, track severity and status.
            </p>
          </div>
          {phase.phase !== 'booting' && phase.phase !== 'log' && (
            <button
              onClick={() => setPhase({ phase: 'log' })}
              className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Log a bug
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-3xl">
          {phase.phase === 'booting' && (
            <p className="text-sm text-dos-muted animate-pulse">Loading…</p>
          )}

          {phase.phase === 'log' && (
            <LogBugSection
              description={description}
              onDescriptionChange={setDescription}
              severity={severity}
              onSeverityChange={setSeverity}
              area={area}
              onAreaChange={setArea}
              discoveredIn={discoveredIn}
              onDiscoveredInChange={setDiscoveredIn}
              targetRequirementId={targetRequirementId}
              onTargetRequirementIdChange={setTargetRequirementId}
              onLog={handleLog}
              onCancel={() => setPhase({ phase: 'list' })}
              busy={busy}
            />
          )}

          {phase.phase === 'list' && (
            <BugListSection bugs={bugs} onOpen={handleOpenDetail} busy={busy} />
          )}

          {phase.phase === 'detail' && (
            <BugDetailSection
              bug={phase.bug}
              onUpdateStatus={handleUpdateStatus}
              onBack={() => setPhase({ phase: 'list' })}
              busy={busy}
            />
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

function LogBugSection({
  description,
  onDescriptionChange,
  severity,
  onSeverityChange,
  area,
  onAreaChange,
  discoveredIn,
  onDiscoveredInChange,
  targetRequirementId,
  onTargetRequirementIdChange,
  onLog,
  onCancel,
  busy,
}: {
  description: string;
  onDescriptionChange: (v: string) => void;
  severity: BugSeverity;
  onSeverityChange: (v: BugSeverity) => void;
  area: string;
  onAreaChange: (v: string) => void;
  discoveredIn: string;
  onDiscoveredInChange: (v: string) => void;
  targetRequirementId: string;
  onTargetRequirementIdChange: (v: string) => void;
  onLog: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const inputCls =
    'w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder';
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-vscode-fg">Log a bug</h2>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-vscode-fg">Description</label>
        <textarea
          value={description}
          onChange={(e) => {
            if (e.target.value.length > MAX_BYTES) return;
            onDescriptionChange(e.target.value);
          }}
          placeholder="What's broken? E.g. 'Export button does nothing on the dashboard.'"
          style={{ minHeight: '8rem' }}
          className={`${inputCls} resize-y`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-vscode-fg">Severity</label>
          <select
            value={severity}
            onChange={(e) => onSeverityChange(e.target.value as BugSeverity)}
            className={inputCls}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-vscode-fg">
            Area <span className="text-dos-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => onAreaChange(e.target.value)}
            placeholder="e.g. dashboard, auth"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-vscode-fg">
            Discovered in <span className="text-dos-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={discoveredIn}
            onChange={(e) => onDiscoveredInChange(e.target.value)}
            placeholder="e.g. v0.3, manual QA"
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-vscode-fg">
            Target requirement ID <span className="text-dos-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={targetRequirementId}
            onChange={(e) => onTargetRequirementIdChange(e.target.value)}
            placeholder="entry id of violated requirement"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onLog}
          disabled={busy || !description.trim()}
          className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {busy ? 'Logging…' : 'Log bug'}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 rounded-md border border-vscode-border text-sm text-vscode-fg hover:bg-vscode-bg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

function BugListSection({
  bugs,
  onOpen,
  busy,
}: {
  bugs: readonly Bug[];
  onOpen: (entryId: string) => void;
  busy: boolean;
}) {
  if (bugs.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-vscode-fg">Bug list</h2>
        <p className="text-sm text-dos-muted">No bugs logged yet. Use “Log a bug” to add one.</p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-vscode-fg">
        Bug list <span className="text-dos-muted font-normal">({bugs.length})</span>
      </h2>
      <ul className="space-y-2">
        {bugs.map((bug) => (
          <li key={bug.entryId}>
            <button
              onClick={() => onOpen(bug.entryId)}
              disabled={busy}
              className="w-full text-left border border-vscode-border rounded-md p-3 bg-dos-surface hover:border-vscode-focusBorder transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold font-mono text-vscode-fg">{bug.id}</span>
                {severityBadge(bug.severity)}
                {statusBadge(bug.status)}
                {bug.area && (
                  <span className="text-xs text-dos-muted">· {bug.area}</span>
                )}
              </div>
              <p className="text-sm text-dos-muted line-clamp-2">{bug.description}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BugDetailSection({
  bug,
  onUpdateStatus,
  onBack,
  busy,
}: {
  bug: Bug;
  onUpdateStatus: (entryId: string, status: BugStatus) => void;
  onBack: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm text-dos-accent hover:underline"
      >
        ← Back to list
      </button>

      <section className="space-y-3 border border-vscode-border rounded-md p-4 bg-dos-surface">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold font-mono text-vscode-fg">{bug.id}</span>
          {severityBadge(bug.severity)}
          {statusBadge(bug.status)}
        </div>
        <p className="text-sm text-vscode-fg whitespace-pre-wrap">{bug.description}</p>
        <dl className="text-xs text-dos-muted space-y-1 mt-2">
          {bug.area && (
            <div>
              <dt className="inline font-medium">Area: </dt>
              <dd className="inline">{bug.area}</dd>
            </div>
          )}
          {bug.discoveredIn && (
            <div>
              <dt className="inline font-medium">Discovered in: </dt>
              <dd className="inline">{bug.discoveredIn}</dd>
            </div>
          )}
          {bug.targetRequirementId && (
            <div>
              <dt className="inline font-medium">Target requirement: </dt>
              <dd className="inline font-mono">{bug.targetRequirementId}</dd>
            </div>
          )}
          {bug.deferredReason && (
            <div>
              <dt className="inline font-medium">Deferred reason: </dt>
              <dd className="inline">{bug.deferredReason}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-vscode-fg">Update status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onUpdateStatus(bug.entryId, s)}
              disabled={busy || s === bug.status}
              className="px-3 py-1.5 rounded-md border border-vscode-border text-xs text-vscode-fg hover:bg-vscode-bg transition-colors disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        {/* TODO (L5): "Compose fix brief" action — composeBugBrief + brief-panel wiring. */}
      </section>
    </div>
  );
}
