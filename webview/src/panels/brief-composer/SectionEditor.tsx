import { useEffect, useRef, useState } from 'react';
import type { BriefSectionId, ExecutionBriefDraft } from '@deliveryos/contracts';

type Section = ExecutionBriefDraft['sections'][BriefSectionId];

interface SectionEditorProps {
  readonly section: Section;
  readonly readOnly: boolean;
  readonly onChange: (body: string) => void;
}

/**
 * Generic markdown textarea for sections 1, 2, 3, 4, 6, 9, 10. Section 9 is
 * read-only (template) and renders here as a pre-formatted block. Debounces
 * onChange by 200ms so we don't fire host messages on every keystroke.
 */
export function SectionEditor({ section, readOnly, onChange }: SectionEditorProps) {
  const [draftBody, setDraftBody] = useState(section.body);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExpectedOutput = section.id === 'expected-output';
  const effectiveReadOnly = readOnly || section.readOnly;

  // Sync local draft when the section body changes from outside (host push,
  // bootstrap, or initial load).
  useEffect(() => {
    setDraftBody(section.body);
  }, [section.body]);

  const handleChange = (next: string) => {
    setDraftBody(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 200);
  };

  const heading = `${section.number}. ${section.name}`;

  if (isExpectedOutput) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-dos-accent">{heading}</h3>
        <p className="text-xs text-dos-muted">
          Read-only — required `result.md` section names that CHUNK-12 will parse.
        </p>
        <pre className="text-xs font-mono whitespace-pre-wrap p-3 rounded bg-vscode-bg border border-vscode-border text-dos-ink">
          {section.body}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-dos-accent">{heading}</h3>
      <textarea
        value={draftBody}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={effectiveReadOnly}
        spellCheck={false}
        rows={Math.max(4, Math.min(20, draftBody.split('\n').length + 1))}
        className="w-full text-sm font-mono p-3 rounded border border-vscode-border bg-vscode-bg text-vscode-fg focus:outline-none focus:ring-1 focus:ring-dos-accent disabled:opacity-60"
        placeholder={`Markdown body for "${section.name}"…`}
      />
    </div>
  );
}
