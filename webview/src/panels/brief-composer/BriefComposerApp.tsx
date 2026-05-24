import { useEffect, useMemo, useState } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  BriefBootstrap,
  BriefCancel,
  BriefCopyPreview,
  BriefEditList,
  BriefEditSection,
  BriefSave,
  type BriefSectionId,
  type BriefValidation,
  type ExecutionBriefDraft,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';
import { SectionEditor } from './SectionEditor';
import { AllowedForbiddenEditor } from './AllowedForbiddenEditor';
import { CodebaseContextPaste } from './CodebaseContextPaste';
import { SaveAndLockButton } from './SaveAndLockButton';

type ComposerState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly mode: 'draft' | 'readonly';
      readonly draft: ExecutionBriefDraft;
      readonly validation: BriefValidation;
      readonly preview: string;
      readonly requirementUserId: string;
      readonly requirementTitle: string;
    }
  | {
      readonly status: 'error';
      readonly reason: 'no-requirement' | 'no-brief' | 'no-project' | 'no-prd';
    };

const SECTION_ORDER: readonly BriefSectionId[] = [
  'objective',
  'approved-requirement',
  'business-intent',
  'approved-design-context',
  'existing-codebase-context',
  'test-first-specification',
  'allowed-changes',
  'forbidden-changes',
  'expected-output',
  'completion-criteria',
];

