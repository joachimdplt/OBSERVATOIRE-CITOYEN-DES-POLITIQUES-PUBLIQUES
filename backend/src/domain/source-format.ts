import { SourceFormat } from '../generated/prisma/enums';

/**
 * Le format d'un fichier déposé, d'après son extension. Un format que
 * l'observatoire ne sait pas encore lire est refusé, jamais deviné : un PDF
 * ou une API arriveront avec leur propre lecteur.
 */
export function formatOf(fileName: string): SourceFormat | null {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'csv' || extension === 'txt') return SourceFormat.csv;
  if (extension === 'xlsx') return SourceFormat.xlsx;
  return null;
}
