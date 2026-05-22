export function parseOwnerRepo(
  url: string,
): { owner: string; repo: string } | null {
  if (!url) return null;
  const match = url.match(
    /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?(?:[/#?].*)?$/,
  );
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export function isNewer(latestTag: string, currentVersion: string): boolean {
  const a = parseSemver(latestTag);
  const b = parseSemver(currentVersion);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function parseSemver(raw: string): [number, number, number] {
  const stripped = raw.replace(/^v/, '').split(/[-+]/, 1)[0];
  const parts = stripped.split('.').map((p) => {
    const n = Number(p);
    return Number.isFinite(n) ? n : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}
