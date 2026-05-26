import type { DiffOutcome } from '@deliveryos/contracts';

interface DiffSummaryPaneProps {
  diff: DiffOutcome | null;
  onOverrideChange: (override: boolean) => void;
  diffOverride: boolean;
}

export function DiffSummaryPane({ diff, onOverrideChange, diffOverride }: DiffSummaryPaneProps) {
  if (!diff) {
    return (
      <div className="p-4 rounded border border-gray-600 bg-gray-800">
        <h3 className="font-semibold text-gray-300 mb-2">Diff Outcome</h3>
        <p className="text-gray-400 text-sm">No diff outcome computed yet.</p>
      </div>
    );
  }

  const verdictColor = diff.verdict === 'pass' ? 'text-green-400' : 'text-red-400';
  const forbiddenTouched = diff.files.filter((f) => f.classification === 'forbidden-but-touched');

  return (
    <div className="p-4 rounded border border-gray-600 bg-gray-800">
      <h3 className="font-semibold text-gray-300 mb-2">Diff Outcome</h3>
      <p className={`font-bold text-lg ${verdictColor}`}>
        {diff.verdict.toUpperCase()}
      </p>
      {forbiddenTouched.length > 0 && (
        <div className="mt-2">
          <p className="text-red-400 text-sm font-semibold">Forbidden files touched:</p>
          <ul className="list-disc pl-4 text-sm text-red-300">
            {forbiddenTouched.map((f) => (
              <li key={f.path}>{f.path}</li>
            ))}
          </ul>
        </div>
      )}
      {diff.verdict === 'fail' && (
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm text-yellow-300 cursor-pointer">
            <input
              type="checkbox"
              checked={diffOverride}
              onChange={(e) => onOverrideChange(e.target.checked)}
              className="accent-yellow-400"
            />
            Override diff verdict (will be recorded in release evidence)
          </label>
        </div>
      )}
    </div>
  );
}
