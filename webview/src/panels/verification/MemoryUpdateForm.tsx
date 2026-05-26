import { useState } from 'react';

interface MemoryUpdateFormProps {
  onSubmit: (form: {
    designUpdate: string;
    codebaseUpdate: string;
    requirementAssumptionUpdate: string;
  }) => void;
  onBypass: (justification: string) => void;
}

const MIN_BYPASS_LEN = 10;

export function MemoryUpdateForm({ onSubmit, onBypass }: MemoryUpdateFormProps) {
  const [design, setDesign] = useState('');
  const [codebase, setCodebase] = useState('');
  const [requirement, setRequirement] = useState('');
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [bypassError, setBypassError] = useState('');

  const handleSubmit = () => {
    onSubmit({
      designUpdate: design,
      codebaseUpdate: codebase,
      requirementAssumptionUpdate: requirement,
    });
  };

  const handleBypass = () => {
    if (justification.length < MIN_BYPASS_LEN) {
      setBypassError(`Justification must be at least ${MIN_BYPASS_LEN} characters.`);
      return;
    }
    setBypassError('');
    onBypass(justification);
    setShowBypassModal(false);
  };

  return (
    <div className="p-4 rounded border border-blue-700 bg-gray-800 space-y-4">
      <h3 className="font-semibold text-blue-300 text-lg">
        Memory Update (mandatory before Release Evidence)
      </h3>
      <p className="text-gray-400 text-sm">
        Review any updates worth preserving in memory. Empty fields are recorded as "nothing to add".
      </p>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Did the harness make any design decisions worth preserving?
        </label>
        <textarea
          value={design}
          onChange={(e) => setDesign(e.target.value)}
          rows={3}
          className="w-full bg-gray-700 text-gray-100 rounded px-3 py-2 text-sm border border-gray-600"
          placeholder="Markdown — appends to Design Memory…"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Are there new files / conventions to record in Codebase?
        </label>
        <textarea
          value={codebase}
          onChange={(e) => setCodebase(e.target.value)}
          rows={3}
          className="w-full bg-gray-700 text-gray-100 rounded px-3 py-2 text-sm border border-gray-600"
          placeholder="Markdown — appends to Codebase Memory…"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">
          Did any requirement assumption change?
        </label>
        <textarea
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          rows={3}
          className="w-full bg-gray-700 text-gray-100 rounded px-3 py-2 text-sm border border-gray-600"
          placeholder="Markdown — appends to Requirement Memory…"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded font-semibold"
        >
          Save & continue
        </button>
        <button
          onClick={() => setShowBypassModal(true)}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-semibold"
        >
          Skip — record bypass
        </button>
      </div>

      {showBypassModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-yellow-600 rounded p-6 w-96 space-y-4">
            <h4 className="font-semibold text-yellow-300">Record Bypass</h4>
            <p className="text-gray-300 text-sm">
              Provide a justification for skipping the Memory Update step.
              This will be visible in Release Evidence.
            </p>
            <textarea
              value={justification}
              onChange={(e) => {
                setJustification(e.target.value);
                setBypassError('');
              }}
              rows={3}
              className="w-full bg-gray-700 text-gray-100 rounded px-3 py-2 text-sm border border-gray-600"
              placeholder="Min 10 characters required…"
            />
            {bypassError && (
              <p className="text-red-400 text-sm">{bypassError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleBypass}
                className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded font-semibold text-sm"
              >
                Confirm bypass
              </button>
              <button
                onClick={() => {
                  setShowBypassModal(false);
                  setJustification('');
                  setBypassError('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
