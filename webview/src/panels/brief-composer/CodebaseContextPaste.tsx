import { useEffect, useRef, useState } from 'react';

interface CodebaseContextPasteProps {
  readonly body: string;
  readonly readOnly: boolean;
  readonly onChange: (body: string) => void;
}

/**
 * Section 5 — Existing Codebase Context. Pasted in MVP per spec § 11.2.
 * Marked as a TODO seam for the future codebaseExtractor module.
 */
export function CodebaseContextPaste({ body, readOnly, onChange }: CodebaseContextPasteProps) {
  const [draft, setDraft] = useState(body);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(body);
  }, [body]);

  const handleChange = (next: string) => {
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 250);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-dos-accent">5. Existing Codebase Context</h3>
      <p className="text-xs text-dos-muted">
        Paste folder structure, conventions, test commands. Future: DeliveryOS will auto-extract
        this from Codebase Memory.
      </p>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        rows={Math.max(6, Math.min(20, draft.split('\n').length + 1))}
        placeholder={
          'src/\n  backend/\n    api/\n      bugs.py        # FastAPI router for bug submission\n  frontend/\n    components/\n\nTest commands:\n- pytest tests/integration -q'
        }
        className="w-full text-sm font-mono p-3 rounded border border-vscode-border bg-vscode-bg text-vscode-fg focus:outline-none focus:ring-1 focus:ring-dos-accent disabled:opacity-60"
      />
    </div>
  );
}
