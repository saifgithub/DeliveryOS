import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  TestDesignerBootstrap,
  TestDesignerCancel,
  TestDesignerGeneratePrompt,
  type RequirementSummary,
  type TestSpec,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';
import { PromptPreview } from './PromptPreview';
import { PasteResultInput } from './PasteResultInput';

type BootstrapState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready';
      readonly requirement: RequirementSummary;
      readonly projectTitle: string;
      readonly prdSummary: string;
      readonly existing: TestSpec | null;
    }
  | { readonly status: 'error'; readonly reason: 'no-requirement' | 'no-prd' | 'no-project' };

export function TestDesignerApp() {
  const [bootstrap, setBootstrap] = useState<BootstrapState>({ status: 'loading' });
  const [prompt, setPrompt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'prompt' | 'result'>('prompt');
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
        const res = await messenger.sendRequest(TestDesignerBootstrap, HOST_EXTENSION, {});
        if (cancelled) return;
        if (res.ok) {
          setBootstrap({
            status: 'ready',
            requirement: res.requirement,
            projectTitle: res.projectTitle,
            prdSummary: res.prdSummary,
            existing: res.existing,
          });
        } else {
          setBootstrap({ status: 'error', reason: res.reason });
        }
      } catch (err) {
        console.error('TestDesignerApp: bootstrap failed', err);
        if (!cancelled) setBootstrap({ status: 'error', reason: 'no-requirement' });
      }
    })();
    return () => {
      cancelled = true;
      void messenger.sendNotification(TestDesignerCancel, HOST_EXTENSION, {});
    };
  }, []);

  const handleGenerate = async () => {
    if (bootstrap.status !== 'ready') return;
    setGenerating(true);
    try {
      const res = await messenger.sendRequest(TestDesignerGeneratePrompt, HOST_EXTENSION, {
        requirementEntryId: bootstrap.requirement.entryId,
      });
      if (res.ok) {
        setPrompt(res.prompt);
      } else {
        showToast(`Could not generate prompt: ${res.reason}.`);
      }
    } catch (err) {
      console.error('TestDesignerApp: generatePrompt failed', err);
      showToast('Failed to generate prompt.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCommitted = (summary: {
    readonly testSpecId: string;
    readonly verificationCriteriaCount: number;
    readonly caseCount: number;
  }) => {
    showToast(
      `Saved ${summary.testSpecId} — ${summary.verificationCriteriaCount} criteria · ${summary.caseCount} test cases.`,
    );
  };

  if (bootstrap.status === 'loading') {
    return (
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex items-center justify-center text-sm text-dos-muted">
        Loading Test Designer…
      </main>
    );
  }

  if (bootstrap.status === 'error') {
    return (
      <main className="min-h-screen bg-vscode-bg text-vscode-fg p-8 max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold text-dos-accent">Test Designer</h1>
        <p className="text-sm text-dos-muted">
          {bootstrap.reason === 'no-requirement'
            ? 'No requirement selected. Open the Requirements Catalogue, click a requirement, and choose "Run Test Designer".'
            : bootstrap.reason === 'no-prd'
              ? 'This project has no PRD yet. Generate the PRD first.'
              : 'No active project. Create a project before running the Test Designer.'}
        </p>
      </main>
    );
  }

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border space-y-1">
          <h1 className="text-2xl font-semibold text-dos-accent">Test Designer</h1>
          <p className="text-sm text-dos-muted">
            <span className="font-mono text-vscode-fg">{bootstrap.requirement.id}</span>{' '}
            — {bootstrap.requirement.title}
          </p>
          {bootstrap.existing && (
            <p className="text-xs text-amber-400">
              A test spec already exists for this requirement ({bootstrap.existing.id}). Saving will
              overwrite it.
            </p>
          )}
        </header>

        <Tabs.Root
          value={tab}
          onValueChange={(v) => setTab(v as 'prompt' | 'result')}
          className="flex-1 flex flex-col"
        >
          <Tabs.List className="px-6 border-b border-vscode-border flex gap-2">
            <Tabs.Trigger
              value="prompt"
              className="px-3 py-2 text-sm text-dos-muted data-[state=active]:text-vscode-fg data-[state=active]:border-b-2 data-[state=active]:border-dos-accent -mb-px"
            >
              1. Prompt
            </Tabs.Trigger>
            <Tabs.Trigger
              value="result"
              className="px-3 py-2 text-sm text-dos-muted data-[state=active]:text-vscode-fg data-[state=active]:border-b-2 data-[state=active]:border-dos-accent -mb-px"
            >
              2. Result
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="prompt" className="flex-1 overflow-y-auto p-6">
            <PromptPreview
              prompt={prompt}
              onGenerate={handleGenerate}
              generating={generating}
              onCopied={() => showToast('Test Designer prompt copied to clipboard.')}
              onCopyFailed={(reason) => showToast(reason)}
              onPickResultTab={() => setTab('result')}
            />
          </Tabs.Content>

          <Tabs.Content value="result" className="flex-1 overflow-y-auto p-6">
            <PasteResultInput
              requirement={bootstrap.requirement}
              hasExistingTestSpec={bootstrap.existing !== null}
              onCommitted={handleCommitted}
              showToast={showToast}
            />
          </Tabs.Content>
        </Tabs.Root>

        <Toast.Root
          open={toastOpen}
          onOpenChange={setToastOpen}
          duration={3000}
          className="bg-dos-surface border border-vscode-border rounded-md shadow-lg px-4 py-3 text-sm text-dos-ink"
        >
          <Toast.Title>{toastMsg}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80" />
      </main>
    </Toast.Provider>
  );
}
