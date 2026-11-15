import { apiKeyHash, apiKeyPrefix, newApiKey, sameKey } from './api-key';

describe('les clés de l’API publique', () => {
  it('sont longues, différentes à chaque fois, et gardées par leur seule empreinte', () => {
    const a = newApiKey();
    const b = newApiKey();
    expect(a).toMatch(/^obs_[\w-]{43}$/);
    expect(a).not.toBe(b);
    expect(apiKeyHash(a)).toHaveLength(64);
    expect(apiKeyHash(a)).not.toContain(a.slice(4));
    expect(apiKeyPrefix(a)).toBe(a.slice(0, 10));
  });

  it('se comparent sans accepter une clé vide', () => {
    expect(sameKey('obs_x', 'obs_x')).toBe(true);
    expect(sameKey('obs_x', 'obs_y')).toBe(false);
    expect(sameKey('', '')).toBe(false);
  });
});
