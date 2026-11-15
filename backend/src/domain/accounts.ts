/** Les réseaux suivis, et la propriété Wikidata qui donne chaque compte. */
export const NETWORK_PROPERTIES = {
  P2397: 'youtube',
  P2003: 'instagram',
  P2002: 'x',
  P7085: 'tiktok',
} as const;

export type Network =
  (typeof NETWORK_PROPERTIES)[keyof typeof NETWORK_PROPERTIES];

/** L'adresse publique d'un compte. */
export function accountUrl(network: Network, handle: string): string {
  const h = encodeURIComponent(handle);
  switch (network) {
    case 'youtube':
      return `https://www.youtube.com/channel/${h}`;
    case 'instagram':
      return `https://www.instagram.com/${h}/`;
    case 'x':
      return `https://x.com/${h}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${h}`;
  }
}
