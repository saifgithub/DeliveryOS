// CHUNK-13 § diff/engine.ts — pure diff algorithm. No I/O, no vscode.
// runDiff(input): DiffOutcome. Easily unit-testable.

import { isMatch } from './picomatchAdapter';
import type {
  DiffInput,
  DiffNote,
  DiffOutcome,
  FileVerdict,
} from '@deliveryos/contracts';

export const CURRENT_ENGINE_VERSION = 1 as const;

/**
 * Run the Allowed/Forbidden diff against the given input.
 * Pure function — no I/O.
 */
export function runDiff(input: DiffInput): DiffOutcome {
  const paths = input.filesChanged.fromGit.map((c) => c.path);
  const files: FileVerdict[] = [];
  const notes: DiffNote[] = [];

  // Track which allowed patterns have been matched by at least one file.
  const allowedPatternMatched = new Set<string>();

  for (const filePath of paths) {
    // --- Check forbidden first (forbidden wins ties) ---
    let forbiddenMatch: string | null = null;
    for (const pattern of input.forbiddenPatterns) {
      if (isMatch(filePath, pattern)) {
        forbiddenMatch = pattern;
        break;
      }
    }

    if (forbiddenMatch !== null) {
      files.push({
        path: filePath,
        classification: 'forbidden-but-touched',
        matchedRule: forbiddenMatch,
        matchedSection: 8,
      });
      notes.push({
        level: 'error',
        message: `File "${filePath}" matches forbidden rule "${forbiddenMatch}" (Section 8).`,
        path: filePath,
      });
      continue;
    }

    // --- Check allowed ---
    let allowedMatch: string | null = null;
    for (const pattern of input.allowedPatterns) {
      if (isMatch(filePath, pattern)) {
        allowedMatch = pattern;
        allowedPatternMatched.add(pattern);
        break;
      }
    }

    if (allowedMatch !== null) {
      files.push({
        path: filePath,
        classification: 'allowed-and-touched',
        matchedRule: allowedMatch,
        matchedSection: 7,
      });
    } else {
      files.push({
        path: filePath,
        classification: 'unclassified-but-touched',
        matchedRule: null,
        matchedSection: null,
      });
      notes.push({
        level: 'warn',
        message: `File "${filePath}" was changed but is not mentioned in the brief's Allowed or Forbidden sections.`,
        path: filePath,
      });
    }
  }

  // --- Per-allowed-pattern: which patterns had NO matching file ---
  const unmatchedAllowedPatterns: string[] = [];
  for (const pattern of input.allowedPatterns) {
    if (!allowedPatternMatched.has(pattern)) {
      unmatchedAllowedPatterns.push(pattern);
    }
  }

  // Verdict: fail iff any file is forbidden-but-touched.
  const verdict: 'pass' | 'fail' = files.some(
    (f) => f.classification === 'forbidden-but-touched',
  )
    ? 'fail'
    : 'pass';

  return {
    resultId: '',  // Filled in by runForResult
    verdict,
    files,
    unmatchedAllowedPatterns,
    notes,
    inputs: input,
    engineVersion: 1,
    computedAt: Date.now(),
  };
}
