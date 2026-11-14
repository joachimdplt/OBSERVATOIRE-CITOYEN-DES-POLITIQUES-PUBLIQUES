/**
 * Une mesure politique : une citation exacte de son document, puis un libellé
 * qui reformule l'action, l'objet et l'horizon sans les qualifier.
 */
export type MeasureInput = { article: string; quote: string; label: string };

/** Les mots de verdict qu'aucun libellé ne porte (CONVENTIONS.md, 1.5). */
const VERDICT =
  /\b(mensong|contradict|irréalist|intenabl|crédib|sincèr|démagog|populis|ambitieu|fantais|absurd)/i;

/** Les erreurs d'une mesure ; vide si elle peut être enregistrée. */
export function checkMeasure(m: MeasureInput): string[] {
  const errors: string[] = [];
  if (!m.article.trim()) errors.push('Une mesure cite son article.');
  if (m.quote.trim().length < 10)
    errors.push('Une mesure porte sa citation exacte, mot pour mot.');
  if (!m.label.trim()) errors.push('Une mesure a un libellé.');
  if (m.label.trim().length > 200)
    errors.push('Un libellé tient en 200 caractères.');
  if (VERDICT.test(m.label))
    errors.push('Un libellé reformule, il ne qualifie pas.');
  return errors;
}