export function BriefComposerApp() {
  const [state, setState] = useState<ComposerState>({ status: 'loading' });
  const [saving, setSaving] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await messenger.sendRequest(BriefBootstrap, HOST_EXTENSION, {});
        if (cancelled) return;
        if (res.ok) {
          setState({
            status: 'ready',
            mode: res.mode,
            draft: res.draft,
            validation: res.validation,
            preview: res.preview,
            requirementUserId: res.requirementUserId,
            requirementTitle: res.requirementTitle,
          });
        } else {
          setState({ status: 'error', reason: res.reason });
        }
      } catch (err) {
        console.error('BriefComposerApp: bootstrap failed', err);
        if (!cancelled) setState({ status: 'error', reason: 'no-requirement' });
      }
    })();
    return () => {
      cancelled = true;
      void messenger.sendNotification(BriefCancel, HOST_EXTENSION, {});
    };
  }, []);

  const handleSectionChange = async (sectionId: BriefSectionId, body: string) => {
    if (state.status !== 'ready' || state.mode === 'readonly') return;
    try {
      const res = await messenger.sendRequest(BriefEditSection, HOST_EXTENSION, {
        sectionId,
        body,
      });
      if (res.ok) {
        setState({ ...state, draft: res.draft, validation: res.validation, preview: res.preview });
      } else if (res.reason !== 'read-only-section') {
        showToast(`Edit blocked: ${res.reason}.`);
      }
    } catch (err) {
      console.error('BriefComposerApp: editSection failed', err);
      showToast('Edit failed.');
    }
  };

  const handleListChange = async (list: 'allowed' | 'forbidden', globs: readonly string[]) => {
    if (state.status !== 'ready' || state.mode === 'readonly') return;
    try {
      const res = await messenger.sendRequest(BriefEditList, HOST_EXTENSION, { list, globs });
      if (res.ok) {
        setState({ ...state, draft: res.draft, validation: res.validation, preview: res.preview });
      } else {
        showToast(`Edit blocked: ${res.reason}.`);
      }
    } catch (err) {
      console.error('BriefComposerApp: editList failed', err);
      showToast('Edit failed.');
    }
  };

  const handleSave = async () => {
    if (state.status !== 'ready' || state.mode === 'readonly') return;
    setSaving(true);
    try {
      const res = await messenger.sendRequest(BriefSave, HOST_EXTENSION, { draft: state.draft });
      if (res.ok) {
        showToast(`Brief saved and locked — ${res.briefId}.`);
        // Re-bootstrap to flip into read-only mode for the just-saved brief.
        // The host's activeBriefEntryId is already set; the panel needs the
        // readonly draft to surface "Compose new version".
        const next = await messenger.sendRequest(BriefBootstrap, HOST_EXTENSION, {});
        if (next.ok) {
          setState({
            status: 'ready',
            mode: next.mode,
            draft: next.draft,
            validation: next.validation,
            preview: next.preview,
            requirementUserId: next.requirementUserId,
            requirementTitle: next.requirementTitle,
          });
        }
      } else {
        showToast(
          res.reason === 'validation'
            ? `Cannot save: ${res.errors.join(' · ')}`
            : `Cannot save: ${res.errors[0] ?? res.reason}`,
        );
      }
    } catch (err) {
      console.error('BriefComposerApp: save failed', err);
      showToast('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPreview = async () => {
    if (state.status !== 'ready') return;
    try {
      const res = await messenger.sendRequest(BriefCopyPreview, HOST_EXTENSION, {
        markdown: state.preview,
      });
      if (res.ok) {
        showToast(`Copied ${res.bytesCopied} bytes of brief markdown.`);
      }
    } catch (err) {
      console.error('BriefComposerApp: copyPreview failed', err);
      showToast('Copy failed.');
    }
  };

  if (state.status === 'loading') {
    return (
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex items-center justify-center text-sm text-dos-muted">
        Loading Execution Brief composer…
      </main>
    );
  }

  if (state.status === 'error') {
    const message =
      state.reason === 'no-requirement'
        ? 'No requirement selected. Open the Requirements Catalogue, pick a requirement, then "Compose Execution Brief".'
        : state.reason === 'no-brief'
          ? 'Brief not found. It may have been deleted from the filesystem.'
          : state.reason === 'no-prd'
            ? 'This project has no PRD yet. Generate the PRD first.'
            : 'No active project. Create a project before composing a brief.';
    return (
      <main className="min-h-screen bg-vscode-bg text-vscode-fg p-8 max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold text-dos-accent">Execution Brief</h1>
        <p className="text-sm text-dos-muted">{message}</p>
      </main>
    );
  }

  return <ReadyView state={state} saving={saving}
    onSectionChange={handleSectionChange}
    onListChange={handleListChange}
    onSave={handleSave}
    onCopyPreview={handleCopyPreview}
    showToast={showToast}
    toastOpen={toastOpen}
    setToastOpen={setToastOpen}
    toastMsg={toastMsg}
  />;
}

interface ReadyViewProps {
  readonly state: Extract<ComposerState, { status: 'ready' }>;
  readonly saving: boolean;
  readonly onSectionChange: (id: BriefSectionId, body: string) => Promise<void>;
  readonly onListChange: (list: 'allowed' | 'forbidden', globs: readonly string[]) => Promise<void>;
  readonly onSave: () => Promise<void>;
  readonly onCopyPreview: () => Promise<void>;
  readonly showToast: (msg: string) => void;
  readonly toastOpen: boolean;
  readonly setToastOpen: (open: boolean) => void;
  readonly toastMsg: string;
}

function ReadyView({
  state,
  saving,
  onSectionChange,
  onListChange,
  onSave,
  onCopyPreview,
  toastOpen,
  setToastOpen,
  toastMsg,
}: ReadyViewProps) {
  const { draft, validation, preview, mode, requirementUserId, requirementTitle } = state;
  const isReadOnly = mode === 'readonly';

  const lockedMessage = useMemo(() => {
    if (!isReadOnly) return null;
    if (draft.frontmatter.locked_at) {
      return `Locked at ${draft.frontmatter.locked_at}.`;
    }
    return 'This brief is saved and locked.';
  }, [isReadOnly, draft.frontmatter.locked_at]);

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border space-y-1">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="text-2xl font-semibold text-dos-accent">Execution Brief</h1>
            <span className="font-mono text-xs text-dos-muted">{draft.frontmatter.brief_id}</span>
          </div>
          <p className="text-sm text-dos-muted">
            <span className="font-mono text-vscode-fg">{requirementUserId}</span> — {requirementTitle}
          </p>
          {lockedMessage && <p className="text-xs text-amber-400">{lockedMessage}</p>}
          {draft.frontmatter.supersedes && (
            <p className="text-xs text-dos-muted">
              Revises{' '}
              <span className="font-mono text-vscode-fg">{draft.frontmatter.supersedes}</span>.
            </p>
          )}
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          <section className="overflow-y-auto p-6 space-y-6 border-r border-vscode-border">
            {SECTION_ORDER.map((id) => {
              const section = draft.sections[id];
              if (id === 'allowed-changes' || id === 'forbidden-changes') {
                // Both lists rendered together in a single side-by-side widget.
                if (id === 'allowed-changes') {
                  return (
                    <AllowedForbiddenEditor
                      key="allowed-forbidden"
                      allowed={draft.allowed}
                      forbidden={draft.forbidden}
                      readOnly={isReadOnly}
                      onChange={onListChange}
                    />
                  );
                }
                return null; // forbidden is folded into the allowed widget above.
              }
              if (id === 'existing-codebase-context') {
                return (
                  <CodebaseContextPaste
                    key={id}
                    body={section.body}
                    readOnly={isReadOnly}
                    onChange={(body) => onSectionChange(id, body)}
                  />
                );
              }
              return (
                <SectionEditor
                  key={id}
                  section={section}
                  readOnly={isReadOnly}
                  onChange={(body) => onSectionChange(id, body)}
                />
              );
            })}

            <div className="pt-4 border-t border-vscode-border space-y-3">
              {validation.errors.length > 0 && (
                <ul className="space-y-1 text-xs text-red-400">
                  {validation.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              )}
              {validation.warnings.length > 0 && (
                <ul className="space-y-1 text-xs text-amber-400">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>⚠ {w}</li>
                  ))}
                </ul>
              )}
              <SaveAndLockButton
                readOnly={isReadOnly}
                disabled={!validation.ok || saving}
                saving={saving}
                onSave={onSave}
                errors={validation.errors}
              />
            </div>
          </section>

          <section className="overflow-y-auto p-6 space-y-3 bg-dos-surface">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-dos-accent">Markdown preview</h2>
              <button
                type="button"
                onClick={onCopyPreview}
                className="text-xs px-2 py-1 rounded border border-vscode-border hover:bg-vscode-bg"
              >
                Copy markdown
              </button>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap break-words p-3 rounded bg-vscode-bg border border-vscode-border text-dos-ink">
              {preview}
            </pre>
          </section>
        </div>

        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={3500}
          className="bg-dos-surface border border-vscode-border rounded-md shadow-lg px-4 py-3 text-sm text-dos-ink"
        >
          <Toast.Title>{toastMsg}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96" />
      </main>
    </Toast.Provider>
  );
}
