import { createHash, randomBytes } from 'node:crypto';

export function createOpaqueToken() {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashToken(token)
  };
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
