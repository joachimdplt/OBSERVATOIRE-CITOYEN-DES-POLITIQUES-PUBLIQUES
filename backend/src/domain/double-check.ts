/**
 * La double vérification : un rangement n'est sûr que si deux personnes
 * distinctes, chacune sans voir l'avis de l'autre, disent la même chose.
 * Comme les chercheurs du CAP, on mesure aussi leur accord : il dit jusqu'où
 * une personne seule est fiable.
 */

/** Ce qu'une personne a dit d'un rangement : juste, ou non. */
export type PersonVerdict = { by: string; accepted: boolean; at: Date };

export type DoubleState = 'none' | 'single' | 'agreed' | 'disagreed';

/** Le dernier avis de chaque personne : changer d'avis remplace le sien. */
export function latestByPerson(verdicts: PersonVerdict[]): PersonVerdict[] {
  const latest = new Map<string, PersonVerdict>();
  for (const v of verdicts) {
    const seen = latest.get(v.by);
    if (!seen || seen.at < v.at) latest.set(v.by, v);
  }
  return [...latest.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Où en est un rangement : personne, une personne, deux d'accord, ou non. */
export function doubleState(verdicts: PersonVerdict[]): DoubleState {
  const people = latestByPerson(verdicts);
  if (people.length === 0) return 'none';
  if (people.length === 1) return 'single';
  const [a, b] = people;
  return a.accepted === b.accepted ? 'agreed' : 'disagreed';
}

/**
 * L'accord entre deux personnes sur les rangements lus deux fois : la part
 * d'accord, et le kappa de Cohen, qui retire l'accord dû au hasard (1 : accord
 * parfait ; 0 : pas mieux que le hasard). `null` sans rangement lu deux fois.
 */
export function agreement(pairs: [boolean, boolean][]) {
  const n = pairs.length;
  if (n === 0) return null;
  const agreed = pairs.filter(([a, b]) => a === b).length;
  const po = agreed / n;
  const pa = pairs.filter(([a]) => a).length / n;
  const pb = pairs.filter(([, b]) => b).length / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  const kappa = pe === 1 ? 1 : (po - pe) / (1 - pe);
  return { pairs: n, agreed, rate: po, kappa };
}
