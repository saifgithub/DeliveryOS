import { useEffect, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { PrdLoad, type DraftPrd, type PrdParseReport } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';
import { PrdGenerationPrompt } from './PrdGenerationPrompt';
import { SectionEditor } from './SectionEditor';

type AppState =
  | { phase: 'loading' }
  | { phase: 'noProject' }
  | { phase: 'empty'; projectId: string; projectTitle: string }
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
          <h1 className="text-2xl font-semibold text-dos-accent">PRD Editor</h1>
          {appState.projectTitle && (
            <p className="text-sm text-dos-muted mt-0.5">{appState.projectTitle}</p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {appState.phase === 'empty' && (
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
