import type { Network } from './accounts';

/**
 * Le compte qu'une adresse désigne, s'il s'agit d'un réseau suivi : une
 * chaîne YouTube (identifiant « UC… » ou nom « @… »), un compte Instagram, X
 * ou TikTok. Les liens de partage et les pages d'aide ne comptent pas.
 */
export function accountFromUrl(
  href: string,
): { network: Network; handle: string } | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, '');
  const parts = u.pathname.split('/').filter(Boolean);
  if (host === 'youtube.com') {
    if (parts[0] === 'channel' && /^UC[\w-]{22}$/.test(parts[1] ?? ''))
      return { network: 'youtube', handle: parts[1] };
    if (parts[0]?.startsWith('@'))
      return { network: 'youtube', handle: parts[0] };
    if ((parts[0] === 'c' || parts[0] === 'user') && parts[1])
      return { network: 'youtube', handle: `${parts[0]}/${parts[1]}` };
    return null;
  }
  const first = parts[0] ?? '';
  const RESERVED = new Set([
    'share',
    'intent',
    'sharer',
    'home',
    'p',
    'reel',
    'explore',
    'hashtag',
    'search',
    'i',
  ]);
  if (!first || RESERVED.has(first) || parts.length > 2) return null;
  if (host === 'instagram.com') return { network: 'instagram', handle: first };
  if (host === 'x.com' || host === 'twitter.com')
    return { network: 'x', handle: first };
  if (host === 'tiktok.com' && first.startsWith('@'))
    return { network: 'tiktok', handle: first.slice(1) };
  return null;
}
