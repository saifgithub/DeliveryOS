import { useEffect, useRef, useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { DiscoverSaveRawIdea } from '@deliveryos/contracts';
import type { RawIdea } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;
const LARGE_THRESHOLD = 50_000;
const LINE_PX = 20;
const MAX_ROWS = 80;

interface Props {
  projectTitle: string;
  rawIdea: RawIdea | null;
  onSaved: (rawIdea: RawIdea) => void;
}

export function RawIdeaInput({ projectTitle, rawIdea, onSaved }: Props) {
  const [body, setBody] = useState(rawIdea?.text ?? '');
  const [title, setTitle] = useState(projectTitle);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBody = useRef(body);
  const latestTitle = useRef(title);
  latestBody.current = body;
  latestTitle.current = title;

  useEffect(() => {
    autosizeTextarea(textareaRef.current);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const autosizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_ROWS * LINE_PX) + 'px';
  };

  const doSave = async (b: string, t: string) => {
    if (!b.trim()) return;
    setSaving(true);
    try {
      const trimmedTitle = t.trim();
      const res = await messenger.sendRequest(DiscoverSaveRawIdea, HOST_EXTENSION, {
        body: b.trim(),
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
      });
      onSaved(res.rawIdea);
    } catch (err) {
      console.error('RawIdeaInput: saveRawIdea failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_BYTES) return;
    setBody(val);
    autosizeTextarea(e.target);

    const isLarge = val.length > LARGE_THRESHOLD;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isLarge && val.trim()) {
      debounceRef.current = setTimeout(
        () => doSave(latestBody.current, latestTitle.current),
        1000,
      );
    }
  };

  const handleBlur = () => {
    if (body.length > LARGE_THRESHOLD && body.trim()) {
      doSave(latestBody.current, latestTitle.current);
    }
  };

  const isLarge = body.length > LARGE_THRESHOLD;
  const savedAt = rawIdea?.capturedAt ? new Date(rawIdea.capturedAt).toLocaleString() : null;

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
        {isLarge && (
          <p className="text-xs text-dos-muted mb-1">
            Body is large ({(body.length / 1024).toFixed(0)} KB) — saving on blur.
          </p>
        )}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. I want a bug triage assistant"
          style={{ minHeight: '10rem', overflowY: 'auto' }}
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-none font-[var(--vscode-editor-font-family)]"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => doSave(body, title)}
          disabled={saving || !body.trim()}
          className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-semibold disabled:opacity-50 hover:brightness-110 active:brightness-95 transition-all shadow-sm"
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
