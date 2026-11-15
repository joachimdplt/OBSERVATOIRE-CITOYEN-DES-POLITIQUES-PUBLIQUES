import { Injectable } from '@nestjs/common';
import { parse } from 'node-html-parser';
import { accountFromUrl } from '../../domain/social-links';
import type {
  FoundAccount,
  SiteAccountSource,
} from '../../ports/account-source';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'Accept-Language': 'fr',
};

/**
 * Les comptes liés depuis un site officiel : chaque lien de la page vers
 * YouTube, Instagram, X ou TikTok. Une chaîne YouTube nommée (« @… ») est
 * ramenée à son identifiant (« UC… »), pour en lire le flux.
 */
@Injectable()
export class WebsiteAccounts implements SiteAccountSource {
  async accountsOnSite(url: string): Promise<FoundAccount[]> {
    const res = await fetch(url, {
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`${res.status} sur ${url}`);
    const root = parse(await res.text());
    const found = new Map<string, FoundAccount>();
    for (const a of root.querySelectorAll('a[href]')) {
      let href: string;
      try {
        href = new URL(a.getAttribute('href') ?? '', url).href;
      } catch {
        continue;
      }
      const account = accountFromUrl(href);
      if (!account) continue;
      if (
        account.network === 'youtube' &&
        !/^UC[\w-]{22}$/.test(account.handle)
      ) {
        const id = await this.channelId(href);
        if (!id) continue;
        account.handle = id;
      }
      found.set(`${account.network}:${account.handle.toLowerCase()}`, account);
    }
    return [...found.values()];
  }

  /** L'identifiant d'une chaîne, lu dans l'adresse canonique de sa page. */
  private async channelId(href: string): Promise<string | null> {
    const res = await fetch(href, {
      headers: { ...HEADERS, Cookie: 'CONSENT=YES+1' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return (
      /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/.exec(
        html,
      )?.[1] ?? null
    );
  }
}
