import React, { useState } from 'react';
import type { FileVerdict, DiffPanelInbound } from '@deliveryos/contracts';
import { PerFileVerdict } from './PerFileVerdict';

interface FileSectionProps {
  title: string;
  files: FileVerdict[];
  icon: string;
  iconColor: string;
  defaultExpanded?: boolean;
  onMessage: (msg: DiffPanelInbound) => void;
  /** Optional footer note to display inside the section */
  note?: React.ReactNode;
}

export function FileSection({
  title,
  files,
  icon,
  iconColor,
  defaultExpanded = false,
  onMessage,
  note,
}: FileSectionProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div style={{ marginBottom: '12px', border: '1px solid var(--vscode-editorWidget-border, #444)', borderRadius: '4px' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '8px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--vscode-foreground, inherit)',
          fontWeight: 'bold',
        }}
      >
        <span>{expanded ? '▼' : '▶'}</span>
        <span style={{ color: iconColor }}>{icon}</span>
        <span>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.85em', fontWeight: 'normal', color: 'var(--vscode-descriptionForeground, #999)' }}>
          ({files.length})
        </span>
      </button>
      {expanded && (
        <div>
          {files.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground, #999)' }}>
              (none)
            </div>
          ) : (
            files.map((f) => (
              <PerFileVerdict key={f.path} verdict={f} onMessage={onMessage} />
            ))
          )}
          {note && (
            <div style={{ padding: '8px 12px', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground, #999)', borderTop: '1px solid var(--vscode-editorWidget-border, #444)' }}>
              {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
