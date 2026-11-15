import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Une clé neuve : « obs_ » suivi de 32 octets au hasard. */
export function newApiKey(): string {
  return `obs_${randomBytes(32).toString('base64url')}`;
}

/** L'empreinte gardée en base ; la clé elle-même ne l'est jamais. */
export function apiKeyHash(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Les premiers signes, pour reconnaître une clé dans une liste. */
export const apiKeyPrefix = (key: string) => key.slice(0, 10);

/** Deux clés égales, comparées en temps constant. */
export function sameKey(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
