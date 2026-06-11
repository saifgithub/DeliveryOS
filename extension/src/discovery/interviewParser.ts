import type { InterviewQuestion } from '@deliveryos/contracts';

// --- Types -----------------------------------------------------------------

export interface InterviewSufficientResult {
  readonly kind: 'sufficient';
  readonly rationale: string;
}

export interface InterviewQuestionsResult {
  readonly kind: 'questions';
  readonly questions: readonly InterviewQuestion[];
  readonly unmatchedText: string;
}

export type ParseInterviewResult = InterviewSufficientResult | InterviewQuestionsResult;

// --- Marker patterns (mirror answersParser's 3-pattern robustness) ----------
// Each pattern captures: [0]=fullMatch, [1]=N from I<N>, [2]=inline question text (may be empty)

interface IMarker {
  readonly index: number;
  readonly end: number;       // start of block content (after the heading line)
  readonly questionNumber: number;
  readonly inlineText: string; // question text captured on the same heading line
}

// Pattern group 1 = question number, group 2 = rest of heading line (question text)
const MARKER_PATTERNS: ReadonlyArray<{ re: RegExp; questionTextGroup: number }> = [
  { re: /^###\s+I(\d+)\.?\s*([^\n]*)(?:\n|$)/gm, questionTextGroup: 2 },   // ### I<N>. question text
  { re: /^\*\*I(\d+)\.?\*\*\s*([^\n]*)(?:\n|$)/gm, questionTextGroup: 2 }, // **I<N>.** question text
  { re: /^I(\d+)\.\s*([^\n]*)(?:\n|$)/gm, questionTextGroup: 2 },           // I<N>. question text
];

// --- Verdict detection (tolerant, case-insensitive) -------------------------

const SUFFICIENT_RE = /(?:###\s*)?VERDICT\s*:\s*SUFFICIENT/i;

// --- Public API ------------------------------------------------------------

/**
 * Parse an AI interview response.
 *
 * @param rawPaste  The raw text pasted from the AI.
 * @param _nextQuestionNumber  The global question counter start (reserved for
 *   future use; actual numbers are taken from the I<N> markers in the text).
 */
export function parseInterviewResponse(
  rawPaste: string,
  _nextQuestionNumber: number,
): ParseInterviewResult {
  if (!rawPaste.trim()) {
    return { kind: 'questions', questions: [], unmatchedText: '' };
  }

  // --- Verdict check -------------------------------------------------------
  if (SUFFICIENT_RE.test(rawPaste)) {
    const rationale = extractRationale(rawPaste);
    return { kind: 'sufficient', rationale };
  }

  // --- Question block parsing ----------------------------------------------
  const markers = collectMarkers(rawPaste);
  if (markers.length === 0) {
    return { kind: 'questions', questions: [], unmatchedText: rawPaste.trim() };
  }

  const questions: InterviewQuestion[] = [];
  const unmatchedRanges: Array<readonly [number, number]> = [];

  const preambleEnd = markers[0].index;
  if (preambleEnd > 0) {
    unmatchedRanges.push([0, preambleEnd] as const);
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].index : rawPaste.length;
    // blockText is what comes AFTER the heading line
    const blockText = rawPaste.slice(marker.end, nextStart);

    const parsed = parseQuestionBlock(
      blockText,
      marker.questionNumber,
      marker.inlineText,
    );
    if (parsed) {
      questions.push(parsed);
    } else {
      unmatchedRanges.push([marker.index, nextStart] as const);
    }
  }

  const unmatchedText = unmatchedRanges
    .map(([s, e]) => rawPaste.slice(s, e).trim())
    .filter((s) => s.length > 0)
    .join('\n\n');

  return { kind: 'questions', questions, unmatchedText };
}

// --- Helpers ---------------------------------------------------------------

function extractRationale(rawPaste: string): string {
  const match = SUFFICIENT_RE.exec(rawPaste);
  if (!match) return '';
  const afterVerdict = rawPaste.slice(match.index + match[0].length).trim();
  return afterVerdict;
}

function collectMarkers(text: string): IMarker[] {
  const seen = new Map<number, IMarker>();
  for (const { re, questionTextGroup } of MARKER_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const index = m.index;
      if (!seen.has(index)) {
        seen.set(index, {
          index,
          end: index + m[0].length,
          questionNumber: parseInt(m[1], 10),
          inlineText: (m[questionTextGroup] ?? '').trim(),
        });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.index - b.index);
}

/**
 * Parse the body of a question block.
 * @param blockText  Text AFTER the heading line.
 * @param questionNumber  The I<N> number from the heading.
 * @param inlineText  Question text already captured from the heading line.
 */
function parseQuestionBlock(
  blockText: string,
  questionNumber: number,
  inlineText: string,
): InterviewQuestion | null {
  const lines = blockText.trim().split('\n');

  // If we already have question text from the inline heading, don't re-read the first block line as question
  // Separate lines into:
  //  - extra question lines (before any **Topic:** or **Recommended:** if no inlineText)
  //  - topicRef
  //  - recommendedAnswer

  const extraQuestionLines: string[] = [];
  let topicRef: string | undefined;
  let inRecommended = false;
  const recommendedLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inRecommended) recommendedLines.push('');
      continue;
    }

    // Topic line: **Topic:** Q<k>
    const topicMatch = /^\*\*Topic:\*\*\s*(Q\d+)/i.exec(line);
    if (topicMatch) {
      topicRef = topicMatch[1];
      inRecommended = false;
      continue;
    }

    // Recommended line: **Recommended:** ...
    const recMatch = /^\*\*Recommended:\*\*\s*(.*)/i.exec(line);
    if (recMatch) {
      inRecommended = true;
      const firstPart = recMatch[1].trim();
      if (firstPart) recommendedLines.push(firstPart);
      continue;
    }

    if (inRecommended) {
      recommendedLines.push(line);
      continue;
    }

    // If no inlineText yet, treat these lines as additional question text
    if (!inlineText) {
      extraQuestionLines.push(line);
    }
    // If we already have inlineText, extra lines before Topic/Recommended are ignored
    // (they'd be structural noise from the AI)
  }

  // Compose the final question string
  const questionParts = inlineText
    ? [inlineText, ...extraQuestionLines]
    : extraQuestionLines;
  const question = questionParts.join('\n').trim();
  const recommendedAnswer = recommendedLines.join('\n').trim();

  if (!question && !recommendedAnswer) return null;

  return {
    id: `I${questionNumber}`,
    ...(topicRef !== undefined && { topicRef }),
    question: question || '(no question text)',
    recommendedAnswer,
    userAnswer: null,
  };
}
