import type { FreePhoto } from '../domain/photo';

/**
 * La photo d'une personne sous licence libre, d'après son élément Wikidata.
 * Rien si l'élément n'a pas de photo, ou si la licence ne permet pas de la
 * republier.
 */
export interface PhotoSource {
  photoOf(wikidataId: string): Promise<FreePhoto | null>;
}

export const PHOTO_SOURCE = Symbol('PHOTO_SOURCE');
