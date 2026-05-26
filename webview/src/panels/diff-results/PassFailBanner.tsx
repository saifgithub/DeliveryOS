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
        padding: '16px',
        marginBottom: '16px',
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.1em',
        ...(isPass
          ? { backgroundColor: 'var(--vscode-testing-iconPassed, #4caf50)' }
          : { backgroundColor: 'var(--vscode-testing-iconFailed, #f44336)' }),
      }}
    >
      <div>{headlineCopy}</div>
      <div style={{ fontSize: '0.85em', fontWeight: 'normal', marginTop: '4px', opacity: 0.9 }}>
        Engine v{outcome.engineVersion} · Computed {new Date(outcome.computedAt).toLocaleString()}
      </div>
    </div>
  );
}
