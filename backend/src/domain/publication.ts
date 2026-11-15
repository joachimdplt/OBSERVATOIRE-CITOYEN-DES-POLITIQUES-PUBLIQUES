import { VersionState } from '../generated/prisma/enums';

/** Ce que le public lit sur une version, selon qu'elle a été relue ou non. */
export const PUBLICATION_LABELS = {
  [VersionState.preprint]:
    'Prépublication : vérifiée par son seul auteur, en attente de relecture',
  [VersionState.published]:
    'Publiée : relue par une autre personne que son auteur',
} as const;

export type PublicState = keyof typeof PUBLICATION_LABELS;

/**
 * Ce que le public lit sur une version de données. Un fichier déposé n'est
 * pas une publication : c'est un matériau, vérifié contre le fichier du
 * producteur, d'abord par son auteur, puis par une seconde personne.
 */
export const DATA_LABELS: Record<PublicState, string> = {
  [VersionState.preprint]:
    'Vérifiée par son auteur, en attente d’une seconde vérification',
  [VersionState.published]: 'Vérifiée par deux personnes',
};

/** Les états qu'une personne sans compte peut lire. Un brouillon ou une version en relecture n'en sont pas. */
export const PUBLIC_STATES: PublicState[] = [
  VersionState.published,
  VersionState.preprint,
];

/**
 * Le contenu de l'observatoire est sous CC BY-NC-SA 4.0 : reprise libre avec
 * crédit, sauf usage commercial. Le code n'est pas libre.
 */
export const CONTENT_LICENSE = {
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr',
} as const;
