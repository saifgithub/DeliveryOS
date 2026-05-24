// CHUNK-10 § 4 — CANONICAL managed delimiter block reader/writer/applier.
// THIS FILE IS THE SINGLE SOURCE OF TRUTH for the delimiter syntax and the
// idempotent applier. CHUNK-11 (`.gitignore` framing) and CHUNK-13
// (`.claude/settings.json` hooks) import from here.

import type {
  ManagedBlock,
  ManagedBlockAction,
  ManagedBlockFormat,
  ManagedBlockPlan,
} from './types';

export type { ManagedBlockAction, ManagedBlockPlan };

// --- Marker constants -----------------------------------------------------

export const BEGIN_MARKER_MD = '<!-- DELIVERYOS:BEGIN -->';
export const END_MARKER_MD = '<!-- DELIVERYOS:END -->';

export const SENTINEL_KEY_JSON = 'deliveryos.managed';

export const BEGIN_MARKER_GITIGNORE = '# DELIVERYOS:BEGIN';
export const END_MARKER_GITIGNORE = '# DELIVERYOS:END';

const VERSION_STAMP_MD =
  '<!-- DeliveryOS managed block v1 — do not edit by hand; edit in DeliveryOS instead. -->';
const VERSION_STAMP_GITIGNORE =
  '# DeliveryOS managed block v1 — do not edit by hand; edit in DeliveryOS instead.';

const HEADER_COMMENT_MD =
  '<!-- This file is read by your AI harness at session start. The DeliveryOS-managed block below tells the harness how to coordinate with DeliveryOS. -->';

// --- Public API -----------------------------------------------------------

/**
 * Read the managed block out of an existing file. Returns `null` if no block
 * is present. Throws if multiple `BEGIN` markers are found (the user broke
 * our single-block invariant; we surface and refuse to guess).
 *
 * For `format === 'json'`, returns the JSON-stringified value of the sentinel
 * key as the body (so callers can diff it as text). Returns `null` when the
 * sentinel key is absent.
 */
export function readManagedBlock(
  content: string,
  format: ManagedBlockFormat,
  file = '',
): ManagedBlock | null {
  if (format === 'md') return readLineMarkerBlock(content, format, file, BEGIN_MARKER_MD, END_MARKER_MD);
  if (format === 'gitignore')
    return readLineMarkerBlock(content, format, file, BEGIN_MARKER_GITIGNORE, END_MARKER_GITIGNORE);
  return readJsonSentinel(content, file);
}

/**
 * Build the managed block body wrapped in its markers. For `format === 'json'`
 * returns the body unchanged (JSON variants use sentinel keys, not markers).
 *
 * The markdown + gitignore variants prepend a one-line version stamp so future
 * extension versions can detect "this user is on the old block content" and
 * prompt a migration (spec § 12 open Q3).
 */
export function buildManagedBlock(body: string, format: ManagedBlockFormat): string {
  if (format === 'md') {
    const stamped = `${VERSION_STAMP_MD}\n\n${body}`;
    return `${BEGIN_MARKER_MD}\n${stamped}\n${END_MARKER_MD}`;
  }
  if (format === 'gitignore') {
    const stamped = `${VERSION_STAMP_GITIGNORE}\n${body}`;
    return `${BEGIN_MARKER_GITIGNORE}\n${stamped}\n${END_MARKER_GITIGNORE}`;
  }
  return body;
}

/**
 * Idempotent applier per spec § 4.1/4.2/4.4:
 *   - existing === null              → `create`
 *   - no BEGIN marker in existing    → `append-block`
 *   - BEGIN marker present, equal    → `noop`
 *   - BEGIN marker present, differs  → `replace-block`
 *
 * For `format === 'json'`, comparison is deep-equal on the parsed sentinel
 * value (whitespace, key order in subobjects, etc. are ignored).
 *
 * Parse failure on an existing JSON file returns `{action: 'noop', error}` —
 * we never attempt to repair the file.
 */
