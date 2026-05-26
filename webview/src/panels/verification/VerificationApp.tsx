import { useState, useEffect } from 'react';
import type { MemoryEntry, DiffOutcome, Defect, ReleaseEvidence, TestSpecPayload } from '@deliveryos/contracts';
import { DiffSummaryPane } from './DiffSummaryPane';
import { ApproveButton } from './ApproveButton';
import { MemoryUpdateForm } from './MemoryUpdateForm';
import { ReleaseEvidencePreview } from './ReleaseEvidencePreview';

type Step = 'verify' | 'memoryUpdate' | 'releaseEvidence';

interface LoadedPayload {
  testSpec: MemoryEntry;
  result: MemoryEntry;
  diff: DiffOutcome | null;
}

// Simple VSCode webview API shim.
declare function acquireVsCodeApi(): {
  postMessage: (msg: unknown) => void;
};
const vscode = acquireVsCodeApi();

let requestId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>();

function request(method: string, params: unknown): Promise<unknown> {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    vscode.postMessage({ id, method, params });
  });
}

window.addEventListener('message', (event: MessageEvent<{ id?: number; method?: string; params?: unknown; result?: unknown; error?: { message: string } }>) => {
  const msg = event.data;
  if (msg.id !== undefined) {
    const handler = pending.get(msg.id);
    if (handler) {
      pending.delete(msg.id);
      if (msg.error) handler.reject(new Error(msg.error.message));
      else handler.resolve(msg.result);
    }
    return;
  }
  // Notifications (no id).
  if (msg.method) {
    window.dispatchEvent(new CustomEvent(`dos:${msg.method}`, { detail: msg.params }));
  }
});

export function VerificationApp() {
  const [step, setStep] = useState<Step>('verify');
  const [loaded, setLoaded] = useState<LoadedPayload | null>(null);
  const [verificationId, setVerificationId] = useState<string>('');
  const [evidence, setEvidence] = useState<ReleaseEvidence | null>(null);
  const [diffOverride, setDiffOverride] = useState(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<LoadedPayload>;
      setLoaded(custom.detail);
    };
    window.addEventListener('dos:verification.loaded', handler);
    return () => window.removeEventListener('dos:verification.loaded', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ evidence: ReleaseEvidence }>;
      setEvidence(custom.detail.evidence);
    };
    window.addEventListener('dos:release.preview', handler);
    return () => window.removeEventListener('dos:release.preview', handler);
  }, []);

  const handleApprove = async (params: { diffOverride: boolean; failedCriteria?: string[]; defects?: Defect[] }) => {
    setLoading(true);
    setError('');
    try {
      const result = await request('verification.approve', params) as { verificationId: string };
      setVerificationId(result.verificationId);
      setStep('memoryUpdate');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (params: { failedCriteria: string[]; defects: Defect[]; diffOverride: boolean }) => {
    setLoading(true);
    setError('');
    try {
      const result = await request('verification.reject', params) as { verificationId: string };
      setVerificationId(result.verificationId);
      setStep('memoryUpdate');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRework = async (params: { reworkNotes: string }) => {
    setLoading(true);
    setError('');
    try {
      await request('verification.requestRework', params);
      setError('Rework requested. The verification flow is complete for this cycle.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMemorySubmit = async (form: {
    designUpdate: string;
    codebaseUpdate: string;
    requirementAssumptionUpdate: string;
  }) => {
    setLoading(true);
    setError('');
    try {
      await request('memory.applyUpdate', { verificationId, form });
      await exportEvidence();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = async (justification: string) => {
    setLoading(true);
    setError('');
    try {
      await request('verification.recordBypass', { verificationId, justification });
      await exportEvidence();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const exportEvidence = async () => {
    const result = await request('release.export', { verificationId }) as ReleaseEvidence;
    setEvidence(result);
    setStep('releaseEvidence');
  };

  const handleOpenDocument = () => {
    if (evidence) {
      vscode.postMessage({
        method: 'release.openDocument',
        params: { releaseId: evidence.releaseId },
      });
    }
  };

  const handleExportZip = async () => {
    if (!evidence) return;
    setLoading(true);
    try {
      await request('release.zipPackage', { releaseId: evidence.releaseId });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const availableCriteria = loaded
    ? ((loaded.testSpec.payload as unknown as TestSpecPayload).scenarios?.map((s) => s.description) ?? [])
    : [];

  if (!loaded) {
    return (
      <div className="p-6 text-gray-300">
        <p>Loading verification data…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-gray-100 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Verification</h1>

      {error && (
        <div className="p-3 rounded border border-red-600 bg-red-900/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="p-3 rounded bg-gray-700 text-gray-300 text-sm">Processing…</div>
      )}

      {step === 'verify' && (
        <div className="space-y-6">
          {/* Test Spec */}
          <div className="p-4 rounded border border-gray-600 bg-gray-800">
            <h3 className="font-semibold text-gray-300 mb-2">
              Test Spec — {loaded.testSpec.title}
            </h3>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-48">
              {loaded.testSpec.body || '(no body)'}
            </pre>
          </div>

          {/* Result Summary */}
          <div className="p-4 rounded border border-gray-600 bg-gray-800">
            <h3 className="font-semibold text-gray-300 mb-2">
              Result — {loaded.result.title}
            </h3>
            <p className="text-sm text-gray-300">
              {(loaded.result.payload as { summary?: string }).summary ?? '(no summary)'}
            </p>
          </div>

          {/* Diff Outcome */}
          <DiffSummaryPane
            diff={loaded.diff}
            onOverrideChange={setDiffOverride}
            diffOverride={diffOverride}
          />

          {/* Approve/Reject/Rework */}
          <ApproveButton
            availableCriteria={availableCriteria}
            onApprove={handleApprove}
            onReject={handleReject}
            onRequestRework={handleRework}
            diffOverride={diffOverride}
          />
        </div>
      )}

      {step === 'memoryUpdate' && (
        <MemoryUpdateForm onSubmit={handleMemorySubmit} onBypass={handleBypass} />
      )}

      {step === 'releaseEvidence' && evidence && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Release Evidence</h2>
          <ReleaseEvidencePreview
            evidence={evidence}
            onOpenDocument={handleOpenDocument}
            onExportZip={handleExportZip}
          />
        </div>
      )}
    </div>
  );
}
