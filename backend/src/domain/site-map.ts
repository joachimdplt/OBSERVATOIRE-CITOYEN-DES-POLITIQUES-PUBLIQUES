/**
 * La carte d'un site de campagne : ce que chaque page est, d'après son
 * adresse et son titre. Les mots sont publiés, les mêmes pour tous les sites.
 */
export type PageKind =
  'programme' | 'agenda' | 'news' | 'method' | 'consultation' | 'other';

/** Dans l'ordre : la première famille qui reconnaît la page l'emporte. */
export const PAGE_WORDS: [PageKind, string[]][] = [
  [
    'consultation',
    [
      'doleance',
      'doléance',
      'consultation',
      'contribution',
      'cahier-de-doleances',
    ],
  ],
  [
    'agenda',
    [
      'agenda',
      'evenement',
      'événement',
      'meeting',
      'deplacement',
      'déplacement',
      'tour-de-france',
      'tour de france',
      'etape',
      'étape',
      'journal-du-tour',
      'tournee',
      'tournée',
      'rassemblement',
    ],
  ],
  [
    'programme',
    [
      'programme',
      'projet',
      'proposition',
      'priorite',
      'priorité',
      'mesure',
      'cahiers-de-campagne',
      'refondation',
      'vision',
      'livret',
      'manifeste',
      'plan',
    ],
  ],
  [
    'method',
    [
      'demarche',
      'démarche',
      'methode',
      'méthode',
      'comite',
      'comité',
      'participer',
      'la-campagne',
      'mouvement',
      'principes',
    ],
  ],
  [
    'news',
    [
      'actualite',
      'actualité',
      'actus',
      'news',
      'blog',
      'presse',
      'communique',
      'communiqué',
      'article',
      'tribune',
    ],
  ],
];

const plain = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Ce qu'une page est, d'après son adresse (chemin) et son titre. */
export function pageKind(url: string, title: string): PageKind {
  let path = '';
  try {
    path = new URL(url).pathname;
  } catch {
    path = url;
  }
  const hay = plain(`${path} ${title}`);
  for (const [kind, words] of PAGE_WORDS)
    if (words.some((w) => hay.includes(plain(w)))) return kind;
  return 'other';
}

const MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
];

/** Les dates écrites en toutes lettres dans un texte : « 12 novembre 2026 ». */
export function writtenDates(text: string): string[] {
  const out = new Set<string>();
  const re =
    /(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d{2})/g;
  for (const m of plain(text).matchAll(re)) {
    const month = MONTHS.indexOf(m[2]) + 1;
    out.add(
      `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`,
    );
  }
  return [...out].sort();
}

/**
 * Les pages qui ne sont pas la parole du candidat : contributions de
 * citoyens à une consultation, comptes, dons, mentions légales. Elles ne
 * sont pas lues.
 */
export const NOT_CANDIDATE_WORDS =
  /\/(probleme|problemes|solution|solutions|contribution|contributions|doleance)\/[\w-]*\d|\/(espace|connexion|login|compte|don|dons|faire-un-don|adherer|mentions-legales|confidentialite|politique-de-confidentialite|cgu|conditions-generales[\w-]*|cookies)(\/|$)|\.(pdf|jpe?g|png|webp|svg|zip|mp4)(\?|$)/i;
