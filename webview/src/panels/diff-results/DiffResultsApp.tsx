import React, { useEffect, useState } from 'react';
import type { DiffOutcome, HookInstallPlan, DiffPanelInbound } from '@deliveryos/contracts';
import { PassFailBanner } from './PassFailBanner';
import { FileSection } from './FileSection';
import { HookInstallTab } from './HookInstallTab';
import { UnclassifiedNote } from './UnclassifiedNote';

type Tab = 'diff-results' | 'hook-install';

// The vscode API object injected into webview context.
const vscode = (typeof acquireVsCodeApi !== 'undefined')
  ? acquireVsCodeApi()
  : null;

declare function acquireVsCodeApi(): { postMessage: (msg: unknown) => void };

function postMessage(msg: DiffPanelInbound): void {
  vscode?.postMessage(msg);
}

export function DiffResultsApp(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('diff-results');
  const [outcome, setOutcome] = useState<DiffOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hookPlan, setHookPlan] = useState<HookInstallPlan | null | undefined>(undefined);
  const [installedAt, setInstalledAt] = useState<number | null>(null);
  const [resultId, setResultId] = useState<string>('');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as { kind: string; [k: string]: unknown };
      if (!msg?.kind) return;

      switch (msg.kind) {
        case 'diffOutcome': {
          const o = msg.outcome as DiffOutcome;
          setOutcome(o);
          setResultId(o.resultId);
          setError(null);
          break;
        }
        case 'hookInstallPlan': {
          setHookPlan((msg.plan as HookInstallPlan | null) ?? null);
          break;
        }
        case 'hookInstalled': {
          setInstalledAt(msg.appliedAt as number);
          // Re-request the plan to show updated state.
          postMessage({ kind: 'requestHookInstallPlan', resultId });
          break;
        }
        case 'error': {
          setError(msg.message as string);
          break;
        }
      }
    };

    window.addEventListener('message', handler);

    // Request the initial diff outcome.
    postMessage({ kind: 'requestDiffOutcome', resultId: '' });

    return () => window.removeEventListener('message', handler);
  }, []);

  const forbiddenFiles = outcome?.files.filter(
    (f) => f.classification === 'forbidden-but-touched',
  ) ?? [];
  const allowedFiles = outcome?.files.filter(
    (f) => f.classification === 'allowed-and-touched',
  ) ?? [];
  const unclassifiedFiles = outcome?.files.filter(
    (f) => f.classification === 'unclassified-but-touched',
  ) ?? [];
  const unmatchedPatterns = outcome?.unmatchedAllowedPatterns ?? [];

  // Convert unmatched patterns to pseudo FileVerdict rows for the section.
  const unmatchedAsVerdicts = unmatchedPatterns.map((p) => ({
    path: p,
    classification: 'allowed-and-touched' as const, // display only
    matchedRule: null,
    matchedSection: 7 as const,
  }));

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '6px 16px',
    cursor: 'pointer',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--vscode-focusBorder, #0078d4)' : '2px solid transparent',
    background: 'none',
    color: activeTab === tab ? 'var(--vscode-foreground, inherit)' : 'var(--vscode-descriptionForeground, #999)',
    fontWeight: activeTab === tab ? 'bold' : 'normal',
  });

  return (
    <div style={{ fontFamily: 'var(--vscode-font-family, sans-serif)', fontSize: 'var(--vscode-font-size, 13px)', color: 'var(--vscode-foreground, inherit)', padding: '16px', maxWidth: '800px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--vscode-editorWidget-border, #444)', marginBottom: '16px' }}>
        <button style={tabStyle('diff-results')} onClick={() => setActiveTab('diff-results')}>
          Diff Results
        </button>
        <button
          style={tabStyle('hook-install')}
          onClick={() => {
            setActiveTab('hook-install');
            if (hookPlan === undefined && resultId) {
              postMessage({ kind: 'requestHookInstallPlan', resultId });
            }
          }}
        >
          Hook Install
        </button>
      </div>

      {activeTab === 'diff-results' && (
        <div>
          {error && (
            <div style={{ padding: '8px', backgroundColor: 'var(--vscode-inputValidation-errorBackground)', borderRadius: '4px', marginBottom: '12px', color: 'var(--vscode-inputValidation-errorForeground, red)' }}>
              Error: {error}
            </div>
          )}
          {!outcome && !error && (
            <div style={{ color: 'var(--vscode-descriptionForeground, #999)', padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>No diff yet — run a brief first.</div>
              <div style={{ fontSize: '12px' }}>After Claude Code finishes, the result will appear here automatically.</div>
            </div>
          )}
          {outcome && (
            <>
              <PassFailBanner outcome={outcome} />

              <FileSection
                title="Forbidden touches"
                files={forbiddenFiles}
                icon="✕"
                iconColor="var(--vscode-testing-iconFailed, #f44336)"
                defaultExpanded={forbiddenFiles.length > 0}
                onMessage={postMessage}
              />

              <FileSection
                title="Unclassified touches"
                files={unclassifiedFiles}
                icon="⚠"
                iconColor="var(--vscode-testing-iconQueued, #ff9800)"
                defaultExpanded={false}
                onMessage={postMessage}
                note={unclassifiedFiles.length > 0 ? <UnclassifiedNote /> : undefined}
              />

              <FileSection
                title="Allowed touches"
                files={allowedFiles}
                icon="✓"
                iconColor="var(--vscode-testing-iconPassed, #4caf50)"
                defaultExpanded={false}
                onMessage={postMessage}
              />

              <FileSection
                title="Allowed but not touched"
                files={unmatchedAsVerdicts}
                icon="ℹ"
                iconColor="var(--vscode-descriptionForeground, #999)"
                defaultExpanded={false}
                onMessage={postMessage}
              />

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (resultId) postMessage({ kind: 'recomputeDiff', resultId });
                  }}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                >
                  Re-run diff
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'hook-install' && (
        <HookInstallTab
          plan={hookPlan}
          installedAt={installedAt}
          onMessage={postMessage}
          resultId={resultId}
        />
      )}
    </div>
  );
}
