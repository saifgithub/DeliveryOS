import React, { useState } from 'react';
import type { HookInstallPlan, DiffPanelInbound } from '@deliveryos/contracts';

interface HookInstallTabProps {
  plan: HookInstallPlan | null | undefined;
  installedAt: number | null;
  onMessage: (msg: DiffPanelInbound) => void;
  resultId: string;
}

export function HookInstallTab({ plan, installedAt, onMessage, resultId }: HookInstallTabProps): React.ReactElement {
  const [loading, setLoading] = useState(false);

  if (plan === undefined) {
    return (
      <div style={{ padding: '16px' }}>
        <button
          onClick={() => onMessage({ kind: 'requestHookInstallPlan', resultId })}
          style={{ cursor: 'pointer' }}
        >
          Load hook install plan
        </button>
      </div>
    );
  }

  if (plan === null) {
    return (
      <div style={{ padding: '16px', color: 'var(--vscode-descriptionForeground, #999)' }}>
        <strong>Hook Install — not available</strong>
        <p style={{ marginTop: '8px' }}>
          Codex has no PreToolUse-equivalent hook in 2026. The post-hoc diff is the universal backstop.
        </p>
      </div>
    );
  }

  const handleApply = async () => {
    setLoading(true);
    onMessage({ kind: 'applyHookInstall', resultId });
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ marginTop: 0 }}>Claude Code PreToolUse Hook</h3>
      <p style={{ fontSize: '0.9em' }}>
        This installs a small script that hard-blocks any Edit, Write, or MultiEdit attempt against
        a path listed in the active brief's Section 8 Forbidden Changes. It runs{' '}
        <strong>BEFORE</strong> Claude Code's permission-mode check and{' '}
        <strong>cannot be bypassed by <code>--dangerously-skip-permissions</code></strong>.
      </p>

      {installedAt !== null && (
        <div style={{ padding: '8px', backgroundColor: 'var(--vscode-inputValidation-infoBackground)', borderRadius: '4px', marginBottom: '12px', fontSize: '0.85em' }}>
          Installed at {new Date(installedAt).toLocaleString()}. Re-apply to update.
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <strong>Files to be written ({plan.fileOps.length}):</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '0.9em' }}>
          {plan.fileOps.map((op) => (
            <li key={op.path}>
              <code>{op.path}</code>{' '}
              <span style={{ color: 'var(--vscode-descriptionForeground, #999)' }}>
                ({op.exists ? 'update' : 'new'}, {op.mode.toString(8)})
              </span>
            </li>
          ))}
          {plan.settingsJsonPlan.action !== 'noop' && (
            <li>
              <code>.claude/settings.json</code>{' '}
              <span style={{ color: 'var(--vscode-descriptionForeground, #999)' }}>
                ({plan.settingsJsonPlan.action})
              </span>
            </li>
          )}
        </ul>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>.claude/settings.json — proposed change:</strong>
        <pre style={{
          fontSize: '0.8em',
          padding: '8px',
          backgroundColor: 'var(--vscode-textBlockQuote-background, #1e1e1e)',
          border: '1px solid var(--vscode-editorWidget-border, #444)',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '200px',
          marginTop: '4px',
        }}>
          {plan.settingsJsonPlan.action === 'noop'
            ? '(no change needed — hook already registered)'
            : plan.settingsJsonPlan.next}
        </pre>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          disabled={loading}
          onClick={handleApply}
          style={{
            padding: '6px 16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--vscode-button-background, #0078d4)',
            color: 'var(--vscode-button-foreground, white)',
            border: 'none',
            borderRadius: '2px',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Applying…' : 'Apply'}
        </button>
      </div>
    </div>
  );
}
