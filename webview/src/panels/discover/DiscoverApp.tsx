import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Toast from '@radix-ui/react-toast';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  DiscoverGetInitialState,
  DiscoverSetMode,
  DiscoverStateChanged,
  type DiscoverMode,
} from '@deliveryos/contracts';
import type { RawIdea, DiscoveryRecord, DiscoveryQuestion } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';
import { RawIdeaInput } from './RawIdeaInput';
import { DiscoveryPromptPreview } from './DiscoveryPromptPreview';
import { DiscoveryAnswersInput } from './DiscoveryAnswersInput';
import { DiscoverySummary } from './DiscoverySummary';

export interface DiscoverState {
  projectTitle: string;
  rawIdea: RawIdea | null;
  discovery: DiscoveryRecord | null;
  questions: readonly DiscoveryQuestion[];
  mode: DiscoverMode;
}

export function DiscoverApp() {
  const [state, setState] = useState<DiscoverState | null>(null);
  const [activeTab, setActiveTab] = useState<string>('rawIdea');
  const [promptGeneratedThisSession, setPromptGeneratedThisSession] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    messenger
      .sendRequest(DiscoverGetInitialState, HOST_EXTENSION, {})
      .then((res) => {
        if (cancelled) return;
        setState({
          projectTitle: res.projectTitle,
          rawIdea: res.rawIdea ?? null,
          discovery: res.discovery ?? null,
          questions: res.questions,
          mode: res.mode,
        });
        setActiveTab(res.mode ?? 'rawIdea');
      })
      .catch((err: unknown) => console.error('DiscoverApp: getInitialState failed', err));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    messenger.onNotification(DiscoverStateChanged, (params) => {
      setState((prev) =>
        prev
          ? {
              ...prev,
              rawIdea: params.rawIdea ?? prev.rawIdea,
              discovery: params.discovery ?? prev.discovery,
            }
          : prev,
      );
    });
    messenger.onNotification(DiscoverSetMode, (params) => {
      setActiveTab(params.mode);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
  };

  const hasRawIdea = Boolean(state?.rawIdea?.text);
  const hasPrompt = promptGeneratedThisSession || state?.discovery !== null;
  const hasAnswers = (state?.discovery?.answers.length ?? 0) > 0;

  if (!state) {
    return (
      <main className="min-h-screen p-8 bg-vscode-bg text-vscode-fg">
        <p className="text-sm text-dos-muted">Loading…</p>
      </main>
    );
  }

  return (
    <Toast.Provider swipeDirection="right">
      <main className="min-h-screen bg-vscode-bg text-vscode-fg flex flex-col">
        <header className="px-6 pt-6 pb-3 border-b border-vscode-border">
          <h1 className="text-2xl font-semibold text-dos-accent">Discover</h1>
          {state.projectTitle && (
            <p className="text-sm text-dos-muted mt-0.5">{state.projectTitle}</p>
          )}
        </header>

        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <Tabs.List className="flex border-b border-vscode-border px-6 gap-1 shrink-0">
            <TabTrigger value="rawIdea" label="Raw Idea" />
            <TabTrigger value="prompt" label="Prompt" disabled={!hasRawIdea} />
            <TabTrigger value="answers" label="Answers" disabled={!hasPrompt} />
            <TabTrigger value="summary" label="Summary" disabled={!hasAnswers} />
          </Tabs.List>

          <div className="flex-1 overflow-y-auto">
            <Tabs.Content value="rawIdea" className="p-6 outline-none">
              <RawIdeaInput
                projectTitle={state.projectTitle}
                rawIdea={state.rawIdea}
                onSaved={(rawIdea) => {
                  setState((prev) => prev ? { ...prev, rawIdea } : prev);
                  showToast('Raw idea saved.');
                }}
              />
            </Tabs.Content>

            <Tabs.Content value="prompt" className="p-6 outline-none">
              <DiscoveryPromptPreview
                rawIdea={state.rawIdea}
                questions={state.questions}
                onPromptGenerated={() => setPromptGeneratedThisSession(true)}
                onCopied={() => showToast('Prompt copied to clipboard.')}
              />
            </Tabs.Content>

            <Tabs.Content value="answers" className="p-6 outline-none">
              <DiscoveryAnswersInput
                questions={state.questions}
                existingDiscovery={state.discovery}
                onSaved={(discovery) => {
                  setState((prev) => prev ? { ...prev, discovery } : prev);
                  showToast('Answers saved.');
                  setActiveTab('summary');
                }}
              />
            </Tabs.Content>

            <Tabs.Content value="summary" className="p-6 outline-none">
              <DiscoverySummary discovery={state.discovery} questions={state.questions} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
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

function TabTrigger({
  value,
  label,
  disabled = false,
}: {
  value: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Tabs.Trigger
      value={value}
      disabled={disabled}
      className="px-4 py-2.5 text-sm font-medium text-dos-muted border-b-2 border-transparent -mb-px transition-colors
        data-[state=active]:text-dos-accent data-[state=active]:border-dos-accent
        hover:text-vscode-fg disabled:opacity-40 disabled:pointer-events-none outline-none"
    >
      {label}
    </Tabs.Trigger>
  );
}
