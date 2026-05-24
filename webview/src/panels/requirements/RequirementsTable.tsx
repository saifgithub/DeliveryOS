import type {
  Requirement,
  RequirementCategory,
  RequirementPriority,
  VerificationStatus,
} from '@deliveryos/contracts';

export interface FilterState {
  category: RequirementCategory | 'all';
  priority: RequirementPriority | 'all';
  verificationStatus: VerificationStatus | 'all';
  search: string;
}

export type SortColumn =
  | 'id'
  | 'title'
  | 'category'
  | 'priority'
  | 'sourcePrdSection'
  | 'verificationStatus';

export interface SortState {
  column: SortColumn;
  direction: 'asc' | 'desc';
}

const PRIORITY_ORDER: Record<RequirementPriority, number> = { must: 0, should: 1, could: 2 };
const STATUS_ORDER: Record<VerificationStatus, number> = { empty: 0, draft: 1, approved: 2 };

interface Props {
  requirements: readonly Requirement[];
  filter: FilterState;
  sort: SortState;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSortChange: (column: SortColumn) => void;
}

export function RequirementsTable({
  requirements,
  filter,
  sort,
  selectedId,
  onSelect,
  onSortChange,
}: Props) {
  const filtered = requirements.filter((r) => {
    if (filter.category !== 'all' && r.category !== filter.category) return false;
    if (filter.priority !== 'all' && r.priority !== filter.priority) return false;
    if (filter.verificationStatus !== 'all' && r.verificationStatus !== filter.verificationStatus)
      return false;
    if (filter.search.trim().length > 0) {
      const needle = filter.search.toLowerCase();
      if (
        !r.id.toLowerCase().includes(needle) &&
        !r.title.toLowerCase().includes(needle) &&
        !r.description.toLowerCase().includes(needle) &&
        !r.sourcePrdSection.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.column) {
      case 'priority':
        return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir;
      case 'verificationStatus':
        return (
          (STATUS_ORDER[a.verificationStatus] - STATUS_ORDER[b.verificationStatus]) * dir
        );
      case 'id':
        return a.id.localeCompare(b.id) * dir;
      case 'title':
        return a.title.localeCompare(b.title) * dir;
      case 'category':
        return a.category.localeCompare(b.category) * dir;
      case 'sourcePrdSection':
        return a.sourcePrdSection.localeCompare(b.sourcePrdSection) * dir;
    }
  });

  if (sorted.length === 0 && requirements.length > 0) {
    return (
      <div className="p-8 text-sm text-dos-muted">
        No requirements match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-vscode-border rounded-md">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-dos-surface border-b border-vscode-border text-left">
            <Th column="id" sort={sort} onSortChange={onSortChange} width="w-24">
              ID
            </Th>
            <Th column="title" sort={sort} onSortChange={onSortChange}>
              Title
            </Th>
            <Th column="category" sort={sort} onSortChange={onSortChange} width="w-32">
              Category
            </Th>
            <Th column="priority" sort={sort} onSortChange={onSortChange} width="w-24">
              Priority
            </Th>
            <Th column="sourcePrdSection" sort={sort} onSortChange={onSortChange} width="w-40">
              Source
            </Th>
            <Th column="verificationStatus" sort={sort} onSortChange={onSortChange} width="w-32">
              Verification
            </Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={
                'cursor-pointer border-b border-vscode-border hover:bg-dos-surface transition-colors ' +
                (selectedId === r.id ? 'bg-dos-surface' : '')
              }
            >
              <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              <td className="px-3 py-2">{r.title}</td>
              <td className="px-3 py-2 capitalize">{r.category.replace('-', ' ')}</td>
              <td className="px-3 py-2 capitalize">{r.priority}</td>
              <td className="px-3 py-2 text-dos-muted">{r.sourcePrdSection || '—'}</td>
              <td className="px-3 py-2 text-dos-muted capitalize">{r.verificationStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  column,
  sort,
  onSortChange,
  children,
  width,
}: {
  column: SortColumn;
  sort: SortState;
  onSortChange: (column: SortColumn) => void;
  children: React.ReactNode;
  width?: string;
}) {
  const active = sort.column === column;
  const arrow = active ? (sort.direction === 'asc' ? '↑' : '↓') : '';
  return (
    <th
      onClick={() => onSortChange(column)}
      className={
        'px-3 py-2 cursor-pointer select-none font-medium text-vscode-fg hover:text-dos-accent ' +
        (width ?? '')
      }
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="text-xs text-dos-muted">{arrow}</span>
      </span>
    </th>
  );
}
