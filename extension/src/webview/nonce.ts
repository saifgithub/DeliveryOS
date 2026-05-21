import { randomBytes } from 'node:crypto';

export function nonce(): string {
  return randomBytes(24).toString('base64url');
}
