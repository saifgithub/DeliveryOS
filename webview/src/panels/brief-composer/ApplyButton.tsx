import type { ManagedBlockAction } from '@deliveryos/contracts';

export interface ApplyButtonProps {
  readonly action: ManagedBlockAction;
  readonly disabled: boolean;
  readonly inFlight: boolean;
  readonly onApply: () => void;
}

const LABELS: Record<ManagedBlockAction, string> = {
  create: 'Create file',
  'append-block': 'Append managed block',
  'replace-block': 'Overwrite managed block',
  noop: 'Up to date',
};

export function ApplyButton({ action, disabled, inFlight, onApply }: ApplyButtonProps) {
  const isNoop = action === 'noop';
  const isReplace = action === 'replace-block';
  return (
    <button
      type="button"
      onClick={onApply}
      disabled={disabled || inFlight || isNoop}
      className={[
        'text-xs px-3 py-1.5 rounded border',
        isNoop
          ? 'border-vscode-border text-dos-muted'
          : isReplace
            ? 'border-amber-400 text-amber-300 hover:bg-amber-950/20'
            : 'border-dos-accent text-dos-accent hover:bg-dos-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {inFlight ? 'Applying…' : LABELS[action]}
    </button>
  );
}
