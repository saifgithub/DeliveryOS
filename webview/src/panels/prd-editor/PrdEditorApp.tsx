import { useEffect, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { PrdLoad, RequirementsOpenDecomposePanel, type DraftPrd, type PrdParseReport } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';
import { PrdGenerationPrompt } from './PrdGenerationPrompt';
import { SectionEditor } from './SectionEditor';

/** Approve PRD button — disabled until all sections are non-empty. */
function ApprovePrdButton({ prd, onToast }: { prd: DraftPrd; onToast: (msg: string) => void }) {
  const emptySections = prd.sections.filter((s) => !s.body.trim());
  const allFilled = emptySections.length === 0;
  const tooltip = allFilled
    ? undefined
    : `Fill in ${emptySections.length} empty section${emptySections.length === 1 ? '' : 's'} before approving: ${emptySections.map((s) => s.title).join(', ')}`;

  const handleApprove = async () => {
    onToast('PRD approved — opening Requirements decomposition…');
    try {
      await messenger.sendRequest(RequirementsOpenDecomposePanel, HOST_EXTENSION, {});
    } catch (err) {
      console.error('ApprovePrdButton: failed to open decompose panel', err);
    }
  };

  return (
    <div className="pt-4 border-t border-vscode-border">
      <div className="group relative inline-block">
        <button
          disabled={!allFilled}
          onClick={() => void handleApprove()}
          title={tooltip}
          className="px-5 py-2.5 rounded-md bg-dos-accent text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:brightness-95 transition-all shadow-sm"
        >
          Approve PRD
        </button>
        {!allFilled && tooltip && (
          <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-72 rounded-md bg-vscode-panel border border-vscode-border px-3 py-2 text-xs text-dos-muted opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {tooltip}
          </div>
        )}
      </div>
    </div>
  );
}

type AppState =
  | { phase: 'loading' }
  | { phase: 'noProject' }
  | { phase: 'empty'; projectId: string; projectTitle: string }
  | { phase: 'reimporting'; projectId: string; projectTitle: string; existingPrd: DraftPrd }
  | { phase: 'parsing'; projectId: string; projectTitle: string; prd: DraftPrd; report: PrdParseReport }
  | { phase: 'editing'; projectId: string; projectTitle: string; prd: DraftPrd };

export function PrdEditorApp() {
  const [appState, setAppState] = useState<AppState>({ phase: 'loading' });
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    messenger
      .sendRequest(PrdLoad, HOST_EXTENSION, { projectId: '' })
      .then((res) => {
        if (cancelled) return;
        if (!res.projectId) {
          setAppState({ phase: 'noProject' });
          return;
        }
        if (res.prd) {
          setAppState({
            phase: 'editing',
            projectId: res.projectId,
            projectTitle: res.projectTitle,
            prd: res.prd,
          });
        } else {
          setAppState({
            phase: 'empty',
            projectId: res.projectId,
            projectTitle: res.projectTitle,
          });
        }
      })
      .catch((err: unknown) => {
        console.error('PrdEditorApp: prd/load failed', err);
        if (!cancelled) setAppState({ phase: 'noProject' });
      });
    return () => { cancelled = true; };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  if (appState.phase === 'loading') {
    return (
      <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg">
        <p className="text-sm text-dos-muted">Loading…</p>
      </main>
    );
  }

  if (appState.phase === 'noProject') {
    return (
      <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg">
        <p className="text-sm text-dos-muted">
          No project open — use the sidebar to create one first.
        </p>
      </main>
    );
  }

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-dos-accent">PRD Editor</h1>
              {appState.projectTitle && (
                <p className="text-sm text-dos-muted mt-0.5">{appState.projectTitle}</p>
              )}
            </div>
            {appState.phase === 'editing' && (
              <button
                onClick={() =>
                  setAppState({
                    phase: 'reimporting',
                    projectId: appState.projectId,
                    projectTitle: appState.projectTitle,
                    existingPrd: appState.prd,
                  })
                }
                className="shrink-0 mt-1 text-xs text-dos-muted underline underline-offset-2 hover:text-vscode-fg transition-colors"
              >
                Re-import draft
              </button>
            )}
            {appState.phase === 'reimporting' && (
              <button
                onClick={() =>
                  setAppState({
                    phase: 'editing',
                    projectId: appState.projectId,
                    projectTitle: appState.projectTitle,
                    prd: appState.existingPrd,
                  })
                }
                className="shrink-0 mt-1 text-xs text-dos-muted underline underline-offset-2 hover:text-vscode-fg transition-colors"
              >
                ← Back to editor
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {(appState.phase === 'empty' || appState.phase === 'reimporting') && (
            <PrdGenerationPrompt
              projectId={appState.projectId}
              projectTitle={appState.projectTitle}
              onToast={showToast}
              onImported={(prd, report) =>
                setAppState({
                  phase: 'parsing',
                  projectId: appState.projectId,
                  projectTitle: appState.projectTitle,
                  prd,
                  report,
                })
              }
            />
          )}

          {appState.phase === 'parsing' && (
            <ParseSummary
              prd={appState.prd}
              report={appState.report}
              onAccept={() =>
                setAppState({
                  phase: 'editing',
                  projectId: appState.projectId,
                  projectTitle: appState.projectTitle,
                  prd: appState.prd,
                })
              }
            />
          )}

          {appState.phase === 'editing' && (
            <div className="space-y-8 max-w-3xl">
              {appState.prd.sections.map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  prdId={appState.prd.prdId}
                  projectTitle={appState.projectTitle}
                  otherSections={appState.prd.sections.filter((s) => s.id !== section.id)}
                  onSaved={(updatedSection) => {
                    setAppState((prev) => {
                      if (prev.phase !== 'editing') return prev;
                      return {
                        ...prev,
                        prd: {
                          ...prev.prd,
                          sections: prev.prd.sections.map((s) =>
                            s.id === updatedSection.id ? updatedSection : s,
                          ),
                        },
                      };
                    });
                  }}
                  onToast={showToast}
                />
              ))}
              <ApprovePrdButton prd={appState.prd} onToast={showToast} />
            </div>
          )}
        </div>
      </main>

      <Toast.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        duration={2500}
        className="bg-dos-surface border border-vscode-border rounded-md shadow-lg px-4 py-3 text-sm text-dos-ink data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full"
      >
        <Toast.Title>{toastMsg}</Toast.Title>
      </Toast.Root>
      <Toast.Viewport className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72" />
    </Toast.Provider>
  );
}

function ParseSummary({
  prd,
  report,
  onAccept,
}: {
  prd: DraftPrd;
  report: PrdParseReport;
  onAccept: () => void;
}) {
  return (
    <section className="max-w-2xl space-y-5">
      <h2 className="text-base font-semibold text-vscode-fg">Import summary</h2>
      <p className="text-sm text-dos-muted">
        {report.sectionsFound.length} of 8 sections found.
        {report.sectionsMissing.length > 0 && (
          <> Missing: {report.sectionsMissing.join(', ')}.</>
        )}
      </p>
      {report.unmatchedHeadings.length > 0 && (
        <p className="text-sm text-dos-muted">
          Unrecognised headings (skipped): {report.unmatchedHeadings.join(', ')}.
        </p>
      )}
      <p className="text-xs text-dos-muted">
        PRD: <span className="font-mono">{prd.prdId}</span>
      </p>
      <button
        onClick={onAccept}
        className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Accept and edit
      </button>
    </section>
  );
}
