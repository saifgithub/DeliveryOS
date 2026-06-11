import { useEffect, useRef, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import {
  InterviewGeneratePrompt,
  InterviewParseResponse,
  InterviewSaveRound,
  InterviewMarkSufficient,
  DiscoverCopyPrompt,
} from '@deliveryos/contracts';
import type { InterviewRecord, InterviewQuestion } from '@deliveryos/contracts';
import type { InterviewParseResponseResult } from '@deliveryos/contracts';
import { ChevronDown, Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;
const LINE_PX = 20;
const MAX_ROWS = 80;

interface Props {
  interview: InterviewRecord | null;
  rawIdeaText: string;
}

function autosizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, MAX_ROWS * LINE_PX) + 'px';
}

export function InterviewTab({ interview, rawIdeaText }: Props) {
  // Prompt generation
  const [promptData, setPromptData] = useState<{ prompt: string; round: number; generatedAt: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copying, setCopying] = useState(false);

  // Response paste + parse
  const [rawPaste, setRawPaste] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<InterviewParseResponseResult | null>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  // Per-question user answers (mutable copy of questions for this round)
  const [draftQuestions, setDraftQuestions] = useState<InterviewQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  // Marking sufficient
  const [markingSufficient, setMarkingSufficient] = useState(false);

  // Auto-fire InterviewMarkSufficient when AI returns a verdict
  const verdictFiredRef = useRef(false);
  useEffect(() => {
    if (
      parseResult?.kind === 'sufficient' &&
      !verdictFiredRef.current &&
      interview?.status !== 'sufficient'
    ) {
      verdictFiredRef.current = true;
      messenger
        .sendRequest(InterviewMarkSufficient, HOST_EXTENSION, {
          source: 'ai',
          rationale: parseResult.rationale,
        })
        .catch((err: unknown) => console.error('InterviewTab: markSufficient(ai) failed', err));
    }
  }, [parseResult, interview?.status]);

  // When parseResult changes to questions, seed draftQuestions
  useEffect(() => {
    if (parseResult?.kind === 'questions') {
      setDraftQuestions(parseResult.questions.map((q) => ({ ...q })));
    }
  }, [parseResult]);

  const handleGenerate = async () => {
    setGenerating(true);
    setParseResult(null);
    setRawPaste('');
    setDraftQuestions([]);
    verdictFiredRef.current = false;
    try {
      const res = await messenger.sendRequest(InterviewGeneratePrompt, HOST_EXTENSION, {});
      setPromptData(res);
    } catch (err) {
      console.error('InterviewTab: generatePrompt failed', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!promptData) return;
    setCopying(true);
    try {
      await messenger.sendRequest(DiscoverCopyPrompt, HOST_EXTENSION, { prompt: promptData.prompt });
    } catch (err) {
      console.error('InterviewTab: copyPrompt failed', err);
    } finally {
      setCopying(false);
    }
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_BYTES) return;
    setRawPaste(val);
    setPasteError('');
    autosizeTextarea(e.target);
  };

  const handleParse = async () => {
    if (!rawPaste.trim()) {
      setPasteError('Paste the AI\'s response before parsing.');
      return;
    }
    setPasteError('');
    setParsing(true);
    try {
      const res = await messenger.sendRequest(InterviewParseResponse, HOST_EXTENSION, {
        rawPaste: rawPaste.trim(),
      });
      setParseResult(res);
    } catch (err) {
      console.error('InterviewTab: parseResponse failed', err);
    } finally {
      setParsing(false);
    }
  };

  const handleSaveRound = async () => {
    if (!draftQuestions.length) return;
    setSaving(true);
    try {
      await messenger.sendRequest(InterviewSaveRound, HOST_EXTENSION, {
        rawPaste: rawPaste.trim(),
        questions: draftQuestions,
      });
      // Reset for next round
      setParseResult(null);
      setRawPaste('');
      setDraftQuestions([]);
      setPromptData(null);
      verdictFiredRef.current = false;
    } catch (err) {
      console.error('InterviewTab: saveRound failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSufficientByUser = async () => {
    if (!window.confirm('Mark interview as sufficient and skip remaining questions?')) return;
    setMarkingSufficient(true);
    try {
      await messenger.sendRequest(InterviewMarkSufficient, HOST_EXTENSION, { source: 'user' });
    } catch (err) {
      console.error('InterviewTab: markSufficient(user) failed', err);
    } finally {
      setMarkingSufficient(false);
    }
  };

  const setDraftAnswer = (idx: number, answer: string) => {
    setDraftQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], userAnswer: answer };
      return next;
    });
  };

  const isSufficient = interview?.status === 'sufficient';
  const priorRounds = interview?.rounds ?? [];
  const generatedAtStr = promptData
    ? new Date(promptData.generatedAt).toLocaleString()
    : null;

  return (
    <section className="space-y-6">
      {/* Sufficiency banner */}
      {isSufficient && (
        <div className="rounded-md border border-dos-success bg-vscode-panel px-4 py-3 flex items-start gap-3">
          <CheckCircle2 size={16} className="text-dos-success mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-vscode-fg">Interview complete</p>
            <p className="text-xs text-dos-muted mt-0.5">
              {interview?.sufficiencySource === 'ai'
                ? 'The AI declared sufficient coverage.'
                : 'You marked the interview as sufficient.'}
              {' '}The Prompt tab (12-question analysis) is now unlocked.
            </p>
          </div>
        </div>
      )}

      {/* Prior rounds history (collapsed) */}
      {priorRounds.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-vscode-fg mb-2">
            Interview history{' '}
            <span className="text-dos-muted font-normal text-xs">
              ({priorRounds.length} {priorRounds.length === 1 ? 'round' : 'rounds'} completed)
            </span>
          </h2>
          <Accordion.Root type="multiple" className="space-y-1">
            {priorRounds.map((round) => (
              <Accordion.Item
                key={round.round}
                value={`round-${round.round}`}
                className="rounded-md border border-vscode-border bg-vscode-panel overflow-hidden"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3 text-sm text-left group">
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-dos-muted font-mono shrink-0">
                        Round {round.round}
                      </span>
                      <span className="text-dos-muted">
                        {round.questions.length} question{round.questions.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      className="text-dos-muted transition-transform group-data-[state=open]:rotate-180"
                    />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="px-4 pb-4 space-y-3">
                  {round.questions.map((q) => (
                    <div key={q.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dos-muted font-mono">{q.id}</span>
                        {q.topicRef && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-dos-surface border border-vscode-border text-dos-muted font-mono">
                            {q.topicRef}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-vscode-fg">{q.question}</p>
                      <p className="text-xs text-dos-muted italic">
                        {q.userAnswer ?? q.recommendedAnswer}
                      </p>
                    </div>
                  ))}
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      )}

      {/* Current round controls — hidden when sufficient */}
      {!isSufficient && (
        <>
          {/* Step 1: Generate prompt */}
          <div>
            <h2 className="text-base font-semibold text-vscode-fg mb-1">
              {priorRounds.length === 0 ? 'Start interview' : `Round ${priorRounds.length + 1}`}
            </h2>
            <p className="text-xs text-dos-muted mb-3">
              Generate an interview prompt for the AI, copy it to your AI tool,
              then paste the response back here.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={generating || !rawIdeaText}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                {generating
                  ? 'Generating…'
                  : promptData
                    ? 'Regenerate prompt'
                    : 'Generate interview prompt'}
              </button>

              {promptData && (
                <button
                  onClick={handleCopy}
                  disabled={copying}
                  className="flex items-center gap-2 px-4 py-2 rounded-md border border-vscode-border bg-dos-surface text-dos-ink text-sm font-medium disabled:opacity-50 hover:bg-vscode-panel transition-colors"
                >
                  <Copy size={14} />
                  {copying ? 'Copying…' : 'Copy to clipboard'}
                </button>
              )}
              {generatedAtStr && (
                <p className="text-xs text-dos-muted">Generated {generatedAtStr}</p>
              )}
            </div>

            {promptData && (
              <pre className="mt-3 whitespace-pre-wrap font-[var(--vscode-editor-font-family)] text-xs bg-vscode-panel border border-vscode-border rounded-md p-4 text-vscode-fg max-h-[20rem] overflow-y-auto">
                {promptData.prompt}
              </pre>
            )}
          </div>

          {/* Step 2: Paste + parse AI response */}
          {promptData && (
            <div>
              <h2 className="text-base font-semibold text-vscode-fg mb-1">Paste AI response</h2>
              <p className="text-xs text-dos-muted mb-2">
                Paste the AI's interview response here, then click "Parse".
              </p>
              <textarea
                ref={pasteRef}
                value={rawPaste}
                onChange={handlePasteChange}
                placeholder="Paste the AI's interview questions here…"
                style={{ minHeight: '6rem', overflowY: 'auto' }}
                className={[
                  'w-full rounded-md border bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-none font-[var(--vscode-editor-font-family)]',
                  pasteError ? 'border-red-400' : 'border-vscode-inputBorder',
                ].join(' ')}
              />
              {pasteError && <p className="mt-1 text-xs text-red-400">{pasteError}</p>}
              <div className="mt-2">
                <button
                  onClick={handleParse}
                  disabled={parsing}
                  className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-semibold disabled:opacity-50 hover:brightness-110 active:brightness-95 transition-all shadow-sm"
                >
                  {parsing ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Parsing…
                    </span>
                  ) : (
                    'Parse response'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3a: Verdict — sufficient */}
          {parseResult?.kind === 'sufficient' && (
            <div className="rounded-md border border-dos-success bg-vscode-panel px-4 py-3 flex items-start gap-3">
              <CheckCircle2 size={16} className="text-dos-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-vscode-fg">
                  AI declared sufficient coverage
                </p>
                <p className="text-xs text-dos-muted mt-1 whitespace-pre-wrap">
                  {parseResult.rationale}
                </p>
              </div>
            </div>
          )}

          {/* Step 3b: Questions to answer */}
          {parseResult?.kind === 'questions' && parseResult.questions.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-vscode-fg mb-2">
                Answer the questions{' '}
                <span className="text-dos-muted font-normal text-xs">
                  ({draftQuestions.filter((q) => q.userAnswer?.trim()).length}/
                  {draftQuestions.length} answered)
                </span>
              </h2>
              <Accordion.Root type="multiple" className="space-y-1">
                {draftQuestions.map((q, idx) => (
                  <Accordion.Item
                    key={q.id}
                    value={q.id}
                    className="rounded-md border border-vscode-border bg-vscode-panel overflow-hidden"
                  >
                    <Accordion.Header>
                      <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3 text-sm text-left group">
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-dos-muted font-mono w-8 shrink-0">
                            {q.id}
                          </span>
                          {q.topicRef && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-dos-surface border border-vscode-border text-dos-muted font-mono">
                              {q.topicRef}
                            </span>
                          )}
                          <span
                            className={
                              q.userAnswer?.trim()
                                ? 'text-vscode-fg'
                                : 'text-dos-muted'
                            }
                          >
                            {q.question.length > 60
                              ? q.question.slice(0, 60) + '…'
                              : q.question}
                          </span>
                          {q.userAnswer?.trim() && (
                            <span className="text-dos-success text-xs">✓</span>
                          )}
                        </span>
                        <ChevronDown
                          size={14}
                          className="text-dos-muted transition-transform group-data-[state=open]:rotate-180"
                        />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="px-4 pb-4 space-y-3">
                      <p className="text-sm text-vscode-fg">{q.question}</p>

                      {q.recommendedAnswer && (
                        <div className="rounded-md bg-dos-surface border border-vscode-border px-3 py-2 text-xs text-dos-muted">
                          <span className="font-medium text-vscode-fg">Recommended: </span>
                          {q.recommendedAnswer}
                        </div>
                      )}

                      <textarea
                        value={q.userAnswer ?? ''}
                        onChange={(e) => setDraftAnswer(idx, e.target.value)}
                        rows={3}
                        placeholder="Your answer…"
                        className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y"
                      />

                      {q.recommendedAnswer && (
                        <button
                          onClick={() => setDraftAnswer(idx, q.recommendedAnswer)}
                          className="text-xs text-dos-accent hover:underline"
                        >
                          Use recommended
                        </button>
                      )}
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>

              <div className="mt-4">
                <button
                  onClick={handleSaveRound}
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {saving ? 'Saving…' : 'Save round & continue'}
                </button>
              </div>
            </div>
          )}

          {/* Unmatched text warning */}
          {parseResult?.kind === 'questions' && parseResult.unmatchedText && (
            <div className="rounded-md border border-dos-warn bg-vscode-panel px-3 py-2 text-xs text-dos-muted">
              <span className="font-medium text-vscode-fg">Unmatched text: </span>
              {parseResult.unmatchedText}
            </div>
          )}

          {/* Escape hatch: skip interview */}
          <div className="pt-2 border-t border-vscode-border">
            <button
              onClick={handleMarkSufficientByUser}
              disabled={markingSufficient}
              className="text-xs text-dos-muted hover:text-vscode-fg disabled:opacity-50 underline underline-offset-2"
            >
              {markingSufficient ? 'Marking…' : 'Mark sufficient & skip interview'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
