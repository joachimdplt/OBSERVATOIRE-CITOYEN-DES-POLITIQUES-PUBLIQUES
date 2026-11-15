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

/** Un indicateur d'un diagnostic de campagne, tel que la campagne le publie. */
export type DiagnosisIndicator = {
  name: string;
  unit: string;
  /** La phrase de la campagne, mot pour mot (« 11,7 % en 1975, 0,9 % en 2025. »). */
  sentence: string;
  /** La source que la campagne cite, et son lien. */
  source: string;
  sourceUrl: string | null;
};

/** Un chapitre d'un diagnostic : son nom, son titre, son introduction, ses indicateurs. */
export type DiagnosisChapter = {
  /** L'ancre du chapitre sur la page de la campagne, pour y mener. */
  anchor: string | null;
  label: string;
  title: string;
  intro: string;
  indicators: DiagnosisIndicator[];
};

/**
 * Un compte qu'une consultation publie sur elle-même : il commence par un
 * nombre suivi d'un mot de participation (« 161 problèmes · 223 solutions »,
 * « 4459 problèmes signalés et publiés. »). Les mots des participants ne
 * sont jamais repris : seuls ces comptes le sont.
 */
export function isParticipationCount(text: string): boolean {
  return (
    text.length <= 200 &&
    /^(déjà\s+)?\d[\d\s]*\s+(problèmes?|solutions?|contributions?|propositions?|doléances?|participants?|signataires?|inscrits?|réponses?)\b/iu.test(
      text.trim(),
    )
  );
}

/** Un compte de consultation, et le sujet qu'il compte quand il en a un. */
export type ParticipationCount = { label: string | null; text: string };
