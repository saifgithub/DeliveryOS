import { useRef, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { HOST_EXTENSION } from 'vscode-messenger-common';
import { DiscoverParseAnswers, DiscoverSaveAnswers } from '@deliveryos/contracts';
import type { DiscoveryQuestion, DiscoveryRecord } from '@deliveryos/contracts';
import type { DiscoveryAnswer } from '@deliveryos/contracts';
import { ChevronDown } from 'lucide-react';
import { messenger } from '../../shared/messenger';

const MAX_BYTES = 2_000_000;
const LARGE_THRESHOLD = 50_000;
const LINE_PX = 20;
const MAX_ROWS = 80;

interface Props {
  questions: readonly DiscoveryQuestion[];
  existingDiscovery: DiscoveryRecord | null;
  onSaved: (discovery: DiscoveryRecord) => void;
}

type CardAnswers = { question: string; answer: string }[];

function initCards(
  questions: readonly DiscoveryQuestion[],
  existing: DiscoveryRecord | null,
): CardAnswers {
  return questions.map((q) => {
    const found = existing?.answers.find((a) => a.question === q.prompt);
    return { question: q.prompt, answer: found?.answer ?? '' };
  });
}

function autosizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, MAX_ROWS * LINE_PX) + 'px';
}

export function DiscoveryAnswersInput({ questions, existingDiscovery, onSaved }: Props) {
  const [rawPaste, setRawPaste] = useState('');
  const [cards, setCards] = useState<CardAnswers>(() => initCards(questions, existingDiscovery));
  const [unmatchedText, setUnmatchedText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_BYTES) return;
    setRawPaste(val);
    autosizeTextarea(e.target);
  };

  const handleParse = async () => {
    if (!rawPaste.trim()) return;
    setParsing(true);
    try {
      const res = await messenger.sendRequest(DiscoverParseAnswers, HOST_EXTENSION, {
        rawPaste: rawPaste.trim(),
      });
      setUnmatchedText(res.unmatchedText);
      setCards((prev) => {
        const next = [...prev];
        // Parser returns answers in question order — match by text then fall back to position
        res.answers.forEach((parsed: DiscoveryAnswer, idx: number) => {
          const cardIdx = next.findIndex((c) => c.question === parsed.question);
          if (cardIdx !== -1) {
            next[cardIdx] = { ...next[cardIdx], answer: parsed.answer };
          } else if (idx < next.length) {
            next[idx] = { ...next[idx], answer: parsed.answer };
          }
        });
        return next;
      });
    } catch (err) {
      console.error('DiscoveryAnswersInput: parseAnswers failed', err);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    const answers = cards.filter((c) => c.answer.trim());
    if (!answers.length) return;
    setSaving(true);
    try {
      const res = await messenger.sendRequest(DiscoverSaveAnswers, HOST_EXTENSION, {
        rawAnswersPaste: rawPaste,
        answers,
        unmatchedText,
      });
      onSaved(res.discovery);
    } catch (err) {
      console.error('DiscoveryAnswersInput: saveAnswers failed', err);
    } finally {
      setSaving(false);
    }
  };

  const answeredCount = cards.filter((c) => c.answer.trim()).length;
  const pasteIsLarge = rawPaste.length > LARGE_THRESHOLD;

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">Paste AI response</h2>
        <p className="text-xs text-dos-muted mb-2">
          Copy the AI's answers from your tool and paste them here. Click "Parse" to pre-fill the
          question cards below.
        </p>
        {pasteIsLarge && (
          <p className="text-xs text-dos-muted mb-1">
            Body is large ({(rawPaste.length / 1024).toFixed(0)} KB).
          </p>
        )}
        <textarea
          ref={pasteTextareaRef}
          value={rawPaste}
          onChange={handlePasteChange}
          placeholder="Paste the AI's discovery interview response here…"
          style={{ minHeight: '6rem', overflowY: 'auto' }}
          className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-none font-[var(--vscode-editor-font-family)]"
        />
        <button
          onClick={handleParse}
          disabled={parsing || !rawPaste.trim()}
          className="mt-2 px-4 py-2 rounded-md border border-vscode-border bg-dos-surface text-dos-ink text-sm font-medium disabled:opacity-50 hover:bg-vscode-panel transition-colors"
        >
          {parsing ? 'Parsing…' : 'Parse answers'}
        </button>
      </div>

      {unmatchedText && (
        <div className="rounded-md border border-dos-warn bg-vscode-panel px-3 py-2 text-xs text-dos-muted">
          <span className="font-medium text-vscode-fg">Unmatched text: </span>
          {unmatchedText}
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-vscode-fg mb-1">
          Questions{' '}
          <span className="text-dos-muted font-normal text-xs">
            ({answeredCount}/{questions.length} answered)
          </span>
        </h2>
        <Accordion.Root type="multiple" className="space-y-1">
          {questions.map((q, idx) => (
            <Accordion.Item
              key={q.id}
              value={q.id}
              className="rounded-md border border-vscode-border bg-vscode-panel overflow-hidden"
            >
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3 text-sm text-left group">
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-dos-muted font-mono w-6 shrink-0">{q.id}</span>
                    <span
                      className={
                        cards[idx]?.answer.trim()
                          ? 'text-vscode-fg'
                          : 'text-dos-muted'
                      }
                    >
                      {q.topic}
                    </span>
                    {cards[idx]?.answer.trim() && (
                      <span className="text-dos-success text-xs">✓</span>
                    )}
                  </span>
                  <ChevronDown
                    size={14}
                    className="text-dos-muted transition-transform group-data-[state=open]:rotate-180"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-4 pb-4">
                <p className="text-sm text-vscode-fg mb-1">{q.prompt}</p>
                {q.helperText && (
                  <p className="text-xs text-dos-muted mb-2">{q.helperText}</p>
                )}
                <textarea
                  value={cards[idx]?.answer ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCards((prev) => {
                      const next = [...prev];
                      next[idx] = { ...next[idx], answer: val };
                      return next;
                    });
                  }}
                  rows={4}
                  placeholder="Answer…"
                  className="w-full rounded-md border border-vscode-inputBorder bg-vscode-inputBg text-vscode-inputFg px-3 py-2 text-sm outline-none focus:border-vscode-focusBorder resize-y"
                />
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || answeredCount === 0}
        className="px-4 py-2 rounded-md bg-dos-accent text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {saving ? 'Saving…' : `Save answers (${answeredCount}/${questions.length})`}
      </button>
    </section>
  );
}