export function applyManagedBlock(
  existing: string | null,
  body: string,
  format: ManagedBlockFormat,
): ManagedBlockPlan {
  if (format === 'json') return applyJsonSentinel(existing, body);
  return applyLineMarkerBlock(existing, body, format);
}

/**
 * Write `content` to `uri` atomically: write to a sibling `.deliveryos.tmp`
 * file, then rename onto the target. On POSIX `rename` is atomic; on Windows
 * it goes through a write-then-replace with a sub-millisecond race window —
 * acceptable for developer instruction files (spec § 12 Risks).
 *
 * Defined here so callers (suggestedUpdates apply path) get the atomic write
 * for free. Pure on string content; the only `vscode` dep lives in the helper.
 */
export async function writeFileAtomic(
  vscodeNs: VscodeFsNamespace,
  uri: VscodeUri,
  content: string,
): Promise<void> {
  const tmpUri = vscodeNs.Uri.file(`${uri.fsPath}.deliveryos.tmp`);
  const bytes = new TextEncoder().encode(content);
  await vscodeNs.workspace.fs.writeFile(tmpUri, bytes);
  await vscodeNs.workspace.fs.rename(tmpUri, uri, { overwrite: true });
}

// --- Markdown + gitignore (line-marker) variant --------------------------

function readLineMarkerBlock(
  content: string,
  format: ManagedBlockFormat,
  file: string,
  begin: string,
  end: string,
): ManagedBlock | null {
  const occurrences = countOccurrences(content, begin);
  if (occurrences === 0) return null;
  if (occurrences > 1) {
    throw new Error(
      `Multiple "${begin}" markers found in ${file || '<file>'}; refusing to guess which is the DeliveryOS-managed block.`,
    );
  }
  const beginIdx = content.indexOf(begin);
  const endIdx = content.indexOf(end, beginIdx + begin.length);
  if (endIdx === -1) {
    throw new Error(
      `Found "${begin}" without matching "${end}" in ${file || '<file>'}.`,
    );
  }
  // Body lives between the marker lines (strip leading/trailing single newline).
  const inner = content.slice(beginIdx + begin.length, endIdx);
  const body = inner.replace(/^\n/, '').replace(/\n$/, '');
  return { file, format, begin, end, body };
}

function applyLineMarkerBlock(
  existing: string | null,
  body: string,
  format: 'md' | 'gitignore',
): ManagedBlockPlan {
  const block = buildManagedBlock(body, format);
  const stampedBody = extractBlockBodyFromBuilt(block, format);

  if (existing === null) {
    const next =
      format === 'md'
        ? `${HEADER_COMMENT_MD}\n\n${block}\n`
        : `${block}\n`;
    return { action: 'create', next, blockBody: stampedBody };
  }

  const begin = format === 'md' ? BEGIN_MARKER_MD : BEGIN_MARKER_GITIGNORE;
  const end = format === 'md' ? END_MARKER_MD : END_MARKER_GITIGNORE;
  const existingBlock = readLineMarkerBlock(existing, format, '', begin, end);

  if (existingBlock === null) {
    const sep = existing.endsWith('\n') ? '\n' : '\n\n';
    const next = `${existing}${sep}${block}\n`;
    return { action: 'append-block', next, blockBody: stampedBody };
  }

  if (bodiesEqual(existingBlock.body, stampedBody)) {
    return { action: 'noop', next: existing, blockBody: stampedBody };
  }

  const beginIdx = existing.indexOf(begin);
  const endIdx = existing.indexOf(end, beginIdx + begin.length);
  const before = existing.slice(0, beginIdx);
  const after = existing.slice(endIdx + end.length);
  const next = `${before}${block}${after}`;
  return { action: 'replace-block', next, blockBody: stampedBody };
}

