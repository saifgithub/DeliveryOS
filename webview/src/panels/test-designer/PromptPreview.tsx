import MarkdownIt from 'markdown-it';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { TestDesignerCopyPrompt } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

const md = new MarkdownIt({ html: false, linkify: false, breaks: false });

interface Props {
  readonly prompt: string | null;
  readonly generating: boolean;
  readonly onGenerate: () => void | Promise<void>;
  readonly onCopied: () => void;
  readonly onCopyFailed: (reason: string) => void;
  readonly onPickResultTab: () => void;
}

export function PromptPreview(props: Props) {
  const { prompt, generating, onGenerate, onCopied, onCopyFailed, onPickResultTab } = props;

  const handleCopy = async () => {
    if (!prompt) return;
    // Webview-side first; fall back to the host's clipboard API if blocked.
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(prompt);
        onCopied();
        return;
      }
    } catch {
      // Fall through to host-side clipboard.
    }
    try {
      const res = await messenger.sendRequest(TestDesignerCopyPrompt, HOST_EXTENSION, { prompt });
      if (res.ok) {
        onCopied();
      } else {
        onCopyFailed('Failed to copy prompt.');
      }
    } catch (err) {
      console.error('PromptPreview: host clipboard failed', err);
      onCopyFailed('Failed to copy prompt.');
    }
  };

  if (!prompt) {
    return (
      <section className="max-w-3xl space-y-3">
        <h2 className="text-base font-semibold text-vscode-fg">Generate the Test Designer prompt</h2>
        <p className="text-sm text-dos-muted">
          DeliveryOS will compose a prompt that follows PRD §22's specialist shape. Run it in your AI
          tool of choice (Claude.ai, ChatGPT, etc.), then paste the response in the Result tab.
        </p>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {generating ? 'Generating…' : 'Generate prompt'}
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-3xl space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Copy prompt
        </button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="px-3 py-1.5 rounded-md border border-vscode-border text-xs text-vscode-fg hover:bg-vscode-bg transition-colors disabled:opacity-50"
        >
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
        <button
          onClick={onPickResultTab}
          className="px-3 py-1.5 rounded-md border border-vscode-border text-xs text-vscode-fg hover:bg-vscode-bg transition-colors"
        >
          Go to Result →
        </button>
      </div>
      <article
        className="prose-tight text-sm border border-vscode-border rounded-md p-4 bg-dos-surface max-h-[60vh] overflow-y-auto"
        dangerouslySetInnerHTML={{ __html: md.render(prompt) }}
      />
    </section>
  );
}
