/** Une photo sous licence libre, avec ce qu'il faut pour la créditer. */
export type FreePhoto = {
  url: string;
  author: string;
  licence: string;
  licenceUrl: string | null;
  page: string;
};

/**
 * Une licence qui permet de republier la photo en la créditant : domaine
 * public, CC0, CC BY, CC BY-SA. Une clause « pas d'utilisation commerciale »
 * ou « pas de modification » l'écarte (la photo est recadrée).
 */
export function isFreeLicence(licence: string): boolean {
  const l = licence.toLowerCase();
  if (/\bnc\b|\bnd\b|non[- ]commercial|no deriv/.test(l)) return false;
  return /^(cc0|cc by(-sa)?\b|public domain|domaine public|pd\b)/.test(l);
}

/** Le nom de l'auteur tel que Commons le publie, sans balises HTML. */
export function plainCredit(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
