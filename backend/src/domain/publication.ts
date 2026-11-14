import { VersionState } from '../generated/prisma/enums';

/** Ce que le public lit sur une version, selon qu'elle a été relue ou non. */
export const PUBLICATION_LABELS = {
  [VersionState.preprint]:
    'Prépublication : vérifiée par son seul auteur, en attente de relecture',
  [VersionState.published]:
    'Publiée : relue par une autre personne que son auteur',
} as const;

export type PublicState = keyof typeof PUBLICATION_LABELS;

/** Les états qu'une personne sans compte peut lire. Un brouillon ou une version en relecture n'en sont pas. */
export const PUBLIC_STATES: PublicState[] = [
  VersionState.published,
  VersionState.preprint,
];

/**
 * Le contenu de l'observatoire est sous CC BY-SA 4.0 ; le code sous
 * AGPL-3.0, qui demande d'indiquer à chaque utilisateur du service où trouver
 * le code (section 13).
 */
export const CONTENT_LICENSE = {
  name: 'CC BY-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr',
} as const;

export const SOURCE_CODE = {
  license: 'AGPL-3.0',
  url: 'https://github.com/joachimdplt/OBSERVATOIRE-CITOYEN-DES-POLITIQUES-PUBLIQUES',
} as const;
