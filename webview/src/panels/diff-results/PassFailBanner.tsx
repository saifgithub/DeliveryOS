import React from 'react';
import type { DiffOutcome } from '@deliveryos/contracts';

interface PassFailBannerProps {
  outcome: DiffOutcome;
}

export function PassFailBanner({ outcome }: PassFailBannerProps): React.ReactElement {
  const isPass = outcome.verdict === 'pass';
  const forbiddenCount = outcome.files.filter(
    (f) => f.classification === 'forbidden-but-touched',
  ).length;
  const totalFiles = outcome.files.length;

  const headlineCopy = isPass
    ? `PASS — ${totalFiles} file${totalFiles !== 1 ? 's' : ''} changed, all within allowed scope`
    : `FAIL — ${forbiddenCount} forbidden touch${forbiddenCount !== 1 ? 'es' : ''} in ${totalFiles} changed file${totalFiles !== 1 ? 's' : ''}`;

  return (
    <div
      style={{
        padding: '20px 24px',
        marginBottom: '20px',
        borderRadius: '6px',
        color: 'white',
        ...(isPass
          ? { backgroundColor: 'var(--vscode-testing-iconPassed, #4caf50)' }
          : { backgroundColor: 'var(--vscode-testing-iconFailed, #f44336)' }),
      }}
    >
      <div style={{ fontSize: '1.5em', fontWeight: 'bold', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
        {isPass ? '✓ PASS' : '✕ FAIL'}
      </div>
      <div style={{ marginTop: '6px', fontSize: '0.95em', fontWeight: '500' }}>
        {headlineCopy}
      </div>
      <div style={{ fontSize: '0.8em', fontWeight: 'normal', marginTop: '6px', opacity: 0.85 }}>
        Engine v{outcome.engineVersion} · Computed {new Date(outcome.computedAt).toLocaleString()}
      </div>
    </div>
  );
}
