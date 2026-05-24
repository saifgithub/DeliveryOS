import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type { SuggestedUpdateWire } from '@deliveryos/contracts';
import { ApplyButton } from './ApplyButton';
import { DiffView } from './DiffView';

export interface SuggestedUpdatesTabProps {
  readonly updates: readonly SuggestedUpdateWire[];
  readonly loading: boolean;
  readonly inFlightFile: string | null;
  readonly onApply: (file: string) => void;
}

const ACTION_BADGE: Record<SuggestedUpdateWire['action'], string> = {
  create: 'Create',
  'append-block': 'Append',
  'replace-block': 'Replace',
  noop: 'Up to date',
};

const ACTION_COLOR: Record<SuggestedUpdateWire['action'], string> = {
  create: 'bg-green-950/40 text-green-300 border-green-700',
  'append-block': 'bg-blue-950/40 text-blue-300 border-blue-700',
  'replace-block': 'bg-amber-950/40 text-amber-300 border-amber-700',
  noop: 'bg-vscode-bg text-dos-muted border-vscode-border',
};

export function SuggestedUpdatesTab({
  updates,
  loading,
  inFlightFile,
  onApply,
}: SuggestedUpdatesTabProps) {
  if (loading) {
    return <p className="text-xs text-dos-muted">Computing suggested updates…</p>;
  }
  if (updates.length === 0) {
    return <p className="text-xs text-dos-muted">No suggested updates for this profile.</p>;
  }

  return (
    <Accordion.Root
      type="multiple"
      defaultValue={updates.filter((u) => u.action !== 'noop').map((u) => u.file)}
      className="space-y-2"
    >
      {updates.map((u) => (
        <Accordion.Item
          key={u.file}
          value={u.file}
          className="border border-vscode-border rounded bg-dos-surface"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs text-vscode-fg truncate">{u.file}</span>
                <span
                  className={[
                    'shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 border rounded',
                    ACTION_COLOR[u.action],
                  ].join(' ')}
                >
                  {ACTION_BADGE[u.action]}
                </span>
                {u.warning && (
                  <span className="shrink-0 text-[10px] text-amber-400 truncate">⚠ hand-edited</span>
                )}
                {u.error && (
                  <span className="shrink-0 text-[10px] text-red-400 truncate">⚠ {u.error}</span>
                )}
              </div>
              <ChevronDown
                className="h-3.5 w-3.5 text-dos-muted transition-transform group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="px-3 pb-3 space-y-3">
            {u.warning && (
              <p className="text-xs text-amber-300 border border-amber-700/40 bg-amber-950/30 rounded px-2 py-1.5">
                {u.warning}
              </p>
            )}
            {u.error && (
              <p className="text-xs text-red-300 border border-red-700/40 bg-red-950/30 rounded px-2 py-1.5">
                {u.error}
              </p>
            )}
            {u.action === 'noop' ? (
              <p className="text-xs text-dos-muted">Already up to date.</p>
            ) : (
              <DiffView file={u.file} existing={u.existingContent ?? ''} next={u.nextContent} />
            )}
            <div className="flex justify-end">
              <ApplyButton
                action={u.action}
                disabled={false}
                inFlight={inFlightFile === u.file}
                onApply={() => onApply(u.file)}
              />
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
