/** Un sujet à reconnaître, par son texte de définition. */
export type TopicText = { code: string; text: string };

/** Un texte à ranger. */
export type UnitText = { id: string; text: string };

/** Les sujets les plus proches d'un texte, du plus proche au moins proche. */
export type TopicSuggestion = {
  id: string;
  suggestions: { code: string; score: number }[];
};

/**
 * Un classeur qui propose, pour chaque texte, les sujets les plus proches.
 * Il propose seulement : une personne valide.
 */
export interface TopicClassifier {
  suggest(
    topics: TopicText[],
    units: UnitText[],
    k: number,
  ): Promise<{ model: string; results: TopicSuggestion[] }>;
}

export const TOPIC_CLASSIFIER = Symbol('TOPIC_CLASSIFIER');
