import { useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import type { ReleaseEvidence } from '@deliveryos/contracts';

const md = new MarkdownIt({ html: false, breaks: true, linkify: true });

interface ReleaseEvidencePreviewProps {
  evidence: ReleaseEvidence;
  onOpenDocument: () => void;
  onExportZip: () => void;
}

export function ReleaseEvidencePreview({
  evidence,
  onOpenDocument,
  onExportZip,
}: ReleaseEvidencePreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = md.render(evidence.markdown);
    }
  }, [evidence.markdown]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={onOpenDocument}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded font-semibold"
        >
          Open document
        </button>
        <button
          onClick={onExportZip}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded font-semibold"
        >
          Export package (zip)
        </button>
      </div>
      <div
        ref={contentRef}
        className="p-4 rounded border border-gray-600 bg-gray-800 prose prose-invert prose-sm max-w-none overflow-auto"
      />
    </div>
  );
}
