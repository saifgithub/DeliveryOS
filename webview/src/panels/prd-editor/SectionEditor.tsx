import { useEffect, useRef, useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { PrdSaveSection, type PrdSection } from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';
import { ReviseSectionButton } from './ReviseSectionButton';

const DEBOUNCE_MS = 500;
const LINE_PX = 20;
const MAX_ROWS = 80;

interface Props {
  section: PrdSection;
  prdId: string;
  projectTitle: string;
  otherSections: readonly PrdSection[];
  onSaved: (updated: PrdSection) => void;
  onToast: (msg: string) => void;
}

export function SectionEditor({
  section,
  prdId,
  otherSections,
  onSaved,
  onToast,
}: Props) {
  const [body, setBody] = useState(section.body);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBody = useRef(body);
  latestBody.current = body;

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

  const doSave = async (b: string) => {
    setSaveState('saving');
    try {
      await messenger.sendRequest(PrdSaveSection, HOST_EXTENSION, {
        prdId,
        sectionId: section.id,
        body: b,
      });
      onSaved({ ...section, body: b });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      console.error('SectionEditor: saveSection failed', err);
      onToast(`Failed to save ${section.title}.`);
      setSaveState('idle');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.target.value);
    autosizeTextarea(e.target);
    setSaveState('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(latestBody.current), DEBOUNCE_MS);
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-vscode-fg">{section.title}</h2>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-dos-muted tabular-nums">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
          {saveState === 'saving' && (
            <span className="text-xs text-dos-muted">Saving…</span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs text-dos-muted">Saved</span>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={handleChange}
        placeholder="(empty — fill in this section before approving the PRD)"
        style={{ minHeight: '6rem', overflowY: 'auto' }}
        className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-none font-[var(--vscode-editor-font-family)]"
      />

      <ReviseSectionButton
        prdId={prdId}
        sectionId={section.id}
        sectionTitle={section.title}
        currentBody={body}
        otherSections={otherSections}
        onToast={onToast}
      />
    </div>
  );
}
