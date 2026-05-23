import { useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { DiscoverSaveRawIdea } from '@deliveryos/contracts';
import type { RawIdea } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

interface Props {
  projectTitle: string;
  rawIdea: RawIdea | null;
  onSaved: (rawIdea: RawIdea) => void;
}

export function RawIdeaInput({ projectTitle, rawIdea, onSaved }: Props) {
  const [body, setBody] = useState(rawIdea?.text ?? '');
  const [title, setTitle] = useState(projectTitle);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const trimmedTitle = title.trim();
      const res = await messenger.sendRequest(DiscoverSaveRawIdea, HOST_EXTENSION, {
        body: body.trim(),
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
      });
      onSaved(res.rawIdea);
    } catch (err) {
      console.error('RawIdeaInput: saveRawIdea failed', err);
    } finally {
      setSaving(false);
    }
  };

  const savedAt = rawIdea?.capturedAt
    ? new Date(rawIdea.capturedAt).toLocaleString()
    : null;

  return (
    <section className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">Project name</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. DeliveryOS"
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder"
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">Raw idea</h2>
        <p className="text-xs text-dos-muted mb-2">
          Describe your idea in your own words — rough is fine. You'll refine it in the next steps.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder="What are you trying to build? What problem does it solve?"
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y font-[var(--vscode-editor-font-family)]"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !body.trim()}
          className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save idea'}
        </button>
        {savedAt && (
          <p className="text-xs text-dos-muted">Last saved {savedAt}</p>
        )}
      </div>
    </section>
  );
}
