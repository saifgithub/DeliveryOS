export interface LatestReleaseResponse {
  tag_name: string;
  html_url: string;
  name: string;
}

export interface UpdateCheckResult {
  kind: 'no-update' | 'update-available' | 'skipped' | 'error';
  current: string;
  latest?: string;
  htmlUrl?: string;
  errorReason?: 'disabled' | 'rate-limited' | 'network' | 'parse' | 'no-repo';
}

export type UpdateAction = 'open-release' | 'silence';
