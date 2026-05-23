import { useRef, useState } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Wand2 } from 'lucide-react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  PrdReviseSectionPrompt,
  type PrdSection,
  type PrdSectionId,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

interface Props {
  prdId: string;
  sectionId: PrdSectionId;
  sectionTitle: string;
  currentBody: string;
  otherSections: readonly PrdSection[];
  onToast: (msg: string) => void;
}

export function ReviseSectionButton({
  prdId,
  sectionId,
  sectionTitle,
  otherSections,
  onToast,
}: Props) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!instruction.trim()) return;
    setSubmitting(true);
    try {
      await messenger.sendRequest(PrdReviseSectionPrompt, HOST_EXTENSION, {
        prdId,
        sectionId,
        instruction: instruction.trim(),
      });
      onToast(
        'Prompt copied. Paste into your AI tool, then paste the result back into the section editor above.',
      );
      setOpen(false);
      setInstruction('');
    } catch (err) {
      console.error('ReviseSectionButton: reviseSectionPrompt failed', err);
      onToast('Failed to copy revision prompt.');
    } finally {
      setSubmitting(false);
    }
  };

  void otherSections;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Revise ${sectionTitle} with AI`}
        className="flex items-center gap-1.5 text-xs text-dos-muted hover:text-dos-accent transition-colors"
      >
        <Wand2 size={13} />
        Revise with AI
      </button>

      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Content className="mt-3 space-y-3 border border-vscode-border rounded-md p-4 bg-dos-surface">
          <p className="text-xs text-dos-muted">
            Describe what to change. The prompt will be copied to your clipboard — paste it
            into your AI tool, then paste the result back into the editor above.
          </p>
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={`e.g. "Tighten to 5 bullets, keep outcome-focused tone."`}
            rows={3}
            className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || !instruction.trim()}
              className="px-3 py-1.5 rounded-md bg-dos-accent text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {submitting ? 'Copying…' : 'Copy revision prompt'}
            </button>
            <button
              onClick={() => { setOpen(false); setInstruction(''); }}
              className="text-xs text-dos-muted hover:text-vscode-fg transition-colors"
            >
              Cancel
            </button>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}
