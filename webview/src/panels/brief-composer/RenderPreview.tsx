import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import type { RenderedBriefWire } from '@deliveryos/contracts';

const md = new MarkdownIt({ html: false, linkify: true, breaks: false });

export interface RenderPreviewProps {
  readonly rendered: RenderedBriefWire | null;
  readonly loading: boolean;
  readonly error: string | null;
}

export function RenderPreview({ rendered, loading, error }: RenderPreviewProps) {
  const html = useMemo(() => (rendered ? md.render(rendered.markdown) : ''), [rendered]);

  if (error) {
    return (
      <p className="text-xs text-red-400">Render failed: {error}</p>
    );
  }
  if (loading || !rendered) {
    return <p className="text-xs text-dos-muted">Rendering preview…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-dos-muted">
        <span>
          Rendered for{' '}
          <span className="font-mono text-vscode-fg">{rendered.profileName}</span>
        </span>
        <span>{new Date(rendered.renderedAt).toLocaleTimeString()}</span>
      </div>
      <div
        className="prose prose-invert prose-sm max-w-none p-3 rounded bg-vscode-bg border border-vscode-border text-dos-ink"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
