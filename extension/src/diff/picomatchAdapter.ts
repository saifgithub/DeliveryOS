// CHUNK-13 § diff/picomatchAdapter.ts — thin wrapper over picomatch.
// Normalises Windows backslash paths to forward slashes before matching.
// Configures picomatch with: dot: true, posixSlashes: true, nocase: false.
//
// Trailing-slash directory shorthand (dir/ → dir/**) is handled upstream
// by CHUNK-09's briefMarkdown.ts parser — this adapter does NOT re-normalise.

import picomatch from 'picomatch';

const PM_OPTIONS: picomatch.PicomatchOptions = {
  dot: true,
  posixSlashes: true,
  nocase: false,
};

/**
 * Normalise a file path to forward slashes and strip a leading `./`.
 */
function normalisePath(filePath: string): string {
  const forward = filePath.replace(/\\/g, '/');
  // Strip leading ./ for consistent matching
  if (forward.startsWith('./')) return forward.slice(2);
  return forward;
}

/**
 * Return true if the given path matches the pattern.
 * Both path and pattern are normalised to forward slashes.
 */
export function isMatch(filePath: string, pattern: string): boolean {
  const normPath = normalisePath(filePath);
  const normPattern = pattern.replace(/\\/g, '/');
  return picomatch(normPattern, PM_OPTIONS)(normPath);
}
