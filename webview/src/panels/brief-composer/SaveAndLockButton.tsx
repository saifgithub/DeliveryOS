interface SaveAndLockButtonProps {
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly saving: boolean;
  readonly errors: readonly string[];
  readonly onSave: () => void;
}

export function SaveAndLockButton({
  readOnly,
  disabled,
  saving,
  errors,
  onSave,
}: SaveAndLockButtonProps) {
  if (readOnly) {
    return (
      <div className="text-xs text-dos-muted">
        This brief is locked. To revise, open the requirement detail and click "Compose new version".
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={disabled}
      title={errors.length > 0 ? errors.join('\n') : 'Validate, persist, and lock this brief.'}
      className="px-4 py-2 rounded bg-dos-accent text-vscode-bg font-medium text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {saving ? 'Saving…' : 'Save and lock'}
    </button>
  );
}
