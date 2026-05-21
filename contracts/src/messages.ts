import type { RequestType, NotificationType } from 'vscode-messenger-common';

export type DiscriminatedRequest<K extends string, P, R> = {
  kind: K;
  params: P;
  result: R;
};

export const assertNever = (x: never): never => {
  throw new Error(`Unexpected discriminant: ${JSON.stringify(x)}`);
};

export type { RequestType, NotificationType };
