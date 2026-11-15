/**
 * Ce que fait un candidat, d'après ce que sa campagne publie : rien n'est
 * déduit, seulement rangé.
 */

/**
 * Les mots qui signalent un déplacement ou un rendez-vous public. Une
 * publication dont le titre ou l'adresse en porte un rejoint « déplacements
 * et agenda » ; la liste est publiée, la même pour tous.
 */
export const EVENT_WORDS = [
  'meeting',
  'déplacement',
  'deplacement',
  'étape',
  'etape',
  'tour de france',
  'agenda',
  'rassemblement',
  'réunion publique',
  'reunion-publique',
  'visite',
  'en direct de',
  'rencontre',
  'tournée',
  'tournee',
];

/** Une publication de campagne raconte-t-elle ou annonce-t-elle un déplacement ? */
export function isCampaignEvent(title: string, url: string): boolean {
  const text = `${title} ${url}`.toLowerCase();
  return EVENT_WORDS.some((w) =>
    new RegExp(
      `(^|[^\\p{L}])${w.replace(/[-]/g, '[-\\s]')}([^\\p{L}]|$)`,
      'u',
    ).test(text),
  );
}

export type CampaignFigure = { label: string; text: string };

/**
 * Les comptes qu'une page de consultation publie, tels qu'écrits : chaque
 * passage court qui commence par un nombre (« 161 problèmes · 223
 * solutions »), avec la rubrique sous laquelle il se trouve.
 */
export function consultationFigures(
  passages: { heading: string; text: string }[],
): CampaignFigure[] {
  return passages
    .filter((p) => p.text.length <= 160 && /^\d[\d\s.]*\s*\p{L}/u.test(p.text))
    .map((p) => ({ label: p.heading, text: p.text }));
}
