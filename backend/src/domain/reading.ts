/**
 * La phrase de lecture d'un indicateur, en mots simples, reprise du
 * producteur : « Les habitants de {territoire} ont accès en moyenne à
 * {valeur} consultations de médecine générale par an. » La valeur s'y écrit
 * telle que publiée, jamais arrondie.
 */
export function checkReadingTemplate(template: string): string[] {
  const errors: string[] = [];
  if (!template.includes('{valeur}')) {
    errors.push(
      'La phrase de lecture contient {valeur}, à la place du chiffre.',
    );
  }
  const unknown = [...template.matchAll(/\{([^}]*)\}/g)]
    .map((m) => m[1])
    .filter((name) => name !== 'valeur' && name !== 'territoire');
  if (unknown.length > 0) {
    errors.push(
      `Seuls {territoire} et {valeur} se remplacent : ${unknown.map((u) => `{${u}}`).join(', ')}.`,
    );
  }
  return errors;
}
