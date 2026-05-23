import { useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { DiscoverGeneratePrompt, DiscoverCopyPrompt } from '@deliveryos/contracts';
import type { RawIdea, DiscoveryQuestion } from '@deliveryos/contracts';
import { Copy, RefreshCw } from 'lucide-react';
import { messenger } from '../../shared/messenger';

interface Props {
  rawIdea: RawIdea | null;
  questions: readonly DiscoveryQuestion[];
  onPromptGenerated: () => void;
  onCopied: () => void;
}

export function DiscoveryPromptPreview({
  rawIdea,
  questions,
  onPromptGenerated,
  onCopied,
}: Props) {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);

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

  const generatedAtStr = generatedAt ? new Date(generatedAt).toLocaleString() : null;

  return (
    <section className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">Discovery prompt</h2>
        <p className="text-xs text-dos-muted mb-3">
          Generate a prompt with your raw idea and the {questions.length} discovery questions,
          then paste it into your AI tool. Paste the response back in the Answers tab.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating || !rawIdea?.text}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generating…' : prompt ? 'Regenerate' : 'Generate prompt'}
        </button>

        {prompt && (
          <button
            onClick={handleCopy}
            disabled={copying}
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
