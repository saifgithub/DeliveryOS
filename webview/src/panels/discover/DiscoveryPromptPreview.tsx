import { useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  DiscoverGeneratePrompt,
  DiscoverCopyPrompt,
  DiscoverRunAI,
  type DiscoveryRecord,
} from '@deliveryos/contracts';
import type { RawIdea, DiscoveryQuestion } from '@deliveryos/contracts';
import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import { messenger } from '../../shared/messenger';

interface Props {
  rawIdea: RawIdea | null;
  questions: readonly DiscoveryQuestion[];
  onPromptGenerated: () => void;
  onCopied: () => void;
  onAISent?: (discovery: DiscoveryRecord) => void;
}

export function DiscoveryPromptPreview({
  rawIdea,
  questions,
  onPromptGenerated,
  onCopied,
  onAISent,
}: Props) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);
  const [runningAI, setRunningAI] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await messenger.sendRequest(DiscoverGeneratePrompt, HOST_EXTENSION, {});
      setPrompt(res.prompt);
      setGeneratedAt(res.generatedAt);
      onPromptGenerated();
    } catch (err) {
      console.error('DiscoveryPromptPreview: generatePrompt failed', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;
    setCopying(true);
    try {
      await messenger.sendRequest(DiscoverCopyPrompt, HOST_EXTENSION, { prompt });
      onCopied();
    } catch (err) {
      console.error('DiscoveryPromptPreview: copyPrompt failed', err);
    } finally {
      setCopying(false);
    }
  };

  const handleRunAI = async () => {
    setRunningAI(true);
    try {
      const res = await messenger.sendRequest(DiscoverRunAI, HOST_EXTENSION, {});
      if (res.ok) {
        onAISent?.(res.discovery);
      } else if (res.clipboardFallback) {
        onCopied();
      }
    } catch (err) {
      console.error('DiscoveryPromptPreview: runAI failed', err);
    } finally {
      setRunningAI(false);
    }
  };

  const generatedAtStr = generatedAt ? new Date(generatedAt).toLocaleString() : null;
  const disabled = !rawIdea?.text;

  return (
    <section className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">Discovery prompt</h2>
        <p className="text-xs text-dos-muted mb-3">
          Send directly to your AI provider, or copy the prompt and paste the response manually.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleRunAI}
          disabled={runningAI || generating || disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Sparkles size={14} className={runningAI ? 'animate-pulse' : ''} />
          {runningAI ? 'AI is thinking…' : 'Send to AI ▶'}
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating || runningAI || disabled}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-vscode-border bg-dos-surface text-dos-ink text-sm font-medium disabled:opacity-50 hover:bg-vscode-panel transition-colors"
        >
          <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generating…' : prompt ? 'Regenerate' : 'Generate prompt'}
        </button>

        {prompt && (
          <button
            onClick={handleCopy}
            disabled={copying || runningAI}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-vscode-border bg-dos-surface text-dos-ink text-sm font-medium disabled:opacity-50 hover:bg-vscode-panel transition-colors"
          >
            <Copy size={14} />
            {copying ? 'Copying…' : 'Copy'}
          </button>
        )}
        {generatedAtStr && (
          <p className="text-xs text-dos-muted">Generated {generatedAtStr}</p>
        )}
      </div>

      {prompt && (
        <div>
          <pre className="whitespace-pre-wrap font-[var(--vscode-editor-font-family)] text-xs bg-vscode-panel border border-vscode-border rounded-md p-4 text-vscode-fg max-h-[28rem] overflow-y-auto">
            {prompt}
          </pre>
        </div>
      )}

      {!prompt && !rawIdea?.text && (
        <p className="text-sm text-dos-muted">
          Save a raw idea on the first tab to enable prompt generation.
        </p>
      )}
    </section>
  );
}