function extractBlockBodyFromBuilt(block: string, format: 'md' | 'gitignore'): string {
  const begin = format === 'md' ? BEGIN_MARKER_MD : BEGIN_MARKER_GITIGNORE;
  const end = format === 'md' ? END_MARKER_MD : END_MARKER_GITIGNORE;
  const inner = block.slice(block.indexOf(begin) + begin.length, block.indexOf(end));
  return inner.replace(/^\n/, '').replace(/\n$/, '');
}

/**
 * Whitespace-normalised equality: trim trailing whitespace per line, strip
 * trailing blank lines. Avoids spurious `replace-block` from editors that
 * trim trailing whitespace on save (spec § 4.1 rule 2).
 */
function bodiesEqual(a: string, b: string): boolean {
  return normaliseBody(a) === normaliseBody(b);
}

function normaliseBody(body: string): string {
  return body
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === '') return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return count;
    count += 1;
    from = idx + needle.length;
  }
}

// --- JSON variant ---------------------------------------------------------

function readJsonSentinel(content: string, file: string): ManagedBlock | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  if (!(SENTINEL_KEY_JSON in parsed)) return null;
  const value = (parsed as Record<string, unknown>)[SENTINEL_KEY_JSON];
  return {
    file,
    format: 'json',
    begin: SENTINEL_KEY_JSON,
    end: SENTINEL_KEY_JSON,
    body: JSON.stringify(value, null, 2),
  };
}

function applyJsonSentinel(existing: string | null, body: string): ManagedBlockPlan {
  let newValue: unknown;
  try {
    newValue = JSON.parse(body);
  } catch (e) {
    return {
      action: 'noop',
      next: existing ?? '',
      blockBody: body,
      error: `Internal: managed-block body is not valid JSON (${(e as Error).message}).`,
    };
  }

  if (existing === null) {
    const fileValue = { [SENTINEL_KEY_JSON]: newValue };
    const next = `${JSON.stringify(fileValue, null, 2)}\n`;
    return { action: 'create', next, blockBody: JSON.stringify(newValue, null, 2) };
  }

  let parsed: Record<string, unknown>;
  try {
    const candidate = JSON.parse(existing);
    if (!isPlainObject(candidate)) {
      return {
        action: 'noop',
        next: existing,
        blockBody: JSON.stringify(newValue, null, 2),
        error:
          'Existing JSON is not an object — DeliveryOS only manages top-level object configs.',
      };
    }
    parsed = candidate as Record<string, unknown>;
  } catch (e) {
    return {
      action: 'noop',
      next: existing,
      blockBody: JSON.stringify(newValue, null, 2),
      error: `Existing JSON is not valid (${(e as Error).message}).`,
    };
  }

  const hadKey = SENTINEL_KEY_JSON in parsed;
  if (hadKey && deepEqual(parsed[SENTINEL_KEY_JSON], newValue)) {
    return { action: 'noop', next: existing, blockBody: JSON.stringify(newValue, null, 2) };
  }

  const nextParsed = { ...parsed, [SENTINEL_KEY_JSON]: newValue };
  const next = `${JSON.stringify(nextParsed, null, 2)}\n`;
  return {
    action: hadKey ? 'replace-block' : 'append-block',
    next,
    blockBody: JSON.stringify(newValue, null, 2),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((el, i) => deepEqual(el, b[i]));
  }
  if (typeof a === 'object') {
    if (typeof b !== 'object' || b === null || Array.isArray(b)) return false;
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => k in bObj && deepEqual(aObj[k], bObj[k]));
  }
  return false;
}

// --- Minimal vscode-shaped interfaces for the atomic-write helper -------
// Typed structurally so the file stays vscode-import-free and testable.

export interface VscodeUri {
  readonly fsPath: string;
}

export interface VscodeFsNamespace {
  readonly Uri: { file(path: string): VscodeUri };
  readonly workspace: {
    readonly fs: {
      writeFile(uri: VscodeUri, content: Uint8Array): PromiseLike<void>;
      rename(
        from: VscodeUri,
        to: VscodeUri,
        options?: { overwrite?: boolean },
      ): PromiseLike<void>;
    };
  };
}
