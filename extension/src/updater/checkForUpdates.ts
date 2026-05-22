import * as vscode from 'vscode';
import { isNewer, parseOwnerRepo } from './helpers';
import type {
  LatestReleaseResponse,
  UpdateCheckResult,
} from './types';

const LAST_SEEN_TAG_KEY = 'deliveryos.lastSeenReleaseTag';
const NETWORK_TIMEOUT_MS = 5_000;

const OPEN_ACTION = 'Open release page';
const SILENCE_ACTION = "Don't show again";

export async function checkForUpdates(
  context: vscode.ExtensionContext,
): Promise<UpdateCheckResult> {
  const current = String(context.extension.packageJSON.version ?? '0.0.0');
  const enabled = vscode.workspace
    .getConfiguration('deliveryos')
    .get<boolean>('checkForUpdates', true);

  if (!enabled) {
    return { kind: 'skipped', current, errorReason: 'disabled' };
  }

  const repoUrl = String(
    context.extension.packageJSON.repository?.url ?? '',
  );
  const ownerRepo = parseOwnerRepo(repoUrl);
  if (!ownerRepo) {
    return { kind: 'error', current, errorReason: 'no-repo' };
  }

  const url = `https://api.github.com/repos/${ownerRepo.owner}/${ownerRepo.repo}/releases/latest`;

  let latest: LatestReleaseResponse;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': `DeliveryOS-Updater/${current}`,
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      if (!res.ok) {
        return {
          kind: 'error',
          current,
          errorReason: res.status === 403 ? 'rate-limited' : 'network',
        };
      }
      latest = (await res.json()) as LatestReleaseResponse;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { kind: 'error', current, errorReason: 'network' };
  }

  if (!latest?.tag_name || !latest?.html_url) {
    return { kind: 'error', current, errorReason: 'parse' };
  }

  if (!isNewer(latest.tag_name, current)) {
    return {
      kind: 'no-update',
      current,
      latest: latest.tag_name,
      htmlUrl: latest.html_url,
    };
  }

  const lastSeen = context.globalState.get<string>(LAST_SEEN_TAG_KEY);
  if (lastSeen === latest.tag_name) {
    return {
      kind: 'no-update',
      current,
      latest: latest.tag_name,
      htmlUrl: latest.html_url,
    };
  }

  void promptUser(context, current, latest);

  return {
    kind: 'update-available',
    current,
    latest: latest.tag_name,
    htmlUrl: latest.html_url,
  };
}

async function promptUser(
  context: vscode.ExtensionContext,
  current: string,
  latest: LatestReleaseResponse,
): Promise<void> {
  const message = `DeliveryOS ${latest.tag_name} is available (you're on v${current}).`;
  const choice = await vscode.window.showInformationMessage(
    message,
    OPEN_ACTION,
    SILENCE_ACTION,
  );

  await context.globalState.update(LAST_SEEN_TAG_KEY, latest.tag_name);

  if (choice === OPEN_ACTION) {
    await vscode.env.openExternal(vscode.Uri.parse(latest.html_url));
  } else if (choice === SILENCE_ACTION) {
    await vscode.workspace
      .getConfiguration('deliveryos')
      .update(
        'checkForUpdates',
        false,
        vscode.ConfigurationTarget.Global,
      );
  }
}

