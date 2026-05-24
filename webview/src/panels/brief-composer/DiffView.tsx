import { useMemo, useState } from 'react';
import { createPatch } from 'diff';

export interface DiffViewProps {
  readonly file: string;
  readonly existing: string;
  readonly next: string;
  readonly fullTruncationLines?: number;
}

const DEFAULT_TRUNCATION = 80;

export function DiffView({
  file,
  existing,
  next,
  fullTruncationLines = DEFAULT_TRUNCATION,
}: DiffViewProps) {
  const patch = useMemo(() => createPatch(file, existing, next, '', ''), [file, existing, next]);
  const lines = useMemo(() => {
    const all = patch.split('\n');
    // Strip the leading `Index:` + `===` + `---` + `+++` + `@@` boilerplate; keep
    // only content lines (the leading 4 lines of a `createPatch` output are
    // headers we don't need; we'll keep the `@@` hunk markers as dimmed lines).
    return all.slice(4);
  }, [patch]);

  const [expanded, setExpanded] = useState(lines.length <= fullTruncationLines);
  const visible = expanded ? lines : lines.slice(0, fullTruncationLines);

  return (
    <div
      role="region"
      aria-label={`Diff for ${file}`}
      className="font-mono text-[11px] leading-snug rounded border border-vscode-border bg-vscode-bg p-2 overflow-x-auto"
    >
      {visible.map((raw, i) => {
        let cls = 'text-dos-muted';
        if (raw.startsWith('+') && !raw.startsWith('+++')) cls = 'text-green-300 bg-green-950/30';
        else if (raw.startsWith('-') && !raw.startsWith('---')) cls = 'text-red-300 bg-red-950/30';
        else if (raw.startsWith('@@')) cls = 'text-blue-300';
        const display = raw.length === 0 ? ' ' : raw;
        return (
          <pre key={i} className={['whitespace-pre m-0', cls].join(' ')}>
            {display}
          </pre>
        );
      })}
      {!expanded && lines.length > fullTruncationLines && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-dos-accent hover:underline"
        >
          Show full content ({lines.length - fullTruncationLines} more lines)
        </button>
      )}
    </div>
  );
}
