import { useState } from 'react';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  TestDesignerCommit,
  TestDesignerPasteResult,
  type RequirementSummary,
  type TestDesignerParseResult,
  type TestSpecConfidence,
} from '@deliveryos/contracts';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;
const LARGE_THRESHOLD = 50_000;

interface Props {
  readonly requirement: RequirementSummary;
  readonly hasExistingTestSpec: boolean;
  readonly onCommitted: (summary: {
    readonly testSpecId: string;
    readonly verificationCriteriaCount: number;
    readonly caseCount: number;
  }) => void;
  readonly showToast: (msg: string) => void;
}

export function PasteResultInput(props: Props) {
  const { requirement, hasExistingTestSpec, onCommitted, showToast } = props;

  const [paste, setPaste] = useState('');
  const [parse, setParse] = useState<TestDesignerParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLarge = paste.length > LARGE_THRESHOLD;

  const handleParse = async () => {
    if (!paste.trim()) return;
    setParsing(true);
    try {
      const res = await messenger.sendRequest(TestDesignerPasteResult, HOST_EXTENSION, {
        requirementEntryId: requirement.entryId,
        raw: paste,
      });
      if (res.ok) {
        setParse(res.parse);
      } else {
        showToast('Parse failed.');
      }
    } catch (err) {
      console.error('PasteResultInput: parse failed', err);
      showToast('Parse failed — check console.');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!paste.trim() || !parse) return;
    if (hasExistingTestSpec) {
      const ok = window.confirm(
        `An existing test spec for ${requirement.id} will be overwritten. Continue?`,
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const res = await messenger.sendRequest(TestDesignerCommit, HOST_EXTENSION, {
        requirementEntryId: requirement.entryId,
        raw: paste,
      });
      if (res.ok) {
        onCommitted({
          testSpecId: res.testSpecId,
          verificationCriteriaCount: res.verificationCriteriaCount,
          caseCount: res.caseCount,
        });
        // Reset so a follow-up edit starts fresh; the parent panel stays open
        // so the user can verify the catalogue refreshed.
        setParse(null);
        setPaste('');
      } else {
        showToast(`Could not save: ${res.reason}.`);
      }
    } catch (err) {
      console.error('PasteResultInput: commit failed', err);
      showToast('Save failed — check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-3xl space-y-4">
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-vscode-fg">Paste the AI response</h2>
        <p className="text-sm text-dos-muted">
          Paste the markdown the AI returned. DeliveryOS expects two level-2 headings:{' '}
          <code>## Verification Criteria</code> and <code>## Test Specification</code>.
        </p>
        {isLarge && (
          <p className="text-xs text-dos-muted">
            Large paste ({(paste.length / 1024).toFixed(0)} KB).
          </p>
        )}
        <textarea
          value={paste}
          onChange={(e) => {
            if (e.target.value.length > MAX_BYTES) return;
            setPaste(e.target.value);
            setParse(null);
          }}
          placeholder="Paste the AI's response here…"
          style={{ minHeight: '18rem' }}
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y font-mono"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleParse}
            disabled={parsing || !paste.trim()}
            className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {parsing ? 'Parsing…' : 'Parse'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !parse || (parse.confidence === 'raw' && parse.cases.length === 0)}
            className="px-4 py-2 rounded-md border border-dos-accent text-dos-accent text-sm font-medium hover:bg-dos-surface disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {parse && (
        <article className="space-y-3 border border-vscode-border rounded-md p-4 bg-dos-surface">
          <ConfidenceBanner confidence={parse.confidence} />

          {parse.warnings.length > 0 && (
            <details className="text-xs text-dos-muted">
              <summary>
                Parser warnings ({parse.warnings.length})
              </summary>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {parse.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}

          {parse.verificationCriteria.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wide text-dos-muted mb-2">
                Verification Criteria · {parse.verificationCriteria.length}
              </h3>
              <ul className="list-disc pl-4 text-sm space-y-1">
                {parse.verificationCriteria.map((vc) => (
                  <li key={vc.id}>
                    <span className="font-mono text-xs text-dos-muted mr-2">{vc.id}</span>
                    {vc.text}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {parse.cases.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wide text-dos-muted mb-2">
                Test Cases · {parse.cases.length}
              </h3>
              <ul className="space-y-2 text-sm">
                {parse.cases.map((c) => (
                  <li key={c.id} className="border border-vscode-border rounded-sm p-2 bg-vscode-bg">
                    <div className="font-mono text-xs text-dos-muted">{c.id}</div>
                    <div className="font-medium">{c.title}</div>
                    {c.bullets.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 text-xs text-dos-muted space-y-0.5">
                        {c.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {parse.openQuestions.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wide text-dos-muted mb-2">
                Open Questions · {parse.openQuestions.length}
              </h3>
              <ul className="list-disc pl-4 text-sm space-y-1 text-amber-300">
                {parse.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )}
    </section>
  );
}

function ConfidenceBanner({ confidence }: { readonly confidence: TestSpecConfidence }) {
  const styles =
    confidence === 'high'
      ? { tint: 'bg-emerald-900/40 text-emerald-200 border-emerald-700/40', label: 'high confidence' }
      : confidence === 'low'
        ? { tint: 'bg-amber-900/40 text-amber-200 border-amber-700/40', label: 'low confidence' }
        : { tint: 'bg-red-900/40 text-red-200 border-red-700/40', label: 'raw — neither section found' };

  return (
    <div
      className={`text-xs rounded-md px-3 py-2 border ${styles.tint}`}
      role="status"
      aria-live="polite"
    >
      Parse result: <strong className="uppercase tracking-wide">{styles.label}</strong>.
      {confidence === 'low' && ' One of the two required headings is missing — review then save.'}
      {confidence === 'raw' && ' Save is disabled until at least one section parses.'}
    </div>
  );
}
