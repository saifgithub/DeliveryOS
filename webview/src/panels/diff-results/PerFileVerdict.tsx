import React from 'react';
import type { FileVerdict, DiffPanelInbound } from '@deliveryos/contracts';

interface PerFileVerdictProps {
  verdict: FileVerdict;
  onMessage: (msg: DiffPanelInbound) => void;
}

const CLASSIFICATION_ICONS: Record<string, string> = {
  'forbidden-but-touched': '✕',
  'allowed-and-touched': '✓',
  'unclassified-but-touched': '⚠',
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  'forbidden-but-touched': 'var(--vscode-testing-iconFailed, #f44336)',
  'allowed-and-touched': 'var(--vscode-testing-iconPassed, #4caf50)',
  'unclassified-but-touched': 'var(--vscode-testing-iconQueued, #ff9800)',
};

export function PerFileVerdict({ verdict, onMessage }: PerFileVerdictProps): React.ReactElement {
  const icon = CLASSIFICATION_ICONS[verdict.classification] ?? '?';
  const color = CLASSIFICATION_COLORS[verdict.classification] ?? 'inherit';
  const sectionLabel = verdict.matchedSection === 7
    ? 'Section 7 (Allowed)'
    : verdict.matchedSection === 8
      ? 'Section 8 (Forbidden)'
      : 'no rule matched';

  return (
    <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--vscode-editorWidget-border, #444)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color, fontWeight: 'bold', minWidth: '16px' }}>{icon}</span>
        <code style={{ flex: 1, fontSize: '0.9em', wordBreak: 'break-all' }}>{verdict.path}</code>
        <button
          style={{
            fontSize: '0.75em',
            padding: '2px 6px',
            cursor: 'pointer',
            background: 'none',
            border: '1px solid var(--vscode-button-border, currentColor)',
            color: 'var(--vscode-button-foreground, inherit)',
            borderRadius: '2px',
          }}
          onClick={() => onMessage({ kind: 'openFile', path: verdict.path })}
        >
          Open
        </button>
        <button
          style={{
            fontSize: '0.75em',
            padding: '2px 6px',
            cursor: 'pointer',
            background: 'none',
            border: '1px solid var(--vscode-button-border, currentColor)',
            color: 'var(--vscode-button-foreground, inherit)',
            borderRadius: '2px',
          }}
          onClick={() => onMessage({ kind: 'copyPath', path: verdict.path })}
        >
          Copy path
        </button>
      </div>
      {verdict.matchedRule && (
        <div style={{ marginTop: '2px', fontSize: '0.8em', color: 'var(--vscode-descriptionForeground, #999)', paddingLeft: '24px' }}>
          Matched rule: <code>{verdict.matchedRule}</code> ({sectionLabel})
        </div>
      )}
      {!verdict.matchedRule && (
        <div style={{ marginTop: '2px', fontSize: '0.8em', color: 'var(--vscode-descriptionForeground, #999)', paddingLeft: '24px' }}>
          {sectionLabel}
        </div>
      )}
    </div>
  );
}
