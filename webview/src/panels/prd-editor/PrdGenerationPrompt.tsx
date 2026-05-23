import { useRef, useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  PrdGenerateDraftPrompt,
  PrdPasteDraft,
  type DraftPrd,
  type PrdParseReport,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;
const LARGE_THRESHOLD = 50_000;

interface Props {
  projectId: string;
  projectTitle: string;
  onToast: (msg: string) => void;
  onImported: (prd: DraftPrd, report: PrdParseReport) => void;
}

export function PrdGenerationPrompt({ projectId, projectTitle, onToast, onImported }: Props) {
  const [draft, setDraft] = useState('');
  const [copying, setCopying] = useState(false);
  const [importing, setImporting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const LINE_PX = 20;
  const MAX_ROWS = 80;

  const autosizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_ROWS * LINE_PX) + 'px';
  };

  const handleCopyPrompt = async () => {
    setCopying(true);
    try {
      await messenger.sendRequest(PrdGenerateDraftPrompt, HOST_EXTENSION, { projectId });
      onToast('Generate-PRD prompt copied to clipboard.');
    } catch (err) {
      console.error('PrdGenerationPrompt: generateDraftPrompt failed', err);
      onToast('Failed to copy prompt.');
    } finally {
      setCopying(false);
    }
  };

  const handleImport = async () => {
    if (!draft.trim()) return;
    setImporting(true);
    try {
      const res = await messenger.sendRequest(PrdPasteDraft, HOST_EXTENSION, {
        projectId,
        rawMarkdown: draft,
      });
      onImported(res.prd, res.report);
    } catch (err) {
      console.error('PrdGenerationPrompt: pasteDraft failed', err);
      onToast('Import failed — check console for details.');
    } finally {
      setImporting(false);
    }
  };

  const isLarge = draft.length > LARGE_THRESHOLD;

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">
          Generate a PRD draft
        </h2>
        <p className="text-sm text-dos-muted">
          Copy the prompt below, paste it into your AI tool, then paste the resulting
          markdown back to import the draft.
        </p>
      </div>

      <div>
        <p className="text-xs text-dos-muted mb-2">Project: {projectTitle}</p>
        <button
          onClick={handleCopyPrompt}
          disabled={copying}
          className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {copying ? 'Copying…' : 'Copy generate-PRD prompt'}
        </button>
      </div>

      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">
          Paste draft markdown
        </h2>
        {isLarge && (
          <p className="text-xs text-dos-muted mb-1">
            Large paste ({(draft.length / 1024).toFixed(0)} KB).
          </p>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            if (e.target.value.length > MAX_BYTES) return;
            setDraft(e.target.value);
            autosizeTextarea(e.target);
          }}
          placeholder="Paste the AI-generated PRD markdown here…"
          style={{ minHeight: '12rem', overflowY: 'auto' }}
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-none font-[var(--vscode-editor-font-family)]"
        />
      </div>

      <button
        onClick={handleImport}
        disabled={importing || !draft.trim()}
        className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {importing ? 'Importing…' : 'Import'}
      </button>
    </section>
  );
}
