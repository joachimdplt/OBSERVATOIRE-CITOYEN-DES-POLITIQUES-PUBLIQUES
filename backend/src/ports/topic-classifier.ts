import type { Correction } from '../domain/corrections';

/** Un grand sujet de la grille, avec ses sous-sujets et leurs définitions. */
export type GridTopic = {
  code: string;
  title: string;
  label: string;
  subtopics: {
    code: string;
    title: string;
    label: string;
    description: string | null;
  }[];
};

/** Un texte à ranger. */
export type UnitText = { id: string; text: string };

/** Le grand sujet choisi pour un texte, ou rien si le classeur n'a pas su. */
export type TopicChoice = { id: string; code: string | null };

/**
 * Un classeur qui range chaque texte dans un grand sujet de la grille. Il
 * range seulement : une personne retire un rangement faux.
 */
export interface TopicClassifier {
  /** Le modèle utilisé, pour dire d'où vient chaque rangement. */
  readonly model: string;
  /**
   * Les corrections de l'équipe lui servent d'exemples : il voit les plus
   * proches de chaque texte avant de le ranger.
   */
  classify(
    grid: GridTopic[],
    units: UnitText[],
    corrections?: Correction[],
    /** Le choix des exemples pour un texte ; par défaut, les plus proches. */
    pick?: (text: string) => Correction[],
  ): Promise<TopicChoice[]>;
}

export const TOPIC_CLASSIFIER = Symbol('TOPIC_CLASSIFIER');
