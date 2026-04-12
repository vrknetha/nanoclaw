import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const IPC_AUTH_SECRET =
  process.env.NANOCLAW_IPC_AUTH_SECRET?.trim() ||
  randomBytes(32).toString('hex');

export function computeIpcAuthToken(groupFolder: string): string {
  return createHmac('sha256', IPC_AUTH_SECRET)
    .update(groupFolder)
    .digest('hex');
}

export function validateIpcAuthToken(
  groupFolder: string,
  candidateToken: string,
): boolean {
  if (!candidateToken) return false;
  const expected = computeIpcAuthToken(groupFolder);
  if (candidateToken.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidateToken), Buffer.from(expected));
}
