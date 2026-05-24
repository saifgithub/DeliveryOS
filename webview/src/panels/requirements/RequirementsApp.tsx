import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  RequirementsChanged,
  RequirementsDelete,
  RequirementsList,
  RequirementsOpenDecomposePanel,
  RequirementsUpdate,
  type Requirement,
  type RequirementCategory,
  type RequirementPriority,
  type RequirementsCatalogue,
  type VerificationStatus,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';
import { RequirementsTable, type FilterState, type SortState, type SortColumn } from './RequirementsTable';
import { RequirementDetail } from './RequirementDetail';

type AppState =
  | { phase: 'loading' }
  | { phase: 'noProject' }
  | { phase: 'noPrd' }
  | { phase: 'ready'; catalogue: RequirementsCatalogue };

const DEFAULT_FILTER: FilterState = {
  category: 'all',
  priority: 'all',
  verificationStatus: 'all',
  search: '',
};

const DEFAULT_SORT: SortState = { column: 'id', direction: 'asc' };

export function RequirementsApp() {
  const [state, setState] = useState<AppState>({ phase: 'loading' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  const loadCatalogue = useCallback(async () => {
    try {
      const res = await messenger.sendRequest(RequirementsList, HOST_EXTENSION, { projectId: '' });
      if (res.ok) {
        setState({ phase: 'ready', catalogue: res.catalogue });
      } else if (res.reason === 'no-prd') {
        setState({ phase: 'noPrd' });
      } else {
        setState({ phase: 'noProject' });
      }
    } catch (err) {
      console.error('RequirementsApp: list failed', err);
      setState({ phase: 'noProject' });
    }
  }, []);

  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue]);

  useEffect(() => {
    messenger.onNotification(RequirementsChanged, () => {
      void loadCatalogue();
    });
  }, [loadCatalogue]);

  const selected = useMemo<Requirement | null>(() => {
    if (state.phase !== 'ready' || selectedId === null) return null;
    return state.catalogue.requirements.find((r) => r.id === selectedId) ?? null;
  }, [state, selectedId]);

  const handleSortChange = (column: SortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' },
    );
  };

  const handleSave = async (patch: {
    title?: string;
    description?: string;
    category?: RequirementCategory;
    priority?: RequirementPriority;
    sourcePrdSection?: string;
  }) => {
    if (!selected) return;
    try {
      await messenger.sendRequest(RequirementsUpdate, HOST_EXTENSION, {
        entryId: selected.entryId,
        patch,
      });
      showToast(`Saved ${selected.id}.`);
      await loadCatalogue();
    } catch (err) {
      console.error('RequirementsApp: update failed', err);
      showToast('Save failed — check console for details.');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await messenger.sendRequest(RequirementsDelete, HOST_EXTENSION, {
        entryId: selected.entryId,
      });
      showToast(`Deleted ${selected.id}.`);
      setSelectedId(null);
      await loadCatalogue();
    } catch (err) {
      console.error('RequirementsApp: delete failed', err);
      showToast('Delete failed — check console for details.');
    }
  };

  const handleDecompose = async () => {
    try {
      await messenger.sendRequest(RequirementsOpenDecomposePanel, HOST_EXTENSION, {
        projectId: '',
      });
    } catch (err) {
      console.error('RequirementsApp: openDecomposePanel failed', err);
    }
  };

  if (state.phase === 'loading') {
    return (
      <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg">
        <p className="text-sm text-dos-muted">Loading…</p>
      </main>
    );
  }

  if (state.phase === 'noProject') {
    return (
      <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg">
        <p className="text-sm text-dos-muted">
          No project open — use the sidebar to create one first.
        </p>
      </main>
    );
  }

  if (state.phase === 'noPrd') {
    return (
      <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg space-y-3">
        <p className="text-sm text-vscode-fg">
          This project doesn't have a PRD yet. Generate it via{' '}
          <em>DeliveryOS: Open PRD Editor</em> before decomposing into requirements.
        </p>
      </main>
    );
  }

  const { catalogue } = state;
  const empty = catalogue.requirements.length === 0;

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border">
          <h1 className="text-2xl font-semibold text-dos-accent">Requirements</h1>
          <p className="text-sm text-dos-muted mt-0.5">
            {catalogue.prdTitle} · {catalogue.requirements.length} total
          </p>
        </header>

        <div className="px-6 py-3 border-b border-vscode-border flex flex-wrap items-center gap-3">
          <button
            onClick={handleDecompose}
            className="px-3 py-1.5 rounded-md bg-dos-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Decompose PRD
          </button>
          <FilterSelect<RequirementCategory | 'all'>
            label="Category"
            value={filter.category}
            onChange={(v) => setFilter((f) => ({ ...f, category: v }))}
            options={['all', 'functional', 'non-functional']}
          />
          <FilterSelect<RequirementPriority | 'all'>
            label="Priority"
            value={filter.priority}
            onChange={(v) => setFilter((f) => ({ ...f, priority: v }))}
            options={['all', 'must', 'should', 'could']}
          />
          <FilterSelect<VerificationStatus | 'all'>
            label="Verification"
            value={filter.verificationStatus}
            onChange={(v) => setFilter((f) => ({ ...f, verificationStatus: v }))}
            options={['all', 'empty', 'draft', 'approved']}
          />
          <input
            type="search"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search…"
            className="flex-1 max-w-xs rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-1.5 text-xs outline-none focus:border-vscode-focusBorder"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {empty ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-vscode-fg">No requirements yet.</p>
              <p className="text-xs text-dos-muted">
                Run <strong>Decompose PRD</strong> to populate the catalogue.
              </p>
              <button
                onClick={handleDecompose}
                className="mt-2 px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Decompose PRD
              </button>
            </div>
          ) : (
            <RequirementsTable
              requirements={catalogue.requirements}
              filter={filter}
              sort={sort}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              onSortChange={handleSortChange}
            />
          )}

          {selected && (
            <RequirementDetail
              requirement={selected}
              prdSections={catalogue.prdSections}
              onSave={handleSave}
              onCancel={() => setSelectedId(null)}
              onDelete={handleDelete}
            />
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

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-dos-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-2 py-1 text-xs"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'all' ? 'All' : opt.replace('-', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}
