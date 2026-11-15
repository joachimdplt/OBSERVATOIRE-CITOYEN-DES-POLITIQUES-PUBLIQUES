import { Injectable } from '@nestjs/common';
import { NETWORK_PROPERTIES } from '../../domain/accounts';
import type { AccountSource, FoundAccount } from '../../ports/account-source';

const HEADERS = { 'User-Agent': 'observatoire-citoyen/0.1 (logiciel libre)' };

type Claims = Record<
  string,
  { rank?: string; mainsnak: { datavalue?: { value: unknown } } }[]
>;

/**
 * Les comptes d'une personne lus sur son élément Wikidata (P2397 chaîne
 * YouTube, P2003 Instagram, P2002 X, P7085 TikTok). Une valeur dépréciée est
 * écartée ; une valeur préférée passe devant.
 */
@Injectable()
export class WikidataAccounts implements AccountSource {
  async accountsOf(wikidataId: string): Promise<FoundAccount[]> {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${encodeURIComponent(wikidataId)}`;
    let res: Response | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise((r) => setTimeout(r, 800));
      res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
    if (!res?.ok) throw new Error(`${res?.status} sur ${wikidataId}`);
    const body = (await res.json()) as {
      entities: Record<string, { claims?: Claims }>;
    };
    const claims = body.entities[wikidataId]?.claims ?? {};
    const found: FoundAccount[] = [];
    for (const [property, network] of Object.entries(NETWORK_PROPERTIES)) {
      const values = (claims[property] ?? [])
        .filter((c) => c.rank !== 'deprecated')
        .sort(
          (a, b) =>
            Number(b.rank === 'preferred') - Number(a.rank === 'preferred'),
        );
      for (const v of values) {
        const handle = v.mainsnak.datavalue?.value;
        if (typeof handle === 'string' && handle)
          found.push({ network, handle });
      }
    }
    return found;
  }
}
