import { useState } from 'react';
import type { Defect } from '@deliveryos/contracts';

interface ApproveButtonProps {
  availableCriteria: string[];
  onApprove: (params: { diffOverride: boolean; failedCriteria?: string[]; defects?: Defect[] }) => void;
  onReject: (params: { failedCriteria: string[]; defects: Defect[]; diffOverride: boolean }) => void;
  onRequestRework: (params: { reworkNotes: string }) => void;
  diffOverride: boolean;
}

export function ApproveButton({
  availableCriteria,
  onApprove,
  onReject,
  onRequestRework,
  diffOverride,
}: ApproveButtonProps) {
  const [mode, setMode] = useState<'idle' | 'reject' | 'rework'>('idle');
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [defectText, setDefectText] = useState('');
  const [reworkNotes, setReworkNotes] = useState('');

  const toggleCriteria = (c: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleRejectSubmit = () => {
    const defects: Defect[] = defectText
      .split('\n')
      .map((line, i) => ({ id: `D${i + 1}`, summary: line.trim() }))
      .filter((d) => d.summary.length > 0);
    onReject({ failedCriteria: selectedCriteria, defects, diffOverride });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={() => onApprove({ diffOverride })}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded font-semibold"
        >
          ✓ Approve
        </button>
        <button
          onClick={() => setMode(mode === 'reject' ? 'idle' : 'reject')}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-semibold"
        >
          ✗ Reject
        </button>
        <button
          onClick={() => setMode(mode === 'rework' ? 'idle' : 'rework')}
          className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded font-semibold"
        >
          ↩ Request Rework
        </button>
      </div>

      {mode === 'reject' && (
        <div className="p-4 rounded border border-red-700 bg-gray-800 space-y-3">
          <h4 className="font-semibold text-red-300">Reject — select failed criteria</h4>
          {availableCriteria.length > 0 ? (
            <div className="space-y-1">
              {availableCriteria.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCriteria.includes(c)}
                    onChange={() => toggleCriteria(c)}
                    className="accent-red-400"
                  />
                  {c}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No criteria defined in test spec.</p>
          )}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Defects (one per line)</label>
            <textarea
              value={defectText}
              onChange={(e) => setDefectText(e.target.value)}
              rows={3}
              className="w-full bg-gray-700 text-gray-100 rounded px-3 py-2 text-sm border border-gray-600"
              placeholder="Describe each defect on its own line…"
            />
          </div>
          <button
            onClick={handleRejectSubmit}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-semibold text-sm"
          >
            Confirm Reject
          </button>
        </div>
      )}

      {mode === 'rework' && (
        <div className="p-4 rounded border border-yellow-700 bg-gray-800 space-y-3">
          <h4 className="font-semibold text-yellow-300">Request Rework</h4>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Rework notes (markdown)</label>
            <textarea
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              rows={4}
              className="w-full bg-gray-700 text-gray-100 rounded px-3 py-2 text-sm border border-gray-600"
              placeholder="Describe what needs to be reworked…"
            />
          </div>
          <button
            onClick={() => onRequestRework({ reworkNotes })}
            className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded font-semibold text-sm"
          >
            Submit Rework Request
          </button>
        </div>
      )}
    </div>
  );
}
