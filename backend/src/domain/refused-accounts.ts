import type { SocialNetwork } from '../generated/prisma/enums';

/**
 * Les comptes que l'équipe a vérifiés et refusés (faux compte, homonyme) :
 * même s'ils figurent sur Wikidata, ils ne sont jamais relevés. Chacun avec
 * sa raison, pour qu'on sache pourquoi.
 */
export const REFUSED_ACCOUNTS: {
  network: SocialNetwork;
  handle: string;
  reason: string;
}[] = [
  {
    network: 'instagram',
    handle: 'edouardphilippepm',
    reason:
      'Faux compte : le compte Instagram donné par son site est edouardphilippelh.',
  },
];

export const isRefusedAccount = (network: string, handle: string) =>
  REFUSED_ACCOUNTS.some(
    (a) =>
      a.network === network && a.handle.toLowerCase() === handle.toLowerCase(),
  );
