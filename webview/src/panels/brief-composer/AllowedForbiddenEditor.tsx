import { useEffect, useRef, useState } from 'react';

interface AllowedForbiddenEditorProps {
  readonly allowed: readonly string[];
  readonly forbidden: readonly string[];
  readonly readOnly: boolean;
  readonly onChange: (list: 'allowed' | 'forbidden', globs: readonly string[]) => void;
}

/**
 * Two textareas side-by-side. One glob per non-blank line. Comments (lines
 * starting with `#`) and blank lines are stripped before emitting. Debounce
 * 250ms so we don't fire a host message on every keystroke; the host
 * normalises trailing-slash directory shorthand to dir/** on receipt.
 */
export function AllowedForbiddenEditor({
  allowed,
  forbidden,
  readOnly,
  onChange,
}: AllowedForbiddenEditorProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-dos-accent">7. Allowed Changes & 8. Forbidden Changes</h3>
      <p className="text-xs text-dos-muted">
        One glob per line. Comments start with <code>#</code>. Trailing slash on directories is
        auto-expanded to <code>dir/**</code>. Allowed must contain at least one glob.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ListPane
          label="Allowed"
          globs={allowed}
          placeholder={'- src/api/endpoint.ts\n- tests/integration/endpoint.test.ts'}
          readOnly={readOnly}
          onChange={(globs) => onChange('allowed', globs)}
        />
        <ListPane
          label="Forbidden"
          globs={forbidden}
          placeholder={'- migrations/**\n- src/frontend/**'}
          readOnly={readOnly}
          onChange={(globs) => onChange('forbidden', globs)}
        />
      </div>
    </div>
  );
}

interface ListPaneProps {
  readonly label: 'Allowed' | 'Forbidden';
  readonly globs: readonly string[];
  readonly placeholder: string;
  readonly readOnly: boolean;
  readonly onChange: (globs: readonly string[]) => void;
}

function ListPane({ label, globs, placeholder, readOnly, onChange }: ListPaneProps) {
  const [text, setText] = useState(globs.join('\n'));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(globs.join('\n'));
  }, [globs]);

  const handleChange = (next: string) => {
    setText(next);
    const parsed = parseGlobLines(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(parsed), 250);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-vscode-fg">{label}</label>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        rows={8}
        placeholder={placeholder}
        className="w-full text-xs font-mono p-3 rounded border border-vscode-border bg-vscode-bg text-vscode-fg focus:outline-none focus:ring-1 focus:ring-dos-accent disabled:opacity-60"
      />
    </div>
  );
}

function parseGlobLines(raw: string): readonly string[] {
  const out: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    // Drop leading bullet markers if the user typed them.
    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    out.push((bullet ? bullet[1] : trimmed).trim());
  }
  return out;
}
