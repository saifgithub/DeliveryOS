import type { DiscoveryQuestion, DiscoveryAnswer } from '@deliveryos/contracts';

export interface ParseAnswersResult {
  readonly answers: readonly DiscoveryAnswer[];
  readonly unmatchedText: string;
}

interface Marker {
  readonly index: number;
  readonly end: number;
  readonly questionId: string;
}

const MARKER_PATTERNS: readonly RegExp[] = [
  /^###\s+(Q\d+)\.?[^\n]*(?:\n|$)/gm,
  /^\*\*(Q\d+)\.?\*\*[^\n]*(?:\n|$)/gm,
  /^(Q\d+)\.[^\n]*(?:\n|$)/gm,
];

export function parseAnswers(
  rawPaste: string,
  questions: readonly DiscoveryQuestion[],
): ParseAnswersResult {
  if (!rawPaste.trim()) {
    return { answers: [], unmatchedText: '' };
  }

  const markers = collectMarkers(rawPaste);
  if (markers.length === 0) {
    return { answers: [], unmatchedText: rawPaste.trim() };
  }

  const byId = new Map(questions.map((q) => [q.id, q] as const));
  const answers: DiscoveryAnswer[] = [];
  const unmatchedRanges: Array<readonly [number, number]> = [];

  const preambleEnd = markers[0].index;
  if (preambleEnd > 0) {
    unmatchedRanges.push([0, preambleEnd] as const);
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].index : rawPaste.length;
    const question = byId.get(marker.questionId);
    if (!question) {
      unmatchedRanges.push([marker.index, nextStart] as const);
      continue;
    }
    const answer = rawPaste.slice(marker.end, nextStart).trim();
    answers.push({ question: question.prompt, answer });
  }

  const unmatchedText = unmatchedRanges
    .map(([s, e]) => rawPaste.slice(s, e).trim())
    .filter((s) => s.length > 0)
    .join('\n\n');

  return { answers, unmatchedText };
}

function collectMarkers(text: string): Marker[] {
  const seen = new Map<number, Marker>();
  for (const pattern of MARKER_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const index = m.index;
      if (!seen.has(index)) {
        seen.set(index, {
          index,
          end: index + m[0].length,
          questionId: m[1],
        });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.index - b.index);
}
