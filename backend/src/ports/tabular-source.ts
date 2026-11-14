/**
 * Un producteur qui sert un fichier ligne par ligne : on lui demande les
 * lignes d'un territoire, sans télécharger le fichier, et la date de dernière
 * modification du fichier, pour savoir s'il faut relire.
 */
export interface TabularSource {
  rows(
    resourceId: string,
    column: string,
    value: string,
  ): Promise<Record<string, unknown>[]>;
  lastModified(resourceId: string): Promise<Date | null>;
  /** L'adresse des lignes lues, pour que le lecteur les retrouve. */
  rowsUrl(resourceId: string, column: string, value: string): string;
}

export const TABULAR_SOURCE = Symbol('TABULAR_SOURCE');
